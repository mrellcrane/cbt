export type Role = 'user' | 'assistant';

export type Mode =
  | 'free_chat'
  | 'check_in'
  | 'thought_record'
  | 'gratitude'
  | 'lesson';

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  sessionId: string;
  createdAt: string;
}

export interface ApiMessage {
  role: Role;
  content: string;
}

// Shape the API can embed in a reply to signal structured data extraction.
// The client strips the JSON block before displaying text.
export interface StructuredPayload {
  mood_score?: number | null;
  thought_record_complete?: {
    situation: string;
    automatic_thought: string;
    emotions: string;
    distortion: string;
    balanced_thought: string;
  } | null;
  gratitude_items?: string[] | null;
  intent?: string | null;
}
