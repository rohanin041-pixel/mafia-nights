import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSegmentProsody,
  selectPreferredVoice,
  splitNarratorSegments,
  VoiceLike,
} from './narrator';

test('selectPreferredVoice favors Natural/Google en-IN over robotic eSpeak voices', () => {
  const voices: VoiceLike[] = [
    { name: 'eSpeak English (India)', lang: 'en-IN', localService: true },
    { name: 'Google US English', lang: 'en-US', localService: false },
    {
      name: 'Microsoft Neerja Online (Natural) - English (India)',
      lang: 'en-IN',
      localService: false,
    },
  ];

  const chosen = selectPreferredVoice(voices);
  assert.equal(chosen?.name, 'Microsoft Neerja Online (Natural) - English (India)');
});

test('selectPreferredVoice avoids robotic eSpeak and macOS novelty voices in favor of natural English', () => {
  const voices: VoiceLike[] = [
    { name: 'eSpeak English (India)', lang: 'en-IN', localService: true },
    { name: 'Zarvox', lang: 'en-US', localService: true },
    { name: 'Google UK English Female', lang: 'en-GB', localService: false },
  ];

  const chosen = selectPreferredVoice(voices);
  assert.equal(chosen?.name, 'Google UK English Female');
});

test('selectPreferredVoice prefers cloud-hosted Android/Google network en-IN over generic local OS voices', () => {
  const voices: VoiceLike[] = [
    { name: 'Android Speech Engine', lang: 'en-US', localService: true, default: true },
    { name: 'English (India) Network', lang: 'en-IN', localService: false },
  ];

  const chosen = selectPreferredVoice(voices);
  assert.equal(chosen?.name, 'English (India) Network');
});

test('splitNarratorSegments splits sentences, em-dashes, and long comma clauses with pauses', () => {
  const parts = splitNarratorSegments(
    'Kabir was found face down in the pressure cooker. Three whistles. No survivors!'
  );
  assert.deepEqual(
    parts.map((p) => p.text),
    [
      'Kabir was found face down in the pressure cooker.',
      'Three whistles.',
      'No survivors!',
    ]
  );
  assert.equal(parts[2].isExclamation, true);

  const longClause = splitNarratorSegments(
    'The Mafia struck silently in the dark, but the Doctor pulled off a miracle save tonight.'
  );
  assert.equal(longClause.length, 2);
  assert.equal(longClause[0].pauseAfterMs, 190);
});

test('computeSegmentProsody adjusts rate and pitch by phase and punctuation', () => {
  const nightSeg = {
    text: 'Night 1 falls.',
    pauseAfterMs: 420,
    isQuestion: false,
    isExclamation: false,
  };
  const nightProsody = computeSegmentProsody('night', nightSeg, 0, 2);
  assert.ok(nightProsody.rate < 0.9);
  assert.ok(nightProsody.pitch < 0.95);
  assert.ok(nightProsody.pauseMs >= 480);

  const winSeg = {
    text: 'The Village wins!',
    pauseAfterMs: 420,
    isQuestion: false,
    isExclamation: true,
  };
  const winProsody = computeSegmentProsody('gameover', winSeg, 1, 2);
  assert.ok(winProsody.pitch > 1.05);
});
