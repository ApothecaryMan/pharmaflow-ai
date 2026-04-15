import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MenuItem } from '../../config/menuData';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { SearchInput } from '../common/SearchInput';
import { useSmartDirection } from '../common/SmartInputs';
import { useSettings } from '../../context';
import { Tooltip } from '../common/Tooltip';

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
  hideSearch?: boolean;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = React.memo(
  ({
    menuItems,
    activeModule,
    currentView,
    onNavigate,
    onViewChange,
    isMobile = false,
    theme,
    translations,
    language,
    hideInactiveModules = false,
    hideSearch = false,
  }) => {
    const { sidebarCollapsed } = useSettings();
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
      return menuItems.find((m) => m.id === activeModule);
    }, [menuItems, activeModule]);

    // Memoized filtered submenus based on search and visibility
    const filteredSubmenus = useMemo(() => {
      if (!activeModuleData?.submenus) return [];

      // First filtered by hideInactiveModules if needed
      let submenus = activeModuleData.submenus;

      if (hideInactiveModules) {
        submenus = submenus
          .map((submenu) => {
            // Filter items within submenu
            const visibleItems = submenu.items.filter((item) => {
              return typeof item === 'object' && !!item.view; // Only keep implemented items
            });

            if (visibleItems.length === 0) return null; // Drop empty submenus
            return { ...submenu, items: visibleItems };
          })
          .filter(Boolean) as any[];
      }

      if (!searchQuery.trim()) return submenus;

      const query = searchQuery.toLowerCase();
      return submenus
        .map((submenu) => {
          const matchesSubmenu = submenu.label.toLowerCase().includes(query);
          const filteredItems = submenu.items.filter((item) => {
            const label = typeof item === 'string' ? item : item.label;
            return label.toLowerCase().includes(query);
          });
          if (matchesSubmenu || filteredItems.length > 0) {
            return { ...submenu, items: matchesSubmenu ? submenu.items : filteredItems };
          }
          return null;
        })
        .filter(Boolean) as any[];
    }, [activeModuleData, searchQuery, hideInactiveModules]);

    // Auto-expand submenus when searching
    React.useEffect(() => {
      if (searchQuery.trim()) {
        const newExpandedSubmenus = new Set<string>();
        filteredSubmenus.forEach((submenu) => {
          newExpandedSubmenus.add(submenu.id);
        });
        setExpandedSubmenus(newExpandedSubmenus);
      }
    }, [searchQuery, filteredSubmenus]);

    // Toggle submenu with auto-collapse (only one open at a time)
    const toggleSubmenu = useCallback((submenuId: string) => {
      setExpandedSubmenus((prev) => {
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

    const handleItemClick = useCallback(
      (submenu: string, item: string) => {
        console.log(`Navigation: ${activeModuleData?.label} > ${submenu} > ${item}`);
        // You can add custom navigation logic here
      },
      [activeModuleData]
    );

    if (!activeModuleData) return null;

    return (
      <div className='flex-1 flex flex-col w-full h-full p-2.5 overflow-hidden'>
        {/* Unified Sidebar Card - Matches CARD_BASE style */}
        <div
          className='flex-1 flex flex-col w-full overflow-hidden rounded-2xl border border-(--border-divider) card-shadow'
          style={{
            backgroundColor: 'var(--bg-navbar)',
          }}
        >
          {/* Search Bar */}
          {!hideSearch && !sidebarCollapsed && (
            <div
              className='px-3 py-3 sticky top-0 z-10'
              style={{ backgroundColor: 'var(--bg-navbar)' }}
            >
              <div className='relative'>
                <SearchInput
                  value={searchQuery}
                  onSearchChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                  placeholder={`${language === 'AR' ? 'بحث في' : 'Search in'} ${getMenuTranslation(activeModuleData?.label || '', language)}...`}
                  color={theme}
                wrapperClassName='!bg-(--bg-card)'
                  style={{
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Submenus - Simplified Flat List */}
          <nav
            ref={navRef}
            onScroll={handleScroll}
            className={`flex-1 space-y-1.5 w-full overflow-y-auto ${sidebarCollapsed ? 'px-[6px] pt-[6px]' : 'px-3'} pb-[6px] custom-scrollbar`}
          >
            {filteredSubmenus.length === 0 ? (
              <div className='text-center py-8 text-gray-400 text-sm'>
                <span className='material-symbols-rounded text-[32px] mb-2 block opacity-50'>
                  search_off
                </span>
                {!sidebarCollapsed && 'No results found'}
              </div>
            ) : (
              filteredSubmenus.map((submenu, submenuIdx) => (
                <div key={submenu.id}>
                  {/* Subtle Divider Line (skip first one and hide in mini) */}
                  {submenuIdx > 0 && !sidebarCollapsed && (
                    <div
                      className='my-3 mx-3'
                      style={{
                        height: '1px',
                        backgroundColor: 'var(--border-divider)',
                        opacity: 0.5,
                      }}
                    />
                  )}

                  {/* Items List */}
                  <div className={`space-y-1.5 ${sidebarCollapsed ? 'flex flex-col items-center' : ''}`}>
                    {submenu.items.slice(0, 15).map((item, idx) => {
                      const itemLabel = typeof item === 'string' ? item : item.label;
                      const itemIcon = typeof item === 'object' ? item.icon : 'radio_button_unchecked';
                      const itemView =
                        typeof item === 'object' && item.view ? item.view : itemLabel;
                      const isImplemented = typeof item === 'object' && !!item.view;
                      const isActive = itemView === currentView;
                      const translatedLabel = getMenuTranslation(itemLabel, language);

                      const buttonContent = (
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
                          className={`
                            relative flex items-center type-interactive
                            ${sidebarCollapsed 
                              ? 'justify-center w-12 h-12 rounded-xl border border-transparent hover:border-(--border-divider)' 
                              : 'w-full gap-2.5 ltr:text-left rtl:text-right px-3 py-2 rounded-lg'
                            }
                            ${!isImplemented
                                ? 'opacity-30 cursor-not-allowed text-gray-400 dark:text-gray-600'
                                : isActive
                                  ? `bg-primary-100 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400 font-semibold border-(--border-divider)`
                                  : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-(--bg-menu-hover)'
                            }
                          `}
                        >
                          {isActive && sidebarCollapsed && (
                            <div className='absolute ltr:left-1 rtl:right-1 w-1 h-6 bg-primary-600 rounded-full' />
                          )}

                          {itemIcon && (
                            <span
                              className={`material-symbols-rounded text-[22px] ${isActive ? 'font-fill' : 'opacity-70'}`}
                            >
                              {itemIcon}
                            </span>
                          )}
                          
                          {!sidebarCollapsed && (
                            <span className='flex-1 truncate'>{translatedLabel}</span>
                          )}
                          
                          {!isImplemented && !sidebarCollapsed && (
                            <span className='text-[9px] opacity-60 border border-gray-300 dark:border-gray-700 px-1 rounded-xs uppercase font-bold'>
                              Soon
                            </span>
                          )}
                        </button>
                      );

                      if (sidebarCollapsed) {
                        return (
                          <Tooltip 
                            key={idx} 
                            content={translatedLabel} 
                            position={language === 'AR' ? 'bottom' : 'bottom'} // Top or Bottom based on spacing
                            delay={100}
                          >
                            {buttonContent}
                          </Tooltip>
                        );
                      }

                      return buttonContent;
                    })}
                  </div>
                </div>
              ))
            )}
          </nav>
        </div>
      </div>
    );
  }
);
