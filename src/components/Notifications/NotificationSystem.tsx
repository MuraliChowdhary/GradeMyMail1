import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { utils } from '../../utils/designSystem';

export interface Notification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface NotificationSystemProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onRemove,
  position = 'top-right',
}) => {
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  const getIcon = (type: Notification['type']) => {
    const iconClasses = 'w-5 h-5';
    
    switch (type) {
      case 'success':
        return (
          <svg className={utils.cn(iconClasses, 'text-success-600')} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={utils.cn(iconClasses, 'text-warning-600')} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className={utils.cn(iconClasses, 'text-error-600')} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
      default:
        return (
          <svg className={utils.cn(iconClasses, 'text-primary-600')} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const getNotificationClasses = (type: Notification['type']) => {
    const baseClasses = 'notification';
    
    switch (type) {
      case 'success':
        return utils.cn(baseClasses, 'notification-success');
      case 'warning':
        return utils.cn(baseClasses, 'notification-warning');
      case 'error':
        return utils.cn(baseClasses, 'notification-error');
      case 'info':
      default:
        return utils.cn(baseClasses, 'border-primary-200 bg-primary-50/90');
    }
  };

  return (
    <div className={utils.cn('fixed z-50 max-w-sm w-full', positionClasses[position])}>
      <AnimatePresence>
        {notifications.map((notification, index) => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            index={index}
            onRemove={onRemove}
            getIcon={getIcon}
            getNotificationClasses={getNotificationClasses}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface NotificationItemProps {
  notification: Notification;
  index: number;
  onRemove: (id: string) => void;
  getIcon: (type: Notification['type']) => React.ReactNode;
  getNotificationClasses: (type: Notification['type']) => string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  index,
  onRemove,
  getIcon,
  getNotificationClasses,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onRemove(notification.id), 300);
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.id, onRemove]);

  const notificationVariants = {
    initial: {
      opacity: 0,
      x: 300,
      scale: 0.8,
    },
    animate: {
      opacity: 1,
      x: 0,
      scale: 1,
      transition: {
        duration: 0.4,
        delay: index * 0.1,
      },
    },
    exit: {
      opacity: 0,
      x: 300,
      scale: 0.8,
      transition: {
        duration: 0.3,
      },
    },
    hover: {
      scale: 1.02,
      y: -2,
      transition: {
        duration: 0.2,
      },
    },
  };

  const progressVariants = {
    initial: { width: '100%' },
    animate: {
      width: '0%',
      transition: {
        duration: (notification.duration || 5000) / 1000,
      },
    },
  };

  return (
    <motion.div
      className={utils.cn(getNotificationClasses(notification.type), 'mb-3 relative overflow-hidden')}
      variants={notificationVariants}
      initial="initial"
      animate={isVisible ? "animate" : "exit"}
      exit="exit"
      whileHover="hover"
      layout
    >
      <div className="flex items-start">
        <motion.div
          className="flex-shrink-0 mr-3"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {getIcon(notification.type)}
        </motion.div>
        
        <div className="flex-1 min-w-0">
          <motion.h4
            className="text-sm font-semibold text-gray-900 mb-1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            {notification.title}
          </motion.h4>
          
          {notification.message && (
            <motion.p
              className="text-sm text-gray-600"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
            >
              {notification.message}
            </motion.p>
          )}
          
          {notification.action && (
            <motion.button
              className="mt-2 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors duration-200"
              onClick={notification.action.onClick}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {notification.action.label}
            </motion.button>
          )}
        </div>
        
        <motion.button
          className="flex-shrink-0 ml-3 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onRemove(notification.id), 300);
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </motion.button>
      </div>
      
      {notification.duration && notification.duration > 0 && (
        <motion.div
          className="absolute bottom-0 left-0 h-1 bg-current opacity-30"
          variants={progressVariants}
          initial="initial"
          animate="animate"
        />
      )}
    </motion.div>
  );
};

export default NotificationSystem;