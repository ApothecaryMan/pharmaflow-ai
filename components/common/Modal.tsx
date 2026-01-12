import React, { useEffect } from 'react';
import { SegmentedControl, SegmentedControlOption } from './SegmentedControl';

/**
 * Modal Component Props
 * 
 * @example Basic Modal
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="My Modal"
 *   subtitle="Optional subtitle"
 *   icon="info"
 * >
 *   <p>Modal content here</p>
 * </Modal>
 * ```
 * 
 * @example Modal with Tabs (Multi-page Modal)
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Settings"
 *   tabs={[
 *     { label: 'General', value: 'general', icon: 'settings' },
 *     { label: 'Privacy', value: 'privacy', icon: 'lock' }
 *   ]}
 *   activeTab={currentTab}
 *   onTabChange={setCurrentTab}
 * >
 *   {currentTab === 'general' ? <GeneralSettings /> : <PrivacySettings />}
 * </Modal>
 * ```
 */
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * Tailwind max-width class to control width.
   * Standard sizes: max-w-sm, max-w-md, max-w-lg, max-w-xl, max-w-2xl, etc.
   * Default: max-w-lg
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full'; 
  width?: string; // explicit override
  className?: string; // extra classes for the container
  closeOnBackdropClick?: boolean;
  zIndex?: number;
  title?: string;
  subtitle?: string;
  icon?: string;
  headerActions?: React.ReactNode;
  
  /**
   * Tab options for multi-page modals.
   * When provided with activeTab and onTabChange, renders a SegmentedControl
   * in the modal header (centered between title and close button).
   * 
   * PLACEMENT: Tabs appear in the center of the modal header
   * LAYOUT: [Title/Subtitle] --- [Tabs] --- [Header Actions + Close Button]
   */
  tabs?: SegmentedControlOption<any>[];
  
  /**
   * Current active tab value.
   * Required when using tabs. Should match one of the tab values.
   */
  activeTab?: any;
  
  /**
   * Callback when tab is changed.
   * Required when using tabs. Updates the activeTab state.
   */
  onTabChange?: (value: any) => void;

  /**
   * Whether to hide the close button in the header.
   * Default: false
   * 
   * @recommendation When using tabs, set this to true and provide a cancel button
   * at the bottom of the modal for better UX.
   */
  hideCloseButton?: boolean;
}

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
  full: 'max-w-full m-4',
};

import ReactDOM from 'react-dom';

// ... (imports)

export const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  children, 
  size = 'lg',
  width,
  className = '',
  closeOnBackdropClick = true,
  zIndex = 100,
  title,
  subtitle,
  icon,
  headerActions,
  tabs,
  activeTab,
  onTabChange,
  hideCloseButton = false
}) => {
  
  // Handle ESC key and Body Scroll Lock
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      // Only close if it's the top-most modal? 
      // For now simple check.
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
    
    return () => {
      window.removeEventListener('keydown', handleEsc);
      // We only restore body scroll if we are unmounting or closing
      // Caveat: nested modals might fight over this.
      // But simple refactor should be fine for now.
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClass = width || SIZE_MAP[size] || SIZE_MAP.lg;
  
  // Construct z-index class if standard, or style if custom
  const zClass = `z-[${zIndex}]`;

  return ReactDOM.createPortal(
    <div 
        className={`fixed inset-0 ${zClass} flex items-center justify-center p-4 animate-fade-in`}
        style={{ zIndex }}
    >
       {/* Backdrop */}
       <div 
         className="absolute inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-sm transition-opacity"
         onClick={closeOnBackdropClick ? onClose : undefined}
       />
       
       {/* Modal Content Wrapper */}
       <div 
         className={`relative w-full ${maxWidthClass} bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in max-h-[95vh] dark:border dark:border-gray-700 ${className}`}
         onClick={e => e.stopPropagation()}
       >
         {title ? (
           <div className="p-6 h-full flex flex-col overflow-hidden">
             {/* Standard Header */}
             <div className="flex items-center justify-between mb-6 shrink-0 gap-4">
               <div>
                 <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                   {icon && <span className="material-symbols-rounded text-[24px]">{icon}</span>}
                   {title}
                 </h2>
                 {subtitle && (
                   <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                     {subtitle}
                   </p>
                 )}
               </div>

               {/* Tabs Section - Renders in the center of header when tabs are provided */}
               {tabs && activeTab && onTabChange && (
                 <div className="flex-1 flex justify-center max-w-md mx-4">
                    <SegmentedControl
                      options={tabs}
                      value={activeTab}
                      onChange={onTabChange}
                      size="sm"
                      variant="onCard"
                    />
                 </div>
               )}

               {/* Right Section - Header Actions + Close Button */}
               <div className="flex items-center gap-2">
                 {headerActions}
                 {!hideCloseButton && (
                   <button
                     onClick={onClose}
                     className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                   >
                     <span className="material-symbols-rounded">close</span>
                   </button>
                 )}
               </div>
             </div>
             
             {/* Content */}
             <div 
                className="flex-1 overflow-y-auto modal-scroll"
                style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(156, 163, 175, 0.6) transparent',
                }}
             >
                <style>{`
                    .modal-scroll::-webkit-scrollbar {
                        width: 4px;
                        background: transparent;
                    }
                    .modal-scroll::-webkit-scrollbar-track {
                        background: transparent;
                        border: none;
                        box-shadow: none;
                    }
                    .modal-scroll::-webkit-scrollbar-thumb {
                        background: rgba(156, 163, 175, 0.3);
                        border-radius: 9999px;
                    }
                    .modal-scroll:hover::-webkit-scrollbar-thumb {
                        background: rgba(156, 163, 175, 0.6);
                    }
                    .modal-scroll::-webkit-scrollbar-corner {
                        background: transparent;
                    }
                `}</style>
               {children}
             </div>
           </div>
         ) : (
           children
         )}
       </div>
    </div>,
    document.body
  );
};
