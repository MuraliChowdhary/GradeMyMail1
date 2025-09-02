import React, { useState } from 'react';

export interface NewsletterContext {
  intendedAudience: string;
  goal: string;
}

export interface ContextPanelProps {
  context: NewsletterContext;
  onChange: (context: NewsletterContext) => void;
  className?: string;
}

const ContextPanel: React.FC<ContextPanelProps> = ({
  context,
  onChange,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleInputChange = (field: keyof NewsletterContext, value: string) => {
    onChange({
      ...context,
      [field]: value,
    });
  };

  const hasContext = context.intendedAudience.trim() || context.goal.trim();

  return (
    <div className={`${className}`}>
      <div className="bg-white dark:bg-[#2C2C2E] border border-gray-300 dark:border-white/10 rounded-xl shadow-md dark:shadow-[0_4px_20px_rgba(0,0,0,0.4)] overflow-hidden transition-all duration-300 hover:shadow-lg dark:hover:shadow-[0_6px_24px_rgba(0,0,0,0.5)]">
        {/* Header */}
        <div 
          className="p-4 cursor-pointer group"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-5 h-5 flex items-center justify-center">
                <svg 
                  className="w-4 h-4 text-gray-400 dark:text-[#8E8E93]" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" 
                  />
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M6 6h.008v.008H6V6Z" 
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white transition-colors">
                  Context
                </h3>
                <p className="text-xs text-gray-500 dark:text-[#8E8E93] mt-0.5">
                  {hasContext ? 'Personalized analysis' : 'For a more detailed analysis'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {hasContext && (
                <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full"></div>
              )}
              <svg 
                className={`w-3.5 h-3.5 text-gray-400 dark:text-[#8E8E93] transition-all duration-300 group-hover:text-gray-600 dark:group-hover:text-gray-300 ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`transition-all duration-300 ease-out ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'} overflow-hidden`}>
          <div className="px-4 pb-4 space-y-4">
            {/* Intended Audience */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Intended Audience
              </label>
              <input
                type="text"
                value={context.intendedAudience}
                onChange={(e) => handleInputChange('intendedAudience', e.target.value)}
                placeholder="Tech professionals, marketers..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#3A3A3C] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-white/20 focus:border-gray-300 dark:focus:border-white/20 transition-all duration-200"
              />
            </div>

            {/* Goal */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                Newsletter Goal
              </label>
              <input
                type="text"
                value={context.goal}
                onChange={(e) => handleInputChange('goal', e.target.value)}
                placeholder="Drive engagement, share insights..."
                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-[#3A3A3C] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-gray-300 dark:focus:ring-white/20 focus:border-gray-300 dark:focus:border-white/20 transition-all duration-200"
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-2">
              <p className="text-xs text-gray-500 dark:text-[#8E8E93]">
                Presets
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onChange({
                    intendedAudience: 'Tech professionals and developers',
                    goal: 'Share technical insights and industry updates'
                  })}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-[#3A3A3C] text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-[#4A4A4C] transition-colors"
                >
                  Tech
                </button>
                <button
                  onClick={() => onChange({
                    intendedAudience: 'Business leaders and entrepreneurs',
                    goal: 'Drive business growth and engagement'
                  })}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-[#3A3A3C] text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-[#4A4A4C] transition-colors"
                >
                  Business
                </button>
                <button
                  onClick={() => onChange({
                    intendedAudience: 'General audience',
                    goal: 'Inform and engage readers'
                  })}
                  className="px-2 py-1 text-xs bg-gray-100 dark:bg-[#3A3A3C] text-gray-600 dark:text-gray-400 rounded hover:bg-gray-200 dark:hover:bg-[#4A4A4C] transition-colors"
                >
                  General
                </button>
              </div>
            </div>

            {/* Clear Button */}
            {hasContext && (
              <div className="pt-3 border-t border-gray-100 dark:border-white/5">
                <button
                  onClick={() => onChange({ intendedAudience: '', goal: '' })}
                  className="text-xs text-gray-500 dark:text-[#8E8E93] hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200 font-medium"
                >
                  Clear context
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContextPanel;