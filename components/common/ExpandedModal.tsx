import type React from 'react';
import { Modal } from './Modal';

interface ViewConfig {
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

interface ExpandedModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  color?: string;
  t?: any;
  /**
   * Optional Registry pattern for multi-view modals.
   * If activeView is provided, title, children and actions are derived from this map.
   */
  activeView?: string | null;
  views?: Record<string, ViewConfig>;
}

export const ExpandedModal: React.FC<ExpandedModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  actions,
  color,
  t,
  activeView,
  views,
}) => {
  // Resolve content from views registry if available
  const currentView = activeView && views ? views[activeView] : null;
  
  const finalTitle = currentView?.title || title || '';
  const finalChildren = currentView?.children || children;
  const finalActions = currentView?.actions || actions;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='6xl'
      zIndex={100}
      title={finalTitle}
      headerActions={finalActions}
    >
      {/* Content */}
      <div className='h-full'>{finalChildren}</div>
    </Modal>
  );
};
