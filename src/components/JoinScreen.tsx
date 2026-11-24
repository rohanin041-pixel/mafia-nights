import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

interface JoinScreenProps {
  initialRoomCode?: string;
  initialName?: string;
  isConnecting: boolean;
  errorMessage: string | null;
  onJoin: (params: { roomCode: string; name: string }) => void;
  onBack: () => void;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({
  initialRoomCode = '',
  initialName = '',
  isConnecting,
  errorMessage,
  onJoin,
  onBack,
}) => {
  const [name, setName] = useState(initialName);
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanCode = roomCode.trim().toUpperCase().replace(/[^A-Z]/g, '');

    if (!cleanName) {
      setLocalError('Enter your name so the room knows who you are.');
      return;
    }
    if (cleanCode.length !== 4) {
      setLocalError('Enter the 4-letter room code from the host.');
      return;
    }
    setLocalError(null);
    onJoin({ roomCode: cleanCode, name: cleanName });
  };

  const displayError = localError || errorMessage;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-8">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex min-h-[44px] w-fit items-center gap-2 rounded-xl px-2 text-sm font-medium text-white/70 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-[#ff2e4d]"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        <span>Back</span>
      </button>

      <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 sm:p-7">
        <h1 className="font-display text-2xl tracking-wide text-white">JOIN A ROOM</h1>
        <p className="mt-1.5 text-sm text-white/65">
          Enter your name and the 4-letter code on the host’s phone.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5" noValidate>
          <div>
            <label htmlFor="join-name" className="block text-sm font-medium text-white/85">
              Your name
            </label>
            <input
              id="join-name"
              type="text"
              maxLength={20}
              autoComplete="name"
              placeholder="e.g. Kabir"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 min-h-[48px] w-full rounded-xl border border-white/15 bg-black/50 px-4 text-base text-white placeholder:text-white/35 focus:border-[#ff2e4d] focus:outline-none"
            />
          </div>

          <div>
            <label htmlFor="join-code" className="block text-sm font-medium text-white/85">
              4-letter room code
            </label>
            <input
              id="join-code"
              type="text"
              maxLength={4}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              placeholder="ABCD"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
              className="font-display mt-2 min-h-[54px] w-full rounded-xl border border-white/15 bg-black/50 px-4 text-center text-2xl tracking-[0.35em] text-white uppercase placeholder:text-white/25 focus:border-[#ff2e4d] focus:outline-none"
            />
          </div>

          {displayError && (
            <div
              role="alert"
              className="rounded-xl border border-[#ff2e4d]/40 bg-[#ff2e4d]/15 px-3.5 py-2.5 text-sm text-rose-100"
            >
              {displayError}
            </div>
          )}

          <button
            type="submit"
            disabled={isConnecting}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ff2e4d] px-6 py-3 text-base font-bold text-white shadow-[0_0_24px_rgba(255,46,77,0.35)] transition-transform active:scale-[0.98] hover:bg-[#ff425e] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-white"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Connecting to host…</span>
              </>
            ) : (
              <>
                <span>Join Lobby</span>
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </>
            )}
          </button>
        </form>
      </div>
    </main>
  );
};
