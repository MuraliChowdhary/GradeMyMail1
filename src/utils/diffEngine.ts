import type { DiffLine, DiffChunk, DiffData } from '../types/diff';

/**
 * Simple diff algorithm optimized for text comparison
 * Uses a basic line-by-line comparison with minimal DOM manipulation
 */
export class DiffEngine {
  private static splitIntoLines(text: string): string[] {
    return text.split(/\r?\n/);
  }

  /**
   * Generate diff data from original and modified content
   */
  static generateDiff(original: string, modified: string): DiffData {
    // Handle empty content
    if (!original && !modified) {
      return {
        chunks: [],
        totalLines: 0,
        addedLines: 0,
        removedLines: 0,
        modifiedLines: 0
      };
    }

    const originalLines = this.splitIntoLines(original);
    const modifiedLines = this.splitIntoLines(modified);
    
    const diffLines: DiffLine[] = [];
    let originalIndex = 0;
    let modifiedIndex = 0;
    let lineNumber = 0;

    // Simple line-by-line comparison
    while (originalIndex < originalLines.length || modifiedIndex < modifiedLines.length) {
      const originalLine = originalLines[originalIndex];
      const modifiedLine = modifiedLines[modifiedIndex];

      if (originalIndex >= originalLines.length) {
        // Only modified lines remain
        diffLines.push({
          type: 'added',
          content: modifiedLine,
          lineNumber: ++lineNumber,
          modifiedLineNumber: modifiedIndex + 1
        });
        modifiedIndex++;
      } else if (modifiedIndex >= modifiedLines.length) {
        // Only original lines remain
        diffLines.push({
          type: 'removed',
          content: originalLine,
          lineNumber: ++lineNumber,
          originalLineNumber: originalIndex + 1
        });
        originalIndex++;
      } else if (originalLine === modifiedLine) {
        // Lines are identical
        diffLines.push({
          type: 'unchanged',
          content: originalLine,
          lineNumber: ++lineNumber,
          originalLineNumber: originalIndex + 1,
          modifiedLineNumber: modifiedIndex + 1
        });
        originalIndex++;
        modifiedIndex++;
      } else {
        // Lines are different - use simple modification detection for now
        diffLines.push({
          type: 'modified',
          content: modifiedLine,
          lineNumber: ++lineNumber,
          originalLineNumber: originalIndex + 1,
          modifiedLineNumber: modifiedIndex + 1
        });
        originalIndex++;
        modifiedIndex++;
      }
    }

    // Group lines into chunks for better performance
    const chunks = this.groupIntoChunks(diffLines);
    
    // Calculate statistics
    const addedLines = diffLines.filter(line => line.type === 'added').length;
    const removedLines = diffLines.filter(line => line.type === 'removed').length;
    const modifiedLinesCount = diffLines.filter(line => line.type === 'modified').length;

    return {
      chunks,
      totalLines: diffLines.length,
      addedLines,
      removedLines,
      modifiedLines: modifiedLinesCount
    };
  }

  /**
   * Group diff lines into chunks for virtualized rendering
   */
  private static groupIntoChunks(lines: DiffLine[], chunkSize: number = 100): DiffChunk[] {
    const chunks: DiffChunk[] = [];
    
    for (let i = 0; i < lines.length; i += chunkSize) {
      const chunkLines = lines.slice(i, i + chunkSize);
      chunks.push({
        lines: chunkLines,
        startLine: i,
        endLine: Math.min(i + chunkSize - 1, lines.length - 1)
      });
    }

    return chunks;
  }

  /**
   * Get lines for a specific range (for virtualized rendering)
   */
  static getLinesInRange(diffData: DiffData, startIndex: number, endIndex: number): DiffLine[] {
    const allLines: DiffLine[] = [];
    
    for (const chunk of diffData.chunks) {
      allLines.push(...chunk.lines);
    }

    return allLines.slice(startIndex, endIndex + 1);
  }

  /**
   * Search for text within diff content
   */
  static searchInDiff(diffData: DiffData, searchTerm: string): number[] {
    const matchingLines: number[] = [];
    const allLines: DiffLine[] = [];
    
    for (const chunk of diffData.chunks) {
      allLines.push(...chunk.lines);
    }

    allLines.forEach((line, index) => {
      if (line.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        matchingLines.push(index);
      }
    });

    return matchingLines;
  }
}