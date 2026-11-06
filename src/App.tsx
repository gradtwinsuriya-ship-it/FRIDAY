import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HudHeader } from './components/HudHeader';
import { ArcReactor } from './components/ArcReactor';
import { TranscriptConsole } from './components/TranscriptConsole';
import { SidePanel } from './components/SidePanel';
import { ChatMessage, TimerItem, NoteItem, AssistantState, VoiceSettings, ToolBadge } from './types';
import { hudAudio, speakResponse, stopSpeaking, unlockAudioAndSpeech } from './utils/audio';
import { FridaySpeechController } from './utils/speechRecognition';
import { AlertCircle, ExternalLink, ShieldCheck } from 'lucide-react';

const INITIAL_NOTES: NoteItem[] = [
  {
    id: 'note-1',
    text: 'Call me Boss or Tony. Prefers metric units for engineering and Celsius for weather.',
    createdAt: Date.now() - 86400000,
  },
  {
    id: 'note-2',
    text: 'Priority projects: Mark L nanotech armor and orbital clean energy grid.',
    createdAt: Date.now() - 43200000,
  },
];

export default function App() {
  // Assistant State
  const [assistantState, setAssistantState] = useState<AssistantState>('idle');
  const [micVolume, setMicVolume] = useState<number>(0);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('friday_chat_messages');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [
      {
        id: 'welcome-1',
        role: 'friday',
        text: 'Good morning, boss. F.R.I.D.A.Y. tactical systems are fully operational and ready for your command.',
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        badges: [{ name: 'system', badge: 'Irish Tactical Core Online' }],
      },
    ];
  });

  // Timers State
  const [timers, setTimers] = useState<TimerItem[]>(() => {
    const saved = localStorage.getItem('friday_timers');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return [];
  });

  // Memory Notes State
  const [notes, setNotes] = useState<NoteItem[]>(() => {
    const saved = localStorage.getItem('friday_memory_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return INITIAL_NOTES;
  });

  // Voice Settings State - Configured for Kerry Condon's Irish Friday Persona
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettings>(() => {
    const saved = localStorage.getItem('friday_voice_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          voiceURI: parsed.voiceURI ?? null,
          rate: parsed.rate ?? 1.04,
          pitch: parsed.pitch ?? 1.08,
          volume: parsed.volume ?? 1.0,
          isMuted: parsed.isMuted ?? false,
          handsFree: parsed.handsFree ?? false,
          useNeuralTts: parsed.useNeuralTts ?? true,
        };
      } catch {}
    }
    return {
      voiceURI: null,
      rate: 1.04, // Crisp, natural Irish conversational cadence
      pitch: 1.08, // Kerry Condon's warm melodic pitch
      volume: 1.0,
      isMuted: false,
      handsFree: false,
      useNeuralTts: true,
    };
  });

  const [inputText, setInputText] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [activeNavView, setActiveNavView] = useState<'terminal' | 'timers' | 'memory'>('terminal');
  const [activeSideTab, setActiveSideTab] = useState<'all' | 'timers' | 'memory' | 'settings'>('timers');
  const [systemAlert, setSystemAlert] = useState<{ message: string; url?: string } | null>(null);

  // Stable references to prevent Speech Recognition from reinitializing on every state change
  const speechControllerRef = useRef<FridaySpeechController | null>(null);
  const voiceSettingsRef = useRef(voiceSettings);
  const handleSendMessageRef = useRef<(text: string) => Promise<void>>(async () => {});

  useEffect(() => {
    voiceSettingsRef.current = voiceSettings;
  }, [voiceSettings]);

  // Sync state to LocalStorage
  useEffect(() => {
    localStorage.setItem('friday_chat_messages', JSON.stringify(messages.slice(-30)));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('friday_timers', JSON.stringify(timers));
  }, [timers]);

  useEffect(() => {
    localStorage.setItem('friday_memory_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    localStorage.setItem('friday_voice_settings', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  // Handle Speech from Friday (Irish Voice Core)
  const speakFridayReply = useCallback(
    (text: string, onDone?: () => void) => {
      // Pause speech recognition while Friday speaks so she doesn't hear herself
      speechControllerRef.current?.pauseForSpeech();
      setAssistantState('speaking');

      speakResponse(text, {
        voiceURI: voiceSettings.voiceURI,
        rate: voiceSettings.rate,
        pitch: voiceSettings.pitch,
        volume: voiceSettings.volume,
        isMuted: voiceSettings.isMuted,
        useNeuralTts: voiceSettings.useNeuralTts,
        onStart: () => setAssistantState('speaking'),
        onEnd: () => {
          setAssistantState('idle');
          speechControllerRef.current?.resumeAfterSpeech();
          onDone?.();
        },
        onError: () => {
          setAssistantState('idle');
          speechControllerRef.current?.resumeAfterSpeech();
          onDone?.();
        },
      });
    },
    [voiceSettings]
  );

  // Process User Message to Gemini
  const handleSendMessage = useCallback(
    async (text: string) => {
      const cleanText = text.trim();
      if (!cleanText) return;

      unlockAudioAndSpeech();
      hudAudio.playSendChime(voiceSettings.isMuted);

      const userMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'user',
        text: cleanText,
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, userMsg]);
      setAssistantState('thinking');
      setInterimTranscript('');

      try {
        const clientTime = new Date().toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: cleanText,
            history: messages.slice(-8),
            savedNotes: notes,
            clientTime,
            clientTimezone,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server returned HTTP ${response.status}`);
        }

        // Process SSE Stream
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let accumulatedReply = '';
        let toolBadges: ToolBadge[] = [];

        if (reader) {
          let buffer = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('event: ')) {
                const eventType = line.split('\n')[0].replace('event: ', '').trim();
                const dataLine = line.split('\n').find((l) => l.startsWith('data: '));
                if (dataLine) {
                  try {
                    const data = JSON.parse(dataLine.replace('data: ', ''));
                    if (eventType === 'tool_call') {
                      hudAudio.playToolChime(voiceSettings.isMuted);
                    } else if (eventType === 'chunk') {
                      accumulatedReply += data.text || '';
                    } else if (eventType === 'done') {
                      accumulatedReply = data.text || accumulatedReply;
                      toolBadges = data.badges || [];

                      // Execute client-side tool actions
                      if (Array.isArray(data.clientActions)) {
                        for (const action of data.clientActions) {
                          if (action.type === 'SET_TIMER') {
                            const secs = Math.round(action.minutes * 60);
                            const newTimer: TimerItem = {
                              id: action.id || Date.now().toString(),
                              label: action.label || 'Timer',
                              totalSeconds: secs,
                              remainingSeconds: secs,
                              isRunning: true,
                              isCompleted: false,
                              createdAt: Date.now(),
                            };
                            setTimers((prev) => [newTimer, ...prev]);
                            setActiveSideTab('timers');
                          } else if (action.type === 'SAVE_NOTE') {
                            const newNote: NoteItem = {
                              id: action.id || Date.now().toString(),
                              text: action.note,
                              createdAt: Date.now(),
                            };
                            setNotes((prev) => [newNote, ...prev]);
                          } else if (action.type === 'OPEN_WEBSITE') {
                            setSystemAlert({
                              message: `Access link ready for ${action.title}:`,
                              url: action.url,
                            });
                          }
                        }
                      }
                    }
                  } catch {}
                }
              }
            }
          }
        }

        const finalReply = accumulatedReply.trim() || 'Command acknowledged, boss.';

        // Add Friday's message to chat log
        const fridayMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'friday',
          text: finalReply,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          badges: toolBadges,
        };

        setMessages((prev) => [...prev, fridayMsg]);

        // Speak Friday's reply aloud
        speakFridayReply(finalReply);
      } catch (err: any) {
        console.error('Error contacting Friday brain:', err);
        const errorReply = 'I seem to have encountered an unexpected system fault, boss. Our neural link may need a moment.';
        setAssistantState('error');
        const fridayErrorMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'friday',
          text: errorReply,
          timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          badges: [{ name: 'error', badge: 'Neural Anomaly' }],
        };
        setMessages((prev) => [...prev, fridayErrorMsg]);
        speakFridayReply(errorReply);
      }
    },
    [messages, notes, voiceSettings, speakFridayReply]
  );

  // Keep ref up to date
  useEffect(() => {
    handleSendMessageRef.current = handleSendMessage;
  });

  // Initialize Speech Recognition ONCE on mount
  useEffect(() => {
    const controller = new FridaySpeechController({
      onWakeWordDetected: () => {
        hudAudio.playWakeChime(voiceSettingsRef.current.isMuted);
        setAssistantState('listening');
      },
      onListeningStart: () => {
        setAssistantState('listening');
      },
      onInterimResult: (transcript) => {
        setInterimTranscript(transcript);
      },
      onFinalResult: (transcript) => {
        setInterimTranscript('');
        handleSendMessageRef.current(transcript);
      },
      onAudioVolume: (volume) => {
        setMicVolume(volume);
      },
      onError: (error) => {
        if (error === 'not-allowed') {
          const micError = "Microphone access was denied, boss. Please verify your browser permissions.";
          setAssistantState('error');
          speakResponse(micError, {
            isMuted: voiceSettingsRef.current.isMuted,
          });
        } else {
          setAssistantState('idle');
        }
      },
    });

    speechControllerRef.current = controller;
    if (voiceSettingsRef.current.handsFree) {
      controller.setHandsFree(true);
    }

    return () => {
      controller.abort();
    };
  }, []);

  // Update hands-free state on controller when toggled
  useEffect(() => {
    speechControllerRef.current?.setHandsFree(voiceSettings.handsFree);
  }, [voiceSettings.handsFree]);

  // Timers countdown tick
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimers((prevTimers) => {
        let hasChanges = false;
        const updated = prevTimers.map((timer) => {
          if (!timer.isRunning || timer.isCompleted) return timer;

          hasChanges = true;
          const nextRemaining = timer.remainingSeconds - 1;

          if (nextRemaining <= 0) {
            hudAudio.playAlarmChime(voiceSettings.isMuted);
            speakFridayReply(`Boss, your timer for ${timer.label} has elapsed.`);

            setMessages((prev) => [
              ...prev,
              {
                id: Date.now().toString(),
                role: 'friday',
                text: `Alert: Countdown completed for "${timer.label}".`,
                timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                badges: [{ name: 'set_timer', badge: `Completed: ${timer.label}` }],
              },
            ]);

            return {
              ...timer,
              remainingSeconds: 0,
              isRunning: false,
              isCompleted: true,
            };
          }

          return {
            ...timer,
            remainingSeconds: nextRemaining,
          };
        });

        return hasChanges ? updated : prevTimers;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [voiceSettings.isMuted, speakFridayReply]);

  // Done speaking: immediately commit and send speech without waiting
  const handleDoneSpeaking = () => {
    const submitted = speechControllerRef.current?.commitAndSubmit();
    if (!submitted) {
      handleCancelListening();
    }
  };

  // Cancel listening
  const handleCancelListening = () => {
    speechControllerRef.current?.cancelListening();
    setInterimTranscript('');
    hudAudio.playCancelChime(voiceSettings.isMuted);
    setAssistantState('idle');
  };

  // Reactor Orb Click Handler (Toggle Mic / Send / Stop Speaking)
  const handleOrbClick = () => {
    unlockAudioAndSpeech();

    if (assistantState === 'speaking') {
      stopSpeaking();
      hudAudio.playCancelChime(voiceSettings.isMuted);
      setAssistantState('idle');
      speechControllerRef.current?.resumeAfterSpeech();
      return;
    }

    if (assistantState === 'listening') {
      // If user has spoken something, commit and send immediately!
      const submitted = speechControllerRef.current?.commitAndSubmit();
      if (submitted) {
        return;
      }
      // If nothing was spoken, cancel
      handleCancelListening();
      return;
    }

    // Start manual voice listening
    hudAudio.playWakeChime(voiceSettings.isMuted);
    setAssistantState('listening');
    speechControllerRef.current?.startManualListening();
  };

  // Toggle Hands-Free
  const handleToggleHandsFree = () => {
    const nextVal = !voiceSettings.handsFree;
    setVoiceSettings((prev) => ({ ...prev, handsFree: nextVal }));
    if (nextVal) {
      hudAudio.playWakeChime(voiceSettings.isMuted);
    }
  };

  // Stop Speaking Button
  const handleStopSpeaking = () => {
    stopSpeaking();
    hudAudio.playCancelChime(voiceSettings.isMuted);
    setAssistantState('idle');
    speechControllerRef.current?.resumeAfterSpeech();
  };

  // Timer Management
  const handleAddTimer = (minutes: number, label: string) => {
    const secs = Math.round(minutes * 60);
    const newTimer: TimerItem = {
      id: Date.now().toString(),
      label,
      totalSeconds: secs,
      remainingSeconds: secs,
      isRunning: true,
      isCompleted: false,
      createdAt: Date.now(),
    };
    setTimers((prev) => [newTimer, ...prev]);
    hudAudio.playToolChime(voiceSettings.isMuted);
  };

  const handleDeleteTimer = (id: string) => {
    setTimers((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToggleTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isRunning: !t.isRunning } : t))
    );
  };

  const handleResetTimer = (id: string) => {
    setTimers((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, remainingSeconds: t.totalSeconds, isRunning: false, isCompleted: false } : t
      )
    );
  };

  // Memory Notes Management
  const handleAddNote = (text: string) => {
    const newNote: NoteItem = {
      id: Date.now().toString(),
      text,
      createdAt: Date.now(),
    };
    setNotes((prev) => [newNote, ...prev]);
    hudAudio.playToolChime(voiceSettings.isMuted);
  };

  const handleDeleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleClearAllNotes = () => {
    setNotes([]);
    hudAudio.playCancelChime(voiceSettings.isMuted);
  };

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 hud-grid-bg flex flex-col font-body selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Header */}
      <HudHeader
        state={assistantState}
        isMuted={voiceSettings.isMuted}
        onToggleMute={() => setVoiceSettings((prev) => ({ ...prev, isMuted: !prev.isMuted }))}
        isHandsFree={voiceSettings.handsFree}
        onToggleHandsFree={handleToggleHandsFree}
        onStopSpeaking={handleStopSpeaking}
        activeView={activeNavView}
        setActiveView={(v) => {
          setActiveNavView(v);
          if (v === 'timers') setActiveSideTab('timers');
          if (v === 'memory') setActiveSideTab('memory');
        }}
        timerCount={timers.length}
        notesCount={notes.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center Area: Arc Reactor + Transcript Console */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {/* Top Arc Reactor Section */}
          <div className="hud-panel rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center relative overflow-hidden hud-bracket">
            {/* Background Corner Decals */}
            <div className="absolute top-3 left-4 flex items-center gap-2 text-[10px] font-mono text-cyan-400/60 uppercase">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ARK PROTOCOL · ACTIVE</span>
            </div>
            <div className="absolute top-3 right-4 text-[10px] font-mono text-slate-500">
              SYS VER: 5.1.0
            </div>

            {/* Arc Reactor Centerpiece with Live Volume reactivity */}
            <ArcReactor
              state={assistantState}
              onClick={handleOrbClick}
              isMuted={voiceSettings.isMuted}
              micVolume={micVolume}
            />

            {/* Quick status prompt hint below orb */}
            <div className="mt-2 text-center text-xs font-mono text-slate-400 max-w-md">
              {assistantState === 'listening' ? (
                <span className="text-cyan-300 font-semibold animate-pulse">
                  Listening... auto-sends 1.2s after pause, or click reactor to send now.
                </span>
              ) : assistantState === 'thinking' ? (
                <span className="text-amber-300 font-semibold">
                  Analyzing query through Gemini neural pipeline...
                </span>
              ) : assistantState === 'speaking' ? (
                <span className="text-orange-300 font-semibold">
                  Friday is speaking. Click the reactor or "Silence" to stop.
                </span>
              ) : (
                <span>
                  Tap the Arc Reactor or say{' '}
                  <span className="text-cyan-300 font-semibold">"Hey Friday"</span> to speak.
                </span>
              )}
            </div>
          </div>

          {/* Holographic Console with Instant Send Controls */}
          <TranscriptConsole
            messages={messages}
            interimTranscript={interimTranscript}
            assistantState={assistantState}
            inputText={inputText}
            setInputText={setInputText}
            onSendMessage={handleSendMessage}
            onToggleMic={handleOrbClick}
            onReplaySpeech={(text) => speakFridayReply(text)}
            onClearMessages={() => setMessages([])}
            micVolume={micVolume}
            onDoneSpeaking={handleDoneSpeaking}
            onCancelListening={handleCancelListening}
          />
        </div>

        {/* Right Area: HUD Side Panel (Timers, Memory Bank, Clock) */}
        <aside className="lg:col-span-4 flex flex-col gap-4">
          <SidePanel
            timers={timers}
            notes={notes}
            voiceSettings={voiceSettings}
            onUpdateVoiceSettings={(updated) => setVoiceSettings((prev) => ({ ...prev, ...updated }))}
            onAddTimer={handleAddTimer}
            onDeleteTimer={handleDeleteTimer}
            onToggleTimer={handleToggleTimer}
            onResetTimer={handleResetTimer}
            onAddNote={handleAddNote}
            onDeleteNote={handleDeleteNote}
            onClearAllNotes={handleClearAllNotes}
            activeTab={activeSideTab}
            setActiveTab={setActiveSideTab}
          />
        </aside>
      </main>

      {/* Floating System Alert */}
      {systemAlert && (
        <div className="fixed bottom-4 right-4 z-50 max-w-md bg-slate-900 border border-cyan-400 p-4 rounded-xl shadow-2xl flex items-start gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <p className="text-slate-200">{systemAlert.message}</p>
            {systemAlert.url && (
              <a
                href={systemAlert.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-cyan-300 hover:underline font-mono font-semibold"
                onClick={() => setSystemAlert(null)}
              >
                <span>Launch Link</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <button
            onClick={() => setSystemAlert(null)}
            className="text-slate-500 hover:text-slate-300 cursor-pointer text-xs font-mono ml-2"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
