// ============================================================================
// REFACTORED: MobileDrawer.tsx - Production-Ready Implementation
// ============================================================================

import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MenuItem } from '../../config/menuData';
import { useSettings } from '../../context';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { getIconByName } from '../common/Icons';
import { SidebarContent } from './SidebarContent';
import { authService } from '../../services/auth/authService';
import type { Employee, ViewState } from '../../types';

// ============================================================================
// CONSTANTS
// ============================================================================

const ANIMATION_DURATION = 500; // ms
const ANIMATION_DELAY = 50; // ms

// ============================================================================
// TYPES
// ============================================================================

interface Translations {
  profile: {
    role: string;
    signOut?: string;
  };
  menu: {
    modules: string;
  };
}

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filteredMenuItems: MenuItem[];
  activeModule: string;
  handleModuleChange: (id: string) => void;
  view: ViewState;
  dashboardSubView: string;
  handleNavigate: (path: ViewState) => void;
  handleViewChange: (view: ViewState) => void;
  t: Translations;
  profileImage: string | null;
  currentEmployeeId?: string | null;
  employees?: Employee[];
  onLogout?: () => void;
}

// ============================================================================
// UTILITY: Sanitize Profile Image
// ============================================================================

const sanitizeProfileImage = (image: string | null): string | undefined => {
  if (!image) return undefined;

  // Only allow data URLs with image MIME types
  if (image.startsWith('data:image/')) {
    return image;
  }

  // Only allow HTTPS URLs (no javascript: or data: attacks)
  if (image.startsWith('https://')) {
    return image;
  }

  console.warn('[MobileDrawer] Blocked potentially unsafe profile image:', image);
  return undefined;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  filteredMenuItems,
  activeModule,
  handleModuleChange,
  view,
  dashboardSubView,
  handleNavigate,
  handleViewChange,
  t,
  profileImage,
  currentEmployeeId,
  employees = [],
  onLogout,
}) => {
  const { theme, language, hideInactiveModules, darkMode } = useSettings();
  const currentEmployee = employees.find(e => e.id === currentEmployeeId);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const unmountTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sanitize profile image
  const safeProfileImage = sanitizeProfileImage(profileImage);

  // ============================================================================
  // EFFECT: Handle Animation Timing and Scroll Lock
  // ============================================================================

  useEffect(() => {
    // Clear any pending timers
    if (animationTimerRef.current) {
      clearTimeout(animationTimerRef.current);
      animationTimerRef.current = null;
    }
    if (unmountTimerRef.current) {
      clearTimeout(unmountTimerRef.current);
      unmountTimerRef.current = null;
    }

    if (isOpen) {
      // Opening sequence
      setShouldRender(true);

      // Lock scroll immediately
      document.body.style.overflow = 'hidden';
      document.body.classList.add('drawer-open');

      // Trigger animation after DOM update
      animationTimerRef.current = setTimeout(() => {
        setIsAnimating(true);
      }, ANIMATION_DELAY);
    } else {
      // Closing sequence
      setIsAnimating(false);

      // Keep scroll locked until animation completes
      unmountTimerRef.current = setTimeout(() => {
        setShouldRender(false);
        // Unlock scroll AFTER animation completes
        document.body.style.overflow = '';
        document.body.classList.remove('drawer-open');
      }, ANIMATION_DURATION);
    }

    return () => {
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    };
  }, [isOpen]);

  // ============================================================================
  // EFFECT: Cleanup on Unmount
  // ============================================================================

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('drawer-open');
      if (animationTimerRef.current) clearTimeout(animationTimerRef.current);
      if (unmountTimerRef.current) clearTimeout(unmountTimerRef.current);
    };
  }, []);

  // ============================================================================
  // EFFECT: Close on Escape (Memoized)
  // ============================================================================

  const handleEscapeKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleEscapeKey);
    return () => window.removeEventListener('keydown', handleEscapeKey);
  }, [handleEscapeKey]);

  // ============================================================================
  // CALLBACKS: Memoized to prevent re-renders
  // ============================================================================

  const handleNavigateAndClose = useCallback(
    (v: ViewState) => {
      handleNavigate(v);
      onClose();
    },
    [handleNavigate, onClose]
  );

  const handleViewChangeAndClose = useCallback(
    (v: ViewState) => {
      handleViewChange(v);
      onClose();
    },
    [handleViewChange, onClose]
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  if (!shouldRender) return null;

  const isRTL = language === 'AR';

  return (
    <div className='fixed inset-0 z-100 md:hidden overflow-hidden'>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-xs 
          transition-opacity duration-${ANIMATION_DURATION} ease-out
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
        aria-hidden='true'
      />

      {/* Drawer Panel */}
      <aside
        ref={drawerRef}
        className={`
          fixed top-0 bottom-0 z-50 w-[85vw] max-w-[320px] flex flex-col
          bg-(--bg-page-surface) shadow-xl
          ${isRTL ? 'right-0 border-l border-(--border-divider)' : 'left-0 border-r border-(--border-divider)'}
          transition-transform duration-${ANIMATION_DURATION} cubic-bezier(0.32, 0.72, 0, 1)
          ${isAnimating ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'}
        `}
        role='dialog'
        aria-modal='true'
        aria-label='Navigation menu'
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-(--border-divider)">
          <div className="relative">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-(--bg-secondary) flex items-center justify-center ring-2 ring-(--border-divider)">
              {safeProfileImage ? (
                <img src={safeProfileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className='material-symbols-rounded text-(--text-tertiary)'>person</span>
              )}
            </div>
            <div className='absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-(--bg-page-surface) rounded-full' aria-label='Online status' />
          </div>
          <div className="min-w-0 flex-1 flex flex-col">
            <span className="text-sm font-bold text-(--text-primary) truncate">
              {currentEmployeeId ? (currentEmployee?.name || authService.getCurrentUserSync()?.username || 'Zinc AI') : 'Zinc AI'}
            </span>
            <span className="text-xs text-primary-500 truncate">
              {currentEmployeeId ? t.profile.role : 'System'}
            </span>
          </div>
          {currentEmployeeId && onLogout && (
            <button
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="flex items-center justify-center px-3 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors shrink-0"
              aria-label={t.profile.signOut || 'Logout'}
              type='button'
            >
              {t.profile.signOut || 'Logout'}
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center justify-center w-10 h-10 text-(--text-tertiary) hover:text-(--text-primary) transition-colors shrink-0"
            aria-label='Close menu'
            type='button'
          >
            <span className='material-symbols-rounded text-[22px]' aria-hidden='true'>menu_open</span>
          </button>
        </div>

        {/* Module Ribbon */}
        <div className='py-3 border-b border-(--border-divider) bg-(--bg-secondary)/50'>
          <div className='flex gap-2 overflow-x-auto px-4 scrollbar-hide mask-fade-edges'>
            {filteredMenuItems.map((module) => {
              const isActive = activeModule === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => handleModuleChange(module.id)}
                  className={`
                    flex flex-col items-center justify-center p-2 min-w-[68px] rounded-xl transition-all duration-300
                    ${isActive
                      ? 'bg-(--bg-card) text-(--text-primary) shadow-xs ring-1 ring-(--border-divider)'
                      : 'text-(--text-tertiary) hover:text-(--text-secondary) hover:bg-(--bg-secondary)'
                    }
                  `}
                  aria-label={getMenuTranslation(module.label, language)}
                  aria-current={isActive ? 'page' : undefined}
                  type='button'
                >
                  {(() => {
                    const IconComponent = getIconByName(module.icon || module.id);
                    return (
                      <IconComponent
                        size={24}
                        active={isActive}
                        className={`transition-all duration-500 ${isActive ? 'scale-110 text-primary-500' : ''}`}
                      />
                    );
                  })()}
                  <span
                    className={`text-[10px] mt-1.5 font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px] ${isActive ? 'opacity-100' : 'opacity-60'}`}
                  >
                    {getMenuTranslation(module.label, language)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Content */}
        <div className='flex-1 overflow-y-auto scrollbar-hide py-3 px-2'>
          <SidebarContent
            menuItems={filteredMenuItems}
            activeModule={activeModule}
            view={view}
            dashboardSubView={dashboardSubView}
            onNavigate={handleNavigateAndClose}
            onViewChange={handleViewChangeAndClose}
            isMobile={true}
            theme={theme}
            t={t}
            language={language}
            hideInactiveModules={hideInactiveModules}
          />
        </div>

        {/* Footer */}
        <div className='p-6 mt-auto border-t border-(--border-divider) bg-(--bg-secondary)/30'>
          <div className='flex justify-center opacity-40 grayscale hover:grayscale-0 transition-all cursor-default'>
            <img
              src={darkMode ? '/logo_word_white.svg' : '/logo_word_black.svg'}
              className='h-3.5 w-auto'
              alt='Zinc'
            />
          </div>
        </div>
      </aside>
    </div>
  );
};

MobileDrawer.displayName = 'MobileDrawer';
