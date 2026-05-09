import React, { useState, useRef } from 'react';
import { useAlert, type AlertData } from './AlertContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../../../context';

/**
 * NotificationOverlay v2: Fluid Stack Engine
 * Engineered for world-class stability and seamless layout transitions.
 * Uses relative flow + negative margins for a robust, interactive stack.
 */
export const NotificationOverlay: React.FC = () => {
  const { alerts, removeAlert } = useAlert();
  const { language } = useSettings();
  const isRTL = language === 'AR';

  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  // Newest first for visual priority in the flex-col
  const visibleAlerts = [...alerts].slice(-3).reverse();

  return (
    <div 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`fixed top-13 right-5 z-[10000] pointer-events-auto flex flex-col items-end w-full max-w-[420px] px-4`}
      style={{ perspective: '1000px' }}
    >
      <AnimatePresence mode="popLayout">
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

const NotificationCard: React.FC<NotificationCardProps> = ({ alert, index, onClose, isExpanded }) => {
  const config = {
    success: { icon: 'check_circle', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
    error: { icon: 'error', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    warning: { icon: 'warning', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    info: { icon: 'info', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
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
        transition: { type: 'tween', ease: 'linear', duration: 0.2 } 
      }}
      transition={{ 
        type: 'tween',
        ease: 'linear',
        duration: 0.2,
        layout: { type: 'tween', ease: 'linear', duration: 0.25 }
      }}
      className={`
        relative w-full pointer-events-auto
        bg-white dark:bg-zinc-900 rounded-xl border border-zinc-300 dark:border-zinc-700 p-4 shadow-2xl
        flex items-start group overflow-hidden
      `}
      dir="ltr"
    >
      {/* Close Button - Fixed Right */}
      <button
        onClick={onClose}
        className={`absolute top-3 right-2 transition-all z-10 cursor-pointer ${isExpanded ? 'opacity-100' : 'opacity-0'}`}
      >
        <span className="material-symbols-rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" style={{ fontSize: '24px' }}>
          close
        </span>
      </button>

      {/* Content - Fixed Left */}
      <div className="flex-1 flex items-start justify-start gap-4 min-w-0">
        <div className={`w-5 h-5 rounded flex items-center justify-center ${config.bg} flex-shrink-0 transition-transform mt-0.5`}>
          <span className={`material-symbols-rounded ${config.color} block`} style={{ fontSize: '16px' }}>
            {config.icon}
          </span>
        </div>

        <div className="min-w-0 py-0.5 text-left" dir="auto">
          {alert.title && (
            <h4 className="text-sm font-bold text-gray-900 dark:text-gray-50 mb-0.5 truncate">
              {alert.title}
            </h4>
          )}
          <p className="text-[13px] leading-relaxed text-gray-700 dark:text-gray-300 font-medium">
            {alert.message}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default NotificationOverlay;
