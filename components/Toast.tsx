import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ 
  message, 
  type, 
  onClose,
  duration = 3000 
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
    warning: 'bg-orange-500'
  }[type];

  const icon = {
    success: 'check_circle',
    error: 'error',
    info: 'info',
    warning: 'warning'
  }[type];

  return (
    <div className="fixed top-4 right-4 z-[200] animate-slide-in">
      <div className={`${bgColor} text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[300px] max-w-md`}>
        <span className="material-symbols-rounded text-2xl">{icon}</span>
        <p className="flex-1 font-medium">{message}</p>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded-full transition-colors"
        >
          <span className="material-symbols-rounded text-xl">close</span>
        </button>
      </div>
    </div>
  );
};
