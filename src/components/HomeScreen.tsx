import React from 'react';
import { Users, Play, Bot, Volume2, VolumeX } from 'lucide-react';

interface HomeScreenProps {
  onHostGame: () => void;
  onGoJoin: () => void;
  onStartDemo: () => void;
  muted: boolean;
  onToggleMute: () => void;
  errorMessage?: string | null;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onHostGame,
  onGoJoin,
  onStartDemo,
  muted,
  onToggleMute,
  errorMessage,
}) => {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-between px-5 py-6 sm:px-8 sm:py-10">
      {/* Top minimal utility row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium tracking-wider text-white/55">
          ONE ROOM · NO SIT-OUTS
        </span>
        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute narrator voice' : 'Mute narrator voice'}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#ff2e4d]"
        >
          {muted ? (
            <VolumeX className="h-5 w-5 text-white/60" />
          ) : (
            <Volume2 className="h-5 w-5 text-[#ff2e4d]" />
          )}
        </button>
      </div>

      {/* Main split / centered hero */}
      <div className="my-auto grid grid-cols-1 items-center gap-10 py-6 lg:grid-cols-12 lg:gap-12">
        {/* Left: Glitch Logo + Primary CTAs */}
        <section className="flex flex-col items-center text-center lg:col-span-7 lg:items-start lg:text-left">
          {/* Crescent Moon SVG + Glitch MAFIA Wordmark */}
          <div className="mb-4 flex items-center gap-4">
            <svg
              viewBox="0 0 64 64"
              className="h-14 w-14 shrink-0 drop-shadow-[0_0_18px_rgba(255,46,77,0.65)] sm:h-16 sm:w-16"
              aria-hidden="true"
            >
              <defs>
                <radialGradient id="moonGlow" cx="35%" cy="35%" r="65%">
                  <stop offset="0%" stopColor="#ff7b8e" />
                  <stop offset="55%" stopColor="#ff2e4d" />
                  <stop offset="100%" stopColor="#990f26" />
                </radialGradient>
              </defs>
              <path
                d="M38.5 10.5C25.5 11.4 15.2 22.3 15.2 35.6C15.2 49.5 26.5 60.8 40.4 60.8C46.5 60.8 52.1 58.6 56.5 55C45.3 54.6 36.3 45.4 36.3 34.1C36.3 24.4 42.9 16.2 51.8 13.8C47.7 11.4 43.2 10.2 38.5 10.5Z"
                fill="url(#moonGlow)"
              />
              <circle cx="14" cy="18" r="1.8" fill="#ffffff" opacity="0.7" />
              <circle cx="52" cy="24" r="1.4" fill="#ff2e4d" opacity="0.85" />
            </svg>

            <div>
              <div className="relative inline-block select-none">
                <h1 className="font-display text-5xl leading-none tracking-wider text-white sm:text-6xl lg:text-7xl">
                  MAFIA
                </h1>
                <span
                  aria-hidden="true"
                  className="glitch-layer-1 font-display pointer-events-none absolute inset-0 text-5xl leading-none tracking-wider text-[#ff2e4d] sm:text-6xl lg:text-7xl"
                >
                  MAFIA
                </span>
                <span
                  aria-hidden="true"
                  className="glitch-layer-2 font-display pointer-events-none absolute inset-0 text-5xl leading-none tracking-wider text-sky-400 sm:text-6xl lg:text-7xl"
                >
                  MAFIA
                </span>
              </div>
              <p className="font-display mt-1 text-lg tracking-[0.3em] text-[#ff2e4d] sm:text-xl">
                NIGHTS
              </p>
            </div>
          </div>

          <p className="max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
            Your phone is the narrator, so every friend in the room gets to play. Bluff in daylight, tap in secret at night.
          </p>

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 w-full max-w-md rounded-xl border border-[#ff2e4d]/40 bg-[#ff2e4d]/15 px-4 py-3 text-left text-sm text-rose-100"
            >
              {errorMessage}
            </div>
          )}

          {/* Primary CTAs */}
          <div className="mt-7 flex w-full max-w-md flex-col gap-3">
            <button
              type="button"
              data-start="true"
              onClick={onHostGame}
              className="flex min-h-[54px] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#ff2e4d] px-6 py-3.5 text-base font-bold text-white shadow-[0_0_28px_rgba(255,46,77,0.38)] transition-transform active:scale-[0.98] hover:bg-[#ff425e] focus-visible:outline-2 focus-visible:outline-white"
            >
              <Play className="h-5 w-5 fill-current" aria-hidden="true" />
              <span>Host a game</span>
            </button>

            <button
              type="button"
              onClick={onGoJoin}
              className="flex min-h-[50px] w-full items-center justify-center gap-2.5 rounded-2xl border border-white/15 bg-white/6 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-white/12 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-[#ff2e4d]"
            >
              <Users className="h-5 w-5 text-white/80" aria-hidden="true" />
              <span>Join a game</span>
            </button>

            <button
              type="button"
              onClick={onStartDemo}
              className="mt-1 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/8 px-5 py-3 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-400/15 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-amber-400"
            >
              <Bot className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>New here? Try a demo with 4 bots</span>
            </button>
          </div>
        </section>

        {/* Right: Clean Party Briefing Panel (especially great on tablet/desktop & scrolls naturally on mobile) */}
        <section
          aria-label="How Mafia Nights works"
          className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 lg:col-span-5"
        >
          <h2 className="font-display text-sm tracking-wider text-white/90">
            HOW THE ROOM PLAYS
          </h2>
          <ol className="mt-4 space-y-4 text-sm leading-relaxed text-white/75">
            <li className="flex gap-3.5">
              <span className="tabular-nums font-display text-base text-[#ff2e4d]">01</span>
              <div>
                <strong className="block font-semibold text-white">One link, 5–15 phones</strong>
                Host shares a 4-letter code. Friends join in the browser with no app or login.
              </div>
            </li>
            <li className="flex gap-3.5">
              <span className="tabular-nums font-display text-base text-[#ff2e4d]">02</span>
              <div>
                <strong className="block font-semibold text-white">Everyone taps at night</strong>
                Villagers pick a suspect decoy while Mafia, Doctor, and Police make their real moves in silence.
              </div>
            </li>
            <li className="flex gap-3.5">
              <span className="tabular-nums font-display text-base text-[#ff2e4d]">03</span>
              <div>
                <strong className="block font-semibold text-white">Phone narrates the chaos</strong>
                Morning announcements, secret Police clues, live timers, and final awards — zero sit-outs.
              </div>
            </li>
          </ol>
        </section>
      </div>

      {/* Minimal footer metadata */}
      <footer className="pt-4 text-center text-xs text-white/45 lg:text-left">
        Best with 5–15 players in one room · Peer-to-peer WebRTC
      </footer>
    </main>
  );
};
