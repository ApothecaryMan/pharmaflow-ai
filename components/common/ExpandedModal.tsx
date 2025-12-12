import React from 'react';
import { Modal } from './Modal';

interface ExpandedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  color: string;
  t?: any;
}

export const ExpandedModal: React.FC<ExpandedModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  actions,
  color,
  t
}) => {
  return (
    <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="6xl"
        zIndex={100}
    >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-800 bg-${color}-50 dark:bg-${color}-950/20`}>
          <h2 className={`text-xl md:text-2xl font-bold text-${color}-900 dark:text-${color}-100`}>
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {actions}
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              title={t?.global?.actions?.close || 'Close'}
            >
              <span className="material-symbols-rounded">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </div>
    </Modal>
  );
};
