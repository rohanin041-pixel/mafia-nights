import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assignRoles,
  checkWinCondition,
  computeAwards,
  createEmptyStats,
  getAutoMafiaCount,
  isValidDoctorSave,
  resolveMafiaTarget,
  resolveNightPhase,
  resolveVotes,
  sanitizeStateForPlayer,
} from './rules';
import { DEFAULT_SETTINGS } from './constants';
import { HostGameState, Player } from './types';

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    name: `Player ${i + 1}`,
    avatar: '🦊',
    isHost: i === 0,
    connected: true,
    alive: true,
  }));
}

test('getAutoMafiaCount scales correctly for 5-7, 8-11, and 12+ players', () => {
  assert.equal(getAutoMafiaCount(5), 1);
  assert.equal(getAutoMafiaCount(7), 1);
  assert.equal(getAutoMafiaCount(8), 2);
  assert.equal(getAutoMafiaCount(11), 2);
  assert.equal(getAutoMafiaCount(12), 3);
  assert.equal(getAutoMafiaCount(15), 3);
});

test('assignRoles assigns exact auto mafia, doctor, police, and villager counts', () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const roles = assignRoles(ids, DEFAULT_SETTINGS, () => 0.42);
  const counts = Object.values(roles).reduce<Record<string, number>>((acc, r) => {
    acc[r] = (acc[r] ?? 0) + 1;
    return acc;
  }, {});
  assert.equal(counts.mafia, 2);
  assert.equal(counts.doctor, 1);
  assert.equal(counts.police, 1);
  assert.equal(counts.villager, 4);
});

test('resolveMafiaTarget picks majority, and latest pick wins ties', () => {
  const alive = ['p1', 'p2', 'p3', 'p4', 'p5'];
  const target = resolveMafiaTarget(
    {
      p1: { targetId: 'p3', timestamp: 100 },
      p2: { targetId: 'p4', timestamp: 250 },
    },
    alive
  );
  assert.equal(target, 'p4');

  const majority = resolveMafiaTarget(
    {
      p1: { targetId: 'p3', timestamp: 100 },
      p2: { targetId: 'p3', timestamp: 150 },
      p5: { targetId: 'p4', timestamp: 300 },
    },
    alive
  );
  assert.equal(majority, 'p3');
});

test('isValidDoctorSave allows self-save and blocks consecutive same target', () => {
  const alive = ['p1', 'p2', 'p3'];
  assert.equal(isValidDoctorSave('p1', null, alive), true);
  assert.equal(isValidDoctorSave('p1', 'p1', alive), false);
  assert.equal(isValidDoctorSave('p2', 'p1', alive), true);
  assert.equal(isValidDoctorSave('p9', 'p1', alive), false);
});

test('resolveNightPhase handles Doctor save and Police private check', () => {
  const players: Player[] = [
    { id: 'p1', name: 'A', avatar: '🦊', isHost: true, connected: true, alive: true, role: 'mafia' },
    { id: 'p2', name: 'B', avatar: '🐼', isHost: false, connected: true, alive: true, role: 'doctor' },
    { id: 'p3', name: 'C', avatar: '👽', isHost: false, connected: true, alive: true, role: 'police' },
    { id: 'p4', name: 'D', avatar: '🤖', isHost: false, connected: true, alive: true, role: 'villager' },
    { id: 'p5', name: 'E', avatar: '🦄', isHost: false, connected: true, alive: true, role: 'villager' },
  ];

  const savedNight = resolveNightPhase({
    round: 1,
    players,
    mafiaPicks: { p1: { targetId: 'p4', timestamp: 100 } },
    doctorSave: 'p4',
    lastDoctorSavedId: null,
    policeCheck: 'p1',
    villagerSuspects: { p4: 'p5', p5: 'p4' },
    stats: createEmptyStats(),
    rng: () => 0,
  });

  assert.equal(savedNight.outcome.wasSaved, true);
  assert.equal(savedNight.outcome.killedPlayerId, null);
  assert.equal(savedNight.updatedPlayers.find((p) => p.id === 'p4')?.alive, true);
  assert.equal(savedNight.policeResultsByPlayer.p3?.isMafia, true);
  assert.equal(savedNight.updatedStats.savesCount.p2, 1);
  assert.equal(savedNight.updatedStats.policeCorrectChecks.p3, 1);
  assert.equal(savedNight.nextLastDoctorSavedId, 'p4');

  const killNight = resolveNightPhase({
    round: 2,
    players,
    mafiaPicks: { p1: { targetId: 'p4', timestamp: 100 } },
    // Doctor tries to save p4 again — invalid, so kill succeeds
    doctorSave: 'p4',
    lastDoctorSavedId: 'p4',
    policeCheck: 'p5',
    villagerSuspects: {},
    stats: savedNight.updatedStats,
    rng: () => 0,
  });

  assert.equal(killNight.outcome.wasSaved, false);
  assert.equal(killNight.outcome.killedPlayerId, 'p4');
  assert.equal(killNight.updatedPlayers.find((p) => p.id === 'p4')?.alive, false);
  assert.equal(killNight.policeResultsByPlayer.p3?.isMafia, false);
});

