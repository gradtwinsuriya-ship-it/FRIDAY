/**
 * Web Audio API synthesizer for futuristic HUD sound effects
 * and resilient SpeechSynthesis interface for Friday's voice output.
 */

class SoundEffectsManager {
  private ctx: AudioContext | null = null;

  public getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  // Wake chime when "Hey Friday" or Mic is activated
  public playWakeChime(isMuted = false) {
    if (isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }

  // Sent chime when command is dispatched
  public playSendChime(isMuted = false) {
    if (isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(640, now);
      osc.frequency.linearRampToValueAtTime(740, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {}
  }

  // Tool activation sound
  public playToolChime(isMuted = false) {
    if (isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(780, now);
      osc.frequency.setValueAtTime(1040, now + 0.06);

      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  // Cancel / Stop sound
  public playCancelChime(isMuted = false) {
    if (isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch {}
  }

  // Timer finished alarm chime
  public playAlarmChime(isMuted = false) {
    if (isMuted) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      [0, 0.18, 0.36].forEach((offset) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(880, now + offset);

        gain.gain.setValueAtTime(0.15, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.13);
      });
    } catch {}
  }
}

export const hudAudio = new SoundEffectsManager();

/**
 * Text cleaner for SpeechSynthesis
 * Strips markdown symbols, asterisks, URLs, code blocks for natural speech
 */
export function cleanTextForSpeech(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/```[\s\S]*?```/g, 'Code block omitted.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[*_~#]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

// Cached voices
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    cachedVoices = voices;
  }
  return cachedVoices;
}

if (typeof window !== 'undefined' && window.speechSynthesis) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    refreshVoices();
  };
}

/**
 * Check if a voice has an authentic Irish accent (Kerry Condon Friday Voice)
 */
export function isIrishVoice(voice: SpeechSynthesisVoice): boolean {
  const lang = (voice.lang || '').toLowerCase();
  const name = (voice.name || '').toLowerCase();

  return (
    lang.startsWith('en-ie') ||
    lang === 'ga-ie' ||
    name.includes('ireland') ||
    name.includes('irish') ||
    name.includes('moira') || // Famous built-in Apple Irish female voice
    name.includes('orla') // Microsoft Irish natural female voice
  );
}

/**
 * Formats a voice label for the HUD selector with authentic Irish Friday badges
 */
export function formatVoiceLabel(voice: SpeechSynthesisVoice): string {
  if (isIrishVoice(voice)) {
    return `☘️ [Irish - Friday Voice] ${voice.name} (${voice.lang})`;
  }
  const lang = (voice.lang || '').toLowerCase();
  if (lang.startsWith('en-gb') || voice.name.toLowerCase().includes('fiona')) {
    return `🇬🇧 [UK/Celtic] ${voice.name} (${voice.lang})`;
  }
  return `${voice.name} (${voice.lang})`;
}

/**
 * Retrieves voices prioritized for Kerry Condon's F.R.I.D.A.Y. persona:
 * 1. Authentic Irish female voices (en-IE: Moira, Orla, Google English Ireland)
 * 2. Celtic & UK female voices (en-GB: Fiona, Libby, Sonia, Hazel, Serena)
 * 3. Other high-quality female English voices
 */
export function getRecommendedFemaleVoices(): SpeechSynthesisVoice[] {
  const voices = refreshVoices();
  if (!voices || voices.length === 0) return [];

  const femaleKeywords = [
    'moira', // Apple Irish female voice
    'orla', // Microsoft Irish female voice
    'emily',
    'fiona', // Scottish Celtic
    'female',
    'google uk english female',
    'libby',
    'sonia',
    'hazel',
    'serena',
    'victoria',
    'samantha',
    'karen',
    'zira',
    'stephanie',
  ];

  const englishVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith('en'));
  const candidateList = englishVoices.length > 0 ? englishVoices : voices;

  return candidateList.slice().sort((a, b) => {
    const aIsIrish = isIrishVoice(a);
    const bIsIrish = isIrishVoice(b);
    if (aIsIrish && !bIsIrish) return -1;
    if (!aIsIrish && bIsIrish) return 1;

    const aName = (a.name || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    const aIsFemale = femaleKeywords.some((k) => aName.includes(k));
    const bIsFemale = femaleKeywords.some((k) => bName.includes(k));

    if (aIsFemale && !bIsFemale) return -1;
    if (!aIsFemale && bIsFemale) return 1;

    const aIsGb = a.lang.toLowerCase().includes('gb');
    const bIsGb = b.lang.toLowerCase().includes('gb');
    if (aIsGb && !bIsGb) return -1;
    if (!aIsGb && bIsGb) return 1;

    return aName.localeCompare(bName);
  });
}

/**
 * Unlock both Web Audio Context, SpeechSynthesis, and HTML5 Audio on user gesture
 */
export function unlockAudioAndSpeech() {
  hudAudio.getContext();
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {}
  }
}

// Global active utterance and active audio element to stop speech cleanly
let activeUtterance: SpeechSynthesisUtterance | null = null;
let currentAudioElement: HTMLAudioElement | null = null;
let keepAliveTimer: any = null;
let activeAbortController: AbortController | null = null;

