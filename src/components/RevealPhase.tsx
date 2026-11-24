import React, { useState } from 'react';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { ROLE_META } from '../game/constants';
import { ClientViewState, Role } from '../game/types';
import { playSfx } from '../utils/narrator';
import { DemoTipCard } from './DemoTipCard';

interface RevealPhaseProps {
  view: ClientViewState;
  muted: boolean;
  onReady: () => void;
}

function RoleEmblem({ role }: { role: Role }) {
  if (role === 'mafia') {
    return (
      <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="#ff2e4d" fillOpacity="0.16" stroke="#ff2e4d" strokeWidth="2" />
        <path
          d="M18 34c4-9 24-9 28 0l-3 10H21l-3-10zm14-14c5 0 9 3 10 8H22c1-5 5-8 10-8z"
          fill="#ff2e4d"
        />
        <circle cx="26" cy="38" r="2.2" fill="#09090d" />
        <circle cx="38" cy="38" r="2.2" fill="#09090d" />
      </svg>
    );
  }
  if (role === 'doctor') {
    return (
      <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="#22c55e" fillOpacity="0.16" stroke="#22c55e" strokeWidth="2" />
        <path d="M27 18h10v9h9v10h-9v9H27v-9h-9V27h9v-9z" fill="#22c55e" />
      </svg>
    );
  }
  if (role === 'police') {
    return (
      <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="#38bdf8" fillOpacity="0.16" stroke="#38bdf8" strokeWidth="2" />
        <path
          d="M32 14l14 6v12c0 9.5-6 16.5-14 20-8-3.5-14-10.5-14-20V20l14-6z"
          fill="#38bdf8"
          fillOpacity="0.85"
        />
        <circle cx="32" cy="31" r="4" fill="#09090d" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 64 64" className="h-16 w-16" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="#f59e0b" fillOpacity="0.16" stroke="#f59e0b" strokeWidth="2" />
      <path d="M32 16l14 12v18H18V28l14-12z" fill="#f59e0b" />
      <rect x="28" y="34" width="8" height="12" rx="1.5" fill="#09090d" />
    </svg>
  );
}

export const RevealPhase: React.FC<RevealPhaseProps> = ({ view, muted, onReady }) => {
  const [flipped, setFlipped] = useState(false);
  const role: Role = view.selfRole ?? 'villager';
  const meta = ROLE_META[role];
  const isReady = view.revealReadyIds.includes(view.selfId);
  const aliveCount = view.players.filter((p) => p.alive).length;

  const handleToggleFlip = () => {
    playSfx('flip', muted);
    setFlipped((prev) => !prev);
  };

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-6">
      <div className="text-center">
        <p className="text-xs font-medium tracking-wider text-white/60">
          KEEP YOUR SCREEN PRIVATE
        </p>
        <h1 className="font-display mt-1 text-2xl tracking-wide text-white">
          YOUR SECRET CARD
        </h1>
      </div>

      {/* 3D Flip Card */}
      <div className="perspective-1000 mt-5">
        <button
          type="button"
          onClick={handleToggleFlip}
          aria-pressed={flipped}
          aria-label={flipped ? 'Tap to hide your role card' : 'Tap to reveal your role card'}
          className="group relative block h-[320px] w-full cursor-pointer text-left focus-visible:outline-2 focus-visible:outline-[#ff2e4d]"
        >
          <div
            className={`transform-style-3d relative h-full w-full transition-transform duration-500 ease-out ${
              flipped ? 'rotate-y-180' : ''
            }`}
          >
            {/* Front (Face-Down) */}
            <div className="backface-hidden absolute inset-0 flex flex-col items-center justify-between rounded-3xl border border-white/15 bg-gradient-to-b from-[#171522] to-[#0c0b12] p-6 shadow-2xl">
              <div className="flex w-full items-center justify-between text-xs font-medium text-white/45">
                <span>DOSSIER</span>
                <span className="tabular-nums">ROOM {view.roomCode}</span>
              </div>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#ff2e4d]/40 bg-[#ff2e4d]/10 text-[#ff2e4d]">
                  <Eye className="h-9 w-9" aria-hidden="true" />
                </div>
                <span className="font-display mt-4 text-xl tracking-wider text-white">
                  TAP TO REVEAL
                </span>
                <span className="mt-1.5 text-sm text-white/60">
                  Make sure nobody is peeking over your shoulder
                </span>
              </div>

              <div className="h-1.5 w-16 rounded-full bg-[#ff2e4d]/45" aria-hidden="true" />
            </div>

            {/* Back (Face-Up Role) */}
            <div
              className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col items-center justify-between rounded-3xl border bg-[#111018] p-6 shadow-2xl"
              style={{ borderColor: `${meta.accent}66` }}
            >
              <div className="flex w-full items-center justify-between text-xs font-medium text-white/55">
                <span>YOUR ROLE</span>
                <span className="inline-flex items-center gap-1 text-white/75">
                  <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
                  Tap to hide
                </span>
              </div>

              <div className="flex flex-col items-center text-center">
                <RoleEmblem role={role} />
                <h2
                  className="font-display mt-3 text-3xl tracking-wider"
                  style={{ color: meta.accent }}
                >
                  {meta.label.toUpperCase()}
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/80">
                  {meta.tagline}
                </p>

                {role === 'mafia' && (
                  <div className="mt-3 w-full rounded-2xl border border-[#ff2e4d]/30 bg-[#ff2e4d]/10 px-3.5 py-2.5 text-center">
                    {view.mafiaPartners.length > 0 ? (
                      <>
                        <div className="text-xs font-semibold text-[#ff7b8e]">
                          Mafia partners
                        </div>
                        <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-sm font-bold text-white">
                          {view.mafiaPartners.map((p) => (
                            <span key={p.id}>
                              {p.avatar} {p.name}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs font-semibold text-[#ff7b8e]">
                        You are the lone Mafia tonight
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="text-xs text-white/45">Tap card again to flip face down</div>
            </div>
          </div>
        </button>
      </div>

      {/* Ready Confirmation */}
      <div className="mt-5">
        <button
          type="button"
          disabled={isReady}
          onClick={onReady}
          className={`flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-6 py-3 text-base font-bold transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-white ${
            isReady
              ? 'border border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
              : 'bg-[#ff2e4d] text-white shadow-[0_0_24px_rgba(255,46,77,0.35)] hover:bg-[#ff425e]'
          }`}
        >
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
          <span>{isReady ? 'Ready — waiting for others' : 'Got it, hide & continue'}</span>
        </button>
        <p className="mt-2 text-center text-xs text-white/55 tabular-nums">
          {view.revealReadyIds.length} / {aliveCount} players ready
        </p>
      </div>

      {view.isDemo && <DemoTipCard phase="reveal" />}
    </main>
  );
};
