/**
 * Resilient Web Speech API controller for F.R.I.D.A.Y.:
 * - Hands-free "Hey Friday" wake word detection
 * - Push-to-talk manual voice input
 * - Fast interim text transcription (<350ms on final phrase, 750ms on pause)
 * - Automatic session buffer clearing to prevent transcript accumulation across turns
 * - Zero microphone hardware conflicts (pure native Web Speech API)
 * - Safe pausing during assistant speech output
 */

export interface SpeechRecognitionHandlers {
  onWakeWordDetected?: () => void;
  onListeningStart?: () => void;
  onInterimResult?: (transcript: string) => void;
  onFinalResult?: (transcript: string) => void;
  onError?: (error: string) => void;
  onStateChange?: (isListening: boolean) => void;
  onSpeechDetected?: (isSpeaking: boolean) => void;
  onAudioVolume?: (volume: number) => void;
}

export class FridaySpeechController {
  private recognition: any = null;
  private isHandsFreeMode = false;
  private isManualListening = false;
  private isAwakeAndListening = false;
  private isPausedForSpeech = false;
  private isRecognitionActive = false;
  private shouldKeepListening = false;
  private handlers: SpeechRecognitionHandlers = {};

  // Wake phrase regex: matches "friday", "hey friday", "ok friday", "hi friday", "hello friday"
  private wakePhraseRegex = /\b(?:hey|ok|okay|hi|hello)?\s*,?\s*friday\b/i;

  // Active transcription state
  private activeFullText = '';
  private silenceTimer: any = null;
  private wakeTimeoutTimer: any = null;
  private volumeDecayTimer: any = null;
  private currentVolume = 0;

  private readonly SILENCE_TIMEOUT_MS = 750; // Fast 750ms silence commit
  private readonly FINAL_PHRASE_COMMIT_MS = 350; // 350ms commit when Google engine confirms final

  constructor(handlers: SpeechRecognitionHandlers) {
    this.handlers = handlers;
    this.initRecognition();
  }

  public updateHandlers(handlers: SpeechRecognitionHandlers) {
    this.handlers = { ...this.handlers, ...handlers };
  }

