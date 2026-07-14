import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useState } from 'react';
import { useSettings } from '../../../context';
import { type AlertData, useAlert } from './AlertContext';

/**
 * NotificationOverlay v2: Fluid Stack Engine
 * Engineered for world-class stability and seamless layout transitions.
 * Uses relative flow + negative margins for a robust, interactive stack.
 */
export const NotificationOverlay: React.FC = () => {
  const { alerts, removeAlert } = useAlert();
  const { language } = useSettings();
  const _isRTL = language === 'AR';

  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  // Newest first for visual priority in the flex-col
  const visibleAlerts = [...alerts].slice(-3).reverse();

  return (
    <div
      role="button"
      tabIndex={0}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed top-13 right-5 z-[10000] pointer-events-auto flex flex-col items-end w-full max-w-[420px] px-4 select-none`}
      style={{ perspective: '1000px' }}
    >
      <AnimatePresence mode='popLayout'>
        {visibleAlerts.map((alert, index) => (
          <NotificationCard
            key={alert.id}
            alert={alert}
            index={index}
            onClose={() => removeAlert(alert.id)}
            isExpanded={isHovered}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

interface NotificationCardProps {
  alert: AlertData;
  index: number;
  onClose: () => void;
  isExpanded: boolean;
}

const NotificationCard: React.FC<NotificationCardProps> = ({
  alert,
  index,
  onClose,
  isExpanded,
}) => {
  const config = {
    success: {
      icon: 'check_circle',
      cardBg: 'bg-green-50 dark:bg-zinc-900',
      cardBorder: 'border-green-200 dark:border-green-900',
      iconBg: 'bg-green-100 dark:bg-green-900',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    error: {
      icon: 'error',
      cardBg: 'bg-red-50 dark:bg-zinc-900',
      cardBorder: 'border-red-200 dark:border-red-900',
      iconBg: 'bg-red-100 dark:bg-red-900',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    warning: {
      icon: 'warning',
      cardBg: 'bg-amber-50 dark:bg-zinc-900',
      cardBorder: 'border-amber-200 dark:border-amber-900',
      iconBg: 'bg-amber-100 dark:bg-amber-900',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    info: {
      icon: 'info',
      cardBg: 'bg-blue-50 dark:bg-zinc-900',
      cardBorder: 'border-blue-200 dark:border-blue-900',
      iconBg: 'bg-blue-100 dark:bg-blue-900',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
  }[alert.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -60, scale: 0.9, filter: 'blur(4px)' }}
      animate={{
        opacity: 1,
        y: 0,
        // The magic: negative margin creates the stack, 8px expands it
        marginBottom: isExpanded ? 8 : -45,
        scale: isExpanded ? 1 : 1 - index * 0.04,
        zIndex: 100 - index,
        filter: 'blur(0px)',
      }}
      exit={{
        opacity: 0,
        scale: 0.9,
        x: 100,
        transition: { type: 'tween', ease: 'linear', duration: 0.2 },
      }}
      transition={{
        type: 'tween',
        ease: 'linear',
        duration: 0.2,
        layout: { type: 'tween', ease: 'linear', duration: 0.25 },
      }}
      className={`
        relative w-full h-[64px] pointer-events-auto
        ${config.cardBg} rounded-xl border-2 ${config.cardBorder} px-4 py-2.5 shadow-2xl
        flex items-center group overflow-hidden
      `}
      dir='ltr'
    >
      {/* Close Button - Fixed Right */}
      <button
        onClick={onClose}
        className={`absolute top-3 right-2 transition-all z-10 cursor-pointer ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
        type='button'
      >
        <span
          className='material-symbols-rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
          style={{ fontSize: '24px' }}
        >
          close
        </span>
      </button>

      {/* Content - Fixed Left */}
      <div className='flex-1 flex items-start justify-start gap-3 min-w-0 pr-9'>
        <div
          className={`w-5 h-5 rounded flex items-center justify-center ${config.iconBg} flex-shrink-0 transition-transform mt-0.5`}
        >
          <span
            className={`material-symbols-rounded ${config.iconColor} block`}
            style={{ fontSize: '16px', fontVariationSettings: "'FILL' 1" }}
          >
            {config.icon}
          </span>
        </div>

        <div className='min-w-0 text-left' dir='auto'>
          {alert.title && (
            <h4 className='text-sm font-bold text-gray-900 dark:text-gray-50 mb-0.5 truncate'>
              {alert.title}
            </h4>
          )}
          <p className='text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 font-medium line-clamp-2'>
            {alert.message}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default NotificationOverlay;
