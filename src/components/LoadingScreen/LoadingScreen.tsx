import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { LoadingType } from '../../hooks/useLoadingState';

interface LoadingScreenProps {
  isVisible: boolean;
  type?: LoadingType | null;
  message?: string;
  progress?: number;
  onComplete?: () => void;
}

// Animated dots component
const AnimatedDots: React.FC = () => {
  return (
    <div className="flex space-x-1 justify-center mb-4">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="w-2 h-2 bg-[#1d1d1f] dark:bg-[#03FF40] rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: index * 0.2,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Pulsing ring loader
const PulsingRings: React.FC = () => {
  return (
    <div className="relative w-16 h-16 mx-auto mb-6">
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          className="absolute inset-0 border-2 border-[#1d1d1f] dark:border-[#03FF40] rounded-full"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [1, 0, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: index * 0.4,
            ease: "easeInOut",
          }}
        />
      ))}
      <div className="absolute inset-4 bg-[#1d1d1f] dark:bg-[#03FF40] rounded-full opacity-20" />
    </div>
  );
};

// Morphing shapes loader
const MorphingShapes: React.FC = () => {
  const [currentShape, setCurrentShape] = useState(0);
  const shapes = [
    "rounded-full",
    "rounded-lg",
    "rounded-none",
    "rounded-full"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentShape((prev) => (prev + 1) % shapes.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex justify-center mb-6">
      <motion.div
        className={`w-12 h-12 bg-gradient-to-br from-[#1d1d1f] to-gray-600 dark:from-[#03FF40] dark:to-[#00e639] ${shapes[currentShape]}`}
        animate={{
          rotate: [0, 180, 360],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
};

// Enhanced progress bar with glow effect
const EnhancedProgressBar: React.FC<{ progress: number }> = ({ progress }) => {
  return (
    <div className="w-full mb-4">
      <div className="relative w-full bg-[#e5e5ea] dark:bg-[#3A3A3C] rounded-full h-3 overflow-hidden">
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-[#1d1d1f] via-gray-700 to-[#1d1d1f] dark:from-[#03FF40] dark:via-[#00e639] dark:to-[#03FF40] h-full rounded-full"
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent h-full rounded-full"
          animate={{
            x: ['-100%', '100%'],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          style={{ width: '30%' }}
        />
      </div>
      <motion.p
        className="text-sm font-medium text-[#1d1d1f] dark:text-[#FFFFFF] mt-2 text-center"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        {Math.round(progress)}% complete
      </motion.p>
    </div>
  );
};

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  isVisible,
  type,
  message,
  progress = 0,
  onComplete
}) => {
  const getLoadingAnimation = () => {
    switch (type) {
      case 'analysis':
        return <PulsingRings />;
      case 'processing':
        return <MorphingShapes />;
      case 'navigation':
        return <AnimatedDots />;
      default:
        return <PulsingRings />;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.4 
            }}
            className="bg-white/95 dark:bg-[#2C2C2E]/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 dark:border-white/10 p-8 max-w-sm w-full mx-4 relative overflow-hidden"
          >
            {/* Animated background gradient */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 dark:from-blue-900/20 dark:via-transparent dark:to-purple-900/20"
              animate={{
                background: [
                  "linear-gradient(45deg, rgba(59, 130, 246, 0.1), transparent, rgba(147, 51, 234, 0.1))",
                  "linear-gradient(135deg, rgba(147, 51, 234, 0.1), transparent, rgba(59, 130, 246, 0.1))",
                  "linear-gradient(225deg, rgba(59, 130, 246, 0.1), transparent, rgba(147, 51, 234, 0.1))",
                  "linear-gradient(315deg, rgba(147, 51, 234, 0.1), transparent, rgba(59, 130, 246, 0.1))",
                ]
              }}
              transition={{ duration: 4, repeat: Infinity }}
            />
            
            <div className="relative z-10 text-center">
              {getLoadingAnimation()}
              
              {message && (
                <motion.h3
                  className="text-lg font-semibold text-[#1d1d1f] dark:text-[#FFFFFF] mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {message}
                </motion.h3>
              )}
              
              {progress > 0 && <EnhancedProgressBar progress={progress} />}
              
              {!message && (
                <motion.p
                  className="text-sm text-[#6d6d70] dark:text-[#8E8E93]"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Please wait...
                </motion.p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};