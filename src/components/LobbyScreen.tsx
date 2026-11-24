import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  X,
  Play,
  SlidersHorizontal,
  Minus,
  Plus,
  RefreshCw,
  LogOut,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { MAX_PLAYERS, MIN_PLAYERS } from '../game/constants';
import { getAutoMafiaCount, getEffectiveMafiaCount } from '../game/rules';
import { ClientViewState, HostSettings, NarratorMode } from '../game/types';
import { buildInviteUrl } from '../utils/storage';

interface LobbyScreenProps {
  view: ClientViewState;
  isHost: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onRerollAvatar: () => void;
  onUpdateHostName?: (name: string) => void;
  onUpdateSettings?: (settings: HostSettings) => void;
  onKickPlayer?: (playerId: string) => void;
  onStartGame?: () => void;
  onLeave: () => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  view,
  isHost,
  muted,
  onToggleMute,
  onRerollAvatar,
  onUpdateHostName,
  onUpdateSettings,
  onKickPlayer,
  onStartGame,
  onLeave,
}) => {
  const [copied, setCopied] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const self = view.players.find((p) => p.id === view.selfId);
  const [nameDraft, setNameDraft] = useState(self?.name || 'Host');

  const inviteUrl = buildInviteUrl(view.roomCode);
  const playerCount = view.players.length;
  const canStart = playerCount >= MIN_PLAYERS && playerCount <= MAX_PLAYERS;
  const effectiveMafia = getEffectiveMafiaCount(Math.max(playerCount, MIN_PLAYERS), view.settings);

  const handleCopyOrShare = async () => {
    const shareData = {
      title: 'Join my Mafia Nights room',
      text: `Join Mafia Nights! Room code: ${view.roomCode}`,
      url: inviteUrl,
    };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // Fall back to clipboard copy
      }
    }
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  const patchSettings = (partial: Partial<HostSettings>) => {
    if (!onUpdateSettings) return;
    onUpdateSettings({ ...view.settings, ...partial });
  };

  const saveHostName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && onUpdateHostName) {
      onUpdateHostName(trimmed);
    }
    setEditingName(false);
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-4 py-5 sm:px-6 sm:py-7">
      {/* Top Bar */}
      <header className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onLeave}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-3.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-[#ff2e4d]"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Leave</span>
        </button>

        <div className="text-center">
          <div className="text-xs font-medium tracking-wider text-white/55">ROOM CODE</div>
          <div className="font-display text-2xl tracking-[0.25em] text-[#ff2e4d] sm:text-3xl">
            {view.roomCode}
          </div>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute narrator voice' : 'Mute narrator voice'}
          className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-white/12 bg-white/5 text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#ff2e4d]"
        >
          {muted ? (
            <VolumeX className="h-5 w-5 text-white/60" />
          ) : (
            <Volume2 className="h-5 w-5 text-[#ff2e4d]" />
          )}
        </button>
      </header>

      {/* Invite Banner */}
      <section className="mt-5 flex flex-col gap-3 rounded-2xl border border-[#ff2e4d]/30 bg-[#ff2e4d]/10 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-base font-bold text-white">Invite friends in the room</h1>
          <p className="mt-0.5 truncate text-xs text-white/70">{inviteUrl}</p>
        </div>

        <button
          type="button"
          onClick={handleCopyOrShare}
          className="flex min-h-[46px] shrink-0 items-center justify-center gap-2 rounded-xl bg-[#ff2e4d] px-5 py-2.5 text-sm font-bold text-white transition-transform active:scale-[0.98] hover:bg-[#ff425e] focus-visible:outline-2 focus-visible:outline-white"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" />
              <span>Link copied</span>
            </>
          ) : (
            <>
              <Share2 className="h-4 w-4 sm:hidden" aria-hidden="true" />
              <Copy className="hidden h-4 w-4 sm:block" aria-hidden="true" />
              <span>Invite friends</span>
            </>
          )}
        </button>
      </section>

      {/* Two-column desktop layout / single-column mobile */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Players Roster */}
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-6">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-lg tracking-wide text-white">PLAYERS</h2>
              <p className="mt-0.5 text-xs text-white/60">
                Tap your own avatar to reroll · {MIN_PLAYERS}–{MAX_PLAYERS} players
              </p>
            </div>
            <div className="tabular-nums text-sm font-bold text-white/85">
              {playerCount} / {MAX_PLAYERS}
            </div>
          </div>

          {/* Host quick name edit */}
          {isHost && self && (
            <div className="mt-4 border-b border-white/10 pb-3">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <label htmlFor="host-name-edit" className="sr-only">
                    Your display name
                  </label>
                  <input
                    id="host-name-edit"
                    type="text"
                    maxLength={20}
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveHostName();
                    }}
                    className="min-h-[44px] flex-1 rounded-xl border border-white/20 bg-black/50 px-3 text-sm text-white focus:border-[#ff2e4d] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={saveHostName}
                    className="min-h-[44px] rounded-xl bg-white/15 px-4 text-sm font-semibold text-white hover:bg-white/25"
                  >
                    Save
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-white/65">
                  <span>Playing as <strong className="text-white">{self.name}</strong></span>
                  <button
                    type="button"
                    onClick={() => {
                      setNameDraft(self.name);
                      setEditingName(true);
                    }}
                    className="min-h-[36px] px-2 font-medium text-[#ff2e4d] hover:underline"
                  >
                    Edit your name
                  </button>
                </div>
              )}
            </div>
          )}

          <ul className="mt-4 divide-y divide-white/8">
            {view.players.map((player) => {
              const isSelf = player.id === view.selfId;
              return (
                <li
                  key={player.id}
                  className="flex min-h-[60px] items-center justify-between gap-3 py-2.5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {isSelf ? (
                      <button
                        type="button"
                        onClick={onRerollAvatar}
                        aria-label={`Reroll your avatar (${player.avatar})`}
                        title="Tap to reroll avatar"
                        className="group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[#ff2e4d]/50 bg-[#ff2e4d]/12 text-2xl transition-transform active:scale-90 focus-visible:outline-2 focus-visible:outline-[#ff2e4d]"
                      >
                        <span>{player.avatar}</span>
                        <RefreshCw
                          className="absolute -right-1 -bottom-1 h-4 w-4 rounded-full bg-[#09090d] p-0.5 text-[#ff2e4d]"
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      <div
                        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/12 bg-white/5 text-2xl"
                        aria-hidden="true"
                      >
                        {player.avatar}
                      </div>
                    )}

                    <div className="min-w-0">
                      <div className="truncate text-base font-semibold text-white">
                        {player.name}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-white/55">
                        {player.isHost && <span className="text-[#ff2e4d]">Host</span>}
                        {player.isHost && isSelf && <span aria-hidden="true">·</span>}
                        {isSelf && <span>You</span>}
                        {!player.connected && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-amber-400">Reconnecting</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {isHost && !isSelf && onKickPlayer && (
                    <button
                      type="button"
                      onClick={() => onKickPlayer(player.id)}
                      aria-label={`Remove ${player.name}`}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-white/50 transition-colors hover:bg-white/10 hover:text-[#ff2e4d] focus-visible:outline-2 focus-visible:outline-[#ff2e4d]"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {/* Host Settings Panel */}
        <section className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.03] p-5 lg:col-span-6">
          <div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-5 w-5 text-[#ff2e4d]" aria-hidden="true" />
              <h2 className="font-display text-lg tracking-wide text-white">GAME SETTINGS</h2>
            </div>
            <p className="mt-0.5 text-xs text-white/60">
              {isHost ? 'Configure roles, timers, and voice.' : 'Only the host can edit game rules.'}
            </p>

            <div className="mt-5 space-y-5">
              {/* Mafia Count */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Mafia count</div>
                  <div className="text-xs text-white/55">
                    {view.settings.mafiaMode === 'auto'
                      ? `Auto (${getAutoMafiaCount(Math.max(playerCount, MIN_PLAYERS))} for ${Math.max(playerCount, MIN_PLAYERS)} players)`
                      : `Manual (${effectiveMafia} Mafia)`}
                  </div>
                </div>

                {isHost ? (
                  <div className="flex items-center gap-2">
                    <div className="flex rounded-xl bg-black/50 p-1">
                      <button
                        type="button"
                        onClick={() => patchSettings({ mafiaMode: 'auto' })}
                        className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                          view.settings.mafiaMode === 'auto'
                            ? 'bg-[#ff2e4d] text-white'
                            : 'text-white/65 hover:text-white'
                        }`}
                      >
                        Auto
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          patchSettings({
                            mafiaMode: 'manual',
                            manualMafiaCount: effectiveMafia,
                          })
                        }
                        className={`min-h-[36px] rounded-lg px-3 text-xs font-semibold transition-colors ${
                          view.settings.mafiaMode === 'manual'
                            ? 'bg-[#ff2e4d] text-white'
                            : 'text-white/65 hover:text-white'
                        }`}
                      >
                        Manual
                      </button>
                    </div>

                    {view.settings.mafiaMode === 'manual' && (
                      <div className="flex items-center gap-1 rounded-xl border border-white/12 bg-black/40 p-1">
                        <button
                          type="button"
                          aria-label="Decrease Mafia count"
                          onClick={() =>
                            patchSettings({
                              manualMafiaCount: Math.max(1, view.settings.manualMafiaCount - 1),
                            })
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="tabular-nums w-6 text-center text-sm font-bold text-white">
                          {view.settings.manualMafiaCount}
                        </span>
                        <button
                          type="button"
                          aria-label="Increase Mafia count"
                          onClick={() =>
                            patchSettings({
                              manualMafiaCount: Math.min(5, view.settings.manualMafiaCount + 1),
                            })
                          }
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="tabular-nums text-sm font-semibold text-white">
                    {effectiveMafia} Mafia
                  </span>
                )}
              </div>

              {/* Doctor & Police toggles */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => patchSettings({ doctorEnabled: !view.settings.doctorEnabled })}
                  aria-pressed={view.settings.doctorEnabled}
                  className={`flex min-h-[52px] items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                    view.settings.doctorEnabled
                      ? 'border-emerald-400/40 bg-emerald-500/12 text-white'
                      : 'border-white/10 bg-black/30 text-white/50'
                  } disabled:cursor-default`}
                >
                  <div>
                    <div className="text-sm font-semibold">Doctor</div>
                    <div className="text-xs opacity-75">
                      {view.settings.doctorEnabled ? 'On' : 'Off'}
                    </div>
                  </div>
                  <span className="text-lg" aria-hidden="true">🩺</span>
                </button>

                <button
                  type="button"
                  disabled={!isHost}
                  onClick={() => patchSettings({ policeEnabled: !view.settings.policeEnabled })}
                  aria-pressed={view.settings.policeEnabled}
                  className={`flex min-h-[52px] items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${
                    view.settings.policeEnabled
                      ? 'border-sky-400/40 bg-sky-500/12 text-white'
                      : 'border-white/10 bg-black/30 text-white/50'
                  } disabled:cursor-default`}
                >
                  <div>
                    <div className="text-sm font-semibold">Police</div>
                    <div className="text-xs opacity-75">
                      {view.settings.policeEnabled ? 'On' : 'Off'}
                    </div>
                  </div>
                  <span className="text-lg" aria-hidden="true">🕵️</span>
                </button>
              </div>

              {/* Phase Timers */}
              <div>
                <div className="mb-2.5 text-sm font-semibold text-white">Phase timers</div>
                <div className="grid grid-cols-2 gap-2.5">
                  <TimerStepper
                    label="Look at card"
                    valueSec={view.settings.revealTimerSec}
                    step={5}
                    min={5}
                    max={30}
                    editable={isHost}
                    onChange={(val) => patchSettings({ revealTimerSec: val })}
                  />
                  <TimerStepper
                    label="Night"
                    valueSec={view.settings.nightTimerSec}
                    step={5}
                    min={10}
                    max={45}
                    editable={isHost}
                    onChange={(val) => patchSettings({ nightTimerSec: val })}
                  />
                  <TimerStepper
                    label="Discussion"
                    valueSec={view.settings.discussionTimerSec}
                    step={30}
                    min={30}
                    max={300}
                    editable={isHost}
                    formatMinutes
                    onChange={(val) => patchSettings({ discussionTimerSec: val })}
                  />
                  <TimerStepper
                    label="Voting"
                    valueSec={view.settings.votingTimerSec}
                    step={5}
                    min={10}
                    max={60}
                    editable={isHost}
                    onChange={(val) => patchSettings({ votingTimerSec: val })}
                  />
                </div>
              </div>

              {/* Narrator Voice Mode */}
              <div>
                <div className="mb-2 text-sm font-semibold text-white">Narrator voice</div>
                <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-black/50 p-1.5">
                  {(
                    [
                      { id: 'host', label: 'Host phone' },
                      { id: 'all', label: 'Every phone' },
                      { id: 'off', label: 'Off' },
                    ] as { id: NarratorMode; label: string }[]
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      disabled={!isHost}
                      onClick={() => patchSettings({ narratorMode: opt.id })}
                      className={`min-h-[40px] rounded-xl px-2 text-xs font-semibold transition-colors ${
                        view.settings.narratorMode === opt.id
                          ? 'bg-[#ff2e4d] text-white'
                          : 'text-white/65 hover:text-white'
                      } disabled:cursor-default`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Start Game CTA */}
          <div className="mt-6 border-t border-white/10 pt-5">
            {isHost ? (
              <>
                <button
                  type="button"
                  disabled={!canStart}
                  onClick={onStartGame}
                  className="flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#ff2e4d] px-6 py-3.5 text-base font-bold text-white shadow-[0_0_26px_rgba(255,46,77,0.35)] transition-transform active:scale-[0.98] hover:bg-[#ff425e] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40 disabled:shadow-none focus-visible:outline-2 focus-visible:outline-white"
                >
                  <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                  <span>Deal Roles & Start</span>
                </button>
                {!canStart && (
                  <p className="mt-2 text-center text-xs text-white/60">
                    Need at least {MIN_PLAYERS} players to start ({playerCount}/{MIN_PLAYERS})
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3.5 text-center text-sm font-medium text-white/75">
                Waiting for host to start the game…
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
};

interface TimerStepperProps {
  label: string;
  valueSec: number;
  step: number;
  min: number;
  max: number;
  editable: boolean;
  formatMinutes?: boolean;
  onChange: (val: number) => void;
}

const TimerStepper: React.FC<TimerStepperProps> = ({
  label,
  valueSec,
  step,
  min,
  max,
  editable,
  formatMinutes,
  onChange,
}) => {
  const display =
    formatMinutes && valueSec >= 60
      ? valueSec % 60 === 0
        ? `${valueSec / 60} min`
        : `${Math.floor(valueSec / 60)}m ${valueSec % 60}s`
      : `${valueSec}s`;

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5">
      <span className="text-xs text-white/60">{label}</span>
      <div className="mt-1.5 flex items-center justify-between gap-1">
        {editable ? (
          <button
            type="button"
            aria-label={`Decrease ${label} timer`}
            onClick={() => onChange(Math.max(min, valueSec - step))}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-white hover:bg-white/15"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span />
        )}
        <span className="tabular-nums text-sm font-bold text-white">{display}</span>
        {editable ? (
          <button
            type="button"
            aria-label={`Increase ${label} timer`}
            onClick={() => onChange(Math.min(max, valueSec + step))}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/8 text-white hover:bg-white/15"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
};
