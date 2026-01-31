import React, { useRef, useEffect, useState } from 'react';
import { SidebarContent } from './SidebarContent';
import { Avatar } from '@mui/material';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { useSettings } from '../../context';
import { UserRole } from '../../config/permissions';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  filteredMenuItems: any[];
  activeModule: string;
  handleModuleChange: (id: string) => void;
  view: string;
  dashboardSubView: string;
  handleNavigate: (path: string) => void;
  handleViewChange: (view: string) => void;
  t: any;
  profileImage: string | null;
}

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
  profileImage
}) => {
  const { theme, language, sidebarBlur, hideInactiveModules, darkMode } = useSettings();
  const drawerRef = useRef<HTMLDivElement>(null);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle Animation Timing and Scroll Lock
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      // Lock scroll immediately
      document.body.style.overflow = 'hidden';
      document.body.classList.add('drawer-open');
      // Small delay to ensure component is in DOM before triggering entry animation
      const timer = setTimeout(() => setIsAnimating(true), 50);
      return () => {
        clearTimeout(timer);
      };
    } else {
      setIsAnimating(false);
      // Unlock scroll immediately when closing starts
      document.body.style.overflow = '';
      document.body.classList.remove('drawer-open');
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 500); 
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
      document.body.classList.remove('drawer-open');
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!shouldRender) return null;

  const isRTL = language === 'AR';

  return (
    <div className="fixed inset-0 z-[100] md:hidden overflow-hidden">
      {/* Immersive Backdrop */}
      <div 
        className={`
            fixed inset-0 bg-white/30 dark:bg-black/40 backdrop-blur-sm transition-opacity duration-500 ease-out
            ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `} 
        onClick={onClose}
      />

      {/* Liquid Sidebar Panel */}
      <aside 
        ref={drawerRef}
        className={`
          fixed top-0 bottom-0 w-[90vw] max-w-[360px] flex flex-col
          bg-white/95 dark:bg-gray-900/95 backdrop-blur-3xl
          ${isRTL ? 'right-0 border-l' : 'left-0 border-r'}
          border-gray-200/50 dark:border-gray-800/50
          transition-transform duration-500 cubic-bezier(0.32, 0.72, 0, 1)
          ${isAnimating ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
        `}
      >
        {/* 1. Header: Profile & Branding */}
        <div className="p-6 pb-4 flex items-center justify-between border-b border-gray-200/30 dark:border-gray-800/30">
          <div className="flex items-center gap-3">
             <div className="relative">
                <Avatar 
                    src={profileImage || undefined}
                    sx={{ 
                    bgcolor: theme.hex,
                    width: 44, 
                    height: 44,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                    }}
                >
                    {!profileImage && <span className="material-symbols-rounded text-white">person</span>}
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
             </div>
             <div className="flex flex-col">
                <span className="text-sm font-black text-gray-900 dark:text-gray-100 leading-tight">Zinc AI</span>
                <span className="text-[11px] font-medium text-gray-500 dark:text-gray-400">{t.profile.role}</span>
             </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-full transition-all"
          >
            <span className="material-symbols-rounded text-[22px]">close</span>
          </button>
        </div>

        {/* 2. Horizontal Module Ribbon (Liquid Switcher) */}
        <div className="py-5 border-y border-gray-200 dark:border-gray-800/30 bg-gray-50/50 dark:bg-gray-900/20">
           <div className="px-5 mb-4">
              <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-400 dark:text-gray-500">
                {t.menu.modules}
              </h3>
           </div>
           <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide mask-fade-edges">
              {filteredMenuItems.map(module => {
                const isActive = activeModule === module.id;
                return (
                  <button
                    key={module.id}
                    onClick={() => handleModuleChange(module.id)}
                    className={`
                      flex flex-col items-center justify-center p-2 min-w-[68px] rounded-2xl transition-all duration-300
                      ${isActive 
                        ? `text-${theme.primary}-600 dark:text-${theme.primary}-400`
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                      }
                    `}
                  >
                    <span className={`
                      material-symbols-rounded text-[26px] transition-all duration-500
                      ${isActive ? 'font-fill scale-110' : ''}
                    `}>
                      {module.icon}
                    </span>
                    <span className={`text-[10px] mt-1.5 font-bold whitespace-nowrap overflow-hidden text-ellipsis max-w-[60px] ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                      {getMenuTranslation(module.label, language)}
                    </span>
                  </button>
                );
              })}
           </div>
        </div>

        {/* 3. Main Menu Content (Simplified Accordion) */}
        <div className="flex-1 overflow-y-auto scrollbar-hide py-3 px-2">
           <SidebarContent 
              menuItems={filteredMenuItems}
              activeModule={activeModule}
              view={view}
              dashboardSubView={dashboardSubView}
              onNavigate={(v) => {
                handleNavigate(v);
                onClose();
              }}
              onViewChange={(v) => {
                handleViewChange(v);
                onClose();
              }}
              isMobile={true}
              theme={theme}
              t={t}
              language={language}
              hideInactiveModules={hideInactiveModules}
            />
        </div>

        {/* 4. Footer: Version & Micro-Branding */}
        <div className="p-6 mt-auto border-t border-gray-200 dark:border-gray-800/30 bg-gray-50/80 dark:bg-gray-950/40">
           <div className="flex justify-center opacity-40 grayscale hover:grayscale-0 transition-all cursor-default">
              <img src={darkMode ? "/logo_word_white.svg" : "/logo_word_black.svg"} className="h-3.5 w-auto" alt="Zinc" />
           </div>
        </div>
      </aside>
    </div>
  );
};
