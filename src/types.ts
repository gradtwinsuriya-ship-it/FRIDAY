export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface ToolBadge {
  name: string;
  badge: string;
  data?: any;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'friday';
  text: string;
  timestamp: string;
  badges?: ToolBadge[];
}

export interface TimerItem {
  id: string;
  label: string;
  totalSeconds: number;
  remainingSeconds: number;
  isRunning: boolean;
  isCompleted: boolean;
  createdAt: number;
}

export interface NoteItem {
  id: string;
  text: string;
  createdAt: number;
}

export interface VoiceSettings {
  voiceURI: string | null;
  rate: number;
  pitch: number;
  volume: number;
  isMuted: boolean;
  handsFree: boolean;
  useNeuralTts: boolean;
}
