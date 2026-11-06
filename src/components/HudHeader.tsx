import React from 'react';
import { Volume2, VolumeX, Mic, MicOff, Square, Radio } from 'lucide-react';
import { AssistantState } from '../types';

interface HudHeaderProps {
  state: AssistantState;
  isMuted: boolean;
  onToggleMute: () => void;
  isHandsFree: boolean;
  onToggleHandsFree: () => void;
  onStopSpeaking: () => void;
  activeView: 'terminal' | 'timers' | 'memory';
  setActiveView: (view: 'terminal' | 'timers' | 'memory') => void;
  timerCount: number;
  notesCount: number;
}

export const HudHeader: React.FC<HudHeaderProps> = ({
  state,
  isMuted,
  onToggleMute,
  isHandsFree,
  onToggleHandsFree,
  onStopSpeaking,
  activeView,
  setActiveView,
  timerCount,
  notesCount,
}) => {
  const isSpeaking = state === 'speaking';

  return (
    <header className="border-b border-cyan-500/20 bg-slate-950/80 backdrop-blur-md px-4 sm:px-6 py-3 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee] animate-pulse" />
          <span className="font-hud text-lg sm:text-xl font-bold tracking-widest text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] whitespace-nowrap shrink-0">
            F.R.I.D.A.Y.
          </span>
          <span className="hidden lg:inline text-[11px] font-mono uppercase tracking-wider text-slate-500 border-l border-slate-800 pl-3">
            MARK L · TACTICAL OS
          </span>
        </div>

        {/* Zone 2: Navigation Links / View Selectors (Single line, whitespace-nowrap) */}
        <nav className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm font-mono text-slate-400 overflow-x-auto py-1 scrollbar-none">
          <button
            onClick={() => setActiveView('terminal')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 ${
              activeView === 'terminal'
                ? 'text-cyan-300 border-cyan-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Terminal Console
          </button>
          <button
            onClick={() => setActiveView('timers')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 ${
              activeView === 'timers'
                ? 'text-cyan-300 border-cyan-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Timers {timerCount > 0 && `(${timerCount})`}
          </button>
          <button
            onClick={() => setActiveView('memory')}
            className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer pb-0.5 border-b-2 ${
              activeView === 'memory'
                ? 'text-cyan-300 border-cyan-400 font-semibold'
                : 'border-transparent hover:text-slate-200'
            }`}
          >
            Memory Bank {notesCount > 0 && `(${notesCount})`}
          </button>
        </nav>

        {/* Zone 3: Quick Tactical Controls (1 primary action group, single-line) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Stop Speaking button (visible when speaking) */}
          {isSpeaking && (
            <button
              onClick={onStopSpeaking}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 text-xs font-mono transition-colors whitespace-nowrap shrink-0 cursor-pointer animate-pulse"
              title="Silence Friday speech"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span className="hidden sm:inline">Silence</span>
            </button>
          )}

          {/* Hands-Free Wake Mode Toggle */}
          <button
            onClick={onToggleHandsFree}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-mono border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              isHandsFree
                ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-slate-900 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={isHandsFree ? 'Hands-free "Hey Friday" listening active' : 'Enable hands-free wake word'}
          >
            <Radio className={`w-3.5 h-3.5 ${isHandsFree ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
            <span className="hidden md:inline">Hey Friday:</span>
            <span className={isHandsFree ? 'font-semibold text-cyan-300' : 'text-slate-400'}>
              {isHandsFree ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* Mute Voice Toggle */}
          <button
            onClick={onToggleMute}
            className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded text-xs font-mono border transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              isMuted
                ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20'
            }`}
            title={isMuted ? 'Voice is Muted (Click to Unmute)' : 'Voice is Active (Click to Mute)'}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{isMuted ? 'Muted' : 'Voice'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
