import React, { useState, useRef, useEffect } from 'react';
import type { ToneKey, ToneOption } from '../../types/gmmeditor';
import { TONES } from '../../types/gmmeditor';
import './ToneSelector.css';

interface ToneSelectorProps {
  selectedTone: ToneKey;
  onToneChange: (toneKey: ToneKey) => void;
  disabled?: boolean;
  className?: string;
}

const ToneSelector: React.FC<ToneSelectorProps> = ({
  selectedTone,
  onToneChange,
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Get tone options from TONES constant
  const toneOptions: ToneOption[] = Object.entries(TONES).map(([key, label]) => ({
    key,
    label,
  }));

  const selectedOption = toneOptions.find(option => option.key === selectedTone);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'Escape':
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          const nextIndex = toneOptions.findIndex(opt => opt.key === selectedTone) + 1;
          if (nextIndex < toneOptions.length) {
            onToneChange(toneOptions[nextIndex].key as ToneKey);
          }
          break;
        case 'ArrowUp':
          event.preventDefault();
          const prevIndex = toneOptions.findIndex(opt => opt.key === selectedTone) - 1;
          if (prevIndex >= 0) {
            onToneChange(toneOptions[prevIndex].key as ToneKey);
          }
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          setIsOpen(false);
          buttonRef.current?.focus();
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, selectedTone, toneOptions, onToneChange]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleOptionSelect = (toneKey: ToneKey) => {
    onToneChange(toneKey);
    setIsOpen(false);
    buttonRef.current?.focus();
  };

  return (
    <div className={`tone-selector ${className} ${disabled ? 'disabled' : ''}`}>
      <label className="tone-selector-label">
        Writing Tone
      </label>
      
      <div className="tone-selector-wrapper">
        <button
          ref={buttonRef}
          type="button"
          className={`tone-selector-button ${isOpen ? 'open' : ''}`}
          onClick={handleToggle}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-labelledby="tone-selector-label"
        >
          <span className="selected-tone">
            {selectedOption?.label || 'Select tone...'}
          </span>
          
          <svg 
            className={`chevron-icon ${isOpen ? 'rotated' : ''}`}
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none"
          >
            <path 
              d="M4 6L8 10L12 6" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {isOpen && (
          <div 
            ref={dropdownRef}
            className="tone-selector-dropdown"
            role="listbox"
            aria-labelledby="tone-selector-label"
          >
            {toneOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={`tone-option ${option.key === selectedTone ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(option.key as ToneKey)}
                role="option"
                aria-selected={option.key === selectedTone}
              >
                <span className="tone-option-label">
                  {option.label}
                </span>
                
                {option.key === selectedTone && (
                  <svg 
                    className="check-icon" 
                    width="16" 
                    height="16" 
                    viewBox="0 0 16 16" 
                    fill="none"
                  >
                    <path 
                      d="M13.5 4.5L6 12L2.5 8.5" 
                      stroke="currentColor" 
                      strokeWidth="2.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ToneSelector;