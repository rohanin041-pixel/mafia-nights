import React from 'react';
import { Check, Moon, Shield, Crosshair, Search, Eye } from 'lucide-react';
import { ClientViewState, Role } from '../game/types';
import { DemoTipCard } from './DemoTipCard';

interface NightPhaseProps {
  view: ClientViewState;
  onSelectTarget: (targetId: string) => void;
}

function getNightPrompt(role: Role | null): {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  accentClass: string;
} {
  if (role === 'mafia') {
    return {
      title: 'Pick tonight’s target',
      subtitle: 'Your Mafia partners see your choice live. Majority wins; ties go to the latest pick.',
      icon: <Crosshair className="h-5 w-5 text-[#ff2e4d]" aria-hidden="true" />,
      accentClass: 'border-[#ff2e4d]/50 bg-[#ff2e4d]/18',
    };
  }
  if (role === 'doctor') {
    return {
      title: 'Save one player tonight',
      subtitle: 'You can save yourself, but never the same person two nights in a row.',
      icon: <Shield className="h-5 w-5 text-emerald-400" aria-hidden="true" />,
      accentClass: 'border-emerald-400/50 bg-emerald-500/18',
    };
  }
  if (role === 'police') {
    return {
      title: 'Investigate one suspect',
      subtitle: 'Tap anyone else to check if they are Mafia. Your answer arrives privately at dawn.',
      icon: <Search className="h-5 w-5 text-sky-400" aria-hidden="true" />,
      accentClass: 'border-sky-400/50 bg-sky-500/18',
    };
  }
  return {
    title: 'Pick your prime suspect',
    subtitle: 'Everyone taps at night so nobody can spot special roles. Choose who you suspect!',
    icon: <Eye className="h-5 w-5 text-amber-400" aria-hidden="true" />,
    accentClass: 'border-amber-400/50 bg-amber-500/15',
  };
}

export const NightPhase: React.FC<NightPhaseProps> = ({ view, onSelectTarget }) => {
  const self = view.players.find((p) => p.id === view.selfId);
  const isAlive = self?.alive ?? false;
  const alivePlayers = view.players.filter((p) => p.alive);
  const hasActed = view.nightActedIds.includes(view.selfId);
  const prompt = getNightPrompt(view.selfRole);

  if (!isAlive) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-5 py-8 text-center">
        <div className="rounded-3xl border border-sky-200/12 bg-slate-950/60 p-7">
          <Moon className="mx-auto h-10 w-10 text-sky-300/75" aria-hidden="true" />
          <h1 className="font-display mt-4 text-2xl tracking-wide text-white">
            SILENT SPECTATOR
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-sky-100/70">
            You are out of the game. Keep quiet and watch the rest of the room sweat through the night.
          </p>
          <p className="tabular-nums mt-5 text-xs font-medium text-sky-200/60">
            {view.nightActedIds.length} / {alivePlayers.length} players have acted
          </p>
        </div>
        {view.isDemo && <DemoTipCard phase="night" />}
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-6 sm:px-6">
      {/* Private Night Header */}
      <div className="mb-5 text-center">
        <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-wider text-sky-200/70">
          {prompt.icon}
          <span>NIGHT {view.round} · KEEP SCREEN PRIVATE</span>
        </div>
        <h1 className="font-display mt-1.5 text-2xl tracking-wide text-white sm:text-3xl">
          {prompt.title}
        </h1>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-sky-100/70">{prompt.subtitle}</p>
      </div>

      {/* Candidate Grid — large tap targets for discreet tapping */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {alivePlayers.map((candidate) => {
          const isSelf = candidate.id === view.selfId;
          const isSelected = view.myNightTargetId === candidate.id;
          const blockedByDoctorRule =
            view.selfRole === 'doctor' && view.lastDoctorSavedId === candidate.id;
          const blockedBySelfRule =
            (view.selfRole === 'police' || view.selfRole === 'villager') && isSelf;
          const blockedByMafiaSelf = view.selfRole === 'mafia' && isSelf;
          const isDisabled = blockedByDoctorRule || blockedBySelfRule || blockedByMafiaSelf;

          // Mafia team live pick indicators
          const mafiaPickingThis =
            view.selfRole === 'mafia'
              ? Object.entries(view.mafiaTeamPicks)
                  .filter(([, pick]) => pick.targetId === candidate.id)
                  .map(([mafiaId]) => view.players.find((p) => p.id === mafiaId))
                  .filter(Boolean)
              : [];

          return (
            <button
              key={candidate.id}
              type="button"
              disabled={isDisabled}
              onClick={() => onSelectTarget(candidate.id)}
              aria-pressed={isSelected}
              className={`flex min-h-[64px] items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-sky-300 ${
                isSelected
                  ? `${prompt.accentClass} text-white shadow-lg`
                  : isDisabled
                  ? 'cursor-not-allowed border-white/8 bg-[#070d1f]/75 text-white/35'
                  : 'border-white/14 bg-[#0a122a]/90 text-white hover:border-white/28 hover:bg-[#101c3d]/95'
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="text-2xl" aria-hidden="true">
                  {candidate.avatar}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-base font-bold">
                    {candidate.name}
                    {isSelf && candidate.name.trim().toLowerCase() !== 'you' ? ' (You)' : ''}
                  </div>
                  {blockedByDoctorRule && (
                    <div className="text-xs text-rose-300/70">Saved last night</div>
                  )}
                  {mafiaPickingThis.length > 0 && (
                    <div className="mt-0.5 text-xs font-medium text-[#ff7b8e]">
                      Picked by {mafiaPickingThis.map((p) => p!.name).join(', ')}
                    </div>
                  )}
                </div>
              </div>

              {isSelected && (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                  <Check className="h-4 w-4" aria-hidden="true" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action Status Footer */}
      <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 text-xs text-sky-100/75">
        <span>
          {hasActed
            ? 'Choice recorded — waiting for the rest of the room.'
            : 'Tap a player above before the timer runs out.'}
        </span>
        <span className="tabular-nums font-bold text-white">
          {view.nightActedIds.length} / {alivePlayers.length}
        </span>
      </div>

      {view.isDemo && <DemoTipCard phase="night" />}
    </main>
  );
};
