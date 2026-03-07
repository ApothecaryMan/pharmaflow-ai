import type React from 'react';
import { useEffect } from 'react';
import { SegmentedControl, type SegmentedControlOption } from './SegmentedControl';

export const BUTTON_CLOSE_BASE = 'border border-transparent hover:border-(--border-divider)';

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

  /**
   * Footer content (e.g. action buttons).
   * Renders at the bottom of the modal, fixed outside the scrollable area.
   */
  footer?: React.ReactNode;
  /**
   * Optional fixed height for the modal (e.g. '600px', '80vh').
   * Useful to prevent layout jumps when switching between tabs.
   */
  height?: string;
}

import ReactDOM from 'react-dom';
import { LAYOUT_CONFIG } from '../../config/layoutConfig';

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
  hideCloseButton = false,
  footer,
  height,
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

  const maxWidthClass = width || LAYOUT_CONFIG.MODAL_SIZES[size] || LAYOUT_CONFIG.MODAL_SIZES.lg;

  // Construct z-index class if standard, or style if custom
  const zClass = `z-[${zIndex}]`;

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 ${zClass} flex items-center justify-center p-4 animate-fade-in`}
      style={{ zIndex }}
    >
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-white/10 dark:bg-black/40 backdrop-blur-md transition-opacity'
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {/* Modal Content Wrapper */}
      <div
        className={`relative w-full ${maxWidthClass} bg-(--bg-card) rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in max-h-[95vh] border border-(--border-divider) select-none ${className}`}
        style={{ height: height || 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className='h-full flex flex-col overflow-hidden'>
            {/* Header - with internal padding */}
            <div className='p-6 pb-0 shrink-0'>
              <div className='flex items-center justify-between mb-6 gap-4'>
                <div>
                  <h2 className='text-xl font-bold text-(--text-primary) flex items-center gap-2'>
                    {icon ? (
                      <span 
                        className='material-symbols-rounded text-(--text-primary)' 
                        style={{ 
                          fontSize: 'var(--icon-lg)',
                          fontVariationSettings: "'FILL' 0, 'wght' 700, 'GRAD' 0, 'opsz' 24"
                        }}
                      >
                        {icon}
                      </span>
                    ) : null}
                    {title}
                  </h2>
                  {subtitle ? (
                    <p className='text-sm text-(--text-tertiary) mt-1'>{subtitle}</p>
                  ) : null}
                </div>

                {/* Tabs Section - Renders in the center of header when tabs are provided */}
                {tabs && activeTab && onTabChange ? (
                  <div className='flex-1 flex justify-center max-w-md mx-4'>
                    <SegmentedControl
                      options={tabs}
                      value={activeTab}
                      onChange={onTabChange}
                      size='sm'
                      variant='onCard'
                    />
                  </div>
                ) : null}

                {/* Right Section - Header Actions + Close Button */}
                <div className='flex items-center gap-2'>
                  {headerActions}
                  {!hideCloseButton ? (
                    <button
                      onClick={onClose}
                      className='w-10 h-10 flex items-center justify-center rounded-xl hover:bg-(--bg-surface-neutral) text-(--text-tertiary) hover:text-(--text-primary) transition-all active:scale-95'
                    >
                      <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>close</span>
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Content - with internal padding and independent scrolling */}
            <div
              className='flex-1 overflow-y-auto modal-scroll p-6 pt-0'
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

            {/* Footer - with top border and balanced padding */}
            {footer ? (
              <div className='p-6 pt-6 shrink-0 border-t border-(--border-divider) bg-(--bg-card)'>
                {footer}
              </div>
            ) : null}
          </div>
        ) : (
          children
        )}
      </div>
    </div>,
    document.body
  );
};
