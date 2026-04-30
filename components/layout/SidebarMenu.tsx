import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { MenuItem } from '../../config/menuData';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { SearchInput } from '../common/SearchInput';
import { useSmartDirection } from '../common/SmartInputs';
import { useSettings } from '../../context';
import { Tooltip } from '../common/Tooltip';
import { motion, AnimatePresence } from 'motion/react';
import { useVirtualizer } from '@tanstack/react-virtual';

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
  sidebarCollapsed: boolean;
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
    sidebarCollapsed,
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

    // Flatten the submenus into a single list of items and dividers for virtualization
    const flatItems = useMemo(() => {
      const rows: Array<{ 
        type: 'divider' | 'item'; 
        data: any; 
        submenuId: string;
        submenuLabel: string;
      }> = [];

      filteredSubmenus.forEach((submenu, submenuIdx) => {
        if (submenuIdx > 0 && !sidebarCollapsed) {
          rows.push({
            type: 'divider',
            data: null,
            submenuId: submenu.id,
            submenuLabel: submenu.label,
          });
        }
        submenu.items.forEach((item) => {
          rows.push({
            type: 'item',
            data: item,
            submenuId: submenu.id,
            submenuLabel: submenu.label,
          });
        });
      });
      return rows;
    }, [filteredSubmenus, sidebarCollapsed]);

    const virtualizer = useVirtualizer({
      count: flatItems.length,
      getScrollElement: () => navRef.current,
      estimateSize: (index) => {
        const item = flatItems[index];
        if (item.type === 'divider') return 25;
        return sidebarCollapsed ? 54 : 46; 
      },
      overscan: 10,
    });

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
          {/* Search Bar - Optimized to not unmount for better performance */}
          <motion.div
            initial={false}
            animate={{ 
              height: sidebarCollapsed ? 0 : 'auto',
              opacity: sidebarCollapsed ? 0 : 1,
              pointerEvents: sidebarCollapsed ? 'none' : 'auto',
            }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className='px-3 overflow-hidden sticky top-0 z-10'
            style={{ backgroundColor: 'var(--bg-navbar)' }}
          >
            <div className='py-3'>
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
          </motion.div>

          {/* Submenus - Simplified Flat List */}
          <motion.nav
            layout
            ref={navRef}
            onScroll={handleScroll}
            className='flex-1 space-y-1.5 w-full overflow-y-auto pb-[6px] custom-scrollbar'
            animate={{
                paddingLeft: sidebarCollapsed ? 6 : 12,
                paddingRight: sidebarCollapsed ? 6 : 12,
                paddingTop: sidebarCollapsed ? 6 : 0,
            }}
            transition={{ duration: 0.2 }}
          >
            {filteredSubmenus.length === 0 ? (
              <div className='text-center py-8 text-gray-400 text-sm'>
                <span className='material-symbols-rounded text-[32px] mb-2 block opacity-50'>
                  search_off
                </span>
                {!sidebarCollapsed && 'No results found'}
              </div>
            ) : (
              <div
                style={{
                  height: `${virtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {virtualizer.getVirtualItems().map((virtualRow) => {
                  const row = flatItems[virtualRow.index];

                  if (row.type === 'divider') {
                    return (
                      <div
                        key={virtualRow.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: `${virtualRow.size}px`,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                      >
                        <div
                          className='my-3 mx-3'
                          style={{
                            height: '1px',
                            backgroundColor: 'var(--border-divider)',
                            opacity: 0.5,
                          }}
                        />
                      </div>
                    );
                  }

                  // Item Logic
                  const item = row.data;
                  const itemLabel = typeof item === 'string' ? item : item.label;
                  const itemIcon = typeof item === 'object' ? item.icon : 'radio_button_unchecked';
                  const itemView = typeof item === 'object' && item.view ? item.view : null;
                  const isImplemented = !!itemView;
                  const isActive = !!itemView && itemView === currentView;
                  const translatedLabel = getMenuTranslation(itemLabel, language);

                  const buttonContent = (
                    <button
                      disabled={!isImplemented}
                      onClick={() => {
                        if (onViewChange && itemView) {
                          onViewChange(itemView);
                        } else {
                          handleItemClick(row.submenuLabel, itemLabel);
                        }
                      }}
                      className={`
                        relative flex items-center type-interactive transition-all duration-200
                        ${sidebarCollapsed 
                          ? 'justify-center w-11 h-11 rounded-full' 
                          : 'w-full gap-2.5 ltr:text-left rtl:text-right px-3 py-2 rounded-lg'
                        }
                        ${!isImplemented
                            ? 'opacity-30 cursor-not-allowed text-gray-400 dark:text-gray-600'
                            : isActive
                              ? sidebarCollapsed
                                ? 'text-primary-600 dark:text-primary-400 font-semibold'
                                : `bg-primary-100 dark:bg-primary-500/15 text-primary-700 dark:text-primary-400 font-semibold border-(--border-divider)`
                              : `text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white 
                                 ${sidebarCollapsed ? 'hover:bg-primary-50 dark:hover:bg-primary-500/10' : 'hover:bg-(--bg-menu-hover)'}`
                        }
                      `}
                    >
                      {isActive && sidebarCollapsed && (
                        <motion.div 
                          layoutId="active-indicator"
                          className='absolute ltr:left-0 rtl:right-0 w-1 h-6 bg-primary-600 rounded-full' 
                        />
                      )}

                      {itemIcon && (
                        <span
                          className={`material-symbols-rounded text-[24px] ${isActive ? 'font-fill' : 'opacity-70'}`}
                        >
                          {itemIcon}
                        </span>
                      )}
                      
                      <AnimatePresence>
                        {!sidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.15 }}
                            className='flex-1 truncate'
                          >
                            {translatedLabel}
                          </motion.span>
                        )}
                      </AnimatePresence>
                      
                      <AnimatePresence>
                        {!isImplemented && !sidebarCollapsed && (
                          <motion.span
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 0.6, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className='text-[9px] border border-gray-300 dark:border-gray-700 px-1 rounded-xs uppercase font-bold'
                          >
                            Soon
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </button>
                  );

                  return (
                    <div
                      key={virtualRow.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                      className={sidebarCollapsed ? 'flex justify-center' : ''}
                    >
                      {sidebarCollapsed ? (
                        <Tooltip 
                          content={translatedLabel} 
                          position={language === 'AR' ? 'bottom' : 'bottom'}
                          delay={100}
                        >
                          {buttonContent}
                        </Tooltip>
                      ) : (
                        buttonContent
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.nav>
        </div>
      </div>
    );
  }
);
