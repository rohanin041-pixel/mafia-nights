import { HostGameState } from '../game/types';

export interface StoredSession {
  roomCode: string;
  playerId: string;
  playerName: string;
  avatar: string;
  isHost: boolean;
  savedAt: number;
}

const SESSION_KEY = 'mafia_nights_session_v1';
const HOST_STATE_PREFIX = 'mafia_nights_host_v1_';
const MUTE_KEY = 'mafia_nights_muted_v1';

const ROOM_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += ROOM_ALPHABET[Math.floor(Math.random() * ROOM_ALPHABET.length)];
  }
  return code;
}

export function generatePlayerId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getRoomCodeFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('room');
  if (!raw) return null;
  const clean = raw.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
  return clean.length === 4 ? clean : null;
}

export function isAutostartFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export function setRoomCodeInUrl(roomCode: string | null): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  if (roomCode) {
    url.searchParams.set('room', roomCode);
  } else {
    url.searchParams.delete('room');
  }
  window.history.replaceState({}, '', url.toString());
}

export function buildInviteUrl(roomCode: string): string {
  if (typeof window === 'undefined') return `?room=${roomCode}`;
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('room', roomCode);
  return url.toString();
}

export function saveSession(session: StoredSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    // Expire sessions older than 12 hours
    if (!parsed.roomCode || !parsed.playerId || Date.now() - parsed.savedAt > 12 * 60 * 60 * 1000) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Ignore
  }
}

export function saveHostGameState(state: HostGameState): void {
  try {
    if (state.isDemo) return;
    localStorage.setItem(`${HOST_STATE_PREFIX}${state.roomCode}`, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

export function loadHostGameState(roomCode: string): HostGameState | null {
  try {
    const raw = localStorage.getItem(`${HOST_STATE_PREFIX}${roomCode}`);
    if (!raw) return null;
    return JSON.parse(raw) as HostGameState;
  } catch {
    return null;
  }
}

export function clearHostGameState(roomCode: string): void {
  try {
    localStorage.removeItem(`${HOST_STATE_PREFIX}${roomCode}`);
  } catch {
    // Ignore
  }
}

export function loadMutedPreference(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function saveMutedPreference(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Ignore
  }
}
