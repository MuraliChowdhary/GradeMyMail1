export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'modified';
  content: string;
  lineNumber: number;
  originalLineNumber?: number;
  modifiedLineNumber?: number;
}

export interface DiffChunk {
  lines: DiffLine[];
  startLine: number;
  endLine: number;
}

export interface DiffData {
  chunks: DiffChunk[];
  totalLines: number;
  addedLines: number;
  removedLines: number;
  modifiedLines: number;
}

export interface VirtualizedDiffProps {
  originalContent: string;
  modifiedContent: string;
  className?: string;
  onLineHover?: (lineNumber: number | null) => void;
  highlightedLine?: number | null;
}

// GMMeditor word diff interface
export interface WordDiff {
  added?: boolean;
  removed?: boolean;
  value: string;
}

// GMMeditor diff mapping interface
export interface DiffMapping {
  type: 'unchanged' | 'changed' | 'inserted' | 'deleted';
  old: string;
  new: string;
  wordDiff: WordDiff[] | null;
}

// GMMeditor data interface
export interface GMMeditorData {
  rewritten: string;
  mappings: DiffMapping[];
  metadata?: {
    model?: string;
    processingTime?: number;
    toneUsed?: string;
    originalLength?: number;
    rewrittenLength?: number;
  };
}

export interface DiffViewerProps extends VirtualizedDiffProps {
  height?: number;
  width?: number;
  itemSize?: number;
  overscanCount?: number;
  gmmEditorData?: GMMeditorData | null;
}