import {
  AVATAR_POOL,
  FUNNY_DEATH_LINES,
  FUNNY_SAVE_LINES,
  NO_KILL_LINES,
} from './constants';
import {
  Award,
  ClientViewState,
  GameStats,
  HostGameState,
  HostSettings,
  MafiaPick,
  MorningOutcome,
  Player,
  PoliceResult,
  Role,
  VoteResult,
} from './types';

export function getAutoMafiaCount(playerCount: number): number {
  if (playerCount <= 7) return 1;
  if (playerCount <= 11) return 2;
  return 3;
}

export function getEffectiveMafiaCount(playerCount: number, settings: HostSettings): number {
  const auto = getAutoMafiaCount(playerCount);
  if (settings.mafiaMode === 'auto') {
    return auto;
  }
  const maxSafe = Math.max(1, Math.floor((playerCount - 1) / 2));
  return Math.min(Math.max(1, settings.manualMafiaCount), maxSafe);
}

export function pickUniqueAvatar(usedAvatars: string[], rng: () => number = Math.random): string {
  const used = new Set(usedAvatars);
  const available = AVATAR_POOL.filter((a) => !used.has(a));
  if (available.length > 0) {
    return available[Math.floor(rng() * available.length)];
  }
  return AVATAR_POOL[Math.floor(rng() * AVATAR_POOL.length)];
}

export function shuffleArray<T>(items: T[], rng: () => number = Math.random): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function assignRoles(
  playerIds: string[],
  settings: HostSettings,
  rng: () => number = Math.random
): Record<string, Role> {
  const shuffled = shuffleArray(playerIds, rng);
  const mafiaCount = getEffectiveMafiaCount(playerIds.length, settings);
  const roles: Record<string, Role> = {};

  let idx = 0;
  for (let i = 0; i < mafiaCount && idx < shuffled.length; i++) {
    roles[shuffled[idx++]] = 'mafia';
  }
  if (settings.doctorEnabled && idx < shuffled.length) {
    roles[shuffled[idx++]] = 'doctor';
  }
  if (settings.policeEnabled && idx < shuffled.length) {
    roles[shuffled[idx++]] = 'police';
  }
  while (idx < shuffled.length) {
    roles[shuffled[idx++]] = 'villager';
  }

  return roles;
}

/**
 * Most picks wins; if there is a tie among top targets, the latest pick wins.
 */
export function resolveMafiaTarget(
  picks: Record<string, MafiaPick>,
  aliveIds: string[]
): string | null {
  const aliveSet = new Set(aliveIds);
  const counts: Record<string, { count: number; latestTimestamp: number }> = {};

  for (const pick of Object.values(picks)) {
    if (!aliveSet.has(pick.targetId)) continue;
    if (!counts[pick.targetId]) {
      counts[pick.targetId] = { count: 0, latestTimestamp: 0 };
    }
    counts[pick.targetId].count += 1;
    if (pick.timestamp >= counts[pick.targetId].latestTimestamp) {
      counts[pick.targetId].latestTimestamp = pick.timestamp;
    }
  }

  let bestTarget: string | null = null;
  let bestCount = 0;
  let bestTimestamp = -1;

  for (const [targetId, info] of Object.entries(counts)) {
    if (
      info.count > bestCount ||
      (info.count === bestCount && info.latestTimestamp > bestTimestamp)
    ) {
      bestTarget = targetId;
      bestCount = info.count;
      bestTimestamp = info.latestTimestamp;
    }
  }

  return bestTarget;
}

export function isValidDoctorSave(
  targetId: string,
  lastSavedId: string | null,
  aliveIds: string[]
): boolean {
  if (!aliveIds.includes(targetId)) return false;
  if (lastSavedId !== null && targetId === lastSavedId) return false;
  return true;
}

export function createEmptyStats(): GameStats {
  return {
    savesCount: {},
    policeCorrectChecks: {},
    timesAccused: {},
    mafiaSurvivingRounds: {},
  };
}

