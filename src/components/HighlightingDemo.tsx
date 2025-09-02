/**
 * HighlightingDemo Component
 * Demonstrates the new GroqGemma rule-based highlighting system
 */

import React, { useState, useRef, useCallback } from 'react';
import { HighlightOverlay } from './HighlightOverlay';
import { highlightingService } from '../services/highlightingService';
import type { HighlightRange } from '../types/highlighting';

const HighlightingDemo: React.FC = () => {
  const [content, setContent] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ranges, setRanges] = useState<HighlightRange[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const handleAnalyze = useCallback(async () => {
    if (!content.trim()) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await highlightingService.analyzeContent(content);
      setRanges(result.ranges);
      setSummary(result.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
      console.error('Analysis failed:', err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [content]);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // Clear previous results when content changes
    setRanges([]);
    setSummary(null);
    setError(null);
  }, []);

  const sampleContent = `This is an amazing newsletter with incredible offers! 
  
Act now to get this free trial - limited time only! Don't miss out on this exclusive opportunity.

The synergistic paradigm shift will leverage our innovative solutions to maximize your ROI. Our comprehensive methodology utilizes cutting-edge technology to facilitate seamless integration.

We guarantee 100% satisfaction with our revolutionary platform. Click here to sign up now!

This might be the best deal you'll ever see. We could potentially increase your profits by 500%.`;

  const handleUseSample = useCallback(() => {
    setContent(sampleContent);
    setRanges([]);
    setSummary(null);
    setError(null);
  }, []);

  return (
    <div className="highlighting-demo" style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ marginBottom: '20px', color: '#333' }}>
        GroqGemma Rule-Based Highlighting Demo
      </h2>
      
      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={handleUseSample}
          style={{
            padding: '8px 16px',
            marginRight: '10px',
            backgroundColor: '#007aff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Use Sample Content
        </button>
        
        <button
          onClick={handleAnalyze}
          disabled={!content.trim() || isAnalyzing}
          style={{
            padding: '8px 16px',
            backgroundColor: isAnalyzing ? '#ccc' : '#34c759',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          }}
        >
          {isAnalyzing ? 'Analyzing...' : 'Analyze Content'}
        </button>
      </div>

      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <textarea
          ref={containerRef}
          value={content}
          onChange={handleContentChange}
          placeholder="Enter your newsletter content here..."
          style={{
            width: '100%',
            height: '300px',
            padding: '12px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            fontSize: '14px',
            lineHeight: '1.5',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            resize: 'vertical',
          }}
        />
        
        {ranges.length > 0 && (
          <HighlightOverlay
            containerRef={containerRef}
            ranges={ranges}
            visible={true}
            animationSpeed={300}
          />
        )}
      </div>

      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '6px',
          color: '#c33',
          marginBottom: '20px',
        }}>
          Error: {error}
        </div>
      )}

      {summary && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f8f9fa',
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          marginBottom: '20px',
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>Analysis Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <div>
              <strong>Overall Grade:</strong> {summary.grade}
            </div>
            <div>
              <strong>Score:</strong> {summary.score}/100
            </div>
            <div>
              <strong>Word Count:</strong> {summary.metrics.wordCount}
            </div>
            <div>
              <strong>Issues Found:</strong> {summary.issueCounts.high + summary.issueCounts.medium + summary.issueCounts.low}
            </div>
          </div>
          
          {summary.issueCounts.high > 0 && (
            <div style={{ marginTop: '12px', color: '#d73a49' }}>
              <strong>High Priority Issues:</strong> {summary.issueCounts.high}
            </div>
          )}
          
          {summary.issueCounts.medium > 0 && (
            <div style={{ marginTop: '8px', color: '#f66a0a' }}>
              <strong>Medium Priority Issues:</strong> {summary.issueCounts.medium}
            </div>
          )}
          
          {summary.issueTypes.length > 0 && (
            <div style={{ marginTop: '12px' }}>
              <strong>Issue Types:</strong> {summary.issueTypes.join(', ')}
            </div>
          )}
        </div>
      )}

      {ranges.length > 0 && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f0f8ff',
          border: '1px solid #b3d9ff',
          borderRadius: '8px',
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: '#333' }}>Highlights Found</h3>
          <div style={{ fontSize: '14px' }}>
            {ranges.map((range, index) => (
              <div key={index} style={{ marginBottom: '8px' }}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: range.priority === 'high' ? '#ffebee' : 
                                 range.priority === 'medium' ? '#fff3e0' : '#e8f5e8',
                  color: range.priority === 'high' ? '#c62828' : 
                         range.priority === 'medium' ? '#ef6c00' : '#2e7d32',
                  marginRight: '8px',
                }}>
                  {range.type.replace(/_/g, ' ')}
                </span>
                <span style={{ color: '#666' }}>
                  "{content.substring(range.start, range.end)}"
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightingDemo;