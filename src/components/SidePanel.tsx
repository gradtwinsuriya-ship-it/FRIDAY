import React, { useState, useEffect } from 'react';
import {
  Clock,
  Timer as TimerIcon,
  BookOpen,
  Plus,
  Trash2,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Check,
  BellRing,
  Volume2,
} from 'lucide-react';
import { TimerItem, NoteItem, VoiceSettings } from '../types';
import {
  getRecommendedFemaleVoices,
  speakResponse,
  unlockAudioAndSpeech,
  formatVoiceLabel,
  isIrishVoice,
} from '../utils/audio';
import { Sparkles, RotateCcw as ResetIcon } from 'lucide-react';

interface SidePanelProps {
  timers: TimerItem[];
  notes: NoteItem[];
  voiceSettings: VoiceSettings;
  onUpdateVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  onAddTimer: (minutes: number, label: string) => void;
  onDeleteTimer: (id: string) => void;
  onToggleTimer: (id: string) => void;
  onResetTimer: (id: string) => void;
  onAddNote: (text: string) => void;
  onDeleteNote: (id: string) => void;
  onClearAllNotes: () => void;
  activeTab: 'all' | 'timers' | 'memory' | 'settings';
  setActiveTab: (tab: 'all' | 'timers' | 'memory' | 'settings') => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  timers,
  notes,
  voiceSettings,
  onUpdateVoiceSettings,
  onAddTimer,
  onDeleteTimer,
  onToggleTimer,
  onResetTimer,
  onAddNote,
  onDeleteNote,
  onClearAllNotes,
  activeTab,
  setActiveTab,
}) => {
  // Live clock state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [newNoteInput, setNewNoteInput] = useState('');
  const [timerLabelInput, setTimerLabelInput] = useState('');
  const [timerMinutesInput, setTimerMinutesInput] = useState('5');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch available voices
  useEffect(() => {
    const updateVoices = () => {
      setAvailableVoices(getRecommendedFemaleVoices());
    };
    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const formatTimerDisplay = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleCreateTimer = (e: React.FormEvent) => {
    e.preventDefault();
    const mins = parseFloat(timerMinutesInput);
    if (isNaN(mins) || mins <= 0) return;
    onAddTimer(mins, timerLabelInput.trim() || 'Timer');
    setTimerLabelInput('');
  };

  const handleCreateNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteInput.trim()) return;
    onAddNote(newNoteInput.trim());
    setNewNoteInput('');
  };

  const handleTestVoice = (phrase?: string) => {
    unlockAudioAndSpeech();
    const textToSpeak = phrase || "Good morning, boss. F.R.I.D.A.Y. tactical systems online and armor diagnostics looking grand.";
    speakResponse(textToSpeak, {
      voiceURI: voiceSettings.voiceURI,
      rate: voiceSettings.rate,
      pitch: voiceSettings.pitch,
      volume: voiceSettings.volume,
      isMuted: false,
      useNeuralTts: voiceSettings.useNeuralTts,
    });
  };

  const handleResetToFridayPreset = () => {
    onUpdateVoiceSettings({
      rate: 1.04,
      pitch: 1.08,
      useNeuralTts: true,
      voiceURI: null,
    });
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Live HUD Tactical Clock Card */}
      <div className="hud-panel rounded-xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between pb-2 border-b border-cyan-500/15">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="font-hud text-xs font-semibold tracking-wider text-cyan-300">
              TACTICAL TIME // SYSTEM CLOCK
            </span>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300">
            SYNCED
          </span>
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <div className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-white tabular-nums">
            {currentTime.toLocaleTimeString('en-US', { hour12: false })}
          </div>
          <div className="font-mono text-xs text-slate-400 text-right">
            <div>{currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>
            <div className="text-cyan-400/80 text-[11px]">{Intl.DateTimeFormat().resolvedOptions().timeZone}</div>
          </div>
        </div>
      </div>

      {/* Side Panel Tabs */}
      <div className="flex border-b border-cyan-500/20 text-xs font-mono">
        <button
          onClick={() => setActiveTab('timers')}
          className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'timers'
              ? 'border-cyan-400 text-cyan-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Timers ({timers.length})
        </button>
        <button
          onClick={() => setActiveTab('memory')}
          className={`flex-1 py-2 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'memory'
              ? 'border-cyan-400 text-cyan-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Memory ({notes.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`py-2 px-3 text-center border-b-2 transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'border-cyan-400 text-cyan-300 font-semibold'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
          title="Voice Settings"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content depending on tab */}
      <div className="flex-1 overflow-y-auto space-y-4 max-h-[500px] pr-1">
        {/* TIMERS TAB */}
        {activeTab === 'timers' && (
          <div className="space-y-3">
            {/* Quick add timer form */}
            <form onSubmit={handleCreateTimer} className="hud-panel rounded-xl p-3 text-xs space-y-2">
              <span className="font-hud text-[11px] text-cyan-300 font-semibold uppercase">
                Create Countdown Timer
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Label (e.g. Pasta)"
                  value={timerLabelInput}
                  onChange={(e) => setTimerLabelInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-cyan-400"
                />
                <input
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="360"
                  placeholder="Mins"
                  value={timerMinutesInput}
                  onChange={(e) => setTimerMinutesInput(e.target.value)}
                  className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-200 outline-none focus:border-cyan-400 text-center font-mono"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-mono font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Set</span>
                </button>
              </div>
            </form>

            {/* List of active/completed timers */}
            {timers.length === 0 ? (
              <div className="text-center py-8 text-xs font-mono text-slate-500">
                <TimerIcon className="w-8 h-8 mx-auto mb-2 opacity-30 text-cyan-400" />
                No active countdown timers.
                <div className="mt-1 text-[11px] text-slate-600">
                  Say "Set a 5 minute timer for tea"
                </div>
              </div>
            ) : (
              timers.map((timer) => {
                const progress =
                  timer.totalSeconds > 0
                    ? Math.max(0, Math.min(100, (timer.remainingSeconds / timer.totalSeconds) * 100))
                    : 0;

                return (
                  <div
                    key={timer.id}
                    className={`rounded-xl p-3 border transition-all ${
                      timer.isCompleted
                        ? 'hud-panel-orange border-orange-500/50 animate-pulse'
                        : 'hud-panel border-cyan-500/25'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {timer.isCompleted ? (
                          <BellRing className="w-4 h-4 text-orange-400 animate-bounce" />
                        ) : (
                          <TimerIcon className="w-4 h-4 text-cyan-400" />
                        )}
                        <span className="font-medium text-xs text-slate-200">
                          {timer.label}
                        </span>
                      </div>
                      <div className="font-mono text-lg font-bold tabular-nums text-white">
                        {formatTimerDisplay(timer.remainingSeconds)}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-800/80 rounded-full h-1.5 mt-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-1000 ${
                          timer.isCompleted
                            ? 'bg-orange-500 w-full'
                            : 'bg-gradient-to-r from-cyan-500 to-sky-400'
                        }`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Timer Controls */}
                    <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800 text-xs font-mono">
                      <span className="text-[10px] text-slate-500">
                        {timer.isCompleted
                          ? 'ALERT: COMPLETE'
                          : timer.isRunning
                          ? 'COUNTING DOWN'
                          : 'PAUSED'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {!timer.isCompleted && (
                          <button
                            onClick={() => onToggleTimer(timer.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                            title={timer.isRunning ? 'Pause timer' : 'Resume timer'}
                          >
                            {timer.isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => onResetTimer(timer.id)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                          title="Reset to initial duration"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteTimer(timer.id)}
                          className="p-1 rounded bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer"
                          title="Delete timer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* MEMORY BANK TAB */}
        {activeTab === 'memory' && (
          <div className="space-y-3">
            {/* Quick add note form */}
            <form onSubmit={handleCreateNote} className="hud-panel rounded-xl p-3 text-xs space-y-2">
              <span className="font-hud text-[11px] text-cyan-300 font-semibold uppercase">
                Add Knowledge or Preference
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Boss drinks green tea with mint"
                  value={newNoteInput}
                  onChange={(e) => setNewNoteInput(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-mono font-medium flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Store</span>
                </button>
              </div>
            </form>

            <div className="flex items-center justify-between px-1 text-[11px] font-mono text-slate-400">
              <span>{notes.length} Active Memories</span>
              {notes.length > 0 && (
                <button
                  onClick={onClearAllNotes}
                  className="text-rose-400 hover:underline cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* List of notes */}
            {notes.length === 0 ? (
              <div className="text-center py-8 text-xs font-mono text-slate-500">
                <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30 text-sky-400" />
                No memory entries saved yet.
                <div className="mt-1 text-[11px] text-slate-600">
                  Say "Remember that I prefer metric units"
                </div>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className="hud-panel rounded-xl p-3 text-xs group flex items-start justify-between gap-2"
                >
                  <div className="flex-1 font-body text-slate-200">
                    <p className="leading-relaxed">{note.text}</p>
                    <span className="text-[10px] font-mono text-slate-500 mt-1 block">
                      {new Date(note.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors cursor-pointer"
                    title="Delete note"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* SETTINGS TAB: F.R.I.D.A.Y. Irish Voice Synthesizer */}
        {activeTab === 'settings' && (
          <div className="hud-panel rounded-xl p-4 text-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-cyan-500/15">
              <div>
                <span className="font-hud text-xs text-cyan-300 font-semibold uppercase block">
                  F.R.I.D.A.Y. Audio Core
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Kerry Condon · Irish Tactical Voice Profile
                </span>
              </div>
              <button
                onClick={handleResetToFridayPreset}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono cursor-pointer transition-colors"
                title="Reset sliders and voice to Friday's signature Irish settings"
              >
                <ResetIcon className="w-3 h-3 text-cyan-400" />
                <span>Reset Preset</span>
              </button>
            </div>

            {/* Neural Gemini AI TTS Toggle */}
            <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-950/40 via-sky-950/20 to-slate-900 border border-cyan-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span className="font-hud text-[11px] font-semibold text-cyan-200">
                    Neural Irish Voice Core
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceSettings.useNeuralTts}
                    onChange={(e) => onUpdateVoiceSettings({ useNeuralTts: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
              <p className="text-[10px] font-mono text-slate-400 leading-relaxed">
                Direct Gemini AI studio synthesis trained on Kerry Condon's authentic Irish persona. Falls back seamlessly to local Irish browser voices if offline.
              </p>
            </div>

            {/* Quick Audition Quotes */}
            <div>
              <span className="block text-[11px] font-mono text-slate-400 mb-1.5 flex items-center justify-between">
                <span>Audition Voice Soundbites</span>
                <span className="text-[10px] text-cyan-400">Click to listen</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleTestVoice("Good morning, boss! F.R.I.D.A.Y. tactical systems are fully primed.")}
                  className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-700/80 hover:border-cyan-500/40 text-[11px] font-mono text-slate-300 text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">"Good morning, boss"</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVoice("Diagnostics looking grand, boss. Arc Reactor humming at 100%.")}
                  className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-700/80 hover:border-cyan-500/40 text-[11px] font-mono text-slate-300 text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">"Diagnostics grand"</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVoice("Incoming threat vector, boss! Deploying flight stabilizers now.")}
                  className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-700/80 hover:border-cyan-500/40 text-[11px] font-mono text-slate-300 text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">"Threat vector, boss"</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestVoice("Ah, no bother at all, boss. All sorted.")}
                  className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-cyan-950/60 border border-slate-700/80 hover:border-cyan-500/40 text-[11px] font-mono text-slate-300 text-left transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate">"No bother at all, boss"</span>
                </button>
              </div>
            </div>

            {/* Voice Selection */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-mono text-slate-400">
                  Voice Profile (Device Synthesizer)
                </label>
                <span className="text-[10px] font-mono text-emerald-400">
                  ☘️ Irish Prioritized
                </span>
              </div>
              <select
                value={voiceSettings.voiceURI || ''}
                onChange={(e) => onUpdateVoiceSettings({ voiceURI: e.target.value || null })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 outline-none focus:border-cyan-400 font-mono text-xs"
              >
                <option value="">
                  ⭐ Auto (Irish Friday Voice - Moira / Orla / Celtic Preferred)
                </option>
                {availableVoices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {formatVoiceLabel(v)}
                  </option>
                ))}
              </select>
            </div>

            {/* Speaking Speed / Rate */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Speaking Rate (Cadence)</span>
                <span className="text-cyan-300 font-semibold">{voiceSettings.rate}x {voiceSettings.rate === 1.04 && '· Friday Preset'}</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.02"
                value={voiceSettings.rate}
                onChange={(e) => onUpdateVoiceSettings({ rate: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Pitch */}
            <div>
              <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Vocal Pitch (Irish Lilt)</span>
                <span className="text-cyan-300 font-semibold">{voiceSettings.pitch} {voiceSettings.pitch === 1.08 && '· Kerry Condon Preset'}</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.3"
                step="0.02"
                value={voiceSettings.pitch}
                onChange={(e) => onUpdateVoiceSettings({ pitch: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Wake Word Tip */}
            <div className="p-2.5 rounded bg-cyan-950/30 border border-cyan-500/20 text-[11px] font-mono text-slate-300">
              <span className="text-cyan-300 font-semibold block mb-0.5">Hands-Free Wake Phrase:</span>
              When enabled in the top header, say <span className="text-cyan-200">"Hey Friday"</span> or <span className="text-cyan-200">"Friday"</span> from anywhere in the room.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
