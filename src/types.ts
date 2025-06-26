export interface ConversationMetadata {
  filePath: string;
  projectName: string;
  sessionId: string;
  messageCount: number;
  lastMessageTime: Date | null;
  firstMessageTime: Date | null;
  matchCount?: number; // Number of messages matching search term
  activeTime?: number; // Total active conversation time in milliseconds
  summary?: string; // Truncated summary of conversation content
}

export interface Message {
  type: string;
  timestamp: string | number;
  message?: {
    role?: string;
    content?: string | any[];
  };
}

export interface MessagePreview {
  type: string;
  timestamp: Date;
  content: string;
  role?: string;
}

export interface UploadResponse {
  id: string;
  created_at: string;
  message: string;
}

export interface ApiError {
  error?: string;
  errors?: string[];
}