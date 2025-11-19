export interface Figure {
  id: string;
  name: string;
  title: string;
  era: string;
  specialty: string;
  image: string;
  warning?: string;
}

export type BackendStatus = 'checking' | 'connected' | 'disconnected';

export type DebateRole = 'moderator' | 'participant' | 'user';
export type MessageType = 'opening' | 'argument' | 'rebuttal' | 'closing' | 'question' | 'answer' | 'moderator';

export interface DebateMessage {
  id: string;
  session_id: string;
  speaker_id: string;
  speaker_name: string;
  role: DebateRole;
  message_type: MessageType;
  content: string;
  timestamp: string;
  turn_number: number;
}

export interface DebateSession {
  id: string;
  topic: string;
  participants: string[];
  status: 'waiting' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
  messages: DebateMessage[];
  current_turn: number;
  max_turns: number;
}

export interface CreateDebateRequest {
  topic: string;
  participants: string[];
  max_turns?: number;
}

export interface CreateDebateResponse {
  session: DebateSession;
  message: string;
}

export interface StreamedDebateMessage {
  type: 'debate_message' | 'status' | 'error' | 'complete';
  id?: string;
  session_id?: string;
  speaker_id?: string;
  speaker_name?: string;
  role?: DebateRole;
  message_type?: MessageType;
  content?: string;
  timestamp?: string;
  turn_number?: number;
  message?: string;
}