export function resolveNightPhase(params: {
  round: number;
  players: Player[];
  mafiaPicks: Record<string, MafiaPick>;
  doctorSave: string | null;
  lastDoctorSavedId: string | null;
  policeCheck: string | null;
  villagerSuspects: Record<string, string>;
  stats: GameStats;
  rng?: () => number;
}): {
  updatedPlayers: Player[];
  outcome: MorningOutcome;
  policeResultsByPlayer: Record<string, PoliceResult>;
  nextLastDoctorSavedId: string | null;
  updatedStats: GameStats;
} {
  const rng = params.rng ?? Math.random;
  const alivePlayers = params.players.filter((p) => p.alive);
  const aliveIds = alivePlayers.map((p) => p.id);

  // Clone stats deeply enough for pure updates
  const updatedStats: GameStats = {
    savesCount: { ...params.stats.savesCount },
    policeCorrectChecks: { ...params.stats.policeCorrectChecks },
    timesAccused: { ...params.stats.timesAccused },
    mafiaSurvivingRounds: { ...params.stats.mafiaSurvivingRounds },
  };

  // Track villager decoy suspicions for "Wrongly accused" flavor
  for (const targetId of Object.values(params.villagerSuspects)) {
    if (aliveIds.includes(targetId)) {
      updatedStats.timesAccused[targetId] = (updatedStats.timesAccused[targetId] ?? 0) + 1;
    }
  }

  // Mafia target resolution
  const mafiaTargetId = resolveMafiaTarget(params.mafiaPicks, aliveIds);

  // Validate doctor save
  const doctorPlayer = alivePlayers.find((p) => p.role === 'doctor');
  const validSaveId =
    doctorPlayer &&
    params.doctorSave &&
    isValidDoctorSave(params.doctorSave, params.lastDoctorSavedId, aliveIds)
      ? params.doctorSave
      : null;

  let killedPlayerId: string | null = null;
  let wasSaved = false;

  if (mafiaTargetId) {
    if (validSaveId && validSaveId === mafiaTargetId) {
      wasSaved = true;
      if (doctorPlayer) {
        updatedStats.savesCount[doctorPlayer.id] =
          (updatedStats.savesCount[doctorPlayer.id] ?? 0) + 1;
      }
    } else {
      killedPlayerId = mafiaTargetId;
    }
  }

  const updatedPlayers = params.players.map((p) => {
    if (p.id === killedPlayerId) {
      return {
        ...p,
        alive: false,
        eliminatedRound: params.round,
        eliminatedBy: 'mafia' as const,
      };
    }
    return p;
  });

  // Track surviving mafia rounds
  for (const p of updatedPlayers) {
    if (p.alive && p.role === 'mafia') {
      updatedStats.mafiaSurvivingRounds[p.id] =
        (updatedStats.mafiaSurvivingRounds[p.id] ?? 0) + 1;
    }
  }

  // Police check
  const policeResultsByPlayer: Record<string, PoliceResult> = {};
  const policePlayer = alivePlayers.find((p) => p.role === 'police');
  if (policePlayer && params.policeCheck) {
    const checkedTarget = params.players.find((p) => p.id === params.policeCheck);
    if (checkedTarget) {
      const isMafia = checkedTarget.role === 'mafia';
      policeResultsByPlayer[policePlayer.id] = {
        round: params.round,
        targetId: checkedTarget.id,
        targetName: checkedTarget.name,
        isMafia,
      };
      if (isMafia) {
        updatedStats.policeCorrectChecks[policePlayer.id] =
          (updatedStats.policeCorrectChecks[policePlayer.id] ?? 0) + 1;
      }
    }
  }

  const killedPlayer = killedPlayerId
    ? params.players.find((p) => p.id === killedPlayerId) ?? null
    : null;

  let headline: string;
  if (killedPlayer) {
    const template = FUNNY_DEATH_LINES[Math.floor(rng() * FUNNY_DEATH_LINES.length)];
    headline = template.replace('{NAME}', killedPlayer.name);
    if (killedPlayer.name.trim().toLowerCase() === 'you') {
      headline = headline.replace(/\bYou was\b/g, 'You were');
    }
  } else if (wasSaved) {
    headline = FUNNY_SAVE_LINES[Math.floor(rng() * FUNNY_SAVE_LINES.length)];
  } else {
    headline = NO_KILL_LINES[Math.floor(rng() * NO_KILL_LINES.length)];
  }

  return {
    updatedPlayers,
    outcome: {
      round: params.round,
      killedPlayerId,
      killedPlayerName: killedPlayer?.name ?? null,
      killedPlayerRole: killedPlayer?.role ?? null,
      wasSaved,
      headline,
    },
    policeResultsByPlayer,
    nextLastDoctorSavedId: validSaveId,
    updatedStats,
  };
}

