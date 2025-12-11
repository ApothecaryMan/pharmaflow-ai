import React, { useState, useMemo, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { MenuItem } from '../../config/menuData';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { useSmartDirection } from '../../hooks/useSmartDirection';
import { SearchInput } from '../common/SearchInput';

interface SidebarMenuProps {
  menuItems: MenuItem[];
  activeModule: string;
  currentView: string;
  onNavigate: (viewId: string) => void;
  onViewChange?: (view: string) => void;
  isMobile?: boolean;
  theme: string;
  translations: any;
  language: 'EN' | 'AR';
  hideInactiveModules?: boolean;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = React.memo(({
  menuItems,
  activeModule,
  currentView,
  onNavigate,
  onViewChange,
  isMobile = false,
  theme,
  translations,
  language,
  hideInactiveModules = false
}) => {
  const [expandedSubmenus, setExpandedSubmenus] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const navRef = useRef<HTMLElement>(null);
  const scrollPosRef = useRef(0);

  // Reset scroll when module changes
  useEffect(() => {
    scrollPosRef.current = 0;
    if (navRef.current) navRef.current.scrollTop = 0;
  }, [activeModule]);

  // Restore scroll after render
  useLayoutEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = scrollPosRef.current;
    }
  });

  const handleScroll = () => {
    if (navRef.current) {
      scrollPosRef.current = navRef.current.scrollTop;
    }
  };

  // Get the active module's data
  const activeModuleData = useMemo(() => {
    return menuItems.find(m => m.id === activeModule);
  }, [menuItems, activeModule]);

  // Memoized filtered submenus based on search and visibility
  const filteredSubmenus = useMemo(() => {
    if (!activeModuleData?.submenus) return [];
    
    // First filtered by hideInactiveModules if needed
    let submenus = activeModuleData.submenus;

    if (hideInactiveModules) {
       submenus = submenus.map(submenu => {
           // Filter items within submenu
           const visibleItems = submenu.items.filter(item => {
               return typeof item === 'object' && !!item.view; // Only keep implemented items
           });
           
           if (visibleItems.length === 0) return null; // Drop empty submenus
           return { ...submenu, items: visibleItems };
       }).filter(Boolean) as any[];
    }

    if (!searchQuery.trim()) return submenus;

    const query = searchQuery.toLowerCase();
    return submenus.map(submenu => {
      const matchesSubmenu = submenu.label.toLowerCase().includes(query);
      const filteredItems = submenu.items.filter(item => {
        const label = typeof item === 'string' ? item : item.label;
        return label.toLowerCase().includes(query);
      });
      if (matchesSubmenu || filteredItems.length > 0) {
        return { ...submenu, items: matchesSubmenu ? submenu.items : filteredItems };
      }
      return null;
    }).filter(Boolean) as any[];
  }, [activeModuleData, searchQuery, hideInactiveModules]);

  // Auto-expand submenus when searching
  React.useEffect(() => {
    if (searchQuery.trim()) {
      const newExpandedSubmenus = new Set<string>();
      filteredSubmenus.forEach(submenu => {
        newExpandedSubmenus.add(submenu.id);
      });
      setExpandedSubmenus(newExpandedSubmenus);
    }
  }, [searchQuery, filteredSubmenus]);

  // Toggle submenu with auto-collapse (only one open at a time)
  const toggleSubmenu = useCallback((submenuId: string) => {
    setExpandedSubmenus(prev => {
      const newExpanded = new Set<string>();
      // If clicking on already expanded submenu, collapse it
      // Otherwise, open only the clicked submenu
      if (!prev.has(submenuId)) {
        newExpanded.add(submenuId);
      }
      return newExpanded;
    });
  }, []);

  // Collapse all submenus
  const collapseAll = useCallback(() => {
    setExpandedSubmenus(new Set());
  }, []);

  const handleItemClick = useCallback((submenu: string, item: string) => {
    console.log(`Navigation: ${activeModuleData?.label} > ${submenu} > ${item}`);
    // You can add custom navigation logic here
  }, [activeModuleData]);

  if (!activeModuleData) return null;

  return (
    <div className="flex-1 flex flex-col w-full overflow-hidden h-full">
      {/* Search Bar */}
      <div className="px-3 py-3 sticky top-0 z-10" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="relative">
          <SearchInput
            value={searchQuery}
            onSearchChange={setSearchQuery}
            onClear={() => setSearchQuery('')}
            placeholder={`${language === 'AR' ? 'بحث في' : 'Search in'} ${getMenuTranslation(activeModuleData?.label || '', language)}...`}
            className="rounded-lg border ps-9 pe-9"
            style={{ 
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
      </div>

      {/* Submenus - Simplified Flat List */}
      <nav 
        ref={navRef}
        onScroll={handleScroll}
        className="flex-1 space-y-1 w-full overflow-y-auto px-3 pb-3"
      >
        {filteredSubmenus.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <span className="material-symbols-rounded text-[32px] mb-2 block opacity-50">search_off</span>
            No results found
          </div>
        ) : (
          filteredSubmenus.map((submenu, submenuIdx) => (
            <div key={submenu.id}>
              {/* Subtle Divider Line (skip first one) */}
              {submenuIdx > 0 && (
                <div 
                  className="my-3 mx-3"
                  style={{ 
                    height: '1px',
                    backgroundColor: 'var(--border-primary)',
                    opacity: 0.5
                  }}
                />
              )}
              
              {/* Items List */}
              <div className="space-y-0.5">
                {submenu.items.slice(0, 15).map((item, idx) => {
                  const itemLabel = typeof item === 'string' ? item : item.label;
                  const itemView = typeof item === 'object' && item.view ? item.view : itemLabel;
                  const isImplemented = typeof item === 'object' && !!item.view;
                  const isActive = itemView === currentView;
                  
                  return (

                    <button
                      key={idx}
                      disabled={!isImplemented}
                      onClick={() => {
                        if (onViewChange) {
                          onViewChange(itemView);
                        } else {
                          handleItemClick(submenu.label, itemLabel);
                        }
                      }}
                      className={`w-full ltr:text-left rtl:text-right px-3 py-2 rounded-lg transition-all type-interactive ${
                        !isImplemented
                          ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600'
                          : isActive 
                            ? `bg-${theme}-100 dark:bg-${theme}-900/30 text-${theme}-700 dark:text-${theme}-400 font-semibold` 
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {getMenuTranslation(itemLabel, language)}
                      {!isImplemented && <span className="text-[10px] opacity-60 ltr:ml-2 rtl:mr-2 border border-gray-300 dark:border-gray-700 px-1 rounded">Soon</span>}
                    </button>
                  );

                })}
              </div>
            </div>
          ))
        )}
      </nav>
    </div>
  );
});
