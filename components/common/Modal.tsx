import type React from 'react';
import { useEffect, useState } from 'react';
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
  /**
   * Extra classes for the modal body (the scrollable content area).
   * Useful for overriding the default padding (p-5).
   */
  bodyClassName?: string;
}

import ReactDOM from 'react-dom';
import { LAYOUT_CONFIG } from '../../config/layoutConfig';

// Global counter to ensure dynamically opened modals stack on top of each other
let globalModalZIndex = 100;

// ... (imports)

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  size = 'lg',
  width,
  className = '',
  closeOnBackdropClick = true,
  zIndex,
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
  bodyClassName = 'p-5',
}) => {
  const [actualZIndex, setActualZIndex] = useState(() => {
    if (isOpen) {
      if (zIndex !== undefined) {
        globalModalZIndex = Math.max(globalModalZIndex, zIndex);
        return zIndex;
      }
      globalModalZIndex += 10;
      return globalModalZIndex;
    }
    return zIndex || 100;
  });

  // Handle ESC key, Body Scroll Lock, and dynamic Z-Index
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
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
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Compute/Update z-index dynamically when the modal state changes or prop updates
  useEffect(() => {
    if (isOpen) {
      if (zIndex !== undefined) {
        setActualZIndex(zIndex);
        globalModalZIndex = Math.max(globalModalZIndex, zIndex);
      } else {
        // If we haven't assigned a dynamic z-index yet (e.g. opened after mount)
        // or if we want to refresh it.
        // But the initializer handles the first mount. 
        // This handles cases where isOpen transitions from false to true.
        setActualZIndex((prev) => {
          if (prev <= globalModalZIndex && prev < 110) { // Simple heuristic
             globalModalZIndex += 10;
             return globalModalZIndex;
          }
          return prev;
        });
      }
    }
  }, [isOpen, zIndex]);

  if (!isOpen) return null;

  const maxWidthClass = width || LAYOUT_CONFIG.MODAL_SIZES[size] || LAYOUT_CONFIG.MODAL_SIZES.lg;

  return ReactDOM.createPortal(
    <div
      className={`fixed inset-0 flex items-center justify-center p-4 animate-fade-in`}
      style={{ zIndex: actualZIndex }}
    >
      {/* Backdrop */}
      <div
        className='absolute inset-0 bg-white/10 dark:bg-black/40 backdrop-blur-md transition-opacity'
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      {/* Modal Content Wrapper */}
      <div
        className={`relative w-full ${maxWidthClass} bg-(--bg-card) rounded-lg shadow-2xl overflow-hidden flex flex-col animate-scale-in max-h-[95vh] border border-(--border-divider) select-none ${className}`}
        style={{ height: height || 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className='h-full flex flex-col overflow-hidden'>
            {/* Header - Windows 10 Style (Compact & Functional) */}
            <div className='shrink-0 border-b border-(--border-divider)/50 bg-(--bg-card) px-4 h-11 flex items-center relative'>
              {/* Title Section: Icon + Title */}
              <div className='flex items-center gap-2 min-w-0 pe-12'>
                {icon ? (
                  <span 
                    className='material-symbols-rounded text-(--text-tertiary)' 
                    style={{ 
                      fontSize: 'var(--icon-lg)',
                      fontVariationSettings: "'FILL' 0, 'wght' 400"
                    }}
                  >
                    {icon}
                  </span>
                ) : null}
                <h2 className='text-sm font-semibold text-(--text-primary) tracking-tight truncate py-1'>
                  {title}
                </h2>
              </div>

              {/* Tabs Section - Strictly Centered */}
              {tabs && activeTab && onTabChange ? (
                <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0'>
                  <SegmentedControl
                    options={tabs}
                    value={activeTab}
                    onChange={onTabChange}
                    size='xs'
                    variant='onCard'
                    fullWidth={false}
                    iconSize='--icon-md'
                  />
                </div>
              ) : null}

              {/* End Section - Header Actions + Close Button */}
              <div className='flex items-center absolute end-0 top-0 bottom-0'>
                {headerActions}
                {!hideCloseButton ? (
                  <button
                    onClick={onClose}
                    className='h-full w-12 flex items-center justify-center text-(--text-tertiary) hover:text-white hover:bg-red-500 active:bg-red-600 transition-colors duration-150 group'
                    aria-label="Close modal"
                  >
                    <span className='material-symbols-rounded block' style={{ fontSize: '18px' }}>close</span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Content - with internal padding and independent scrolling */}
            <div className={`flex-1 overflow-y-auto custom-scrollbar ${bodyClassName} content-shift-layer`}>
              {children}
            </div>

            {/* Footer - with top border and balanced padding */}
            {footer ? (
              <div className='p-5 shrink-0 border-t border-(--border-divider) bg-(--bg-card)'>
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
