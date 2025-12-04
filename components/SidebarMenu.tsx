import React, { useState, useMemo, useCallback } from 'react';
import { MenuItem, Submenu } from '../menuData';
import { getMenuTranslation } from '../menuTranslations';

interface SidebarMenuProps {
  menuItems: MenuItem[];
  activeModule: string;
  currentView: string;
  onNavigate: (viewId: string) => void;
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
    }).filter(Boolean) as Submenu[];
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

  const toggleSubmenu = useCallback((submenuId: string) => {
    setExpandedSubmenus(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(submenuId)) {
        newExpanded.delete(submenuId);
      } else {
        newExpanded.add(submenuId);
      }
      return newExpanded;
    });
  }, []);

  const handleItemClick = useCallback((submenu: string, item: string) => {
    console.log(`Navigation: ${activeModuleData?.label} > ${submenu} > ${item}`);
    // You can add custom navigation logic here
  }, [activeModuleData]);

  if (!activeModuleData) return null;

  return (
    <div className="flex-1 flex flex-col w-full overflow-hidden h-full">
      {/* Module Header */}
      <div className={`px-4 py-3 border-b border-slate-200 dark:border-slate-700/50 ${activeModuleData.hasPage === false ? 'bg-slate-100 dark:bg-slate-800/50' : 'bg-slate-50 dark:bg-slate-800/30'}`}>
        <div className="flex items-center gap-2">
          <span className={`material-symbols-rounded text-${theme}-600 dark:text-${theme}-400 text-[20px] icon-filled ${activeModuleData.hasPage === false ? 'opacity-40' : ''}`}>
            {activeModuleData.icon}
          </span>
          <h2 className={`text-sm font-bold text-slate-800 dark:text-slate-200 ${activeModuleData.hasPage === false ? 'opacity-60' : ''}`}>
            {getMenuTranslation(activeModuleData.label, language)}
          </h2>
          {activeModuleData.hasPage === false ? (
            <span className="ml-auto text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
              {language === 'AR' ? 'قريباً' : 'Coming Soon'}
            </span>
          ) : (
            <span className="ml-auto text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full font-medium text-slate-600 dark:text-slate-400">
              {activeModuleData.submenus?.length || 0} {translations.menu.sections}
            </span>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-3 sticky top-0 bg-white dark:bg-slate-900 z-10">
        <div className="relative">
          <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            placeholder={`${translations.menu.searchIn} ${getMenuTranslation(activeModuleData.label, language)}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-${theme}-500 focus:border-transparent transition-all`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
            >
              <span className="material-symbols-rounded text-slate-400 text-[16px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Submenus */}
      <nav className="flex-1 space-y-1 w-full overflow-y-auto px-3 pb-3 scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
        {filteredSubmenus.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">
            <span className="material-symbols-rounded text-[32px] mb-2 block opacity-50">search_off</span>
            No results found
          </div>
        ) : (
          filteredSubmenus.map((submenu) => {
            const isSubmenuExpanded = expandedSubmenus.has(submenu.id);

            return (
              <div key={submenu.id} className="mb-1">
                {/* Submenu Header */}
                <button
                  onClick={() => toggleSubmenu(submenu.id)}
                  className="flex items-center w-full px-3 py-2.5 gap-2 rounded-lg transition-all group text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"
                >
                  <span className="material-symbols-rounded text-[18px] opacity-70 group-hover:opacity-100 transition-opacity">
                    {isSubmenuExpanded ? 'folder_open' : 'folder'}
                  </span>
                  <span className="text-sm font-semibold flex-1 text-left">
                    {getMenuTranslation(submenu.label, language)}
                  </span>
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full font-medium">
                    {submenu.items.length}
                  </span>
                  <span className={`material-symbols-rounded text-[18px] transition-transform duration-200 ${isSubmenuExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>

                {/* Submenu Items */}
                {isSubmenuExpanded && (
                  <div className="ml-4 mt-1 space-y-0.5 border-l-2 border-slate-200 dark:border-slate-700/50 pl-3 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700 animate-fade-in">
                    {submenu.items.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleItemClick(submenu.label, item)}
                        className="flex items-center w-full px-2.5 py-1.5 gap-2 rounded-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200 transition-all group"
                      >
                        <span className="material-symbols-rounded text-[12px] opacity-0 group-hover:opacity-100 transition-opacity">
                          arrow_right
                        </span>
                        <span className="text-xs font-medium text-left flex-1 truncate">
                          {getMenuTranslation(item, language)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </nav>

      {/* Quick Stats (when not searching) */}
      {!searchQuery && (
        <div className="px-3 pt-2 pb-3 border-t border-slate-200 dark:border-slate-700/50 mt-auto">
          <div className="text-[10px] text-slate-400 space-y-1">
            <div className="flex justify-between items-center px-2">
              <span>{translations.menu.sections}</span>
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {activeModuleData.submenus?.length || 0}
              </span>
            </div>
            <div className="flex justify-between items-center px-2">
              <span>{translations.menu.totalItems}</span>
              <span className="font-bold text-slate-600 dark:text-slate-300">
                {activeModuleData.submenus?.reduce((acc, s) => acc + s.items.length, 0) || 0}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
