import React from 'react';
import { MessageSquare, ArrowRight, Skull } from 'lucide-react';
import { ROLE_META } from '../game/constants';
import { ClientViewState } from '../game/types';
import { DemoTipCard } from './DemoTipCard';

interface DiscussionPhaseProps {
  view: ClientViewState;
  secondsLeft: number;
  isHostOrDemo: boolean;
  onSkipToVoting: () => void;
}

function formatClock(sec: number): string {
  const safe = Math.max(0, sec);
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

export const DiscussionPhase: React.FC<DiscussionPhaseProps> = ({
  view,
  secondsLeft,
  isHostOrDemo,
  onSkipToVoting,
}) => {
  const alivePlayers = view.players.filter((p) => p.alive);
  const deadPlayers = view.players.filter((p) => !p.alive);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-6 sm:px-6">
      {/* Main Timer & Prompt */}
      <section className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 text-center">
        <p className="text-xs font-semibold tracking-wider text-amber-300/85">
          FACE-TO-FACE DEBATE
        </p>
        <div
          className="font-display tabular-nums mt-2 text-5xl tracking-wider text-white sm:text-6xl"
          aria-live="off"
        >
          {formatClock(secondsLeft)}
        </div>
        <h1 className="mt-3 text-lg font-bold text-white sm:text-xl">
          Who is lying to the room?
        </h1>
        <p className="mx-auto mt-1 max-w-md text-sm text-white/65">
          {view.isDemo
            ? 'Read the bot table chatter below, then skip straight to voting whenever you are ready.'
            : 'Look around the room and argue your case before the ballot opens.'}
        </p>

        {isHostOrDemo && (
          <button
            type="button"
            onClick={onSkipToVoting}
            className="mx-auto mt-5 flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#ff2e4d] px-6 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(255,46,77,0.35)] transition-transform active:scale-[0.98] hover:bg-[#ff425e] focus-visible:outline-2 focus-visible:outline-white"
          >
            <span>Skip to Voting</span>
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </section>

      {/* Demo Bot Chat Feed */}
      {view.isDemo && (
        <section
          aria-label="Table discussion messages"
          className="mt-5 rounded-3xl border border-white/10 bg-black/40 p-4 sm:p-5"
        >
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wider text-white/60">
            <MessageSquare className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <span>TABLE CHATTER</span>
          </div>

          {view.chatMessages.length === 0 ? (
            <p className="text-sm text-white/50">The room is eyeing each other nervously…</p>
          ) : (
            <ul className="space-y-2.5">
              {view.chatMessages.map((msg) => (
                <li
                  key={msg.id}
                  className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3.5 py-2.5"
                >
                  <span className="text-xl" aria-hidden="true">
                    {msg.senderAvatar}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white/80">{msg.senderName}</div>
                    <p className="mt-0.5 text-sm text-white">{msg.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Alive & Eliminated Suspects Overview */}
      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-xs font-semibold tracking-wider text-white/60">
            STILL ALIVE ({alivePlayers.length})
          </h2>
          <ul className="mt-2.5 flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-white">
            {alivePlayers.map((p) => (
              <li key={p.id} className="flex items-center gap-1.5">
                <span aria-hidden="true">{p.avatar}</span>
                <span>{p.name}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <h2 className="text-xs font-semibold tracking-wider text-white/60">
            ELIMINATED ({deadPlayers.length})
          </h2>
          {deadPlayers.length === 0 ? (
            <p className="mt-2.5 text-sm text-white/45">Nobody is out yet.</p>
          ) : (
            <ul className="mt-2.5 space-y-1.5 text-sm text-white/65">
              {deadPlayers.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5">
                    <Skull className="h-3.5 w-3.5 text-[#ff2e4d]" aria-hidden="true" />
                    <span>
                      {p.avatar} {p.name}
                    </span>
                  </span>
                  {p.revealedRole && (
                    <span
                      className="text-xs font-bold"
                      style={{ color: ROLE_META[p.revealedRole].accent }}
                    >
                      {ROLE_META[p.revealedRole].label}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {view.isDemo && <DemoTipCard phase="discussion" />}
    </main>
  );
};
