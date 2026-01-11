import React from 'react';
import { MenuItem } from '../../config/menuData';
import { getMenuTranslation } from '../../i18n/menuTranslations';

interface SidebarDropdownProps {
  module: MenuItem;
  currentView: string;
  onNavigate: (viewId: string) => void;
  onClose: () => void;
  theme: string;
  hideInactiveModules?: boolean;
  anchorEl: HTMLElement | null;
  language: 'EN' | 'AR';
  blur?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export const SidebarDropdown: React.FC<SidebarDropdownProps> = ({
  module,
  currentView,
  onNavigate,
  onClose,
  theme,
  language,
  hideInactiveModules,
  anchorEl,
  blur = false,
  onMouseEnter,
  onMouseLeave
}) => {
  const [position, setPosition] = React.useState<{ top: number; left?: number; right?: number } | null>(null);

  React.useLayoutEffect(() => {
    if (anchorEl) {
      const updatePosition = () => {
        const rect = anchorEl.getBoundingClientRect();
        const top = rect.bottom + 9; // Add 9px offset to align with navbar border (6px gap + 4px extra)
        
        if (language === 'AR') {
           // RTL: Align right edge of dropdown with right edge of button (or window)
           // Actually, standard dropdown behavior aligns start (right in RTL) with start.
           // However, simple approach: left = auto, rightOffset = windowWidth - rect.right
           setPosition({
             top,
             right: window.innerWidth - rect.right
           });
        } else {
           // LTR: Align left
           setPosition({
             top,
             left: rect.left
           });
        }
      };

      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true); // Capture scroll to update if needed
      
      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', updatePosition, true);
      };
    }
  }, [anchorEl, language]);

  // Filter submenus if hideInactiveModules is true
  const filteredSubmenus = React.useMemo(() => {
    if (!hideInactiveModules) return module.submenus;

    return module.submenus?.map(submenu => {
         // Filter items
         const visibleItems = submenu.items.filter(item => {
             return typeof item === 'object' && !!item.view;
         });
         
         if (visibleItems.length === 0) return null;
         return { ...submenu, items: visibleItems };
    }).filter(Boolean) as typeof module.submenus;
  }, [module.submenus, hideInactiveModules]);

  if (!module.submenus || !anchorEl || !position) return null;
  if (hideInactiveModules && (!filteredSubmenus || filteredSubmenus.length === 0)) return null;

  const submenusToRender = hideInactiveModules ? filteredSubmenus : module.submenus;

  return (
    <div 
      className={`fixed w-64 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-[9999] animate-fade-in origin-top ${
        blur 
          ? 'backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 saturate-150 supports-[backdrop-filter]:bg-white/30' 
          : 'bg-white dark:bg-gray-800'
      }`}
      style={{
        top: position.top,
        left: position.left,
        right: position.right
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="max-h-[60vh] overflow-y-auto py-2">
        {submenusToRender!.map((submenu, submenuIdx) => (
            <div key={submenu.id}>
                {/* Submenu Header */}
                <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {getMenuTranslation(submenu.label, language)}
                </div>

                {/* Submenu Items */}
                <div className="px-2 mb-2">
                    {submenu.items.map((item, idx) => {
                        const itemLabel = typeof item === 'string' ? item : item.label;
                        const itemView = typeof item === 'object' && item.view ? item.view : null;
                        const itemIcon = typeof item === 'object' && item.icon ? item.icon : null;
                        const isImplemented = !!itemView;
                        const isActive = itemView === currentView;

                        return (
                            <button
                                key={idx}
                                disabled={!isImplemented}
                                onClick={() => {
                                    if (itemView) {
                                        onNavigate(itemView);
                                        onClose();
                                    }
                                }}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all text-start ${
                                    !isImplemented 
                                        ? 'opacity-50 cursor-not-allowed text-gray-400' 
                                        : isActive
                                            ? `bg-${theme}-100 dark:bg-${theme}-900/30 text-${theme}-700 dark:text-${theme}-400 font-semibold`
                                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700'
                                }`}
                            >
                                <div className="flex items-center gap-2.5">
                                    {itemIcon && (
                                        <span className={`material-symbols-rounded text-[18px] ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`}>
                                            {itemIcon}
                                        </span>
                                    )}
                                    <span>{getMenuTranslation(itemLabel, language)}</span>
                                </div>
                                {!isImplemented && (
                                    <span className="text-[10px] items-center px-1.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-400">
                                        Soon
                                    </span>
                                )}    
                            </button>
                        );
                    })}
                </div>
                
                {submenuIdx < (submenusToRender!.length || 0) - 1 && (
                    <div className="h-px bg-gray-100 dark:bg-gray-800 mx-4 my-1" />
                )}
            </div>
        ))}
      </div>
    </div>
  );
};
