import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  title?: string;
  onClose: (id: string) => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  id,
  message, 
  type, 
  title,
  onClose,
  duration = 4000 
}) => {
  useEffect(() => {
    if (duration && duration > 0) {
      const timer = setTimeout(() => onClose(id), duration);
      return () => clearTimeout(timer);
    }
  }, [id, onClose, duration]);

  const styles = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      iconColor: 'text-green-600',
      titleColor: 'text-green-800',
      textColor: 'text-green-700',
      icon: 'check_circle',
      defaultTitle: 'Success'
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      iconColor: 'text-red-500',
      titleColor: 'text-red-800',
      textColor: 'text-red-700',
      icon: 'cancel',
      defaultTitle: 'Error'
    },
    warning: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      iconColor: 'text-amber-500',
      titleColor: 'text-amber-800',
      textColor: 'text-amber-700',
      icon: 'warning',
      defaultTitle: 'Warning'
    },
    info: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      iconColor: 'text-sky-500',
      titleColor: 'text-sky-800',
      textColor: 'text-sky-700',
      icon: 'info',
      defaultTitle: 'Info'
    }
  }[type];

  return (
    <div className={`${styles.bg} ${styles.border} border shadow-lg rounded-xl p-4 min-w-[320px] max-w-md animate-slide-in flex gap-3 relative`}>
      <div className={`mt-0.5 shrink-0`}>
        <span className={`material-symbols-rounded ${styles.iconColor} text-2xl`}>
          {styles.icon}
        </span>
      </div>
      
      <div className="flex-1 me-4">
        <h4 className={`font-semibold text-[15px] ${styles.titleColor} mb-0.5 leading-tight`}>
          {title || styles.defaultTitle}
        </h4>
        <p className={`text-[14px] ${styles.textColor} leading-normal`}>
          {message}
        </p>
      </div>

      <button 
        onClick={() => onClose(id)}
        className={`absolute top-3 end-3 p-1 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${styles.textColor}`}
        aria-label="Close"
      >
        <span className="material-symbols-rounded text-lg">close</span>
      </button>
    </div>
  );
};
