/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  DEMO_BOT_PROFILES,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from './game/constants';
import {
  assignRoles,
  checkWinCondition,
  computeAwards,
  createEmptyStats,
  generateBotDiscussionLines,
  generateBotNightActions,
  generateBotVotes,
  hasEveryoneActedAtNight,
  hasEveryoneVoted,
  isValidDoctorSave,
  pickUniqueAvatar,
  resolveNightPhase,
  resolveVotes,
  sanitizeStateForPlayer,
} from './game/rules';
import { ClientViewState, HostGameState, HostSettings, Player } from './game/types';
import { ClientPeerConnection, HostPeerServer } from './network/peerManager';
import { initNarrator, playSfx, speakNarratorLine, stopNarrator } from './utils/narrator';
import {
  clearHostGameState,
  clearSession,
  generatePlayerId,
  generateRoomCode,
  getRoomCodeFromUrl,
  isAutostartFromUrl,
  loadHostGameState,
  loadMutedPreference,
  loadSession,
  saveHostGameState,
  saveMutedPreference,
  saveSession,
  setRoomCodeInUrl,
} from './utils/storage';
import { PhaseAtmosphere } from './components/PhaseAtmosphere';
import { NarratorBanner } from './components/NarratorBanner';
import { HomeScreen } from './components/HomeScreen';
import { JoinScreen } from './components/JoinScreen';
import { LobbyScreen } from './components/LobbyScreen';
import { RevealPhase } from './components/RevealPhase';
import { NightPhase } from './components/NightPhase';
import { MorningPhase } from './components/MorningPhase';
import { DiscussionPhase } from './components/DiscussionPhase';
import { VotingPhase } from './components/VotingPhase';
import { GameOverScreen } from './components/GameOverScreen';

type AppMode = 'home' | 'join' | 'host' | 'client' | 'demo';

