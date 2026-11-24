import Peer, { DataConnection } from 'peerjs';
import { ClientViewState } from '../game/types';

export type ClientToHostMessage =
  | {
      type: 'JOIN';
      playerId: string;
      name: string;
      preferredAvatar?: string;
    }
  | {
      type: 'REROLL_AVATAR';
      playerId: string;
    }
  | {
      type: 'REVEAL_READY';
      playerId: string;
    }
  | {
      type: 'NIGHT_ACTION';
      playerId: string;
      targetId: string;
    }
  | {
      type: 'VOTE';
      playerId: string;
      choice: string | 'skip';
    };

export type HostToClientMessage =
  | {
      type: 'STATE_SYNC';
      state: ClientViewState;
    }
  | {
      type: 'KICKED';
      reason: string;
    }
  | {
      type: 'ERROR';
      message: string;
    };

export function roomCodeToPeerId(roomCode: string): string {
  return `mafia-nights-room-${roomCode.toUpperCase()}`;
}

export class HostPeerServer {
  private peer: Peer | null = null;
  private connectionsByPlayerId = new Map<string, DataConnection>();
  private playerIdByPeerConn = new Map<DataConnection, string>();
  private onMessage: (playerId: string, msg: ClientToHostMessage) => void;
  private onPlayerDisconnect: (playerId: string) => void;
  private onReady: (peerId: string) => void;
  private onError: (err: string) => void;

  constructor(callbacks: {
    onMessage: (playerId: string, msg: ClientToHostMessage) => void;
    onPlayerDisconnect: (playerId: string) => void;
    onReady: (peerId: string) => void;
    onError: (err: string) => void;
  }) {
    this.onMessage = callbacks.onMessage;
    this.onPlayerDisconnect = callbacks.onPlayerDisconnect;
    this.onReady = callbacks.onReady;
    this.onError = callbacks.onError;
  }

  start(roomCode: string): void {
    this.destroy();
    const peerId = roomCodeToPeerId(roomCode);
    const peer = new Peer(peerId, { debug: 0 });
    this.peer = peer;

    peer.on('open', (id) => {
      this.onReady(id);
    });

    peer.on('connection', (conn) => {
      conn.on('data', (raw) => {
        const msg = raw as ClientToHostMessage;
        if (!msg || typeof msg !== 'object' || !('type' in msg)) return;

        if (msg.type === 'JOIN' && msg.playerId) {
          this.connectionsByPlayerId.set(msg.playerId, conn);
          this.playerIdByPeerConn.set(conn, msg.playerId);
        }

        const pid = msg.playerId ?? this.playerIdByPeerConn.get(conn);
        if (pid) {
          this.onMessage(pid, msg);
        }
      });

      conn.on('close', () => {
        const pid = this.playerIdByPeerConn.get(conn);
        if (pid) {
          if (this.connectionsByPlayerId.get(pid) === conn) {
            this.connectionsByPlayerId.delete(pid);
            this.onPlayerDisconnect(pid);
          }
          this.playerIdByPeerConn.delete(conn);
        }
      });
    });

    peer.on('error', (err) => {
      const message = err?.message || 'Could not open room connection.';
      this.onError(message);
    });
  }

  sendToPlayer(playerId: string, message: HostToClientMessage): void {
    const conn = this.connectionsByPlayerId.get(playerId);
    if (conn && conn.open) {
      try {
        conn.send(message);
      } catch {
        // Ignore transient send error
      }
    }
  }

  kickPlayer(playerId: string, reason = 'Removed from the lobby by host.'): void {
    const conn = this.connectionsByPlayerId.get(playerId);
    if (conn) {
      if (conn.open) {
        try {
          conn.send({ type: 'KICKED', reason } satisfies HostToClientMessage);
        } catch {
          // Ignore
        }
      }
      setTimeout(() => {
        try {
          conn.close();
        } catch {
          // Ignore
        }
      }, 100);
      this.connectionsByPlayerId.delete(playerId);
      this.playerIdByPeerConn.delete(conn);
    }
  }

  destroy(): void {
    for (const conn of this.connectionsByPlayerId.values()) {
      try {
        conn.close();
      } catch {
        // Ignore
      }
    }
    this.connectionsByPlayerId.clear();
    this.playerIdByPeerConn.clear();
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignore
      }
      this.peer = null;
    }
  }
}

export class ClientPeerConnection {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  private onStateSync: (state: ClientViewState) => void;
  private onKicked: (reason: string) => void;
  private onError: (message: string) => void;
  private onConnected: () => void;

  constructor(callbacks: {
    onStateSync: (state: ClientViewState) => void;
    onKicked: (reason: string) => void;
    onError: (message: string) => void;
    onConnected: () => void;
  }) {
    this.onStateSync = callbacks.onStateSync;
    this.onKicked = callbacks.onKicked;
    this.onError = callbacks.onError;
    this.onConnected = callbacks.onConnected;
  }

  connect(params: {
    roomCode: string;
    playerId: string;
    name: string;
    preferredAvatar?: string;
  }): void {
    this.destroy();
    const peer = new Peer({ debug: 0 });
    this.peer = peer;

    let didOpen = false;
    const timeoutId = window.setTimeout(() => {
      if (!didOpen) {
        this.onError('Could not reach host phone. Check the 4-letter code and try again.');
      }
    }, 10000);

    peer.on('open', () => {
      const hostPeerId = roomCodeToPeerId(params.roomCode);
      const conn = peer.connect(hostPeerId, { reliable: true });
      this.conn = conn;

      conn.on('open', () => {
        didOpen = true;
        window.clearTimeout(timeoutId);
        this.onConnected();
        this.send({
          type: 'JOIN',
          playerId: params.playerId,
          name: params.name,
          preferredAvatar: params.preferredAvatar,
        });
      });

      conn.on('data', (raw) => {
        const msg = raw as HostToClientMessage;
        if (!msg || typeof msg !== 'object' || !('type' in msg)) return;
        if (msg.type === 'STATE_SYNC') {
          this.onStateSync(msg.state);
        } else if (msg.type === 'KICKED') {
          this.onKicked(msg.reason);
        } else if (msg.type === 'ERROR') {
          this.onError(msg.message);
        }
      });

      conn.on('close', () => {
        if (didOpen) {
          this.onError('Disconnected from host phone. Tap Reconnect or refresh to rejoin.');
        }
      });

      conn.on('error', () => {
        window.clearTimeout(timeoutId);
        this.onError('Connection to host failed.');
      });
    });

    peer.on('error', () => {
      window.clearTimeout(timeoutId);
      this.onError('Could not connect to room. Check the room code or internet connection.');
    });
  }

  send(msg: ClientToHostMessage): void {
    if (this.conn && this.conn.open) {
      try {
        this.conn.send(msg);
      } catch {
        // Ignore
      }
    }
  }

  destroy(): void {
    if (this.conn) {
      try {
        this.conn.close();
      } catch {
        // Ignore
      }
      this.conn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // Ignore
      }
      this.peer = null;
    }
  }
}
