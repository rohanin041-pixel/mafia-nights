import { HostSettings, Phase } from './types';

export const AVATAR_POOL = [
  '🦊', '🐼', '👽', '🤖', '🦄',
  '🐙', '🦉', '🐺', '🦁', '🐯',
  '🐸', '🐲', '🦋', '🦚', '🦜',
  '🦩', '🦈', '🐳', '🦑', '🦝',
  '🦡', '🦔', '🦇', '🕷️', '🦂',
];

export const MIN_PLAYERS = 5;
export const MAX_PLAYERS = 15;

export const DEFAULT_SETTINGS: HostSettings = {
  mafiaMode: 'auto',
  manualMafiaCount: 1,
  doctorEnabled: true,
  policeEnabled: true,
  revealTimerSec: 10,
  nightTimerSec: 15,
  discussionTimerSec: 120,
  votingTimerSec: 20,
  narratorMode: 'host',
};

export const DEMO_BOT_PROFILES = [
  { name: 'Kabir', avatar: '🦊' },
  { name: 'Ananya', avatar: '🦉' },
  { name: 'Rohan', avatar: '🤖' },
  { name: 'Meera', avatar: '🦄' },
];

export const FUNNY_DEATH_LINES = [
  '{NAME} was found face down in the pressure cooker. Three whistles. No survivors.',
  '{NAME} stepped out for late-night chai and never returned. The kettle is still screaming.',
  '{NAME} was last seen arguing with a ceiling fan. The fan won.',
  '{NAME} got slipped into a suspiciously large tiffin box. Nobody is claiming it.',
  '{NAME} tried to outsmart the shadows and tripped over their own alibi.',
  '{NAME} went looking for the Wi-Fi router at 3 AM. Classic last words: "It has full bars here."',
  '{NAME} vanished mid-whisper. Only a half-eaten samosa remains as evidence.',
  '{NAME} trusted the wrong person to watch their back. Spoiler: they did not watch.',
];

export const FUNNY_SAVE_LINES = [
  'The Mafia struck in the dark, but the Doctor pulled off a miracle save! Nobody died tonight.',
  'Footsteps echoed down the hall, yet everyone woke up breathing. Someone owes the Doctor a huge favour.',
  'A close call in the dead of night! The Doctor arrived just in time — zero casualties.',
];

export const NO_KILL_LINES = [
  'The night passed in eerie silence. Somehow, everyone made it to sunrise.',
  'Not a single scream in the dark. Either the Mafia got cold feet or forgot their lines.',
];

export const DEMO_TIPS: Partial<Record<Phase, { title: string; body: string }>> = {
  reveal: {
    title: 'Phase 1 · Secret Role Reveal',
    body: 'Tap your card to peek at your role privately, then tap again to hide it before anyone glances at your screen. If you are Mafia, you will also see your partners.',
  },
  night: {
    title: 'Phase 2 · Simultaneous Night Moves',
    body: 'Everyone taps their screen at the same time — even Villagers pick a suspect decoy — so nobody in the room can guess who has a special role by watching thumbs move.',
  },
  morning: {
    title: 'Phase 3 · Dawn Report',
    body: 'The phone narrates who was eliminated overnight or if the Doctor saved someone. If you are Police, only your screen shows your secret investigation result.',
  },
  discussion: {
    title: 'Phase 4 · Table Debate',
    body: 'In a real room, players argue face-to-face right here. In this demo, the 4 bots drop clues and accusations in the feed while you decide who sounds shady.',
  },
  voting: {
    title: 'Phase 5 · Secret Ballot',
    body: 'Vote to eliminate a suspect or skip if you are unsure. A strict majority sends someone out; ties or skip-majorities spare everyone.',
  },
  vote_result: {
    title: 'Verdict & Role Reveal',
    body: 'Anyone voted out reveals their true role to the room and watches silently from the shadows for the rest of the match.',
  },
  gameover: {
    title: 'End of Game & Awards',
    body: 'All secret identities are unmasked along with party awards like Sherlock and Sneakiest Mafia. Tap Play again to deal fresh roles.',
  },
};

export const ROLE_META = {
  mafia: {
    label: 'Mafia',
    tagline: 'Blend in by day. Pick a target with your team by night.',
    accent: '#ff2e4d',
  },
  doctor: {
    label: 'Doctor',
    tagline: 'Save one player each night — never the same person twice in a row.',
    accent: '#22c55e',
  },
  police: {
    label: 'Police',
    tagline: 'Investigate one player each night. Results arrive privately at dawn.',
    accent: '#38bdf8',
  },
  villager: {
    label: 'Villager',
    tagline: 'Read the room, spot the lies, and vote out the Mafia.',
    accent: '#f59e0b',
  },
} as const;
