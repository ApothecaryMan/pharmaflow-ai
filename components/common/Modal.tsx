import type React from 'react';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { SegmentedControl, type SegmentedControlOption } from './SegmentedControl';
import { SearchInput } from './SearchInput';

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
  /**
   * Optional inline style overrides for the modal content container card.
   */
  style?: React.CSSProperties;
  /**
   * Optional inline style overrides for the modal background backdrop overlay.
   */
  backdropStyle?: React.CSSProperties;
  /**
   * If true, prevents this modal from being shown as a sidebar.
   * Useful for modals that require a wider view.
   */
  preventSidebar?: boolean;

  /** Enables a compact search bar below the header */
  searchable?: boolean;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

import ReactDOM from 'react-dom';
import { LAYOUT_CONFIG } from '../../config/layoutConfig';
import { useSettings } from '../../context';
import { TRANSLATIONS } from '../../i18n/translations';
import { useContextMenu } from './ContextMenu';

// Global counter to ensure dynamically opened modals stack on top of each other
let globalModalZIndex = 100;

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
  style,
  backdropStyle,
  preventSidebar = false,
  searchable = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder,
}) => {
  const settings = useSettings();
  const {
    modalPresentationMode,
    setModalPresentationMode,
    sidebarModalWidth,
    setSidebarModalWidth,
    language,
  } = settings;
  const { showMenu } = useContextMenu();
  const t = TRANSLATIONS[language].settings;

  const isSidebar = modalPresentationMode === 'sidebar' && !preventSidebar;

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

  // Handle ESC key listener
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  // Handle Body Scroll Lock and Sidebar Active Classes
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';

      if (isSidebar) {
        document.body.classList.add('sidebar-modal-active');
      } else {
        document.body.classList.add('modal-blur-active');
      }
    }

    return () => {
      if (isSidebar) {
        const remainingSidebars = document.querySelectorAll(
          '[data-modal-type="sidebar"][data-modal-open="true"]'
        );
        if (remainingSidebars.length <= 1) {
          document.body.classList.remove('sidebar-modal-active');
        }
      } else {
        const remainingModals = document.querySelectorAll(
          '[data-modal-type="modal"][data-modal-open="true"]'
        );
        if (remainingModals.length <= 1) {
          document.body.classList.remove('modal-blur-active');
        }
      }

      const allOpen = document.querySelectorAll('[data-modal-open="true"]');
      if (allOpen.length <= 1) {
        document.body.style.overflow = '';
      }
    };
  }, [isOpen, isSidebar]);

  // Compute/Update z-index dynamically when the modal state changes or prop updates
  useEffect(() => {
    if (isOpen) {
      if (zIndex !== undefined) {
        setActualZIndex(zIndex);
        globalModalZIndex = Math.max(globalModalZIndex, zIndex);
      } else {
        setActualZIndex((prev) => {
          if (prev <= globalModalZIndex && prev < 110) {
            globalModalZIndex += 10;
            return globalModalZIndex;
          }
          return prev;
        });
      }
    }
  }, [isOpen, zIndex]);

  const ContextMenuContent: React.FC<{ preventSidebar: boolean }> = ({ preventSidebar }) => {
    const { modalPresentationMode, sidebarModalWidth, setModalPresentationMode, setSidebarModalWidth, language } = useSettings();
    const { hideMenu } = useContextMenu();
    const isSidebar = modalPresentationMode === 'sidebar' && !preventSidebar;
    const tSettings = TRANSLATIONS[language].settings;

    return (
      <div className='font-sans'>
        <div className='px-2 py-1.5'>
          <SegmentedControl
            options={[
              { label: '', value: 'modal', icon: 'open_in_full' },
              { label: '', value: 'sidebar', icon: 'vertical_split' },
            ]}
            value={modalPresentationMode}
            onChange={(val) => {
              setModalPresentationMode?.(val as 'modal' | 'sidebar');
              hideMenu();
            }}
            size='xs'
            fullWidth
            iconSize='--icon-lg'
          />
        </div>

        <div className='border-t border-(--border-divider)' />

        {([
          { key: 'sm' as const, label: `${tSettings.sidebarModalWidth} (${tSettings.sidebarModalWidthNarrow})` },
          { key: 'md' as const, label: `${tSettings.sidebarModalWidth} (${tSettings.sidebarModalWidthStandard})` },
          { key: 'lg' as const, label: `${tSettings.sidebarModalWidth} (${tSettings.sidebarModalWidthWide})` },
          { key: 'xl' as const, label: `${tSettings.sidebarModalWidth} (${tSettings.sidebarModalWidthExtraWide})` },
        ]).map((item) => (
          <button
            key={item.key}
            onClick={() => setSidebarModalWidth?.(item.key)}
            disabled={!isSidebar}
            className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
              !isSidebar
                ? 'opacity-30 cursor-not-allowed'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            <span className='material-symbols-rounded text-lg'>
              {sidebarModalWidth === item.key ? 'check_circle' : 'circle'}
            </span>
            <span className='text-xs font-medium'>{item.label}</span>
          </button>
        ))}
      </div>
    );
  };

  const handleHeaderContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    showMenu(e.clientX, e.clientY, <ContextMenuContent preventSidebar={preventSidebar} />);
  };

  if (!isOpen) return null;

  const maxWidthClass = width || LAYOUT_CONFIG.MODAL_SIZES[size] || LAYOUT_CONFIG.MODAL_SIZES.lg;

  const cardVariants = {
    modal: {
      initial: { opacity: 0, scale: 0.95, y: 20 },
      animate: { opacity: 1, scale: 1, y: 0 },
      exit: { opacity: 0, scale: 0.95, y: 20 },
    },
    sidebar: {
      initial: { opacity: 0, x: '100%' },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: '100%' },
    },
  };

  const backdropVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const cardTransition = { type: 'spring', damping: 28, stiffness: 300 };
  const backdropTransition = { duration: 0.2 };
  const exitTransition = { duration: 0 };

  const mode = isSidebar ? 'sidebar' : 'modal';

  return ReactDOM.createPortal(
    <div
      className={
        isSidebar
          ? `fixed inset-0 flex md:justify-end justify-center pointer-events-none md:p-0 p-4`
          : `fixed inset-0 flex items-center justify-center p-4`
      }
      style={{ zIndex: isSidebar ? 10 : actualZIndex }}
      data-modal-type={isSidebar ? 'sidebar' : 'modal'}
      data-modal-open='true'
    >
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key='backdrop'
              className={`absolute inset-0 bg-black/10 dark:bg-black/60 pointer-events-auto ${isSidebar ? 'sidebar-modal-backdrop' : 'modal-backdrop'}`}
              style={backdropStyle}
              onClick={closeOnBackdropClick ? onClose : undefined}
              variants={backdropVariants}
              initial='initial'
              animate='animate'
              exit='exit'
              transition={backdropTransition}
            />

            {/* Card */}
            <motion.div
              key='card'
              layout
              className={
                isSidebar
                  ? `relative w-full bg-(--bg-card) border border-zinc-400/40 dark:border-zinc-500/30 overflow-hidden flex flex-col sidebar-modal-card select-none pointer-events-auto ${className}`
                  : `relative w-full ${maxWidthClass} bg-(--bg-card) rounded-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[95vh] border border-zinc-400/40 dark:border-zinc-500/30 ring-1 ring-inset ring-white/20 dark:ring-white/10 select-none ${className}`
              }
              style={isSidebar ? style : { height: height || 'auto', ...style }}
              onClick={(e) => e.stopPropagation()}
              variants={cardVariants[mode]}
              initial='initial'
              animate='animate'
              exit='exit'
              transition={{ ...cardTransition, exit: exitTransition }}
            >
        {title || tabs || headerActions ? (
          <div className='h-full flex flex-col overflow-hidden'>
            {/* Header - Windows 10 Style (Compact & Functional) */}
            <div
              className='shrink-0 border-b border-(--border-divider)/50 bg-(--bg-card) px-4 h-11 flex items-center relative select-none'
              onContextMenu={handleHeaderContextMenu}
            >
              {/* Title Section: Icon + Title */}
              {title || icon ? (
                <div className='flex items-center gap-2 min-w-0 pe-12'>
                  {icon ? (
                    <span
                      className='material-symbols-rounded text-(--text-tertiary)'
                      style={{
                        fontSize: 'var(--icon-lg)',
                        fontVariationSettings: "'FILL' 0, 'wght' 400",
                      }}
                    >
                      {icon}
                    </span>
                  ) : null}
                  {title ? (
                    <h2 className='text-sm font-semibold text-(--text-primary) tracking-tight truncate py-1'>
                      {title}
                    </h2>
                  ) : null}
                </div>
              ) : null}

              {/* Tabs Section - Strictly Centered */}
              {tabs && activeTab && onTabChange ? (
                <div className='absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0'>
                  <SegmentedControl
                    options={tabs}
                    value={activeTab}
                    onChange={onTabChange}
                    size='xs'
                    fullWidth={false}
                    iconSize='--icon-md'
                  />
                </div>
              ) : null}

              {/* End Section - Search + Header Actions + Close Button */}
              <div className='flex items-center gap-2 absolute end-2 top-0 bottom-0'>
                {searchable && (
                  <div className='w-[300px]'>
                    <SearchInput
                      compact
                      value={searchValue}
                      onSearchChange={(val) => onSearchChange?.(val)}
                      placeholder={searchPlaceholder}
                      wrapperClassName='w-full'
                    />
                  </div>
                )}
                {headerActions}
                {!hideCloseButton ? (
                  <button
                    onClick={onClose}
                    className='w-8 h-8 rounded-full grid place-items-center text-(--text-tertiary) hover:text-(--text-primary) hover:bg-zinc-500/10 dark:hover:bg-zinc-400/15 active:scale-95 transition-all duration-200'
                    aria-label='Close modal'
                  >
                    <span
                      className='material-symbols-rounded leading-none'
                      style={{
                        fontSize: '22px',
                        fontVariationSettings: "'wght' 600",
                        display: 'block',
                      }}
                    >
                      close
                    </span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Content - with internal padding and independent scrolling */}
            <div
              className={`flex-1 overflow-y-auto custom-scrollbar ${bodyClassName} content-shift-layer`}
            >
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
      </motion.div>
        </>
      )}
    </AnimatePresence>
    </div>,
    document.body
  );
};