export function resolveVotes(
  votes: Record<string, string | 'skip'>,
  alivePlayers: Player[],
  round: number,
  stats: GameStats
): {
  result: VoteResult;
  updatedPlayers: Player[];
  updatedStats: GameStats;
} {
  const aliveIds = new Set(alivePlayers.map((p) => p.id));
  const tally: Record<string, number> = {};
  let skipCount = 0;

  const updatedStats: GameStats = {
    savesCount: { ...stats.savesCount },
    policeCorrectChecks: { ...stats.policeCorrectChecks },
    timesAccused: { ...stats.timesAccused },
    mafiaSurvivingRounds: { ...stats.mafiaSurvivingRounds },
  };

  let castVotesCount = 0;
  for (const [voterId, choice] of Object.entries(votes)) {
    if (!aliveIds.has(voterId)) continue;
    castVotesCount += 1;
    if (choice === 'skip') {
      skipCount += 1;
    } else if (aliveIds.has(choice)) {
      tally[choice] = (tally[choice] ?? 0) + 1;
      updatedStats.timesAccused[choice] = (updatedStats.timesAccused[choice] ?? 0) + 1;
    }
  }

  const sortedTargets = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const topCount = sortedTargets.length > 0 ? sortedTargets[0][1] : 0;
  const tiedTop = sortedTargets.filter(([, c]) => c === topCount && c > 0);
  const skipMajority =
    castVotesCount === 0 ||
    skipCount > castVotesCount / 2 ||
    skipCount >= topCount;
  const isTie = !skipMajority && tiedTop.length > 1;

  let eliminatedId: string | null = null;
  if (!isTie && !skipMajority && sortedTargets.length > 0 && topCount > 0) {
    eliminatedId = sortedTargets[0][0];
  }

  const eliminatedPlayer = eliminatedId
    ? alivePlayers.find((p) => p.id === eliminatedId) ?? null
    : null;

  const updatedPlayers = alivePlayers.map((p) => {
    if (p.id === eliminatedId) {
      return {
        ...p,
        alive: false,
        eliminatedRound: round,
        eliminatedBy: 'vote' as const,
      };
    }
    return p;
  });

  let headline: string;
  if (eliminatedPlayer) {
    headline = `The room has spoken. ${eliminatedPlayer.name} is out!`;
  } else if (isTie) {
    headline = 'Deadlocked tie! Nobody was voted out this round.';
  } else {
    headline = 'The room chose to hold fire. Nobody goes out.';
  }

  return {
    result: {
      round,
      eliminatedId,
      eliminatedName: eliminatedPlayer?.name ?? null,
      eliminatedRole: eliminatedPlayer?.role ?? null,
      isTie,
      skipMajority: !isTie && skipMajority,
      tally,
      skipCount,
      headline,
    },
    updatedPlayers,
    updatedStats,
  };
}

export function checkWinCondition(players: Player[]): 'village' | 'mafia' | null {
  const alive = players.filter((p) => p.alive);
  const aliveMafia = alive.filter((p) => p.role === 'mafia').length;
  const aliveVillageTeam = alive.length - aliveMafia;

  if (aliveMafia === 0) return 'village';
  if (aliveMafia >= aliveVillageTeam) return 'mafia';
  return null;
}

export function computeAwards(players: Player[], stats: GameStats): Award[] {
  const awards: Award[] = [];

  // 1. Sherlock (Police with most Mafia catches, or Police player)
  const policePlayers = players.filter((p) => p.role === 'police');
  if (policePlayers.length > 0) {
    const bestPolice = [...policePlayers].sort(
      (a, b) => (stats.policeCorrectChecks[b.id] ?? 0) - (stats.policeCorrectChecks[a.id] ?? 0)
    )[0];
    const catches = stats.policeCorrectChecks[bestPolice.id] ?? 0;
    awards.push({
      id: 'sherlock',
      title: 'Sherlock',
      winnerName: bestPolice.name,
      winnerAvatar: bestPolice.avatar,
      reason:
        catches > 0
          ? `Pinned ${catches} Mafia suspect${catches > 1 ? 's' : ''} in the dark`
          : 'Searched the shadows every night',
    });
  }

  // 2. Life saver (Doctor with most saves)
  const doctorPlayers = players.filter((p) => p.role === 'doctor');
  if (doctorPlayers.length > 0) {
    const bestDoc = [...doctorPlayers].sort(
      (a, b) => (stats.savesCount[b.id] ?? 0) - (stats.savesCount[a.id] ?? 0)
    )[0];
    const saves = stats.savesCount[bestDoc.id] ?? 0;
    awards.push({
      id: 'lifesaver',
      title: 'Life Saver',
      winnerName: bestDoc.name,
      winnerAvatar: bestDoc.avatar,
      reason:
        saves > 0
          ? `Pulled off ${saves} clutch save${saves > 1 ? 's' : ''} before dawn`
          : 'Kept the medical kit ready all night',
    });
  }

  // 3. Wrongly accused (Non-mafia with most accusations/votes)
  const innocents = players.filter((p) => p.role !== 'mafia');
  if (innocents.length > 0) {
    const mostAccused = [...innocents].sort(
      (a, b) => (stats.timesAccused[b.id] ?? 0) - (stats.timesAccused[a.id] ?? 0)
    )[0];
    const count = stats.timesAccused[mostAccused.id] ?? 0;
    awards.push({
      id: 'wrongly_accused',
      title: 'Wrongly Accused',
      winnerName: mostAccused.name,
      winnerAvatar: mostAccused.avatar,
      reason:
        count > 0
          ? `Caught ${count} stray accusation${count > 1 ? 's' : ''} while completely innocent`
          : 'Somehow stayed under everyone’s radar',
    });
  }

  // 4. Sneakiest Mafia (Mafia who survived longest / avoided votes)
  const mafias = players.filter((p) => p.role === 'mafia');
  if (mafias.length > 0) {
    const sneakiest = [...mafias].sort((a, b) => {
      if (a.alive !== b.alive) return a.alive ? -1 : 1;
      const roundsDiff =
        (stats.mafiaSurvivingRounds[b.id] ?? 0) - (stats.mafiaSurvivingRounds[a.id] ?? 0);
      if (roundsDiff !== 0) return roundsDiff;
      return (stats.timesAccused[a.id] ?? 0) - (stats.timesAccused[b.id] ?? 0);
    })[0];
    awards.push({
      id: 'sneakiest_mafia',
      title: 'Sneakiest Mafia',
      winnerName: sneakiest.name,
      winnerAvatar: sneakiest.avatar,
      reason: sneakiest.alive
        ? 'Walked out clean without getting caught'
        : `Blended in for ${stats.mafiaSurvivingRounds[sneakiest.id] ?? 1} night(s)`,
    });
  }

  return awards;
}