test('resolveVotes handles elimination, ties, and skip majority', () => {
  const players = makePlayers(5);
  const stats = createEmptyStats();

  const elim = resolveVotes(
    { p1: 'p3', p2: 'p3', p3: 'p1', p4: 'p3', p5: 'skip' },
    players,
    1,
    stats
  );
  assert.equal(elim.result.eliminatedId, 'p3');
  assert.equal(elim.result.isTie, false);
  assert.equal(elim.result.skipMajority, false);

  const tie = resolveVotes(
    { p1: 'p3', p2: 'p3', p3: 'p1', p4: 'p1', p5: 'skip' },
    players,
    1,
    stats
  );
  assert.equal(tie.result.eliminatedId, null);
  assert.equal(tie.result.isTie, true);

  const skipMaj = resolveVotes(
    { p1: 'skip', p2: 'skip', p3: 'skip', p4: 'p1', p5: 'p2' },
    players,
    1,
    stats
  );
  assert.equal(skipMaj.result.eliminatedId, null);
  assert.equal(skipMaj.result.skipMajority, true);
});

test('checkWinCondition detects village and mafia victories', () => {
  const villageWins = makePlayers(5).map((p, i) => ({
    ...p,
    role: (i === 0 ? 'mafia' : 'villager') as Player['role'],
    alive: i !== 0,
  }));
  assert.equal(checkWinCondition(villageWins), 'village');

  const mafiaWins = makePlayers(4).map((p, i) => ({
    ...p,
    role: (i < 2 ? 'mafia' : 'villager') as Player['role'],
    alive: true,
  }));
  assert.equal(checkWinCondition(mafiaWins), 'mafia');

  const ongoing = makePlayers(5).map((p, i) => ({
    ...p,
    role: (i === 0 ? 'mafia' : 'villager') as Player['role'],
    alive: true,
  }));
  assert.equal(checkWinCondition(ongoing), null);
});

test('sanitizeStateForPlayer hides other roles from non-mafia during active game', () => {
  const players: Player[] = [
    { id: 'p1', name: 'Mafioso', avatar: '🦊', isHost: true, connected: true, alive: true, role: 'mafia' },
    { id: 'p2', name: 'Doc', avatar: '🐼', isHost: false, connected: true, alive: true, role: 'doctor' },
    { id: 'p3', name: 'Cop', avatar: '👽', isHost: false, connected: true, alive: true, role: 'police' },
    { id: 'p4', name: 'Townie', avatar: '🤖', isHost: false, connected: true, alive: true, role: 'villager' },
    { id: 'p5', name: 'Partner', avatar: '🦄', isHost: false, connected: true, alive: true, role: 'mafia' },
  ];

  const hostState: HostGameState = {
    roomCode: 'ABCD',
    isDemo: false,
    phase: 'night',
    round: 1,
    settings: DEFAULT_SETTINGS,
    players,
    revealReadyIds: [],
    nightActions: {
      mafiaPicks: { p1: { targetId: 'p4', timestamp: 123 } },
      doctorSave: 'p2',
      policeCheck: 'p1',
      villagerSuspects: {},
      actedPlayerIds: ['p1'],
    },
    lastDoctorSavedId: null,
    morningOutcome: null,
    policeResultsByPlayer: {
      p3: { round: 1, targetId: 'p1', targetName: 'Mafioso', isMafia: true },
    },
    votes: {},
    voteResult: null,
    winner: null,
    awards: [],
    stats: createEmptyStats(),
    narratorLine: 'Close your eyes.',
    phaseStartedAt: 1000,
    phaseDurationSec: 15,
    chatMessages: [],
  };

  const townView = sanitizeStateForPlayer(hostState, 'p4');
  assert.equal(townView.selfRole, 'villager');
  assert.equal(townView.mafiaPartners.length, 0);
  assert.deepEqual(townView.mafiaTeamPicks, {});
  assert.equal(townView.myPoliceResult, null);
  assert.equal(townView.players.every((p) => p.revealedRole === undefined), true);

  const mafiaView = sanitizeStateForPlayer(hostState, 'p5');
  assert.equal(mafiaView.mafiaPartners.length, 1);
  assert.equal(mafiaView.mafiaPartners[0].id, 'p1');
  assert.equal(mafiaView.mafiaTeamPicks.p1.targetId, 'p4');

  const awards = computeAwards(players, hostState.stats);
  assert.equal(awards.length, 4);
});
