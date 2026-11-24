import { Phase } from '../game/types';

let audioCtx: AudioContext | null = null;
let cachedVoices: SpeechSynthesisVoice[] = [];
let listenersBound = false;
let speechQueueToken = 0;
let pendingTimeoutIds: number[] = [];

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export type SfxType = 'flip' | 'tap' | 'night' | 'morning' | 'vote' | 'win';

export function playSfx(type: SfxType, muted: boolean): void {
  if (muted) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'flip') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(520, now + 0.09);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.13);
    } else if (type === 'tap') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.06);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'night') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(293.66, now);
      osc.frequency.exponentialRampToValueAtTime(196, now + 0.35);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.42);
    } else if (type === 'morning') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(330, now);
      osc.frequency.exponentialRampToValueAtTime(493.88, now + 0.28);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.37);
    } else if (type === 'vote') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
      osc.start(now);
      osc.stop(now + 0.18);
    } else if (type === 'win') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(392, now);
      osc.frequency.setValueAtTime(493.88, now + 0.12);
      osc.frequency.setValueAtTime(587.33, now + 0.24);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.52);
      osc.start(now);
      osc.stop(now + 0.55);
    }
  } catch {
    // Ignore audio errors
  }
}

export interface VoiceLike {
  name: string;
  lang: string;
  default?: boolean;
  localService?: boolean;
}

const ROBOTIC_OR_NOVELTY_VOICES = [
  'espeak',
  'mbrola',
  'festival',
  'compact',
  'zarvox',
  'trinoids',
  'boing',
  'bubbles',
  'cellos',
  'whisper',
  'bad news',
  'good news',
  'albert',
  'bahh',
  'bells',
  'jester',
  'organ',
  'superstar',
  'wobble',
  'microsoft anna',
  'microsoft sam',
];

const NEURAL_OR_NATURAL_TAGS = [
  'natural',
  'neural',
  'online',
  'wavenet',
  'network',
  'enhanced',
  'premium',
  'studio',
  'chirp',
  'siri',
];

const EXPRESSIVE_HUMAN_NAMES = [
  // Expressive Indian English & global voices across Edge, Chrome, Android, macOS, iOS
  'neerja',
  'prabhat',
  'kavya',
  'ananya',
  'rishi',
  'veena',
  'sangeeta',
  'isha',
  'aman',
  'tara',
  'aria',
  'jenny',
  'guy',
  'sonia',
  'ryan',
  'libby',
  'maisie',
  'natasha',
  'clara',
  'samantha',
  'ava',
  'allison',
  'serena',
  'daniel',
  'oliver',
  'karen',
  'moira',
  'tessa',
  'kate',
  'zoe',
  'evan',
  'nicky',
];

export function scoreVoice(voice: VoiceLike): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase().replace('_', '-');
  let score = 0;

  if (!lang.startsWith('en')) return -1000;

  // Strongly penalize robotic legacy, compact, or novelty synthesizers
  if (ROBOTIC_OR_NOVELTY_VOICES.some((bad) => name.includes(bad))) {
    score -= 160;
  }

  // Strongly reward neural / natural / network / enhanced voices
  if (NEURAL_OR_NATURAL_TAGS.some((tag) => name.includes(tag))) {
    score += 75;
  }

  if (name.includes('google')) {
    score += 50;
  }

  if (EXPRESSIVE_HUMAN_NAMES.some((person) => name.includes(person))) {
    score += 30;
  }

  // Regional weighting: prefer en-IN when natural, otherwise clear conversational English
  if (lang.startsWith('en-in') || name.includes('india')) {
    score += 55;
  } else if (lang.startsWith('en-gb') || lang.startsWith('en-au') || lang.startsWith('en-ie')) {
    score += 18;
  } else if (lang.startsWith('en-us') || lang.startsWith('en-ca')) {
    score += 14;
  }

  // Cloud-hosted voices (localService === false) are almost always neural/expressive
  if (voice.localService === false) {
    score += 28;
  }

  if (voice.default) {
    score += 3;
  }

  return score;
}

export function selectPreferredVoice<T extends VoiceLike>(voices: T[]): T | null {
  if (!voices.length) return null;
  const sorted = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return sorted[0];
}

