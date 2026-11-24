import React, { useEffect, useState } from 'react';
import { Check, SkipForward, Gavel, ArrowRight, Scale } from 'lucide-react';
import { ROLE_META } from '../game/constants';
import { ClientViewState } from '../game/types';
import { DemoTipCard } from './DemoTipCard';

interface VotingPhaseProps {
  view: ClientViewState;
  isHostOrDemo: boolean;
  onVote: (choice: string | 'skip') => void;
  onNextNight: () => void;
}

export const VotingPhase: React.FC<VotingPhaseProps> = ({
  view,
  isHostOrDemo,
  onVote,
  onNextNight,
}) => {
  const [selectedChoice, setSelectedChoice] = useState<string | 'skip' | null>(null);
  const self = view.players.find((p) => p.id === view.selfId);
  const isAlive = self?.alive ?? false;
  const alivePlayers = view.players.filter((p) => p.alive);

  // Reset local draft choice when a new voting round starts
  useEffect(() => {
    setSelectedChoice(view.myVote ?? null);
  }, [view.phase, view.round, view.myVote]);

  if (view.phase === 'vote_result' && view.voteResult) {
    const res = view.voteResult;
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-5 py-6">
        <section className="rounded-3xl border border-[#ff2e4d]/35 bg-black/50 p-6 text-center shadow-2xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#ff2e4d]/40 bg-[#ff2e4d]/15">
            {res.eliminatedId ? (
              <Gavel className="h-7 w-7 text-[#ff2e4d]" aria-hidden="true" />
            ) : (
              <Scale className="h-7 w-7 text-amber-300" aria-hidden="true" />
            )}
          </div>

          <p className="mt-4 text-xs font-semibold tracking-wider text-rose-200/75">
            BALLOT VERDICT
          </p>
          <h1 className="mt-2 text-xl font-bold leading-snug text-white sm:text-2xl">
            {res.headline}
          </h1>

          {res.eliminatedName && res.eliminatedRole && (
            <div className="mt-5 inline-flex flex-col items-center rounded-2xl border border-white/12 bg-white/5 px-5 py-3">
              <span className="text-xs text-white/60">
                {res.eliminatedName}’s true role was
              </span>
              <span
                className="font-display mt-1 text-xl tracking-wider"
                style={{ color: ROLE_META[res.eliminatedRole].accent }}
              >
                {ROLE_META[res.eliminatedRole].label.toUpperCase()}
              </span>
            </div>
          )}

          {/* Vote Breakdown */}
          <div className="mt-6 border-t border-white/10 pt-4 text-left">
            <h2 className="text-xs font-semibold tracking-wider text-white/55">VOTE TALLY</h2>
            <ul className="mt-2.5 space-y-1.5 text-sm">
              {Object.entries(res.tally)
                .sort((a, b) => b[1] - a[1])
                .map(([targetId, count]) => {
                  const target = view.players.find((p) => p.id === targetId);
                  if (!target) return null;
                  return (
                    <li key={targetId} className="flex items-center justify-between text-white/85">
                      <span>
                        {target.avatar} {target.name}
                      </span>
                      <span className="tabular-nums font-bold text-[#ff7b8e]">
                        {count} vote{count > 1 ? 's' : ''}
                      </span>
                    </li>
                  );
                })}
              <li className="flex items-center justify-between text-white/60">
                <span>Skipped vote</span>
                <span className="tabular-nums font-semibold">{res.skipCount}</span>
              </li>
            </ul>
          </div>
        </section>

        <div className="mt-6">
          {isHostOrDemo ? (
            <button
              type="button"
              onClick={onNextNight}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ff2e4d] px-6 py-3 text-base font-bold text-white shadow-[0_0_24px_rgba(255,46,77,0.35)] transition-transform active:scale-[0.98] hover:bg-[#ff425e] focus-visible:outline-2 focus-visible:outline-white"
            >
              <span>Night Falls Again</span>
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          ) : (
            <p className="text-center text-sm text-rose-100/75">
              Night begins shortly…
            </p>
          )}
        </div>

        {view.isDemo && <DemoTipCard phase="vote_result" />}
      </main>
    );
  }

  const activeChoice = view.myVote ?? selectedChoice;
  const selectedPlayer =
    activeChoice && activeChoice !== 'skip'
      ? alivePlayers.find((p) => p.id === activeChoice) ?? null
      : null;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-6 sm:px-6">
      <div className="mb-5 text-center">
        <p className="text-xs font-semibold tracking-wider text-rose-200/75">
          ROUND {view.round} · SECRET BALLOT
        </p>
        <h1 className="font-display mt-1 text-2xl tracking-wide text-white sm:text-3xl">
          {isAlive ? 'VOTE SOMEONE OUT' : 'SPECTATING VOTE'}
        </h1>
        <p className="mt-1 text-sm text-rose-100/75">
          {isAlive
            ? 'Tap a suspect or Skip Vote, then lock in your choice.'
            : 'Dead players watch silently and cannot vote.'}
        </p>
      </div>

      {!isAlive ? (
        <div className="rounded-3xl border border-white/12 bg-black/45 p-7 text-center">
          <p className="text-base font-medium text-white/80">
            Waiting for the surviving players to finish voting…
          </p>
          <p className="tabular-nums mt-3 text-sm text-rose-200/70">
            {view.votedPlayerIds.length} / {alivePlayers.length} votes cast
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {alivePlayers.map((candidate) => {
              const isSelf = candidate.id === view.selfId;
              const isSelected = activeChoice === candidate.id;

              return (
                <button
                  key={candidate.id}
                  type="button"
                  disabled={isSelf || view.myVote !== null}
                  onClick={() => setSelectedChoice(candidate.id)}
                  aria-pressed={isSelected}
                  className={`flex min-h-[62px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-white ${
                    isSelected
                      ? 'border-[#ff2e4d] bg-[#ff2e4d]/25 text-white shadow-[0_0_20px_rgba(255,46,77,0.3)]'
                      : isSelf
                      ? 'cursor-not-allowed border-white/6 bg-black/25 text-white/30'
                      : view.myVote !== null
                      ? 'cursor-default border-white/10 bg-black/35 text-white/50'
                      : 'border-white/14 bg-black/45 text-white hover:border-[#ff2e4d]/50 hover:bg-black/65'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">
                      {candidate.avatar}
                    </span>
                    <span className="truncate text-base font-bold">
                      {candidate.name}
                      {isSelf && candidate.name.trim().toLowerCase() !== 'you' ? ' (You)' : ''}
                    </span>
                  </div>
                  {isSelected && (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff2e4d] text-white">
                      <Check className="h-4 w-4" aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={view.myVote !== null}
            onClick={() => setSelectedChoice('skip')}
            aria-pressed={activeChoice === 'skip'}
            className={`mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border px-5 py-3 text-sm font-bold transition-colors active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-white ${
              activeChoice === 'skip'
                ? 'border-amber-400 bg-amber-500/25 text-amber-100'
                : view.myVote !== null
                ? 'cursor-default border-white/10 bg-black/30 text-white/40'
                : 'border-white/15 bg-black/40 text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <SkipForward className="h-4 w-4" aria-hidden="true" />
            <span>Skip Vote (Spare everyone)</span>
          </button>

          {/* Explicit Lock In Vote button */}
          <div className="mt-4">
            <button
              type="button"
              disabled={!activeChoice || view.myVote !== null}
              onClick={() => {
                if (activeChoice && view.myVote === null) {
                  onVote(activeChoice);
                }
              }}
              className={`flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-bold transition-transform active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-white ${
                view.myVote !== null
                  ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
                  : activeChoice
                  ? 'bg-[#ff2e4d] text-white shadow-[0_0_24px_rgba(255,46,77,0.4)] hover:bg-[#ff425e]'
                  : 'cursor-not-allowed bg-white/10 text-white/40'
              }`}
            >
              <Check className="h-5 w-5" aria-hidden="true" />
              <span>
                {view.myVote !== null
                  ? 'Vote locked — waiting for others'
                  : selectedPlayer
                  ? `Lock In Vote for ${selectedPlayer.name}`
                  : activeChoice === 'skip'
                  ? 'Lock In Skip Vote'
                  : 'Select a player or Skip Vote'}
              </span>
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-black/40 px-4 py-3 text-xs text-rose-100/75">
            <span>
              {view.myVote ? 'Your ballot is sealed.' : 'Votes stay secret until everyone locks in.'}
            </span>
            <span className="tabular-nums font-bold text-white">
              {view.votedPlayerIds.length} / {alivePlayers.length}
            </span>
          </div>
        </>
      )}

      {view.isDemo && <DemoTipCard phase="voting" />}
    </main>
  );
};
