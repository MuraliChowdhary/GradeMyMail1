import { describe, it, expect } from 'vitest';
import { DiffEngine } from '../diffEngine';

describe('DiffEngine', () => {
  describe('generateDiff', () => {
    it('should identify identical content', () => {
      const original = 'Hello\nWorld';
      const modified = 'Hello\nWorld';
      
      const result = DiffEngine.generateDiff(original, modified);
      
      expect(result.totalLines).toBe(2);
      expect(result.addedLines).toBe(0);
      expect(result.removedLines).toBe(0);
      expect(result.modifiedLines).toBe(0);
      
      const allLines = result.chunks.flatMap(chunk => chunk.lines);
      expect(allLines).toHaveLength(2);
      expect(allLines[0].type).toBe('unchanged');
      expect(allLines[1].type).toBe('unchanged');
    });

    it('should identify added lines', () => {
      const original = 'Hello';
      const modified = 'Hello\nWorld';
      
      const result = DiffEngine.generateDiff(original, modified);
      
      expect(result.addedLines).toBe(1);
      expect(result.removedLines).toBe(0);
      
      const allLines = result.chunks.flatMap(chunk => chunk.lines);
      expect(allLines[0].type).toBe('unchanged');
      expect(allLines[1].type).toBe('added');
      expect(allLines[1].content).toBe('World');
    });

    it('should identify removed lines', () => {
      const original = 'Hello\nWorld';
      const modified = 'Hello';
      
      const result = DiffEngine.generateDiff(original, modified);
      
      expect(result.addedLines).toBe(0);
      expect(result.removedLines).toBe(1);
      
      const allLines = result.chunks.flatMap(chunk => chunk.lines);
      expect(allLines[0].type).toBe('unchanged');
      expect(allLines[1].type).toBe('removed');
      expect(allLines[1].content).toBe('World');
    });

    it('should identify modified lines', () => {
      const original = 'Hello World';
      const modified = 'Hello Universe';
      
      const result = DiffEngine.generateDiff(original, modified);
      
      expect(result.modifiedLines).toBe(1);
      
      const allLines = result.chunks.flatMap(chunk => chunk.lines);
      expect(allLines[0].type).toBe('modified');
      expect(allLines[0].content).toBe('Hello Universe');
    });

    it('should handle empty content', () => {
      const result = DiffEngine.generateDiff('', '');
      
      expect(result.totalLines).toBe(0);
      expect(result.chunks).toHaveLength(0);
    });

    it('should handle complex changes', () => {
      const original = `Line 1
Line 2
Line 3`;
      
      const modified = `Line 1
Modified Line 2
Line 3`;
      
      const result = DiffEngine.generateDiff(original, modified);
      
      expect(result.totalLines).toBe(3);
      expect(result.addedLines).toBe(0);
      expect(result.removedLines).toBe(0);
      expect(result.modifiedLines).toBe(1); // Modified Line 2
      
      const allLines = result.chunks.flatMap(chunk => chunk.lines);
      expect(allLines[0].content).toBe('Line 1');
      expect(allLines[0].type).toBe('unchanged');
      expect(allLines[1].content).toBe('Modified Line 2');
      expect(allLines[1].type).toBe('modified');
    });
  });

  describe('getLinesInRange', () => {
    it('should return lines in specified range', () => {
      const original = 'Line 1\nLine 2\nLine 3\nLine 4';
      const modified = 'Line 1\nModified 2\nLine 3\nLine 4';
      
      const diffData = DiffEngine.generateDiff(original, modified);
      const lines = DiffEngine.getLinesInRange(diffData, 1, 2);
      
      expect(lines).toHaveLength(2);
      expect(lines[0].content).toBe('Modified 2');
      expect(lines[1].content).toBe('Line 3');
    });
  });

  describe('searchInDiff', () => {
    it('should find matching lines', () => {
      const original = 'Hello World\nFoo Bar\nTest Line';
      const modified = 'Hello Universe\nFoo Bar\nTest Line';
      
      const diffData = DiffEngine.generateDiff(original, modified);
      const matches = DiffEngine.searchInDiff(diffData, 'foo');
      
      expect(matches).toContain(1); // Should find "Foo Bar" line
    });

    it('should be case insensitive', () => {
      const original = 'Hello World';
      const modified = 'Hello Universe';
      
      const diffData = DiffEngine.generateDiff(original, modified);
      const matches = DiffEngine.searchInDiff(diffData, 'HELLO');
      
      expect(matches).toHaveLength(1);
    });
  });
});