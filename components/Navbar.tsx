import React from 'react';
import { MenuItem } from '../menuData';
import { getMenuTranslation } from '../menuTranslations';

interface NavbarProps {
  menuItems: MenuItem[];
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  theme: string;
  darkMode: boolean;
  appTitle: string;
  onMobileMenuToggle: () => void;
  isMobile?: boolean;
  language: 'EN' | 'AR';
}

export const Navbar: React.FC<NavbarProps> = React.memo(({
  menuItems,
  activeModule,
  onModuleChange,
  theme,
  darkMode,
  appTitle,
  onMobileMenuToggle,
  isMobile = false,
  language
}) => {
  return (
    <nav 
      className="h-16 flex items-center px-4 sticky top-0 z-50"
      style={{
        backgroundColor: 'var(--bg-primary)',
        borderBottom: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Logo & Title */}
      <div className="flex items-center gap-3 mr-6 shrink-0">
        <div className={`w-10 h-10 rounded-xl bg-${theme}-600 flex items-center justify-center shadow-lg shadow-${theme}-500/30`}>
          <span className="material-symbols-rounded text-white text-[24px]">local_pharmacy</span>
        </div>
        <h1 className="hidden md:block text-lg font-bold tracking-tight text-slate-800 dark:text-slate-100 whitespace-nowrap">
          {appTitle}
        </h1>
      </div>

      {/* Desktop: Horizontal Module Tabs */}
      <div className="hidden md:flex items-center gap-1 flex-1 overflow-x-auto scrollbar-hide">
        {menuItems.map((module) => {
          const isActive = activeModule === module.id;
          const hasPage = module.hasPage !== false; // Default to true if not specified
          
          return (
            <button
              key={module.id}
              onClick={() => hasPage && onModuleChange(module.id)}
              disabled={!hasPage}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 whitespace-nowrap group relative
                ${!hasPage 
                  ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-600'
                  : isActive
                    ? `bg-${theme}-100 dark:bg-${theme}-900/30 text-${theme}-700 dark:text-${theme}-400 font-semibold shadow-sm`
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-800 dark:hover:text-slate-200'}
              `}
              title={!hasPage ? 'قريباً / Coming Soon' : ''}
            >
              <span className={`material-symbols-rounded text-[20px] transition-transform ${isActive && hasPage ? 'icon-filled scale-110' : hasPage ? 'group-hover:scale-105' : ''}`}>
                {module.icon}
              </span>
              <span className="text-sm font-medium">
                {getMenuTranslation(module.label, language)}
              </span>
              {isActive && hasPage && (
                <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-0.5 bg-${theme}-600 rounded-full`}></div>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile: Hamburger Menu */}
      <button
        onClick={onMobileMenuToggle}
        className="md:hidden ml-auto p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
      >
        <span className="material-symbols-rounded text-[24px]">menu</span>
      </button>

      {/* Right Side Actions (Desktop) */}
      <div className="hidden md:flex items-center gap-2 ml-4">
        {/* Notifications */}
        <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative">
          <span className="material-symbols-rounded text-[22px]">notifications</span>
          <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></div>
        </button>
        
        {/* User Profile */}
        <button className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <span className="material-symbols-rounded text-[22px]">account_circle</span>
        </button>
      </div>
    </nav>
  );
});
