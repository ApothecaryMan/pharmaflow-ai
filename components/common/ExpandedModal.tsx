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
        title={title}
        headerActions={actions}
    >

        {/* Content */}
        <div className="h-full">
          {children}
        </div>
    </Modal>
  );
};
