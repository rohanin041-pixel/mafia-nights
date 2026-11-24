export type Role = 'mafia' | 'doctor' | 'police' | 'villager';

export type Phase =
  | 'home'
  | 'join'
  | 'lobby'
  | 'reveal'
  | 'night'
  | 'morning'
  | 'discussion'
  | 'voting'
  | 'vote_result'
  | 'gameover';

export type NarratorMode = 'host' | 'all' | 'off';

export interface HostSettings {
  mafiaMode: 'auto' | 'manual';
  manualMafiaCount: number;
  doctorEnabled: boolean;
  policeEnabled: boolean;
  revealTimerSec: number;
  nightTimerSec: number;
  discussionTimerSec: number;
  votingTimerSec: number;
  narratorMode: NarratorMode;
}

export interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isBot?: boolean;
  connected: boolean;
  alive: boolean;
  role?: Role;
  eliminatedRound?: number;
  eliminatedBy?: 'mafia' | 'vote';
}

export interface MafiaPick {
  targetId: string;
  timestamp: number;
}

export interface NightActions {
  mafiaPicks: Record<string, MafiaPick>;
  doctorSave: string | null;
  policeCheck: string | null;
  villagerSuspects: Record<string, string>;
  actedPlayerIds: string[];
}

export interface MorningOutcome {
  round: number;
  killedPlayerId: string | null;
  killedPlayerName: string | null;
  killedPlayerRole: Role | null;
  wasSaved: boolean;
  headline: string;
}

export interface PoliceResult {
  round: number;
  targetId: string;
  targetName: string;
  isMafia: boolean;
}

export interface VoteResult {
  round: number;
  eliminatedId: string | null;
  eliminatedName: string | null;
  eliminatedRole: Role | null;
  isTie: boolean;
  skipMajority: boolean;
  tally: Record<string, number>;
  skipCount: number;
  headline: string;
}

export interface GameStats {
  savesCount: Record<string, number>;
  policeCorrectChecks: Record<string, number>;
  timesAccused: Record<string, number>;
  mafiaSurvivingRounds: Record<string, number>;
}

export interface Award {
  id: 'sherlock' | 'lifesaver' | 'wrongly_accused' | 'sneakiest_mafia';
  title: string;
  winnerName: string;
  winnerAvatar: string;
  reason: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  timestamp: number;
}

export interface HostGameState {
  roomCode: string;
  isDemo: boolean;
  phase: Phase;
  round: number;
  settings: HostSettings;
  players: Player[];
  revealReadyIds: string[];
  nightActions: NightActions;
  lastDoctorSavedId: string | null;
  morningOutcome: MorningOutcome | null;
  policeResultsByPlayer: Record<string, PoliceResult>;
  votes: Record<string, string | 'skip'>;
  voteResult: VoteResult | null;
  winner: 'village' | 'mafia' | null;
  awards: Award[];
  stats: GameStats;
  narratorLine: string;
  phaseStartedAt: number;
  phaseDurationSec: number;
  chatMessages: ChatMessage[];
}

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isBot?: boolean;
  connected: boolean;
  alive: boolean;
  /** Revealed only if dead (after death/vote) or at gameover */
  revealedRole?: Role;
}

export interface ClientViewState {
  roomCode: string;
  isDemo: boolean;
  phase: Phase;
  round: number;
  settings: HostSettings;
  selfId: string;
  selfRole: Role | null;
  mafiaPartners: { id: string; name: string; avatar: string }[];
  mafiaTeamPicks: Record<string, MafiaPick>;
  lastDoctorSavedId: string | null;
  myNightTargetId: string | null;
  nightActedIds: string[];
  revealReadyIds: string[];
  morningOutcome: MorningOutcome | null;
  myPoliceResult: PoliceResult | null;
  myVote: string | 'skip' | null;
  votedPlayerIds: string[];
  voteResult: VoteResult | null;
  winner: 'village' | 'mafia' | null;
  awards: Award[];
  players: PublicPlayer[];
  narratorLine: string;
  phaseStartedAt: number;
  phaseDurationSec: number;
  chatMessages: ChatMessage[];
}