  public isSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    );
  }

  private initRecognition() {
    if (!this.isSupported()) return;

    try {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      this.recognition.lang =
        (typeof navigator !== 'undefined' && navigator.language) || 'en-US';

      this.recognition.onstart = () => {
        this.isRecognitionActive = true;
        this.handlers.onStateChange?.(true);
        if (this.isManualListening || this.isAwakeAndListening) {
          this.handlers.onListeningStart?.();
        }
      };

      this.recognition.onspeechstart = () => {
        this.handlers.onSpeechDetected?.(true);
        this.simulateVolumePulse(75);
      };

      this.recognition.onspeechend = () => {
        this.handlers.onSpeechDetected?.(false);
        this.decayVolume();
      };

      this.recognition.onresult = (event: any) => {
        if (this.isPausedForSpeech) return;

        // Extract transcripts
        let currentInterim = '';
        let currentFinal = '';
        let hasFinalChunk = false;

        for (let i = 0; i < event.results.length; ++i) {
          const res = event.results[i];
          const transcript = res[0]?.transcript || '';
          if (res.isFinal) {
            currentFinal += transcript + ' ';
            hasFinalChunk = true;
          } else {
            currentInterim += transcript + ' ';
          }
        }

        const totalSessionText = (currentFinal + currentInterim).trim();
        if (!totalSessionText) return;

        // Visual volume reaction to voice activity
        this.simulateVolumePulse(85);

        // CASE 1: Passive Hands-Free Mode (Waiting for "Hey Friday")
        if (this.isHandsFreeMode && !this.isAwakeAndListening && !this.isManualListening) {
          if (this.wakePhraseRegex.test(totalSessionText)) {
            this.isAwakeAndListening = true;
            this.handlers.onWakeWordDetected?.();

            // Set a fallback watchdog: if no command is spoken within 8s, go back to sleep
            this.resetWakeTimeout();

            // Extract any command spoken immediately after the wake phrase
            const commandAfterWake = totalSessionText.replace(this.wakePhraseRegex, '').trim();
            if (commandAfterWake) {
              this.handleIncomingSpeech(commandAfterWake, hasFinalChunk);
            }
            return;
          }
        }

        // CASE 2: Active Command Mode (Manual Push-To-Talk OR Awakened Hands-Free)
        if (this.isManualListening || this.isAwakeAndListening) {
          this.resetWakeTimeout();

          // Strip wake phrase if present
          let commandText = totalSessionText.replace(this.wakePhraseRegex, '').trim();
          if (!commandText && this.isManualListening) {
            commandText = totalSessionText;
          }

          if (commandText) {
            this.handleIncomingSpeech(commandText, hasFinalChunk);
          }
        }
      };

      this.recognition.onerror = (event: any) => {
        this.decayVolume();
        if (event.error === 'aborted' || event.error === 'no-speech') {
          return;
        }
        console.warn('SpeechRecognition notice:', event.error);
        if (event.error === 'not-allowed') {
          this.handlers.onError?.(event.error);
        }
      };

      this.recognition.onend = () => {
        this.isRecognitionActive = false;
        this.handlers.onStateChange?.(false);
        this.handlers.onSpeechDetected?.(false);
        this.decayVolume();

        // Safely restart if continuous listening is desired and not paused
        if (this.shouldKeepListening && !this.isPausedForSpeech) {
          setTimeout(() => {
            if (this.shouldKeepListening && !this.isPausedForSpeech && !this.isRecognitionActive) {
              this.startRecognitionSafe();
            }
          }, 150);
        } else if (!this.isPausedForSpeech) {
          this.isManualListening = false;
          this.isAwakeAndListening = false;
        }
      };
    } catch (err) {
      console.warn('Failed to initialize SpeechRecognition:', err);
    }
  }

  private startRecognitionSafe() {
    if (!this.recognition || this.isRecognitionActive || this.isPausedForSpeech) return;
    try {
      this.recognition.start();
    } catch (err: any) {
      if (err.name === 'InvalidStateError') {
        this.isRecognitionActive = true;
      }
    }
  }

  private simulateVolumePulse(level: number) {
    this.currentVolume = Math.min(100, Math.max(30, level + (Math.random() * 20 - 10)));
    this.handlers.onAudioVolume?.(this.currentVolume);
    if (this.volumeDecayTimer) clearTimeout(this.volumeDecayTimer);
    this.volumeDecayTimer = setTimeout(() => {
      this.decayVolume();
    }, 250);
  }

  private decayVolume() {
    if (this.currentVolume > 0) {
      this.currentVolume = Math.max(0, this.currentVolume - 20);
      this.handlers.onAudioVolume?.(this.currentVolume);
      if (this.currentVolume > 0) {
        setTimeout(() => this.decayVolume(), 60);
      }
    }
  }

  private resetWakeTimeout() {
    if (this.wakeTimeoutTimer) clearTimeout(this.wakeTimeoutTimer);
    if (this.isHandsFreeMode && this.isAwakeAndListening) {
      this.wakeTimeoutTimer = setTimeout(() => {
        if (this.isAwakeAndListening && !this.activeFullText) {
          this.cancelListening();
        }
      }, 8000);
    }
  }

  private handleIncomingSpeech(text: string, isFinalPhrase: boolean) {
    this.activeFullText = text;
    this.handlers.onInterimResult?.(text);

    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    // If Google Speech engine already declared this chunk final, commit quickly (350ms)
    // Otherwise wait for silence timeout (750ms)
    const timeout = isFinalPhrase ? this.FINAL_PHRASE_COMMIT_MS : this.SILENCE_TIMEOUT_MS;

    this.silenceTimer = setTimeout(() => {
      this.commitAndSubmit();
    }, timeout);
  }

  /**
   * Commit the transcribed text and transmit immediately
   */
  public commitAndSubmit(): boolean {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.wakeTimeoutTimer) {
      clearTimeout(this.wakeTimeoutTimer);
      this.wakeTimeoutTimer = null;
    }

    const textToSubmit = this.activeFullText.trim();
    if (!textToSubmit) {
      return false;
    }

    // Reset internal state
    this.activeFullText = '';
    this.isManualListening = false;
    this.isAwakeAndListening = false;
    this.decayVolume();

    // Send result to Friday
    this.handlers.onFinalResult?.(textToSubmit);

    // CRITICAL: End current recognition session to completely wipe event.results buffer
    this.shouldKeepListening = this.isHandsFreeMode;
    try {
      this.recognition?.abort();
    } catch {}

    return true;
  }

  /**
   * Start manual push-to-talk listening
   */
  public startManualListening() {
    this.activeFullText = '';
    this.isManualListening = true;
    this.isAwakeAndListening = true;
    this.isPausedForSpeech = false;
    this.shouldKeepListening = true;

    // Reset any existing session buffer by aborting, then starting fresh
    try {
      this.recognition?.abort();
    } catch {}

    setTimeout(() => {
      this.startRecognitionSafe();
      this.handlers.onListeningStart?.();
    }, 50);
  }

  /**
   * Cancel listening without submitting
   */
  public cancelListening() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.wakeTimeoutTimer) {
      clearTimeout(this.wakeTimeoutTimer);
      this.wakeTimeoutTimer = null;
    }

    this.activeFullText = '';
    this.isManualListening = false;
    this.isAwakeAndListening = false;
    this.decayVolume();
    this.shouldKeepListening = this.isHandsFreeMode;

    try {
      this.recognition?.abort();
    } catch {}

    if (this.isHandsFreeMode && !this.isPausedForSpeech) {
      setTimeout(() => {
        this.startRecognitionSafe();
      }, 200);
    }
  }

  /**
   * Toggle Hands-Free "Hey Friday" mode
   */
  public setHandsFree(enabled: boolean) {
    this.isHandsFreeMode = enabled;
    this.shouldKeepListening = enabled;

    if (enabled && !this.isPausedForSpeech) {
      this.startRecognitionSafe();
    } else if (!this.isManualListening) {
      this.cancelListening();
    }
  }

  /**
   * Pause recognition while Friday is speaking aloud
   */
  public pauseForSpeech() {
    this.isPausedForSpeech = true;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.wakeTimeoutTimer) {
      clearTimeout(this.wakeTimeoutTimer);
      this.wakeTimeoutTimer = null;
    }
    try {
      this.recognition?.abort();
    } catch {}
  }

  /**
   * Resume recognition after Friday finishes speaking
   */
  public resumeAfterSpeech() {
    this.isPausedForSpeech = false;
    if (this.isHandsFreeMode) {
      this.shouldKeepListening = true;
      setTimeout(() => {
        if (!this.isPausedForSpeech && this.isHandsFreeMode) {
          this.startRecognitionSafe();
        }
      }, 250);
    }
  }

  public abort() {
    this.shouldKeepListening = false;
    this.isManualListening = false;
    this.isAwakeAndListening = false;
    this.isPausedForSpeech = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.wakeTimeoutTimer) {
      clearTimeout(this.wakeTimeoutTimer);
      this.wakeTimeoutTimer = null;
    }
    try {
      this.recognition?.abort();
    } catch {}
  }
}
