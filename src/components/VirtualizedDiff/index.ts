export { default as VirtualizedDiffViewer } from './VirtualizedDiffViewer';
export { default as SplitPaneDiffViewer } from './SplitPaneDiffViewer';
export { default as DiffLine } from './DiffLine';

export type {
  DiffLine as DiffLineType,
  DiffChunk,
  DiffData,
  VirtualizedDiffProps,
  DiffViewerProps
} from '../../types/diff';