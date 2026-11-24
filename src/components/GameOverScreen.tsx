import React from 'react';
import { Trophy, RotateCcw, Award as AwardIcon } from 'lucide-react';
import { ROLE_META } from '../game/constants';
import { ClientViewState } from '../game/types';
import { DemoTipCard } from './DemoTipCard';

interface GameOverScreenProps {
  view: ClientViewState;
  isHostOrDemo: boolean;
  onPlayAgain: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  view,
  isHostOrDemo,
  onPlayAgain,
}) => {
  const isVillageWin = view.winner === 'village';

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-6 sm:px-6">
      {/* Winner Hero Card */}
      <section className="rounded-3xl border border-white/15 bg-white/[0.04] p-6 text-center shadow-2xl">
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full border ${
            isVillageWin
              ? 'border-amber-400/50 bg-amber-500/15 text-amber-300'
              : 'border-[#ff2e4d]/50 bg-[#ff2e4d]/15 text-[#ff2e4d]'
          }`}
        >
          <Trophy className="h-8 w-8" aria-hidden="true" />
        </div>

        <p className="mt-4 text-xs font-semibold tracking-wider text-white/60">
          GAME OVER · ALL ROLES UNMASKED
        </p>
        <h1
          className={`font-display mt-1.5 text-3xl tracking-wider sm:text-4xl ${
            isVillageWin ? 'text-amber-300' : 'text-[#ff2e4d]'
          }`}
        >
          {isVillageWin ? 'VILLAGE WINS!' : 'MAFIA WINS!'}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/75">
          {isVillageWin
            ? 'Every last Mafia member was caught before they could take over the room.'
            : 'The Mafia outnumbered the remaining townsfolk and claimed the night.'}
        </p>
      </section>

      {/* Party Awards */}
      {view.awards.length > 0 && (
        <section aria-label="Match awards" className="mt-6">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-white/65">
            <AwardIcon className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <span>NIGHT AWARDS</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {view.awards.map((award) => (
              <div
                key={award.id}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
              >
                <div className="text-xs font-semibold tracking-wider text-[#ff7b8e]">
                  {award.title.toUpperCase()}
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-base font-bold text-white">
                  <span aria-hidden="true">{award.winnerAvatar}</span>
                  <span>{award.winnerName}</span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-white/65">{award.reason}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Full Cast & Secret Roles */}
      <section className="mt-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-display text-sm tracking-wider text-white/90">FULL CAST</h2>
        <ul className="mt-3 divide-y divide-white/8">
          {view.players.map((p) => {
            const role = p.revealedRole ?? 'villager';
            const meta = ROLE_META[role];
            return (
              <li
                key={p.id}
                className="flex min-h-[52px] items-center justify-between gap-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="text-xl" aria-hidden="true">
                    {p.avatar}
                  </span>
                  <div className="min-w-0">
                    <span className="truncate font-semibold text-white">
                      {p.name}
                      {p.id === view.selfId && p.name.trim().toLowerCase() !== 'you' ? ' (You)' : ''}
                    </span>
                    <span className="ml-2 text-xs text-white/50">
                      {p.alive ? 'Survived' : 'Eliminated'}
                    </span>
                  </div>
                </div>
                <span
                  className="font-display shrink-0 text-sm tracking-wide"
                  style={{ color: meta.accent }}
                >
                  {meta.label.toUpperCase()}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Play Again */}
      <div className="mt-6">
        {isHostOrDemo ? (
          <button
            type="button"
            data-start="true"
            onClick={onPlayAgain}
            className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ff2e4d] px-6 py-3.5 text-base font-bold text-white shadow-[0_0_26px_rgba(255,46,77,0.38)] transition-transform active:scale-[0.98] hover:bg-[#ff425e] focus-visible:outline-2 focus-visible:outline-white"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
            <span>Play again</span>
          </button>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-center text-sm text-white/75">
            Waiting for the host to start another round…
          </div>
        )}
      </div>

      {view.isDemo && <DemoTipCard phase="gameover" />}
    </main>
  );
};