export function stopSpeaking() {
  // Abort any ongoing neural TTS fetch
  if (activeAbortController) {
    try {
      activeAbortController.abort();
    } catch {}
    activeAbortController = null;
  }

  // Stop active HTML5 Audio (Gemini Neural TTS)
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
      currentAudioElement.src = '';
    } catch {}
    currentAudioElement = null;
  }

  // Stop browser SpeechSynthesis
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    try {
      window.speechSynthesis.cancel();
    } catch {}
    activeUtterance = null;
  }
}

/**
 * Fallback Web Speech synthesis using prioritized Irish/Celtic voices
 */
function speakViaWebSpeech(
  spokenText: string,
  options: {
    voiceURI?: string | null;
    rate?: number;
    pitch?: number;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    options.onEnd?.();
    return;
  }

  const synth = window.speechSynthesis;

  try {
    if (synth.paused) {
      synth.resume();
    }
  } catch {}

  const utterance = new SpeechSynthesisUtterance(spokenText);
  // Default to Friday's signature melodic Irish cadence: slightly faster (1.04x) and bright pitch (1.08)
  utterance.rate = options.rate ?? 1.04;
  utterance.pitch = options.pitch ?? 1.08;
  utterance.volume = options.volume ?? 1.0;
  utterance.lang = 'en-IE';

  const allVoices = refreshVoices();
  if (allVoices && allVoices.length > 0) {
    if (options.voiceURI) {
      const selected = allVoices.find((v) => v.voiceURI === options.voiceURI);
      if (selected) {
        utterance.voice = selected;
        utterance.lang = selected.lang || 'en-IE';
      }
    }
    if (!utterance.voice) {
      const recommended = getRecommendedFemaleVoices();
      if (recommended.length > 0) {
        utterance.voice = recommended[0];
        utterance.lang = recommended[0].lang || 'en-IE';
      }
    }
  }

  let hasFinished = false;
  const finishOnce = () => {
    if (hasFinished) return;
    hasFinished = true;
    if (keepAliveTimer) {
      clearInterval(keepAliveTimer);
      keepAliveTimer = null;
    }
    activeUtterance = null;
    options.onEnd?.();
  };

  utterance.onstart = () => {
    options.onStart?.();

    if (keepAliveTimer) clearInterval(keepAliveTimer);
    keepAliveTimer = setInterval(() => {
      try {
        if (synth.speaking && !synth.paused) {
          synth.pause();
          synth.resume();
        } else {
          clearInterval(keepAliveTimer);
          keepAliveTimer = null;
        }
      } catch {}
    }, 8000);
  };

  utterance.onend = () => {
    finishOnce();
  };

  utterance.onerror = (e) => {
    if (e.error !== 'canceled' && e.error !== 'interrupted') {
      console.warn('SpeechSynthesis notice:', e.error);
      options.onError?.(e);
    }
    finishOnce();
  };

  activeUtterance = utterance;
  (window as any).__fridayUtterance = utterance;

  try {
    synth.speak(utterance);
    if (synth.paused) {
      synth.resume();
    }
  } catch (err) {
    console.warn('SpeechSynthesis speak failed:', err);
    finishOnce();
    return;
  }

  const estimatedMs = Math.max(4000, Math.ceil((spokenText.length / 10) * 1000) + 4000);
  setTimeout(() => {
    if (activeUtterance === utterance && !synth.speaking && !synth.pending) {
      finishOnce();
    }
  }, estimatedMs);
}

/**
 * Speaks a response aloud using:
 * 1. Studio-grade Neural Irish Friday TTS via Gemini server endpoint (when available)
 * 2. Seamless local Irish / Celtic Web Speech fallback (Moira / Microsoft Orla / en-IE)
 */
export async function speakResponse(
  text: string,
  options: {
    voiceURI?: string | null;
    rate?: number;
    pitch?: number;
    volume?: number;
    isMuted?: boolean;
    useNeuralTts?: boolean;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
) {
  stopSpeaking();

  if (options.isMuted) {
    options.onEnd?.();
    return;
  }

  const spokenText = cleanTextForSpeech(text);
  if (!spokenText) {
    options.onEnd?.();
    return;
  }

  // 1. Try Gemini Neural Irish Friday Voice if enabled (default: true) and no specific local voice override
  const shouldTryNeural = options.useNeuralTts !== false && !options.voiceURI;

  if (shouldTryNeural) {
    const abortCtrl = new AbortController();
    activeAbortController = abortCtrl;

    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: spokenText }),
        signal: abortCtrl.signal,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.audio) {
          activeAbortController = null;
          const audio = new Audio(data.audio);
          currentAudioElement = audio;
          audio.volume = Math.max(0, Math.min(1, options.volume ?? 1.0));

          let started = false;
          audio.onplay = () => {
            started = true;
            options.onStart?.();
          };

          audio.onended = () => {
            currentAudioElement = null;
            options.onEnd?.();
          };

          audio.onerror = (e) => {
            console.warn('Audio playback error, falling back to local Irish voice:', e);
            currentAudioElement = null;
            speakViaWebSpeech(spokenText, options);
          };

          try {
            await audio.play();
            return;
          } catch (playErr) {
            console.warn('Audio play() rejected, falling back to local speech:', playErr);
            currentAudioElement = null;
          }
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      // Continue to local speech fallback
    } finally {
      if (activeAbortController === abortCtrl) {
        activeAbortController = null;
      }
    }
  }

  // 2. Seamless local Irish Web Speech fallback
  speakViaWebSpeech(spokenText, options);
}