export function sanitizeStateForPlayer(state: HostGameState, playerId: string): ClientViewState {
  const self = state.players.find((p) => p.id === playerId);
  const selfRole = self?.role ?? null;
  const isGameOver = state.phase === 'gameover';
  const isMafia = selfRole === 'mafia';
  const isDoctor = selfRole === 'doctor';
  const isPolice = selfRole === 'police';

  const mafiaPartners = isMafia
    ? state.players
        .filter((p) => p.role === 'mafia' && p.id !== playerId)
        .map((p) => ({ id: p.id, name: p.name, avatar: p.avatar }))
    : [];

  let myNightTargetId: string | null = null;
  if (isMafia) {
    myNightTargetId = state.nightActions.mafiaPicks[playerId]?.targetId ?? null;
  } else if (isDoctor) {
    myNightTargetId = state.nightActions.doctorSave;
  } else if (isPolice) {
    myNightTargetId = state.nightActions.policeCheck;
  } else {
    myNightTargetId = state.nightActions.villagerSuspects[playerId] ?? null;
  }

  return {
    roomCode: state.roomCode,
    isDemo: state.isDemo,
    phase: state.phase,
    round: state.round,
    settings: state.settings,
    selfId: playerId,
    selfRole,
    mafiaPartners,
    mafiaTeamPicks: isMafia ? state.nightActions.mafiaPicks : {},
    lastDoctorSavedId: isDoctor ? state.lastDoctorSavedId : null,
    myNightTargetId,
    nightActedIds: state.nightActions.actedPlayerIds,
    revealReadyIds: state.revealReadyIds,
    morningOutcome: state.morningOutcome,
    myPoliceResult: isPolice ? state.policeResultsByPlayer[playerId] ?? null : null,
    myVote: state.votes[playerId] ?? null,
    votedPlayerIds: Object.keys(state.votes),
    voteResult: state.voteResult,
    winner: state.winner,
    awards: state.awards,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      isBot: p.isBot,
      connected: p.connected,
      alive: p.alive,
      revealedRole: isGameOver || !p.alive ? p.role : undefined,
    })),
    narratorLine: state.narratorLine,
    phaseStartedAt: state.phaseStartedAt,
    phaseDurationSec: state.phaseDurationSec,
    chatMessages: state.chatMessages,
  };
}

export function hasEveryoneActedAtNight(players: Player[], actedPlayerIds: string[]): boolean {
  const aliveIds = players.filter((p) => p.alive).map((p) => p.id);
  const actedSet = new Set(actedPlayerIds);
  return aliveIds.length > 0 && aliveIds.every((id) => actedSet.has(id));
}

export function hasEveryoneVoted(players: Player[], votes: Record<string, string | 'skip'>): boolean {
  const aliveIds = players.filter((p) => p.alive).map((p) => p.id);
  return aliveIds.length > 0 && aliveIds.every((id) => votes[id] !== undefined);
}

