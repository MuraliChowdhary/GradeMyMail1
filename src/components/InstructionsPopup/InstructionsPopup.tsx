import React, { useState, useEffect } from 'react';

interface InstructionsPopupProps {
  className?: string;
  forceShow?: boolean;
}

const InstructionsPopup: React.FC<InstructionsPopupProps> = ({ className = '', forceShow = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Check if popup has been dismissed before
  useEffect(() => {
    const isDismissed = localStorage.getItem('instructions-popup-dismissed');
    
    if (!isDismissed || forceShow) {
      // Show popup after a brief delay for smooth entrance
      const timer = setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleDismiss = () => {
    setIsAnimating(false);
    
    // Wait for exit animation to complete
    setTimeout(() => {
      setIsVisible(false);
      // Mark as permanently dismissed
      localStorage.setItem('instructions-popup-dismissed', 'true');
    }, 300);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={`fixed right-6 bottom-6 z-50 ${className}`}>
      {/* Backdrop blur effect */}
      <div 
        className={`absolute inset-0 bg-black/5 backdrop-blur-sm rounded-2xl transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {/* Main popup content */}
      <div 
        className={`relative bg-white/95 backdrop-blur-md border border-gray-200/50 rounded-2xl shadow-2xl p-6 w-80 transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) ${
          isAnimating 
            ? 'opacity-100 translate-x-0 scale-100' 
            : 'opacity-0 translate-x-12 scale-90'
        }`}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center rounded-full bg-gray-100/80 hover:bg-gray-200/80 transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1) group hover:scale-110 hover:rotate-90 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
          aria-label="Dismiss instructions"
        >
          <svg 
            className="w-3 h-3 text-gray-500 group-hover:text-gray-700 transition-all duration-300" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Content */}
        <div className="pr-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            How it works
          </h3>
          
          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start space-x-3 transition-all duration-300 hover:translate-x-1 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 hover:scale-110 hover:bg-blue-200">
                <span className="text-xs font-medium text-blue-600">1</span>
              </div>
              <p>Paste or type your newsletter content</p>
            </div>
            
            <div className="flex items-start space-x-3 transition-all duration-300 hover:translate-x-1 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 hover:scale-110 hover:bg-blue-200">
                <span className="text-xs font-medium text-blue-600">2</span>
              </div>
              <p>Click "Analyze" to identify issues</p>
            </div>
            
            <div className="flex items-start space-x-3 transition-all duration-300 hover:translate-x-1 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 hover:scale-110 hover:bg-blue-200">
                <span className="text-xs font-medium text-blue-600">3</span>
              </div>
              <p>Review highlighted areas for clarity, engagement, and tone</p>
            </div>
            
            <div className="flex items-start space-x-3 transition-all duration-300 hover:translate-x-1 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-300 hover:scale-110 hover:bg-blue-200">
                <span className="text-xs font-medium text-blue-600">4</span>
              </div>
              <p>Click "Improve" to see suggested enhancements</p>
            </div>
          </div>

          {/* Color legend */}
          <div className="mt-5 pt-4 border-t border-gray-200/50">
            <p className="text-xs font-medium text-gray-700 mb-2">Issue types:</p>
            <div className="space-y-1.5">
              <div className="flex items-center space-x-2 transition-all duration-300 hover:translate-x-1 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                <div className="w-3 h-3 rounded-full bg-red-200 border border-red-300 transition-all duration-300 hover:scale-125"></div>
                <span className="text-xs text-gray-600">Clarity issues</span>
              </div>
              <div className="flex items-center space-x-2 transition-all duration-300 hover:translate-x-1 animate-fade-in-up" style={{ animationDelay: '0.6s' }}>
                <div className="w-3 h-3 rounded-full bg-yellow-200 border border-yellow-300 transition-all duration-300 hover:scale-125"></div>
                <span className="text-xs text-gray-600">Engagement problems</span>
              </div>
              <div className="flex items-center space-x-2 transition-all duration-300 hover:translate-x-1 animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
                <div className="w-3 h-3 rounded-full bg-green-200 border border-green-300 transition-all duration-300 hover:scale-125"></div>
                <span className="text-xs text-gray-600">Tone inconsistencies</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructionsPopup;