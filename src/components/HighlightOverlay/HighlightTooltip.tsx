/**
 * HighlightTooltip Component
 * Shows detailed information about highlighted content issues
 */

import React, { useEffect, useState } from 'react';
import type { HighlightRange } from '../../types/highlighting';

export interface HighlightTooltipProps {
  /** The highlight range to show tooltip for */
  range: HighlightRange | null;
  
  /** Mouse position for tooltip positioning */
  position: { x: number; y: number } | null;
  
  /** Whether tooltip is visible */
  visible: boolean;
  
  /** Custom CSS class */
  className?: string;
  
  /** Maximum width of tooltip */
  maxWidth?: number;
  
  /** Callback when tooltip is closed */
  onClose?: () => void;
}

const HighlightTooltip: React.FC<HighlightTooltipProps> = ({
  range,
  position,
  visible,
  className = '',
  maxWidth = 300,
  onClose,
}) => {
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});

  // Update tooltip position
  useEffect(() => {
    if (!position || !visible) {
      setTooltipStyle({ display: 'none' });
      return;
    }

    const style: React.CSSProperties = {
      position: 'fixed',
      left: position.x + 10,
      top: position.y - 10,
      maxWidth,
      zIndex: 1000,
      display: 'block',
    };

    // Adjust position to keep tooltip in viewport
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (position.x + maxWidth + 20 > viewportWidth) {
      style.left = position.x - maxWidth - 10;
    }

    if (position.y - 100 < 0) {
      style.top = position.y + 20;
    }

    setTooltipStyle(style);
  }, [position, visible, maxWidth]);

  if (!visible || !range) {
    return null;
  }

  const priorityColors = {
    high: '#FF6B6B',
    medium: '#FFD93D', 
    low: '#6BCF7F',
    info: '#6BCF7F',
  };

  const priorityLabels = {
    high: 'High Priority',
    medium: 'Medium Priority',
    low: 'Low Priority', 
    info: 'Information',
  };

  return (
    <div
      className={`highlight-tooltip ${className}`}
      style={{
        ...tooltipStyle,
        backgroundColor: 'white',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        fontSize: '14px',
        lineHeight: '1.4',
      }}
    >
      {/* Priority indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px',
          fontSize: '12px',
          fontWeight: '600',
          color: priorityColors[range.priority],
        }}
      >
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: priorityColors[range.priority],
            marginRight: '6px',
          }}
        />
        {priorityLabels[range.priority]}
      </div>

      {/* Issue type */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: '500',
          color: '#333',
          marginBottom: '6px',
          textTransform: 'capitalize',
        }}
      >
        {range.type.replace(/_/g, ' ')}
      </div>

      {/* Message */}
      {range.message && (
        <div
          style={{
            color: '#666',
            marginBottom: '8px',
            fontSize: '13px',
          }}
        >
          {range.message}
        </div>
      )}

      {/* Suggestion */}
      {range.suggestion && (
        <div
          style={{
            backgroundColor: '#f8f9fa',
            padding: '8px',
            borderRadius: '4px',
            fontSize: '12px',
            color: '#555',
            borderLeft: `3px solid ${priorityColors[range.priority]}`,
          }}
        >
          <strong>Suggestion:</strong> {range.suggestion}
        </div>
      )}

      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: 'none',
            border: 'none',
            fontSize: '16px',
            color: '#999',
            cursor: 'pointer',
            padding: '0',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-label="Close tooltip"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default HighlightTooltip;