export function generateBotNightActions(params: {
  players: Player[];
  lastDoctorSavedId: string | null;
  round?: number;
  isDemo?: boolean;
  rng?: () => number;
}): {
  mafiaPicks: Record<string, MafiaPick>;
  doctorSave: string | null;
  policeCheck: string | null;
  villagerSuspects: Record<string, string>;
  actedBotIds: string[];
} {
  const rng = params.rng ?? Math.random;
  const alive = params.players.filter((p) => p.alive);
  const aliveIds = alive.map((p) => p.id);
  const bots = alive.filter((p) => p.isBot);

  const mafiaPicks: Record<string, MafiaPick> = {};
  let doctorSave: string | null = null;
  let policeCheck: string | null = null;
  const villagerSuspects: Record<string, string> = {};
  const actedBotIds: string[] = [];

  for (const bot of bots) {
    actedBotIds.push(bot.id);
    if (bot.role === 'mafia') {
      const nonMafia = alive.filter((p) => p.role !== 'mafia');
      const round1DemoBots =
        params.isDemo && params.round === 1
          ? nonMafia.filter((p) => p.isBot)
          : nonMafia;
      const pool =
        round1DemoBots.length > 0
          ? round1DemoBots
          : nonMafia.length > 0
          ? nonMafia
          : alive.filter((p) => p.id !== bot.id);
      if (pool.length > 0) {
        const target = pool[Math.floor(rng() * pool.length)];
        mafiaPicks[bot.id] = { targetId: target.id, timestamp: Date.now() + Math.floor(rng() * 50) };
      }
    } else if (bot.role === 'doctor') {
      const validTargets = aliveIds.filter((id) => id !== params.lastDoctorSavedId);
      if (validTargets.length > 0) {
        doctorSave = validTargets[Math.floor(rng() * validTargets.length)];
      }
    } else if (bot.role === 'police') {
      const others = alive.filter((p) => p.id !== bot.id);
      if (others.length > 0) {
        policeCheck = others[Math.floor(rng() * others.length)].id;
      }
    } else {
      const others = alive.filter((p) => p.id !== bot.id);
      if (others.length > 0) {
        villagerSuspects[bot.id] = others[Math.floor(rng() * others.length)].id;
      }
    }
  }

  return { mafiaPicks, doctorSave, policeCheck, villagerSuspects, actedBotIds };
}

export function generateBotVotes(
  players: Player[],
  rng: () => number = Math.random
): Record<string, string | 'skip'> {
  const alive = players.filter((p) => p.alive);
  const bots = alive.filter((p) => p.isBot);
  const votes: Record<string, string | 'skip'> = {};

  for (const bot of bots) {
    if (rng() < 0.2) {
      votes[bot.id] = 'skip';
      continue;
    }
    const candidates = alive.filter((p) => {
      if (p.id === bot.id) return false;
      if (bot.role === 'mafia' && p.role === 'mafia') return false;
      return true;
    });
    if (candidates.length > 0) {
      votes[bot.id] = candidates[Math.floor(rng() * candidates.length)].id;
    } else {
      votes[bot.id] = 'skip';
    }
  }

  return votes;
}

export function generateBotDiscussionLines(
  players: Player[],
  morningOutcome: MorningOutcome | null,
  rng: () => number = Math.random
): { sender: Player; text: string }[] {
  const aliveBots = players.filter((p) => p.alive && p.isBot);
  const aliveAll = players.filter((p) => p.alive);
  if (aliveBots.length === 0 || aliveAll.length < 2) return [];

  const templates = [
    '{TARGET} was way too quiet last night 👀',
    'Honestly, {TARGET} is smiling like someone with an alibi.',
    'Wait — why did {TARGET} glance at the ceiling when the sun came up?',
    'Not saying it is {TARGET}, but {TARGET} definitely looks guilty.',
    'Trust me, keep your eyes on {TARGET} this vote.',
  ];

  const lines: { sender: Player; text: string }[] = [];
  const shuffledBots = shuffleArray(aliveBots, rng).slice(0, Math.min(3, aliveBots.length));

  for (const bot of shuffledBots) {
    const targets = aliveAll.filter((p) => p.id !== bot.id);
    const target = targets[Math.floor(rng() * targets.length)];
    let text = templates[Math.floor(rng() * templates.length)].replace(/\{TARGET\}/g, target.name);
    if (morningOutcome?.wasSaved && rng() < 0.35) {
      text = `Huge save by the Doctor! Still watching ${target.name} closely though.`;
    }
    lines.push({ sender: bot, text });
  }

  return lines;
}
