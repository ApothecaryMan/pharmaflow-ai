// ============================================================================
// REFACTORED: MobileDrawer.tsx - Production-Ready Implementation
// ============================================================================

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { SidebarContent } from './SidebarContent';
import { Avatar } from '@mui/material';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { useSettings } from '../../context';
import { MenuItem } from '../../config/menuData';


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
  view: string;
  dashboardSubView: string;
  handleNavigate: (path: string) => void;
  handleViewChange: (view: string) => void;
  t: Translations;
  profileImage: string | null;
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
}) => {
  const { theme, language, hideInactiveModules, darkMode } = useSettings();
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
    (v: string) => {
      handleNavigate(v);
      onClose();
    },
    [handleNavigate, onClose]
  );

  const handleViewChangeAndClose = useCallback(
    (v: string) => {
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
    <div className="fixed inset-0 z-[100] md:hidden overflow-hidden">
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-sm 
          transition-opacity duration-${ANIMATION_DURATION} ease-out
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside
        ref={drawerRef}
        className={`
          fixed top-0 bottom-0 w-[90vw] max-w-[360px] flex flex-col
          bg-white/95 dark:bg-gray-900/95 backdrop-blur-3xl
          ${isRTL ? 'right-0 border-l' : 'left-0 border-r'}
          border-gray-200/50 dark:border-gray-800/50
          transition-transform duration-${ANIMATION_DURATION} cubic-bezier(0.32, 0.72, 0, 1)
          ${isAnimating ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
        `}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        {/* Header */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-gray-200/30 dark:border-gray-800/30">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar
                src={safeProfileImage}
                sx={{
                  bgcolor: theme.hex,
                  width: 44,
                  height: 44,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                alt="User profile"
              >
                {!safeProfileImage && (
                  <span className="material-symbols-rounded text-white" aria-hidden="true">
                    person
                  </span>
                )}
              </Avatar>
              <div
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"
                aria-label="Online status"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-gray-900 dark:text-gray-100 leading-tight">
                Zinc AI
              </span>
              <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {t.profile.role}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-full transition-all"
            aria-label="Close menu"
            type="button"
          >
            <span className="material-symbols-rounded text-[22px]" aria-hidden="true">
              close
            </span>
          </button>
        </div>

        {/* Module Ribbon */}
        <div className="py-5 border-y border-gray-200 dark:border-gray-800/30 bg-gray-50/50 dark:bg-gray-900/20">
          <div className="px-5 mb-4">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
              {t.menu.modules}
            </h3>
          </div>
          <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide mask-fade-edges">
            {filteredMenuItems.map((module) => {
              const isActive = activeModule === module.id;
              return (
                <button
                  key={module.id}
                  onClick={() => handleModuleChange(module.id)}
                  className={`
                    flex flex-col items-center justify-center p-2 min-w-[68px] rounded-2xl transition-all duration-300
                    ${
                      isActive
                        ? `text-${theme.primary}-600 dark:text-${theme.primary}-400`
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                    }
                  `}
                  aria-label={getMenuTranslation(module.label, language)}
                  aria-current={isActive ? 'page' : undefined}
                  type="button"
                >
                  {module.id === 'sales' ? (
                    <svg 
                      className={`w-[26px] h-[26px] transition-all duration-500 ${isActive ? 'scale-110' : ''}`}
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="2" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    >
                      <path d="M4 4h3l1 10h10l1-10H7" />
                      <circle cx="9" cy="19" r="1.5" />
                      <circle cx="17" cy="19" r="1.5" />
                    </svg>
                  ) : (
                    <span
                      className={`
                        material-symbols-rounded text-[26px] transition-all duration-500
                        ${isActive ? 'font-fill scale-110' : ''}
                      `}
                      aria-hidden="true"
                    >
                      {module.icon}
                    </span>
                  )}
                  <span
                    className={`text-[10px] mt-1.5 font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px] ${
                      isActive ? 'opacity-100' : 'opacity-60'
                    }`}
                  >
                    {getMenuTranslation(module.label, language)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Menu Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-3 px-2">
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
        <div className="p-6 mt-auto border-t border-gray-200 dark:border-gray-800/30 bg-gray-50/80 dark:bg-gray-950/40">
          <div className="flex justify-center opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
            <img
              src={darkMode ? '/logo_word_white.svg' : '/logo_word_black.svg'}
              className="h-3.5 w-auto"
              alt="Zinc"
            />
          </div>
        </div>
      </aside>
    </div>
  );
};

MobileDrawer.displayName = 'MobileDrawer';
