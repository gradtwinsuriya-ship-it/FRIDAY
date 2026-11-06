import React, { useRef, useEffect } from 'react';
import {
  Mic,
  Send,
  Volume2,
  Copy,
  Check,
  Sparkles,
  Clock,
  CloudSun,
  Timer,
  BookOpen,
  Globe,
  ExternalLink,
  RotateCcw,
  CheckCircle2,
  X,
} from 'lucide-react';
import { ChatMessage, AssistantState, ToolBadge } from '../types';

interface TranscriptConsoleProps {
  messages: ChatMessage[];
  interimTranscript: string;
  assistantState: AssistantState;
  inputText: string;
  setInputText: (val: string) => void;
  onSendMessage: (text: string) => void;
  onToggleMic: () => void;
  onReplaySpeech: (text: string) => void;
  onClearMessages: () => void;
  micVolume?: number;
  onDoneSpeaking?: () => void;
  onCancelListening?: () => void;
}

export const TranscriptConsole: React.FC<TranscriptConsoleProps> = ({
  messages,
  interimTranscript,
  assistantState,
  inputText,
  setInputText,
  onSendMessage,
  onToggleMic,
  onReplaySpeech,
  onClearMessages,
  micVolume = 0,
  onDoneSpeaking,
  onCancelListening,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, interimTranscript]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const isListening = assistantState === 'listening';
  const isThinking = assistantState === 'thinking';

  // Render appropriate icon for tool badge
  const renderToolIcon = (name: string) => {
    switch (name) {
      case 'get_time':
        return <Clock className="w-3.5 h-3.5 text-cyan-400" />;
      case 'get_weather':
        return <CloudSun className="w-3.5 h-3.5 text-amber-400" />;
      case 'set_timer':
        return <Timer className="w-3.5 h-3.5 text-orange-400" />;
      case 'save_note':
      case 'recall_notes':
        return <BookOpen className="w-3.5 h-3.5 text-sky-400" />;
      case 'search_web':
        return <Globe className="w-3.5 h-3.5 text-emerald-400" />;
      case 'open_website':
        return <ExternalLink className="w-3.5 h-3.5 text-indigo-400" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-cyan-400" />;
    }
  };

  const samplePrompts = [
    "What's the weather in Tokyo?",
    "Set a 3-minute timer for espresso",
    "Save note: Stark Industries meeting on Friday",
    "What time is it in London?",
    "Search web for latest Artemis space mission news",
  ];

  return (
    <div className="flex flex-col h-full hud-panel rounded-xl overflow-hidden hud-bracket">
      {/* Console Top Header */}
      <div className="px-4 py-2.5 bg-slate-950/70 border-b border-cyan-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          <span className="font-hud text-xs tracking-wider text-cyan-300 font-semibold uppercase">
            Holographic Comm Log
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            · {messages.length} transmission{messages.length === 1 ? '' : 's'}
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClearMessages}
            className="flex items-center gap-1 text-[11px] font-mono text-slate-400 hover:text-rose-400 transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-slate-900"
            title="Reset communications log"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Log</span>
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 min-h-[260px] max-h-[460px] scroll-smooth"
      >
        {messages.length === 0 && !interimTranscript && (
          <div className="flex flex-col items-center justify-center h-full text-center py-10 px-4">
            <div className="w-10 h-10 rounded-full border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-3 bg-cyan-950/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <p className="font-hud text-sm text-cyan-200 tracking-wide font-medium">
              F.R.I.D.A.Y. NEURAL SYSTEM ONLINE
            </p>
            <p className="text-xs font-mono text-slate-400 mt-1 max-w-sm">
              Press the Arc Reactor or say <span className="text-cyan-300 font-semibold">"Hey Friday"</span> to initiate voice commands.
            </p>

            {/* Quick Prompt Chips */}
            <div className="mt-5 flex flex-wrap justify-center gap-2 max-w-lg">
              {samplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => onSendMessage(prompt)}
                  className="text-[11px] font-mono px-2.5 py-1 rounded bg-slate-900/90 border border-cyan-500/25 text-slate-300 hover:border-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/30 transition-all text-left cursor-pointer"
                >
                  "{prompt}"
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Transcripts */}
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} transition-all`}
            >
              {/* Sender name & timestamp */}
              <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono text-slate-400">
                <span className={isUser ? 'text-slate-300 font-medium' : 'text-cyan-400 font-semibold'}>
                  {isUser ? 'BOSS' : 'F.R.I.D.A.Y.'}
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-slate-500">{msg.timestamp}</span>
              </div>

              {/* Message Bubble */}
              <div
                className={`group relative max-w-[85%] sm:max-w-[78%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-slate-800/90 text-slate-100 border border-slate-700/70 shadow-sm'
                    : 'bg-gradient-to-br from-slate-900/90 via-cyan-950/20 to-slate-900/90 text-slate-100 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.06)]'
                }`}
              >
                {/* Tool Badges (if any) */}
                {msg.badges && msg.badges.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5 pb-2 border-b border-cyan-500/15">
                    {msg.badges.map((b, i) => (
                      <div
                        key={i}
                        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-mono text-cyan-200"
                      >
                        {renderToolIcon(b.name)}
                        <span>{b.badge}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Message text */}
                <div className="font-body whitespace-pre-wrap">{msg.text}</div>

                {/* Action buttons (copy & replay) */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-950/80 rounded px-1 py-0.5 border border-slate-800">
                  {!isUser && (
                    <button
                      onClick={() => onReplaySpeech(msg.text)}
                      className="p-1 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                      title="Speak again"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleCopy(msg.id, msg.text)}
                    className="p-1 text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
                    title="Copy text"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Live Interim Speech Preview with Immediate Send Action */}
        {isListening && (
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono text-cyan-300">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>TRANSCRIBING LIVE SPEECH...</span>
              <span className="text-[10px] text-slate-400 hidden sm:inline">(Auto-sends 1.2s after pause)</span>
            </div>
            <div className="max-w-[85%] rounded-xl px-4 py-3 text-sm bg-cyan-950/40 border border-cyan-400/50 text-cyan-100 shadow-[0_0_15px_rgba(6,182,212,0.15)] flex flex-col gap-2">
              <p className="italic">
                {interimTranscript ? `"${interimTranscript}"` : 'Listening... Speak your command now.'}
              </p>

              {/* Fast Action Buttons during listening */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-cyan-500/20">
                {interimTranscript && (
                  <button
                    type="button"
                    onClick={onDoneSpeaking}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs font-bold transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Send Now</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={onCancelListening}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Thinking Indicator */}
        {isThinking && (
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2 mb-1 px-1 text-[11px] font-mono text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>F.R.I.D.A.Y. ANALYZING NEURAL CHANNELS...</span>
            </div>
            <div className="rounded-xl px-4 py-2.5 text-xs font-mono bg-amber-950/20 border border-amber-500/30 text-amber-200 flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.15s]" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.3s]" />
              </div>
              <span>Formulating reply...</span>
            </div>
          </div>
        )}
      </div>

      {/* Terminal Input Bar with Large Mic Button & Fallback */}
      <div className="p-3 bg-slate-950/80 border-t border-cyan-500/20">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* Large Mic Button with Live Audio Level */}
          <button
            type="button"
            onClick={isListening ? onDoneSpeaking : onToggleMic}
            className={`relative p-3 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isListening
                ? 'bg-cyan-500/30 border-cyan-300 text-cyan-200 shadow-[0_0_20px_rgba(6,182,212,0.6)] ring-2 ring-cyan-400/70'
                : 'bg-slate-900 border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/40 hover:border-cyan-400/60'
            }`}
            title={isListening ? 'Click to finish & send' : 'Start voice input'}
            aria-label={isListening ? 'Click to finish & send' : 'Start voice input'}
          >
            {isListening ? (
              <>
                <Mic className="w-5 h-5 animate-pulse text-cyan-300" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              </>
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>

          {/* Text Input Fallback */}
          <div className="relative flex-1">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? 'Listening to speech... (or type here)' : 'Type a command or query for Friday...'}
              className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-cyan-400/70 focus:ring-1 focus:ring-cyan-400/50 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-body outline-none transition-all"
            />
          </div>

          {/* Send Button */}
          <button
            type="submit"
            disabled={!inputText.trim() || isThinking}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:hover:bg-cyan-600 text-white font-mono text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Execute</span>
          </button>
        </form>
      </div>
    </div>
  );
};
