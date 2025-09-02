// TypeScript type definitions for GMMeditor functions

export interface DiffMapping {
  type: 'unchanged' | 'changed' | 'inserted' | 'deleted';
  old: string;
  new: string;
  wordDiff: Array<{
    added?: boolean;
    removed?: boolean;
    value: string;
  }> | null;
}

export interface GMMeditorAnalysis {
  readabilityGrade?: number;
  audienceFit?: number;
  toneScore?: number;
  clarity?: number;
  engagement?: number;
  spamRisk?: number;
}

export interface GMMeditorOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  targetGradeLow?: number;
  targetGradeHigh?: number;
}

export interface GMMeditorRequest {
  originalText: string;
  analysis?: GMMeditorAnalysis;
  suggestions?: string[];
  toneKey?: 'professional' | 'friendly' | 'persuasive' | 'analytical' | 'storytelling';
  options?: GMMeditorOptions;
}

export interface GMMeditorResponse {
  rewritten: string;
  mappings: DiffMapping[];
}

export interface ToneOption {
  key: string;
  label: string;
}

export interface GMMeditorMetadata {
  model: string;
  processingTime: number;
  toneUsed: string;
  originalLength: number;
  rewrittenLength: number;
}

export interface GMMeditorResult extends GMMeditorResponse {
  metadata: GMMeditorMetadata;
}

// Constants from GMMeditor
export const TONES = {
  professional: "Professional & formal",
  friendly: "Friendly & conversational",
  persuasive: "Persuasive & motivational",
  analytical: "Analytical & insight-driven",
  storytelling: "Storytelling with light anecdotes",
} as const;

export type ToneKey = keyof typeof TONES;