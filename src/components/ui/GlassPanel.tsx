import React from 'react';
import { motion } from 'framer-motion';
import { utils } from '../../utils/designSystem';

export interface GlassPanelProps {
  variant?: 'light' | 'dark';
  blur?: 'sm' | 'md' | 'lg';
  className?: string;
  children: React.ReactNode;
  animate?: boolean;
}

const GlassPanel: React.FC<GlassPanelProps> = ({
  variant = 'light',
  blur = 'md',
  className = '',
  children,
  animate = true,
}) => {
  const baseClasses = utils.cn(
    variant === 'light' && 'glass-panel',
    variant === 'dark' && 'glass-panel-dark',
    blur === 'sm' && 'backdrop-blur-sm',
    blur === 'md' && 'backdrop-blur-md',
    blur === 'lg' && 'backdrop-blur-lg',
    className
  );

  const panelVariants = {
    initial: { 
      opacity: 0, 
      scale: 0.95,
      y: 20,
    },
    animate: { 
      opacity: 1, 
      scale: 1,
      y: 0,
      transition: {
        duration: 0.5,
      }
    },
    hover: {
      scale: 1.02,
      y: -4,
      transition: {
        duration: 0.3,
      }
    },
  };

  const contentVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: {
        duration: 0.4,
        delay: 0.2,
      }
    },
  };

  if (!animate) {
    return (
      <div className={baseClasses}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={baseClasses}
      variants={panelVariants}
      initial="initial"
      animate="animate"
      whileHover="hover"
    >
      <motion.div
        variants={contentVariants}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

export default GlassPanel;