export default function App() {
  const [mode, setMode] = useState<AppMode>('home');
  const [clientView, setClientView] = useState<ClientViewState | null>(null);
  const [joinRoomPrefill, setJoinRoomPrefill] = useState<string>('');
  const [joinNamePrefill, setJoinNamePrefill] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(() => loadMutedPreference());
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  const hostStateRef = useRef<HostGameState | null>(null);
  const hostServerRef = useRef<HostPeerServer | null>(null);
  const clientConnRef = useRef<ClientPeerConnection | null>(null);
  const selfIdRef = useRef<string>(generatePlayerId());
  const lastSpokenKeyRef = useRef<string>('');

  const syncHostToAll = useCallback((nextState: HostGameState) => {
    hostStateRef.current = nextState;
    if (!nextState.isDemo) {
      saveHostGameState(nextState);
    }
    const selfView = sanitizeStateForPlayer(nextState, selfIdRef.current);
    setClientView(selfView);

    if (!nextState.isDemo && hostServerRef.current) {
      for (const player of nextState.players) {
        if (!player.isHost && player.connected) {
          hostServerRef.current.sendToPlayer(player.id, {
            type: 'STATE_SYNC',
            state: sanitizeStateForPlayer(nextState, player.id),
          });
        }
      }
    }
  }, []);

  const beginNightPhase = useCallback(
    (state: HostGameState, nextRound: number): HostGameState => {
      const now = Date.now();
      return {
        ...state,
        phase: 'night',
        round: nextRound,
        nightActions: {
          mafiaPicks: {},
          doctorSave: null,
          policeCheck: null,
          villagerSuspects: {},
          actedPlayerIds: [],
        },
        voteResult: null,
        votes: {},
        chatMessages: [],
        narratorLine: `Night ${nextRound} falls. Close your eyes and tap your screen silently.`,
        phaseStartedAt: now,
        phaseDurationSec: state.settings.nightTimerSec,
      };
    },
    []
  );

  const beginMorningPhase = useCallback((state: HostGameState): HostGameState => {
    const resolved = resolveNightPhase({
      round: state.round,
      players: state.players,
      mafiaPicks: state.nightActions.mafiaPicks,
      doctorSave: state.nightActions.doctorSave,
      lastDoctorSavedId: state.lastDoctorSavedId,
      policeCheck: state.nightActions.policeCheck,
      villagerSuspects: state.nightActions.villagerSuspects,
      stats: state.stats,
    });

    const winner = checkWinCondition(resolved.updatedPlayers);
    const now = Date.now();

    if (winner) {
      const awards = computeAwards(resolved.updatedPlayers, resolved.updatedStats);
      return {
        ...state,
        players: resolved.updatedPlayers,
        morningOutcome: resolved.outcome,
        policeResultsByPlayer: {
          ...state.policeResultsByPlayer,
          ...resolved.policeResultsByPlayer,
        },
        lastDoctorSavedId: resolved.nextLastDoctorSavedId,
        stats: resolved.updatedStats,
        phase: 'gameover',
        winner,
        awards,
        narratorLine: `${resolved.outcome.headline} ${
          winner === 'village' ? 'The Village wins!' : 'The Mafia wins!'
        }`,
        phaseStartedAt: now,
        phaseDurationSec: 0,
      };
    }

    return {
      ...state,
      players: resolved.updatedPlayers,
      morningOutcome: resolved.outcome,
      policeResultsByPlayer: {
        ...state.policeResultsByPlayer,
        ...resolved.policeResultsByPlayer,
      },
      lastDoctorSavedId: resolved.nextLastDoctorSavedId,
      stats: resolved.updatedStats,
      phase: 'morning',
      narratorLine: resolved.outcome.headline,
      phaseStartedAt: now,
      phaseDurationSec: 8,
    };
  }, []);

  const beginDiscussionPhase = useCallback((state: HostGameState): HostGameState => {
    const now = Date.now();
    return {
      ...state,
      phase: 'discussion',
      chatMessages: [],
      narratorLine: 'Open your eyes and argue your case. Who cannot be trusted?',
      phaseStartedAt: now,
      phaseDurationSec: state.settings.discussionTimerSec,
    };
  }, []);

  const beginVotingPhase = useCallback((state: HostGameState): HostGameState => {
    const now = Date.now();
    return {
      ...state,
      phase: 'voting',
      votes: {},
      voteResult: null,
      narratorLine: 'Time is up. Cast your secret vote on your phone now.',
      phaseStartedAt: now,
      phaseDurationSec: state.settings.votingTimerSec,
    };
  }, []);

  const beginVoteResultPhase = useCallback((state: HostGameState): HostGameState => {
    const alivePlayers = state.players.filter((p) => p.alive);
    const { result, updatedPlayers: updatedAlive, updatedStats } = resolveVotes(
      state.votes,
      alivePlayers,
      state.round,
      state.stats
    );

    const aliveMap = new Map(updatedAlive.map((p) => [p.id, p]));
    const allUpdatedPlayers = state.players.map((p) => aliveMap.get(p.id) ?? p);
    const winner = checkWinCondition(allUpdatedPlayers);
    const now = Date.now();

    if (winner) {
      const awards = computeAwards(allUpdatedPlayers, updatedStats);
      return {
        ...state,
        players: allUpdatedPlayers,
        stats: updatedStats,
        voteResult: result,
        phase: 'gameover',
        winner,
        awards,
        narratorLine: `${result.headline} ${
          winner === 'village' ? 'The Village wins!' : 'The Mafia wins!'
        }`,
        phaseStartedAt: now,
        phaseDurationSec: 0,
      };
    }

    return {
      ...state,
      players: allUpdatedPlayers,
      stats: updatedStats,
      voteResult: result,
      phase: 'vote_result',
      narratorLine: result.headline,
      phaseStartedAt: now,
      phaseDurationSec: 7,
    };
  }, []);

  const startMatchFromLobby = useCallback(
    (state: HostGameState) => {
      if (state.players.length < MIN_PLAYERS) return;
      const roles = assignRoles(
        state.players.map((p) => p.id),
        state.settings
      );
      const dealtPlayers: Player[] = state.players.map((p) => ({
        ...p,
        alive: true,
        role: roles[p.id],
        eliminatedRound: undefined,
        eliminatedBy: undefined,
      }));
      const now = Date.now();
      const nextState: HostGameState = {
        ...state,
        phase: 'reveal',
        round: 1,
        players: dealtPlayers,
        revealReadyIds: [],
        nightActions: {
          mafiaPicks: {},
          doctorSave: null,
          policeCheck: null,
          villagerSuspects: {},
          actedPlayerIds: [],
        },
        lastDoctorSavedId: null,
        morningOutcome: null,
        policeResultsByPlayer: {},
        votes: {},
        voteResult: null,
        winner: null,
        awards: [],
        stats: createEmptyStats(),
        narratorLine: 'Roles have been dealt. Peek at your card privately and hide it.',
        phaseStartedAt: now,
        phaseDurationSec: state.settings.revealTimerSec,
        chatMessages: [],
      };
      syncHostToAll(nextState);
    },
    [syncHostToAll]
  );

  const handleHostInboundAction = useCallback(
    (
      playerId: string,
      action:
        | { type: 'JOIN'; playerId: string; name: string; preferredAvatar?: string }
        | { type: 'REROLL_AVATAR'; playerId: string }
        | { type: 'REVEAL_READY'; playerId: string }
        | { type: 'NIGHT_ACTION'; playerId: string; targetId: string }
        | { type: 'VOTE'; playerId: string; choice: string | 'skip' }
    ) => {
      const current = hostStateRef.current;
      if (!current) return;

      if (action.type === 'JOIN') {
        const existing = current.players.find((p) => p.id === playerId);
        if (existing) {
          const updatedPlayers = current.players.map((p) =>
            p.id === playerId ? { ...p, connected: true, name: action.name || p.name } : p
          );
          syncHostToAll({ ...current, players: updatedPlayers });
          return;
        }

        if (current.phase !== 'lobby') {
          hostServerRef.current?.sendToPlayer(playerId, {
            type: 'ERROR',
            message: 'This game has already started.',
          });
          return;
        }

        if (current.players.length >= MAX_PLAYERS) {
          hostServerRef.current?.sendToPlayer(playerId, {
            type: 'ERROR',
            message: 'Room is full (15/15 players).',
          });
          return;
        }

        const usedAvatars = current.players.map((p) => p.avatar);
        const avatar =
          action.preferredAvatar && !usedAvatars.includes(action.preferredAvatar)
            ? action.preferredAvatar
            : pickUniqueAvatar(usedAvatars);

        const newPlayer: Player = {
          id: playerId,
          name: action.name.slice(0, 20),
          avatar,
          isHost: false,
          connected: true,
          alive: true,
        };

        syncHostToAll({
          ...current,
          players: [...current.players, newPlayer],
        });
        return;
      }

      if (action.type === 'REROLL_AVATAR' && current.phase === 'lobby') {
        const usedByOthers = current.players
          .filter((p) => p.id !== playerId)
          .map((p) => p.avatar);
        const newAvatar = pickUniqueAvatar(usedByOthers);
        const updatedPlayers = current.players.map((p) =>
          p.id === playerId ? { ...p, avatar: newAvatar } : p
        );
        syncHostToAll({ ...current, players: updatedPlayers });
        return;
      }

      if (action.type === 'REVEAL_READY' && current.phase === 'reveal') {
        if (current.revealReadyIds.includes(playerId)) return;
        const nextReady = [...current.revealReadyIds, playerId];
        const aliveIds = current.players.filter((p) => p.alive).map((p) => p.id);
        const allReady = aliveIds.every((id) => nextReady.includes(id));

        if (allReady) {
          syncHostToAll(beginNightPhase({ ...current, revealReadyIds: nextReady }, 1));
        } else {
          syncHostToAll({ ...current, revealReadyIds: nextReady });
        }
        return;
      }

      if (action.type === 'NIGHT_ACTION' && current.phase === 'night') {
        const actor = current.players.find((p) => p.id === playerId);
        if (!actor || !actor.alive) return;
        const aliveIds = current.players.filter((p) => p.alive).map((p) => p.id);
        if (!aliveIds.includes(action.targetId)) return;

        const nextNight = {
          ...current.nightActions,
          mafiaPicks: { ...current.nightActions.mafiaPicks },
          villagerSuspects: { ...current.nightActions.villagerSuspects },
          actedPlayerIds: current.nightActions.actedPlayerIds.includes(playerId)
            ? current.nightActions.actedPlayerIds
            : [...current.nightActions.actedPlayerIds, playerId],
        };

        if (actor.role === 'mafia') {
          if (action.targetId === playerId) return;
          nextNight.mafiaPicks[playerId] = {
            targetId: action.targetId,
            timestamp: Date.now(),
          };
        } else if (actor.role === 'doctor') {
          if (!isValidDoctorSave(action.targetId, current.lastDoctorSavedId, aliveIds)) return;
          nextNight.doctorSave = action.targetId;
        } else if (actor.role === 'police') {
          if (action.targetId === playerId) return;
          nextNight.policeCheck = action.targetId;
        } else {
          if (action.targetId === playerId) return;
          nextNight.villagerSuspects[playerId] = action.targetId;
        }

        const nextState: HostGameState = {
          ...current,
          nightActions: nextNight,
        };

        if (hasEveryoneActedAtNight(nextState.players, nextNight.actedPlayerIds)) {
          syncHostToAll(beginMorningPhase(nextState));
        } else {
          syncHostToAll(nextState);
        }
        return;
      }

      if (action.type === 'VOTE' && current.phase === 'voting') {
        const voter = current.players.find((p) => p.id === playerId);
        if (!voter || !voter.alive) return;

        const nextVotes = {
          ...current.votes,
          [playerId]: action.choice,
        };
        const nextState: HostGameState = {
          ...current,
          votes: nextVotes,
        };

        if (hasEveryoneVoted(nextState.players, nextVotes)) {
          syncHostToAll(beginVoteResultPhase(nextState));
        } else {
          syncHostToAll(nextState);
        }
      }
    },
    [beginMorningPhase, beginNightPhase, beginVoteResultPhase, syncHostToAll]
  );

  // Host / Demo start functions
  const startHostRoom = useCallback(
    (restoreState?: HostGameState) => {
      stopNarrator();
      hostServerRef.current?.destroy();
      clientConnRef.current?.destroy();

      const roomCode = restoreState?.roomCode ?? generateRoomCode();
      const hostId = restoreState?.players.find((p) => p.isHost)?.id ?? selfIdRef.current;
      selfIdRef.current = hostId;

      const initialPlayers: Player[] = restoreState?.players ?? [
        {
          id: hostId,
          name: 'Host',
          avatar: pickUniqueAvatar([]),
          isHost: true,
          connected: true,
          alive: true,
        },
      ];

      const initialHostState: HostGameState = restoreState ?? {
        roomCode,
        isDemo: false,
        phase: 'lobby',
        round: 0,
        settings: DEFAULT_SETTINGS,
        players: initialPlayers,
        revealReadyIds: [],
        nightActions: {
          mafiaPicks: {},
          doctorSave: null,
          policeCheck: null,
          villagerSuspects: {},
          actedPlayerIds: [],
        },
        lastDoctorSavedId: null,
        morningOutcome: null,
        policeResultsByPlayer: {},
        votes: {},
        voteResult: null,
        winner: null,
        awards: [],
        stats: createEmptyStats(),
        narratorLine: 'Waiting for players to join the room.',
        phaseStartedAt: Date.now(),
        phaseDurationSec: 0,
        chatMessages: [],
      };

      const server = new HostPeerServer({
        onMessage: (pid, msg) => handleHostInboundAction(pid, msg),
        onPlayerDisconnect: (pid) => {
          const cur = hostStateRef.current;
          if (!cur) return;
          const updated = cur.players.map((p) =>
            p.id === pid ? { ...p, connected: false } : p
          );
          syncHostToAll({ ...cur, players: updated });
        },
        onReady: () => {
          setErrorMsg(null);
        },
        onError: (err) => {
          setErrorMsg(err);
        },
      });

      hostServerRef.current = server;
      server.start(roomCode);

      const hostPlayer = initialHostState.players.find((p) => p.id === hostId);
      saveSession({
        roomCode,
        playerId: hostId,
        playerName: hostPlayer?.name ?? 'Host',
        avatar: hostPlayer?.avatar ?? '🦊',
        isHost: true,
        savedAt: Date.now(),
      });
      setRoomCodeInUrl(roomCode);
      setMode('host');
      syncHostToAll(initialHostState);
    },
    [handleHostInboundAction, syncHostToAll]
  );

  const startDemoGame = useCallback(() => {
    stopNarrator();
    hostServerRef.current?.destroy();
    clientConnRef.current?.destroy();

    const humanId = selfIdRef.current;
    const demoPlayers: Player[] = [
      {
        id: humanId,
        name: 'You',
        avatar: '🐼',
        isHost: true,
        isBot: false,
        connected: true,
        alive: true,
      },
      ...DEMO_BOT_PROFILES.map((bot, idx) => ({
        id: `bot_${idx + 1}`,
        name: bot.name,
        avatar: bot.avatar,
        isHost: false,
        isBot: true,
        connected: true,
        alive: true,
      })),
    ];

    const demoState: HostGameState = {
      roomCode: 'DEMO',
      isDemo: true,
      phase: 'lobby',
      round: 0,
      settings: {
        ...DEFAULT_SETTINGS,
        revealTimerSec: 25,
        nightTimerSec: 25,
      },
      players: demoPlayers,
      revealReadyIds: [],
      nightActions: {
        mafiaPicks: {},
        doctorSave: null,
        policeCheck: null,
        villagerSuspects: {},
        actedPlayerIds: [],
      },
      lastDoctorSavedId: null,
      morningOutcome: null,
      policeResultsByPlayer: {},
      votes: {},
      voteResult: null,
      winner: null,
      awards: [],
      stats: createEmptyStats(),
      narratorLine: 'Demo room ready.',
      phaseStartedAt: Date.now(),
      phaseDurationSec: 0,
      chatMessages: [],
    };

    setErrorMsg(null);
    setMode('demo');
    startMatchFromLobby(demoState);
  }, [startMatchFromLobby]);

  const connectAsClient = useCallback(
    (params: { roomCode: string; name: string; playerId?: string; preferredAvatar?: string }) => {
      stopNarrator();
      hostServerRef.current?.destroy();
      clientConnRef.current?.destroy();

      const pid = params.playerId ?? selfIdRef.current;
      selfIdRef.current = pid;
      setIsConnecting(true);
      setErrorMsg(null);

      const conn = new ClientPeerConnection({
        onConnected: () => {
          setIsConnecting(false);
          setMode('client');
          setRoomCodeInUrl(params.roomCode);
        },
        onStateSync: (state) => {
          setIsConnecting(false);
          setClientView(state);
          const self = state.players.find((p) => p.id === state.selfId);
          if (self) {
            saveSession({
              roomCode: state.roomCode,
              playerId: state.selfId,
              playerName: self.name,
              avatar: self.avatar,
              isHost: false,
              savedAt: Date.now(),
            });
          }
        },
        onKicked: (reason) => {
          setIsConnecting(false);
          clearSession();
          setClientView(null);
          setMode('home');
          setErrorMsg(reason);
          setRoomCodeInUrl(null);
        },
        onError: (msg) => {
          setIsConnecting(false);
          setErrorMsg(msg);
        },
      });

      clientConnRef.current = conn;
      conn.connect({
        roomCode: params.roomCode,
        playerId: pid,
        name: params.name,
        preferredAvatar: params.preferredAvatar,
      });
    },
    []
  );

  // Initial URL & localStorage session restore + voice pre-warm
  useEffect(() => {
    initNarrator();
    if (isAutostartFromUrl()) {
      startDemoGame();
      return;
    }

    const urlRoom = getRoomCodeFromUrl();
    const saved = loadSession();

    if (saved && (!urlRoom || urlRoom === saved.roomCode)) {
      selfIdRef.current = saved.playerId;
      if (saved.isHost) {
        const restoredHostState = loadHostGameState(saved.roomCode);
        if (restoredHostState) {
          startHostRoom(restoredHostState);
          return;
        }
      } else {
        setJoinRoomPrefill(saved.roomCode);
        setJoinNamePrefill(saved.playerName);
        connectAsClient({
          roomCode: saved.roomCode,
          name: saved.playerName,
          playerId: saved.playerId,
          preferredAvatar: saved.avatar,
        });
        return;
      }
    }

    if (urlRoom) {
      setJoinRoomPrefill(urlRoom);
      setMode('join');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup connections on unmount
  useEffect(() => {
    return () => {
      stopNarrator();
      hostServerRef.current?.destroy();
      clientConnRef.current?.destroy();
    };
  }, []);

  // Sync document.body.dataset.state for testability
  useEffect(() => {
    const phase = clientView?.phase ?? mode;
    if (phase === 'home' || phase === 'join') {
      document.body.dataset.state = 'title';
    } else if (phase === 'gameover') {
      document.body.dataset.state = 'gameover';
    } else {
      document.body.dataset.state = 'playing';
    }
  }, [clientView?.phase, mode]);

  // Phase timer loop (Host/Demo advances phases automatically; all devices render countdown)
  useEffect(() => {
    if (!clientView || clientView.phaseDurationSec <= 0) {
      setSecondsLeft(null);
      return;
    }

    const tick = () => {
      const cur = hostStateRef.current;
      if (cur && (mode === 'host' || mode === 'demo')) {
        if (cur.phaseDurationSec <= 0) {
          setSecondsLeft(null);
          return;
        }
        const authElapsed = Math.floor((Date.now() - cur.phaseStartedAt) / 1000);
        const authRemaining = Math.max(0, cur.phaseDurationSec - authElapsed);
        setSecondsLeft(authRemaining);

        if (authRemaining <= 0) {
          if (cur.phase === 'reveal') {
            syncHostToAll(beginNightPhase(cur, 1));
          } else if (cur.phase === 'night') {
            syncHostToAll(beginMorningPhase(cur));
          } else if (cur.phase === 'morning') {
            syncHostToAll(beginDiscussionPhase(cur));
          } else if (cur.phase === 'discussion') {
            syncHostToAll(beginVotingPhase(cur));
          } else if (cur.phase === 'voting') {
            syncHostToAll(beginVoteResultPhase(cur));
          } else if (cur.phase === 'vote_result') {
            syncHostToAll(beginNightPhase(cur, cur.round + 1));
          }
        }
        return;
      }

      const elapsed = Math.floor((Date.now() - clientView.phaseStartedAt) / 1000);
      const remaining = Math.max(0, clientView.phaseDurationSec - elapsed);
      setSecondsLeft(remaining);
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [
    beginDiscussionPhase,
    beginMorningPhase,
    beginNightPhase,
    beginVoteResultPhase,
    beginVotingPhase,
    clientView,
    mode,
    syncHostToAll,
  ]);

  // Demo Mode Bot Automation (Reveal Ready, Night Moves, Discussion Chatter, Voting)
  useEffect(() => {
    const cur = hostStateRef.current;
    if (!cur || !cur.isDemo || mode !== 'demo') return;

    const timers: number[] = [];

    if (cur.phase === 'reveal') {
      const t = window.setTimeout(() => {
        const latest = hostStateRef.current;
        if (!latest || latest.phase !== 'reveal') return;
        const botIds = latest.players.filter((p) => p.isBot).map((p) => p.id);
        const merged = Array.from(new Set([...latest.revealReadyIds, ...botIds]));
        const aliveIds = latest.players.filter((p) => p.alive).map((p) => p.id);
        if (aliveIds.every((id) => merged.includes(id))) {
          syncHostToAll(beginNightPhase({ ...latest, revealReadyIds: merged }, 1));
        } else {
          syncHostToAll({ ...latest, revealReadyIds: merged });
        }
      }, 650);
      timers.push(t);
    } else if (cur.phase === 'night') {
      const t = window.setTimeout(() => {
        const latest = hostStateRef.current;
        if (!latest || latest.phase !== 'night') return;
        const botActs = generateBotNightActions({
          players: latest.players,
          lastDoctorSavedId: latest.lastDoctorSavedId,
          round: latest.round,
          isDemo: true,
        });
        const mergedActed = Array.from(
          new Set([...latest.nightActions.actedPlayerIds, ...botActs.actedBotIds])
        );
        const nextState: HostGameState = {
          ...latest,
          nightActions: {
            mafiaPicks: { ...latest.nightActions.mafiaPicks, ...botActs.mafiaPicks },
            doctorSave: latest.nightActions.doctorSave ?? botActs.doctorSave,
            policeCheck: latest.nightActions.policeCheck ?? botActs.policeCheck,
            villagerSuspects: {
              ...latest.nightActions.villagerSuspects,
              ...botActs.villagerSuspects,
            },
            actedPlayerIds: mergedActed,
          },
        };
        if (hasEveryoneActedAtNight(nextState.players, mergedActed)) {
          syncHostToAll(beginMorningPhase(nextState));
        } else {
          syncHostToAll(nextState);
        }
      }, 600);
      timers.push(t);
    } else if (cur.phase === 'discussion') {
      const lines = generateBotDiscussionLines(cur.players, cur.morningOutcome);
      lines.forEach((item, idx) => {
        const t = window.setTimeout(() => {
          const latest = hostStateRef.current;
          if (!latest || latest.phase !== 'discussion') return;
          const nextMsg = {
            id: `chat_${latest.round}_${idx}_${item.sender.id}`,
            senderId: item.sender.id,
            senderName: item.sender.name,
            senderAvatar: item.sender.avatar,
            text: item.text,
            timestamp: Date.now(),
          };
          syncHostToAll({
            ...latest,
            chatMessages: [...latest.chatMessages, nextMsg],
          });
        }, 700 + idx * 1100);
        timers.push(t);
      });
    } else if (cur.phase === 'voting') {
      const botVotes = generateBotVotes(cur.players);
      const entries = Object.entries(botVotes);
      entries.forEach(([botId, choice], idx) => {
        const t = window.setTimeout(() => {
          const latest = hostStateRef.current;
          if (!latest || latest.phase !== 'voting') return;
          const mergedVotes = { ...latest.votes, [botId]: choice };
          const nextState: HostGameState = { ...latest, votes: mergedVotes };
          if (hasEveryoneVoted(nextState.players, mergedVotes)) {
            syncHostToAll(beginVoteResultPhase(nextState));
          } else {
            syncHostToAll(nextState);
          }
        }, 1200 + idx * 700);
        timers.push(t);
      });
    }

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [
    beginMorningPhase,
    beginNightPhase,
    beginVoteResultPhase,
    clientView?.phase,
    clientView?.round,
    mode,
    syncHostToAll,
  ]);

  // SpeechSynthesis Narrator & Phase SFX
  useEffect(() => {
    if (!clientView) return;
    const key = `${clientView.phase}_${clientView.round}_${clientView.narratorLine}`;
    if (key === lastSpokenKeyRef.current) return;
    lastSpokenKeyRef.current = key;

    if (clientView.phase === 'night') playSfx('night', muted);
    if (clientView.phase === 'morning') playSfx('morning', muted);
    if (clientView.phase === 'gameover') playSfx('win', muted);

    const isHostDevice = mode === 'host' || mode === 'demo';
    const shouldSpeak =
      clientView.phase !== 'lobby' &&
      (clientView.settings.narratorMode === 'all' ||
        (clientView.settings.narratorMode === 'host' && isHostDevice));

    speakNarratorLine(clientView.narratorLine, {
      shouldSpeak,
      muted,
      phase: clientView.phase,
    });
  }, [clientView, mode, muted]);

  const handleToggleMute = () => {
    setMuted((prev) => {
      const next = !prev;
      saveMutedPreference(next);
      if (next) stopNarrator();
      return next;
    });
  };

  const handleLeaveGame = () => {
    stopNarrator();
    if (hostStateRef.current?.roomCode) {
      clearHostGameState(hostStateRef.current.roomCode);
    }
    hostServerRef.current?.destroy();
    hostServerRef.current = null;
    clientConnRef.current?.destroy();
    clientConnRef.current = null;
    hostStateRef.current = null;
    clearSession();
    setClientView(null);
    setErrorMsg(null);
    setRoomCodeInUrl(null);
    setMode('home');
  };

  // Player actions (works identically for Host, Demo, or P2P Client!)
  const dispatchPlayerAction = (
    action:
      | { type: 'REROLL_AVATAR' }
      | { type: 'REVEAL_READY' }
      | { type: 'NIGHT_ACTION'; targetId: string }
      | { type: 'VOTE'; choice: string | 'skip' }
  ) => {
    playSfx(action.type === 'VOTE' ? 'vote' : 'tap', muted);
    const pid = selfIdRef.current;
    if (mode === 'host' || mode === 'demo') {
      handleHostInboundAction(pid, { ...action, playerId: pid });
    } else {
      clientConnRef.current?.send({ ...action, playerId: pid });
    }
  };

  // Host-only controls
  const handleUpdateSettings = (settings: HostSettings) => {
    const cur = hostStateRef.current;
    if (!cur) return;
    syncHostToAll({ ...cur, settings });
  };

  const handleUpdateHostName = (name: string) => {
    const cur = hostStateRef.current;
    if (!cur) return;
    const updated = cur.players.map((p) =>
      p.id === selfIdRef.current ? { ...p, name: name.slice(0, 20) } : p
    );
    syncHostToAll({ ...cur, players: updated });
    const hostPlayer = updated.find((p) => p.id === selfIdRef.current);
    if (hostPlayer) {
      saveSession({
        roomCode: cur.roomCode,
        playerId: hostPlayer.id,
        playerName: hostPlayer.name,
        avatar: hostPlayer.avatar,
        isHost: true,
        savedAt: Date.now(),
      });
    }
  };

  const handleKickPlayer = (targetId: string) => {
    const cur = hostStateRef.current;
    if (!cur) return;
    hostServerRef.current?.kickPlayer(targetId);
    syncHostToAll({
      ...cur,
      players: cur.players.filter((p) => p.id !== targetId),
    });
  };

  const handlePlayAgain = () => {
    const cur = hostStateRef.current;
    if (!cur) return;
    if (cur.isDemo) {
      startDemoGame();
      return;
    }
    const resetPlayers = cur.players.map((p) => ({
      ...p,
      alive: true,
      role: undefined,
      eliminatedRound: undefined,
      eliminatedBy: undefined,
    }));
    syncHostToAll({
      ...cur,
      phase: 'lobby',
      round: 0,
      players: resetPlayers,
      revealReadyIds: [],
      morningOutcome: null,
      policeResultsByPlayer: {},
      votes: {},
      voteResult: null,
      winner: null,
      awards: [],
      stats: createEmptyStats(),
      narratorLine: 'Back in the lobby. Ready for another round.',
      phaseStartedAt: Date.now(),
      phaseDurationSec: 0,
      chatMessages: [],
    });
  };

  const activePhase = clientView?.phase ?? (mode === 'join' ? 'join' : 'home');
  const isHostOrDemo = mode === 'host' || mode === 'demo';
  const showNarratorBanner =
    clientView !== null &&
    clientView.phase !== 'home' &&
    clientView.phase !== 'join' &&
    clientView.phase !== 'lobby';

  return (
    <PhaseAtmosphere phase={activePhase}>
      {showNarratorBanner && clientView && (
        <NarratorBanner
          phase={clientView.phase}
          round={clientView.round}
          narratorLine={clientView.narratorLine}
          secondsLeft={secondsLeft}
          totalSeconds={clientView.phaseDurationSec}
          muted={muted}
          onToggleMute={handleToggleMute}
          onExit={handleLeaveGame}
          isDemo={clientView.isDemo}
        />
      )}

      {mode === 'home' && (
        <HomeScreen
          onHostGame={() => startHostRoom()}
          onGoJoin={() => {
            setErrorMsg(null);
            setMode('join');
          }}
          onStartDemo={startDemoGame}
          muted={muted}
          onToggleMute={handleToggleMute}
          errorMessage={errorMsg}
        />
      )}

      {mode === 'join' && (
        <JoinScreen
          initialRoomCode={joinRoomPrefill}
          initialName={joinNamePrefill}
          isConnecting={isConnecting}
          errorMessage={errorMsg}
          onJoin={({ roomCode, name }) => connectAsClient({ roomCode, name })}
          onBack={() => {
            setErrorMsg(null);
            setRoomCodeInUrl(null);
            setMode('home');
          }}
        />
      )}

      {clientView && clientView.phase === 'lobby' && (
        <LobbyScreen
          view={clientView}
          isHost={mode === 'host'}
          muted={muted}
          onToggleMute={handleToggleMute}
          onRerollAvatar={() => dispatchPlayerAction({ type: 'REROLL_AVATAR' })}
          onUpdateHostName={handleUpdateHostName}
          onUpdateSettings={handleUpdateSettings}
          onKickPlayer={handleKickPlayer}
          onStartGame={() => {
            if (hostStateRef.current) startMatchFromLobby(hostStateRef.current);
          }}
          onLeave={handleLeaveGame}
        />
      )}

      {clientView && clientView.phase === 'reveal' && (
        <RevealPhase
          view={clientView}
          muted={muted}
          onReady={() => dispatchPlayerAction({ type: 'REVEAL_READY' })}
        />
      )}

      {clientView && clientView.phase === 'night' && (
        <NightPhase
          view={clientView}
          onSelectTarget={(targetId) =>
            dispatchPlayerAction({ type: 'NIGHT_ACTION', targetId })
          }
        />
      )}

      {clientView && clientView.phase === 'morning' && (
        <MorningPhase
          view={clientView}
          isHostOrDemo={isHostOrDemo}
          onContinueToDiscussion={() => {
            if (hostStateRef.current) {
              syncHostToAll(beginDiscussionPhase(hostStateRef.current));
            }
          }}
        />
      )}

      {clientView && clientView.phase === 'discussion' && (
        <DiscussionPhase
          view={clientView}
          secondsLeft={secondsLeft ?? clientView.phaseDurationSec}
          isHostOrDemo={isHostOrDemo}
          onSkipToVoting={() => {
            if (hostStateRef.current) {
              syncHostToAll(beginVotingPhase(hostStateRef.current));
            }
          }}
        />
      )}

      {clientView && (clientView.phase === 'voting' || clientView.phase === 'vote_result') && (
        <VotingPhase
          view={clientView}
          isHostOrDemo={isHostOrDemo}
          onVote={(choice) => dispatchPlayerAction({ type: 'VOTE', choice })}
          onNextNight={() => {
            if (hostStateRef.current) {
              syncHostToAll(
                beginNightPhase(hostStateRef.current, hostStateRef.current.round + 1)
              );
            }
          }}
        />
      )}

      {clientView && clientView.phase === 'gameover' && (
        <GameOverScreen
          view={clientView}
          isHostOrDemo={isHostOrDemo}
          onPlayAgain={handlePlayAgain}
        />
      )}
    </PhaseAtmosphere>
  );
}
