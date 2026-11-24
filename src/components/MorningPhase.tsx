import React from 'react';
import { Sun, ShieldCheck, Skull, Search, ArrowRight } from 'lucide-react';
import { ROLE_META } from '../game/constants';
import { ClientViewState } from '../game/types';
import { DemoTipCard } from './DemoTipCard';

interface MorningPhaseProps {
  view: ClientViewState;
  isHostOrDemo: boolean;
  onContinueToDiscussion: () => void;
}

export const MorningPhase: React.FC<MorningPhaseProps> = ({
  view,
  isHostOrDemo,
  onContinueToDiscussion,
}) => {
  const outcome = view.morningOutcome;
  const policeResult = view.myPoliceResult;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-6">
      {/* Dawn Headline Card */}
      <section className="rounded-3xl border border-amber-300/25 bg-black/45 p-6 text-center shadow-2xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-amber-400/35 bg-amber-500/15">
          {outcome?.wasSaved ? (
            <ShieldCheck className="h-7 w-7 text-emerald-400" aria-hidden="true" />
          ) : outcome?.killedPlayerId ? (
            <Skull className="h-7 w-7 text-[#ff2e4d]" aria-hidden="true" />
          ) : (
            <Sun className="h-7 w-7 text-amber-400" aria-hidden="true" />
          )}
        </div>

        <p className="mt-4 text-xs font-semibold tracking-wider text-amber-300/80">
          MORNING {view.round} REPORT
        </p>

        <h1 className="mt-2 text-xl font-bold leading-snug text-white sm:text-2xl">
          {outcome?.headline ?? 'The sun rises over the room.'}
        </h1>

        {outcome?.killedPlayerName && outcome.killedPlayerRole && (
          <div className="mt-5 inline-flex flex-col items-center rounded-2xl border border-white/12 bg-white/5 px-5 py-3">
            <span className="text-xs text-white/60">
              {outcome.killedPlayerName}’s true role was
            </span>
            <span
              className="font-display mt-1 text-xl tracking-wider"
              style={{ color: ROLE_META[outcome.killedPlayerRole].accent }}
            >
              {ROLE_META[outcome.killedPlayerRole].label.toUpperCase()}
            </span>
          </div>
        )}
      </section>

      {/* Private Police Investigation Result (only visible to Police) */}
      {view.selfRole === 'police' && policeResult && policeResult.round === view.round && (
        <section
          aria-label="Private Police Investigation"
          className="mt-4 rounded-3xl border border-sky-400/35 bg-sky-950/45 p-5"
        >
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-sky-300">
            <Search className="h-4 w-4" aria-hidden="true" />
            <span>CONFIDENTIAL POLICE FILE · ONLY YOU SEE THIS</span>
          </div>
          <p className="mt-2 text-base font-bold text-white">
            {policeResult.targetName} is{' '}
            <span className={policeResult.isMafia ? 'text-[#ff2e4d]' : 'text-emerald-400'}>
              {policeResult.isMafia ? 'MAFIA' : 'NOT MAFIA'}
            </span>
            .
          </p>
        </section>
      )}

      {/* Advance CTA */}
      <div className="mt-6">
        {isHostOrDemo ? (
          <button
            type="button"
            onClick={onContinueToDiscussion}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ff2e4d] px-6 py-3 text-base font-bold text-white shadow-[0_0_24px_rgba(255,46,77,0.35)] transition-transform active:scale-[0.98] hover:bg-[#ff425e] focus-visible:outline-2 focus-visible:outline-white"
          >
            <span>Start Discussion</span>
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        ) : (
          <p className="text-center text-sm text-amber-100/75">
            Discussion begins shortly…
          </p>
        )}
      </div>

      {view.isDemo && <DemoTipCard phase="morning" />}
    </main>
  );
};
