import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface PopupAlertProps {
  isOpen: boolean;
  type?: 'confirm' | 'warning' | 'info';
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  anchorRef: React.RefObject<HTMLElement | null>;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const PopupAlert: React.FC<PopupAlertProps> = ({
  isOpen,
  type = 'confirm',
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  anchorRef,
}) => {
  const [coords, setCoords] = useState({ top: -999, left: -999, opacity: 0 });
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const updatePosition = () => {
        if (!anchorRef.current || !popupRef.current) return;

        const anchorRect = anchorRef.current.getBoundingClientRect();
        const popupRect = popupRef.current.getBoundingClientRect();

        let top = anchorRect.top - popupRect.height - 6;
        let left = anchorRect.left + anchorRect.width / 2 - popupRect.width / 2;

        // Keep within viewport bounds
        if (top < 10) top = anchorRect.bottom + 6; // flip to bottom
        if (left < 10) left = 10;
        if (left + popupRect.width > window.innerWidth - 10) {
          left = window.innerWidth - popupRect.width - 10;
        }

        setCoords({ top, left, opacity: 1 });
      };

      requestAnimationFrame(updatePosition);

      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [isOpen, anchorRef]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.95, y: 5 }}
          animate={{ opacity: coords.opacity, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 5 }}
          transition={{ duration: 0.12, ease: 'easeOut' }}
          className='fixed z-[99999] w-max min-w-[220px] max-w-[280px] bg-white dark:bg-[#1a1a1a] border border-black/[0.08] dark:border-white/10 rounded-lg shadow-xl overflow-hidden flex flex-col backdrop-blur-xl'
          style={{ top: coords.top, left: coords.left }}
          dir='rtl'
        >
          {/* Header */}
          {(title || type !== 'confirm') && (
            <div
              className={`px-3 py-1.5 flex items-center gap-1.5 border-b border-black/[0.04] dark:border-white/5 ${
                type === 'warning'
                  ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400'
                  : 'bg-black/[0.02] dark:bg-white/[0.02] text-gray-700 dark:text-gray-300'
              }`}
            >
              {type === 'warning' && (
                <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>
                  warning
                </span>
              )}
              {type === 'info' && (
                <span
                  className='material-symbols-rounded text-blue-500'
                  style={{ fontSize: '14px' }}
                >
                  info
                </span>
              )}
              <h4 className='text-[11px] font-bold font-cairo flex-1'>
                {title || (type === 'warning' ? 'تنبيه' : 'تأكيد')}
              </h4>
            </div>
          )}

          {/* Body */}
          <div className='px-3 py-2.5 text-[11px] text-gray-600 dark:text-gray-300 font-cairo leading-relaxed font-medium'>
            {message}
          </div>

          {/* Footer (Actions) */}
          <div className='px-2 py-1.5 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/[0.04] dark:border-white/5 flex justify-end gap-2'>
            {onCancel && (
              <button
                onClick={onCancel}
                className='px-3 py-1 rounded-[4px] text-[10px] font-bold text-zinc-600 dark:text-zinc-400 bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors'
                type='button'
              >
                {cancelText || 'إلغاء'}
              </button>
            )}
            {onConfirm && (
              <button
                onClick={onConfirm}
                className={`px-3 py-1 rounded-[4px] text-[10px] font-bold transition-all active:scale-95 shadow-xs border ${
                  type === 'warning'
                    ? 'bg-red-600 hover:bg-red-700 text-white border-red-700/50 dark:border-red-500/50'
                    : 'bg-zinc-900 hover:bg-black text-white border-zinc-950 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white dark:border-white/10'
                }`}
                type='button'
              >
                {confirmText || 'موافق'}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
