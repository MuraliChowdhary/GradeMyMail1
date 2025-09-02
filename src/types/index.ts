// Common types for the email analysis system
export interface Email {
  id: string;
  subject: string;
  content: string;
  sender: string;
  recipient: string;
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  filename: string;
  size: number;
  type: string;
  url: string;
}

export interface AnalysisResult {
  id: string;
  emailId: string;
  score: number;
  feedback: string;
  categories: string[];
  suggestions: string[];
  timestamp: Date;
}

export interface User {
  id: string;
  email: string;
  name: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: 'light' | 'dark';
  notifications: boolean;
  analysisDepth: 'basic' | 'detailed' | 'comprehensive';
}

// Re-export highlighting types for convenience
export type {
  HighlightRange,
  HighlightPosition,
  HighlightColors,
  AnimationState,
  HighlightingConfig,
  HighlightingState,
  HighlightingEngine,
} from './highlighting';

// Re-export GMMeditor types for convenience
export type {
  DiffMapping,
  GMMeditorAnalysis,
  GMMeditorOptions,
  GMMeditorRequest,
  GMMeditorResponse,
  ToneOption,
  GMMeditorMetadata,
  GMMeditorResult,
  ToneKey,
} from './gmmeditor';

export { TONES } from './gmmeditor';
