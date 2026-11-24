import React from 'react';
import { Volume2, VolumeX, LogOut } from 'lucide-react';
import { Phase } from '../game/types';

interface NarratorBannerProps {
  phase: Phase;
  round: number;
  narratorLine: string;
  secondsLeft: number | null;
  totalSeconds: number;
  muted: boolean;
  onToggleMute: () => void;
  onExit?: () => void;
  isDemo?: boolean;
}

const PHASE_LABELS: Record<Phase, string> = {
  home: 'Home',
  join: 'Join Room',
  lobby: 'Lobby',
  reveal: 'Secret Role',
  night: 'Night Falls',
  morning: 'Morning Report',
  discussion: 'Discussion',
  voting: 'Cast Your Vote',
  vote_result: 'The Verdict',
  gameover: 'Final Unmasking',
};

export const NarratorBanner: React.FC<NarratorBannerProps> = ({
  phase,
  round,
  narratorLine,
  secondsLeft,
  totalSeconds,
  muted,
  onToggleMute,
  onExit,
  isDemo,
}) => {
  const showTimer = secondsLeft !== null && totalSeconds > 0;
  const pct = showTimer ? Math.max(0, Math.min(100, (secondsLeft / totalSeconds) * 100)) : 0;

  return (
    <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-black/75 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3 px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs font-medium text-white/60">
            <span className="text-[#ff2e4d]">{PHASE_LABELS[phase]}</span>
            {round > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">Round {round}</span>
              </>
            )}
            {isDemo && (
              <>
                <span aria-hidden="true">·</span>
                <span>Demo Mode</span>
              </>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-white">
            {narratorLine}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {showTimer && (
            <div
              className="tabular-nums text-right text-base font-bold text-white"
              aria-label={`${secondsLeft} seconds remaining`}
            >
              {secondsLeft}s
            </div>
          )}

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute narrator voice' : 'Mute narrator voice'}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#ff2e4d]"
          >
            {muted ? <VolumeX className="h-5 w-5 text-white/60" /> : <Volume2 className="h-5 w-5 text-[#ff2e4d]" />}
          </button>

          {onExit && (
            <button
              type="button"
              onClick={onExit}
              aria-label="Leave game"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white/75 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#ff2e4d]"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {showTimer && (
        <div className="h-1 w-full bg-white/10" role="progressbar" aria-valuenow={secondsLeft ?? 0} aria-valuemax={totalSeconds}>
          <div
            className="h-full bg-[#ff2e4d] transition-[width] duration-300 ease-linear"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </header>
  );
};