export function initNarrator(): void {
  if (listenersBound || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  listenersBound = true;
  const refresh = () => {
    try {
      cachedVoices = window.speechSynthesis.getVoices();
    } catch {
      cachedVoices = [];
    }
  };
  refresh();
  if (typeof window.speechSynthesis.addEventListener === 'function') {
    window.speechSynthesis.addEventListener('voiceschanged', refresh);
  } else {
    window.speechSynthesis.onvoiceschanged = refresh;
  }
}

export interface SpeechSegment {
  text: string;
  pauseAfterMs: number;
  isQuestion: boolean;
  isExclamation: boolean;
}

export function splitNarratorSegments(text: string): SpeechSegment[] {
  const normalized = text
    .replace(/\s*—\s*/g, '. ')
    .replace(/\s*;\s*/g, '. ')
    .replace(/\s*-\s+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!normalized) return [];

  const sentenceParts = normalized.split(/(?<=[.!?])\s+/);
  const segments: SpeechSegment[] = [];

  for (const rawSentence of sentenceParts) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;

    // Break long multi-clause sentences at ", " so the narrator breathes naturally
    if (sentence.length > 68 && sentence.includes(', ')) {
      const clauses = sentence.split(/,\s+/);
      clauses.forEach((clause, idx) => {
        const cleanClause = clause.trim();
        if (!cleanClause) return;
        const isLastClause = idx === clauses.length - 1;
        segments.push({
          text: isLastClause ? cleanClause : `${cleanClause},`,
          pauseAfterMs: isLastClause ? 420 : 190,
          isQuestion: isLastClause && cleanClause.endsWith('?'),
          isExclamation: isLastClause && cleanClause.endsWith('!'),
        });
      });
    } else {
      segments.push({
        text: sentence,
        pauseAfterMs: 420,
        isQuestion: sentence.endsWith('?'),
        isExclamation: sentence.endsWith('!'),
      });
    }
  }

  return segments;
}

export function computeSegmentProsody(
  phase: Phase | undefined,
  segment: SpeechSegment,
  segmentIndex: number,
  totalSegments: number
): {
  rate: number;
  pitch: number;
  pauseMs: number;
} {
  const isFinal = segmentIndex === totalSegments - 1;
  let rate = 0.92;
  let pitch = 0.98;
  let basePause = segment.pauseAfterMs;

  switch (phase) {
    case 'night':
      rate = 0.85;
      pitch = isFinal ? 0.87 : 0.91;
      basePause = Math.max(basePause, 480);
      break;
    case 'morning':
      // Build suspense on setup line, lift energy on the reveal/punchline
      rate = isFinal ? 0.95 : 0.89;
      pitch = isFinal ? 1.05 : 0.96;
      basePause = isFinal ? 400 : Math.max(basePause, 480);
      break;
    case 'discussion':
      rate = 0.95;
      pitch = 1.02;
      break;
    case 'voting':
    case 'vote_result':
      rate = 0.89;
      pitch = isFinal ? 0.93 : 0.97;
      basePause = Math.max(basePause, 440);
      break;
    case 'gameover':
      rate = isFinal ? 0.98 : 0.92;
      pitch = isFinal ? 1.09 : 1.01;
      break;
    case 'reveal':
      rate = 0.9;
      pitch = 0.95;
      break;
    default:
      break;
  }

  // Micro-inflections from punctuation for natural emotion
  if (segment.isQuestion) {
    pitch += 0.08;
    rate -= 0.02;
  } else if (segment.isExclamation) {
    pitch += 0.06;
    rate += 0.03;
  }

  return {
    rate: Number(Math.max(0.75, Math.min(1.15, rate)).toFixed(2)),
    pitch: Number(Math.max(0.75, Math.min(1.25, pitch)).toFixed(2)),
    pauseMs: basePause,
  };
}

export function stopNarrator(): void {
  speechQueueToken += 1;
  for (const id of pendingTimeoutIds) {
    window.clearTimeout(id);
  }
  pendingTimeoutIds = [];

  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Ignore
  }
}

export function speakNarratorLine(
  text: string,
  options: { shouldSpeak: boolean; muted: boolean; phase?: Phase }
): void {
  if (!options.shouldSpeak || options.muted || !text.trim()) return;
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  initNarrator();
  stopNarrator();
  const token = speechQueueToken;

  const segments = splitNarratorSegments(text);
  if (segments.length === 0) return;

  const speakNext = (index: number) => {
    if (token !== speechQueueToken || index >= segments.length) return;
    try {
      const synth = window.speechSynthesis;
      const availableVoices = cachedVoices.length ? cachedVoices : synth.getVoices();
      const voice = selectPreferredVoice(availableVoices);

      const seg = segments[index];
      const prosody = computeSegmentProsody(options.phase, seg, index, segments.length);
      const utterance = new SpeechSynthesisUtterance(seg.text);

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = 'en-IN';
      }
      utterance.rate = prosody.rate;
      utterance.pitch = prosody.pitch;
      utterance.volume = 1;

      utterance.onend = () => {
        if (token !== speechQueueToken) return;
        const nextIndex = index + 1;
        if (nextIndex < segments.length) {
          const id = window.setTimeout(() => speakNext(nextIndex), prosody.pauseMs);
          pendingTimeoutIds.push(id);
        }
      };

      utterance.onerror = () => {
        // Stop cleanly on synthesis error
      };

      synth.speak(utterance);
    } catch {
      // Ignore speech synthesis errors in restricted environments
    }
  };

  const startId = window.setTimeout(() => speakNext(0), 140);
  pendingTimeoutIds.push(startId);
}
