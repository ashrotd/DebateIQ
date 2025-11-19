export interface Figure {
  id: string;
  name: string;
  title: string;
  era: string;
  specialty: string;
  amage: string;
  warning?: string;
}

export type BackendStatus = 'checking' | 'connected' | 'disconnected';

export interface DebateMessage {
  role: string;
  content: string;
  timestamp: string;
}

export interface DebateSession {
  session_id: string;
  figure_id: string;
  topic: string;
  messages: DebateMessage[];
  turn_count: number;
}