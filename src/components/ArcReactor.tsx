import React from 'react';
import { AssistantState } from '../types';

interface ArcReactorProps {
  state: AssistantState;
  onClick: () => void;
  isMuted?: boolean;
  micVolume?: number; // 0 to 100
}

export const ArcReactor: React.FC<ArcReactorProps> = ({ state, onClick, micVolume = 0 }) => {
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isSpeaking = state === 'speaking';
  const isError = state === 'error';

  // Dynamic scale boost based on voice volume while listening
  const volumeScale = isListening ? 1 + (micVolume / 100) * 0.15 : 1;
  const volumeGlowOpacity = isListening ? 0.3 + (micVolume / 100) * 0.4 : 0.2;

  return (
    <div className="relative flex flex-col items-center justify-center py-6 select-none">
      {/* Outer Glow Halo */}
      <div
        style={{
          opacity: isListening ? volumeGlowOpacity : undefined,
          transform: `scale(${volumeScale})`,
        }}
        className={`absolute rounded-full transition-all duration-300 pointer-events-none blur-3xl ${
          isSpeaking
            ? 'w-72 h-72 bg-gradient-to-tr from-cyan-500/25 via-sky-400/20 to-orange-500/20 opacity-90 scale-110'
            : isThinking
            ? 'w-64 h-64 bg-gradient-to-r from-orange-500/25 via-amber-400/20 to-cyan-500/25 opacity-85 animate-pulse'
            : isListening
            ? 'w-72 h-72 bg-cyan-400/40'
            : isError
            ? 'w-64 h-64 bg-rose-500/20 opacity-80'
            : 'w-60 h-60 bg-cyan-500/15 opacity-60'
        }`}
      />

      {/* Acoustic Ripple Rings (active during Speaking and Listening) */}
      {(isSpeaking || isListening) && (
        <>
          <div className="absolute w-56 h-56 rounded-full border border-cyan-400/40 animate-ping pointer-events-none [animation-duration:2.4s]" />
          <div className="absolute w-64 h-64 rounded-full border border-cyan-300/20 animate-ping pointer-events-none [animation-duration:3.2s] [animation-delay:0.8s]" />
          {isSpeaking && (
            <div className="absolute w-72 h-72 rounded-full border border-orange-400/25 animate-ping pointer-events-none [animation-duration:2.8s] [animation-delay:1.4s]" />
          )}
        </>
      )}

      {/* Main Interactive Reactor Core Frame */}
      <button
        onClick={onClick}
        aria-label={`F.R.I.D.A.Y. Reactor Orb: ${state}. Click to interact.`}
        className="relative group cursor-pointer w-48 h-48 md:w-56 md:h-56 rounded-full flex items-center justify-center p-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 transition-transform active:scale-95"
      >
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full overflow-visible drop-shadow-[0_0_20px_rgba(6,182,212,0.45)]"
        >
          <defs>
            {/* Core Radial Gradients */}
            <radialGradient id="reactorCoreGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isThinking ? '#fff' : isSpeaking ? '#e0f2fe' : '#ffffff'} />
              <stop offset="35%" stopColor={isThinking ? '#f97316' : '#22d3ee'} />
              <stop offset="70%" stopColor={isThinking ? '#ea580c' : '#0891b2'} />
              <stop offset="100%" stopColor="#030712" stopOpacity="0.9" />
            </radialGradient>

            <radialGradient id="plasmaGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isThinking ? '#fb923c' : '#38bdf8'} stopOpacity="0.9" />
              <stop offset="60%" stopColor={isThinking ? '#c2410c' : '#0e7490'} stopOpacity="0.4" />
              <stop offset="100%" stopColor="#020617" stopOpacity="0" />
            </radialGradient>

            {/* Linear Segment Gradients */}
            <linearGradient id="cyanAccent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00f0ff" />
              <stop offset="100%" stopColor="#0284c7" />
            </linearGradient>

            <linearGradient id="orangeAccent" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff8c00" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {/* Outer Housing Ring */}
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke="rgba(14, 116, 144, 0.35)"
            strokeWidth="1.5"
            strokeDasharray="4 6"
          />

          {/* Outer Segmented HUD Ring (Rotates) */}
          <g
            className={`origin-center transition-all ${
              isThinking
                ? 'animate-spin [animation-duration:4s]'
                : isSpeaking
                ? 'animate-spin [animation-duration:12s]'
                : isListening
                ? 'animate-spin [animation-duration:18s]'
                : 'animate-spin [animation-duration:45s]'
            }`}
          >
            <circle
              cx="100"
              cy="100"
              r="84"
              fill="none"
              stroke={isThinking ? 'url(#orangeAccent)' : 'url(#cyanAccent)'}
              strokeWidth="2.5"
              strokeDasharray="48 12 24 16 36 8"
              strokeLinecap="round"
              opacity="0.85"
            />
            {/* Degree Tick Markers on Outer Ring */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
              <line
                key={deg}
                x1="100"
                y1="12"
                x2="100"
                y2="17"
                stroke={deg % 90 === 0 ? '#22d3ee' : 'rgba(34, 211, 238, 0.4)'}
                strokeWidth={deg % 90 === 0 ? '2' : '1'}
                transform={`rotate(${deg} 100 100)`}
              />
            ))}
          </g>

          {/* Middle Counter-Rotating Ring */}
          <g
            className={`origin-center transition-all ${
              isThinking
                ? 'animate-spin [animation-duration:3s] [animation-direction:reverse]'
                : isSpeaking
                ? 'animate-spin [animation-duration:9s] [animation-direction:reverse]'
                : 'animate-spin [animation-duration:30s] [animation-direction:reverse]'
            }`}
          >
            <circle
              cx="100"
              cy="100"
              r="72"
              fill="none"
              stroke={isThinking ? '#f97316' : '#06b6d4'}
              strokeWidth="1.5"
              strokeDasharray="18 10 32 8"
              opacity="0.7"
            />
            {/* 10 Arc Reactor Inductor Coils (Stark Industries Mark L style) */}
            {[0, 36, 72, 108, 144, 180, 216, 252, 288, 324].map((angle, idx) => (
              <g key={angle} transform={`rotate(${angle} 100 100)`}>
                {/* Copper/Holographic Coil Wedge */}
                <rect
                  x="96.5"
                  y="26"
                  width="7"
                  height="12"
                  rx="1.5"
                  fill={
                    isThinking && idx % 2 === 0
                      ? '#ea580c'
                      : isSpeaking
                      ? idx % 2 === 0 ? '#06b6d4' : '#f97316'
                      : '#0891b2'
                  }
                  stroke={isThinking ? '#fdba74' : '#67e8f9'}
                  strokeWidth="0.8"
                />
                <line
                  x1="100"
                  y1="26"
                  x2="100"
                  y2="38"
                  stroke={isThinking ? '#fff7ed' : '#ecfeff'}
                  strokeWidth="1"
                  opacity="0.9"
                />
              </g>
            ))}
          </g>

          {/* Inner Stabilizer Ring */}
          <circle
            cx="100"
            cy="100"
            r="54"
            fill="none"
            stroke={isThinking ? '#ea580c' : '#22d3ee'}
            strokeWidth="2"
            strokeDasharray="12 4"
            opacity="0.8"
          />

          {/* Pulsing Plasma Energy Field with Volume Reactivity */}
          <circle
            cx="100"
            cy="100"
            r="44"
            fill="url(#plasmaGlow)"
            style={{
              transformOrigin: '100px 100px',
              transform: isListening ? `scale(${1 + (micVolume / 100) * 0.25})` : undefined,
            }}
            className={`transition-transform duration-100 origin-center ${
              isSpeaking
                ? 'animate-pulse [animation-duration:0.6s]'
                : isListening
                ? ''
                : isThinking
                ? 'scale-110 [animation-duration:0.4s]'
                : 'scale-95'
            }`}
          />

          {/* Core Arc Reactor Center Node */}
          <circle
            cx="100"
            cy="100"
            r="32"
            fill="url(#reactorCoreGrad)"
            stroke={isThinking ? '#fed7aa' : '#a5f3fc'}
            strokeWidth="2.5"
            className="filter drop-shadow-[0_0_15px_rgba(34,211,238,0.85)]"
          />

          {/* Central Triangular / Hexagonal Inertial Lock */}
          <g
            className={`origin-center ${
              isThinking
                ? 'animate-spin [animation-duration:2s]'
                : isSpeaking
                ? 'animate-spin [animation-duration:6s]'
                : ''
            }`}
          >
            <polygon
              points="100,76 120,112 80,112"
              fill="none"
              stroke={isThinking ? '#ffffff' : '#e0f2fe'}
              strokeWidth="2"
              strokeLinejoin="round"
              opacity="0.9"
            />
            <circle
              cx="100"
              cy="100"
              r="6"
              fill={isThinking ? '#ffffff' : '#ffffff'}
              className="drop-shadow-[0_0_8px_#ffffff]"
            />
          </g>
        </svg>

        {/* Center Hover Label */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/60 rounded-full backdrop-blur-xs">
          <span className="text-[10px] uppercase tracking-widest font-mono font-bold text-cyan-300">
            {isListening ? 'Click to Finish & Send' : isSpeaking ? 'Click to Silence' : 'Click to Speak'}
          </span>
        </div>
      </button>

      {/* State Badge & Audio Waveform Preview */}
      <div className="mt-3 flex flex-col items-center gap-1.5">
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-cyan-500/30 text-xs font-mono tracking-wider">
          <span
            className={`w-2 h-2 rounded-full ${
              isListening
                ? 'bg-cyan-400 animate-ping'
                : isThinking
                ? 'bg-amber-400 animate-pulse'
                : isSpeaking
                ? 'bg-orange-400 animate-bounce'
                : isError
                ? 'bg-rose-500'
                : 'bg-cyan-600'
            }`}
          />
          <span className="text-slate-300 uppercase font-semibold">
            {isListening
              ? micVolume > 15
                ? 'VOICE DETECTED...'
                : 'LISTENING... (SPEAK NOW)'
              : isThinking
              ? 'ANALYZING INTENT...'
              : isSpeaking
              ? 'TRANSMITTING...'
              : isError
              ? 'OFFLINE / ANOMALY'
              : 'IDLE // STANDBY'}
          </span>
        </div>

        {/* Real Mic Volume Level Bar while Listening */}
        {isListening && (
          <div className="flex items-center gap-2 text-[10px] font-mono text-cyan-400">
            <span className="text-slate-500 text-[9px] uppercase tracking-widest">Mic Input</span>
            <div className="w-24 h-1.5 rounded-full bg-slate-800 overflow-hidden border border-cyan-500/30">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-sky-300 transition-all duration-75"
                style={{ width: `${Math.max(5, micVolume)}%` }}
              />
            </div>
          </div>
        )}

        {/* Speaking Frequency Equalizer Bar during speaking */}
        {isSpeaking && (
          <div className="flex items-end gap-1 h-4 mt-1">
            {[40, 75, 95, 60, 85, 100, 70, 50, 90, 65, 45, 80].map((h, i) => (
              <span
                key={i}
                style={{
                  height: `${h * 0.16}px`,
                  animationDuration: `${0.3 + (i % 4) * 0.1}s`,
                }}
                className="w-1 rounded-full animate-pulse bg-orange-400"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
