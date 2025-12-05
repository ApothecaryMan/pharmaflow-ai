import React, { useState, useMemo, useCallback } from 'react';
import { MenuItem } from '../menuData';
import { getMenuTranslation } from '../menuTranslations';

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
  language
}) => {
  const [expandedSubmenus, setExpandedSubmenus] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');

  // Get the active module's data
  const activeModuleData = useMemo(() => {
    return menuItems.find(m => m.id === activeModule);
  }, [menuItems, activeModule]);

  // Memoized filtered submenus based on search
  const filteredSubmenus = useMemo(() => {
    if (!activeModuleData?.submenus) return [];
    if (!searchQuery.trim()) return activeModuleData.submenus;

    const query = searchQuery.toLowerCase();
    return activeModuleData.submenus.map(submenu => {
      const matchesSubmenu = submenu.label.toLowerCase().includes(query);
      const filteredItems = submenu.items.filter(item => 
        item.toLowerCase().includes(query)
      );

      if (matchesSubmenu || filteredItems.length > 0) {
        return { ...submenu, items: matchesSubmenu ? submenu.items : filteredItems };
      }
      return null;
    }).filter(Boolean) as any[];
  }, [activeModuleData, searchQuery]);

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
          <span className="material-symbols-rounded absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder={`${language === 'AR' ? 'بحث في' : 'Search in'} ${getMenuTranslation(activeModuleData?.label || '', language)}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-10 py-2 text-sm rounded-xl border transition-all focus:ring-2 focus:ring-offset-0"
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-primary)',
              color: 'var(--text-primary)'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="material-symbols-rounded absolute ltr:right-3 rtl:left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 text-[18px] transition-colors"
            >
              close
            </button>
          )}
        </div>
      </div>

      {/* Submenus - Simplified Flat List */}
      <nav className="flex-1 space-y-1 w-full overflow-y-auto px-3 pb-3">
        {filteredSubmenus.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
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
                  const itemView = typeof item === 'object' && item.view ? item.view : null;
                  const isActive = itemView === currentView;
                  
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (itemView && onViewChange) {
                          onViewChange(itemView as any);
                        } else {
                          handleItemClick(submenu.label, itemLabel);
                        }
                      }}
                      className={`w-full ltr:text-left rtl:text-right px-3 py-2 rounded-lg text-sm transition-all ${
                        isActive 
                          ? `bg-${theme}-100 dark:bg-${theme}-900/30 text-${theme}-700 dark:text-${theme}-400 font-semibold` 
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {getMenuTranslation(itemLabel, language)}
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
