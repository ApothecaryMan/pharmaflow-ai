import { motion } from 'framer-motion';
import React from 'react';
import type { MenuItem } from '../../../config/menuData';
import { useSettings } from '../../../context';
import { getMenuTranslation } from '../../../i18n/menuTranslations';
import { TRANSLATIONS } from '../../../i18n/translations';
import type { ViewState } from '../../../types';
import { EventManager } from '../../../utils/events/eventManager';
import { getIconByName, Icons } from '../../common/Icons';
import { Tooltip } from '../../common/Tooltip';
import { SidebarDropdown } from '../SidebarDropdown';

interface NavModulesProps {
  menuItems: MenuItem[];
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  currentView?: ViewState;
  onNavigate?: (view: ViewState) => void;
  onOpenInWindow?: (view: ViewState) => void;
  // External control for dropdowns
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  activeAnchor: HTMLElement | null;
  setActiveAnchor: (el: HTMLElement | null) => void;
  dropdownRef: React.RefObject<HTMLDivElement>;
  handleWheel: (e: React.WheelEvent) => void;
  handleMouseEnter: (moduleId: string, event: React.MouseEvent) => void;
  handleMouseLeave: () => void;
  cancelClose: () => void;
  isCompact?: boolean;
}

export const NavModules: React.FC<NavModulesProps> = ({
  menuItems,
  activeModule,
  onModuleChange,
  currentView,
  onNavigate,
  onOpenInWindow,
  activeDropdown,
  setActiveDropdown,
  activeAnchor,
  setActiveAnchor,
  dropdownRef,
  handleWheel,
  handleMouseEnter,
  handleMouseLeave,
  cancelClose,
  isCompact = false,
}) => {
  const {
    language,
    theme: currentTheme,
    navStyle = 1,
    hideInactiveModules,
    developerMode,
    navbarMenuLayout,
  } = useSettings();

  const t = TRANSLATIONS[language];
  const theme = currentTheme.primary;

  // Resolve active dynamic events to see if there is a custom navbar icon set
  const activeEvents = React.useMemo(() => {
    if (typeof window === 'undefined') return [];
    return EventManager.getActiveEvents({
      currentPath: window.location.pathname,
      view: currentView,
    });
  }, [currentView]);

  const navbarIconsEvent = activeEvents.find((e) => e.type === 'NAVBAR_ICONS');
  const customIcons = navbarIconsEvent?.payload as Record<string, any> | undefined;
  const customGradient = customIcons?.gradient;
  const gradRef = customGradient ? 'url(#navbar-event-gradient)' : undefined;

  const handleModuleClick = (moduleId: string, event: React.MouseEvent<HTMLButtonElement>) => {
    if (navStyle === 2) {
      if (activeDropdown === moduleId) {
        setActiveDropdown(null);
        setActiveAnchor(null);
      } else {
        setActiveDropdown(moduleId);
        setActiveAnchor(event.currentTarget);
      }
    } else {
      onModuleChange(moduleId);
      if (onNavigate) {
        const module = menuItems.find((m) => m.id === moduleId);
        if (module?.submenus) {
          for (const submenu of module.submenus) {
            for (const item of submenu.items) {
              if (typeof item === 'object' && item.view) {
                onNavigate(item.view);
                return;
              }
            }
          }
        }
      }
    }
  };

  return (
    <div
      className={`flex items-center gap-0.5 flex-1 scrollbar-hide ${activeDropdown && navStyle === 2 ? 'overflow-hidden' : 'overflow-x-auto'}`}
      ref={dropdownRef}
      onWheel={handleWheel}
    >
      {menuItems
        .filter((m) => m.id !== 'test' || developerMode)
        .map((module) => {
          const isActive = activeModule === module.id;
          const isDropdownOpen = activeDropdown === module.id;
          const hasPage = module.hasPage !== false;
          const hasImplementedSubItems =
            module.submenus?.some((submenu) =>
              submenu.items.some((item) => typeof item === 'object' && !!item.view)
            ) ?? false;

          const isEffectivelyDisabled = !developerMode && !hasPage && !hasImplementedSubItems;

          return (
            <div
              key={module.id}
              id={`navbar-tab-${module.id}`}
              className='relative group/item'
              onMouseLeave={handleMouseLeave}
            >
              <button
                onMouseEnter={(e) => handleMouseEnter(module.id, e)}
                onClick={(e) => handleModuleClick(module.id, e)}
                disabled={isEffectivelyDisabled}
                className={`main-nav-tab flex items-center gap-2 ${module.id === 'settings' || module.id === 'test' ? 'px-2' : 'px-2.5'} py-1 rounded-lg whitespace-nowrap relative type-interactive transition-all duration-200
                    ${
                      isEffectivelyDisabled
                        ? 'opacity-40 cursor-not-allowed text-gray-400 dark:text-gray-600'
                        : isActive
                          ? `bg-(--bg-navbar-hover) text-primary-900 dark:text-primary-400 font-bold shadow-xs border-(--border-divider)`
                          : isDropdownOpen
                            ? `bg-(--bg-navbar-hover) text-gray-800 dark:text-gray-200 font-medium`
                            : 'text-gray-600 dark:text-gray-400 hover:bg-(--bg-navbar-hover) hover:text-gray-900 dark:hover:text-white'
                    }
                  `}
                title={
                  module.id === 'settings' || module.id === 'test'
                    ? getMenuTranslation(module.label, language)
                    : !hasPage && !hasImplementedSubItems && navStyle !== 2
                      ? t.settings.comingSoon
                      : ''
                }
              >
                <span className={`flex items-center justify-center`}>
                  {(() => {
                    const customIconName = customIcons?.[module.id];
                    const iconName = customIconName || module.icon || module.id;
                    const IconComponent = getIconByName(iconName);
                    return (
                      <IconComponent
                        size={isCompact ? 20 : 22}
                        active={isActive || isDropdownOpen}
                        className='transition-all duration-200'
                        style={
                          gradRef && {
                            stroke: gradRef,
                            fill: isActive || isDropdownOpen ? gradRef : 'none',
                          }
                        }
                      />
                    );
                  })()}
                </span>

                {!isCompact && module.id !== 'settings' && module.id !== 'test' && (
                  <span className='text-sm font-medium'>
                    {getMenuTranslation(module.label, language)}
                  </span>
                )}

                {isActive && (hasPage || hasImplementedSubItems) && navStyle !== 2 && (
                  <motion.div
                    layoutId='nav-indicator'
                    className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-[1.5px] bg-primary-600 rounded-full`}
                  />
                )}
              </button>

              {isDropdownOpen && navStyle === 2 && (
                <SidebarDropdown
                  module={module}
                  currentView={activeModule === module.id ? currentView || '' : ''}
                  onNavigate={(viewId) => {
                    onModuleChange(module.id);
                    if (onNavigate) {
                      onNavigate(viewId);
                    }
                    setActiveDropdown(null);
                    setActiveAnchor(null);
                  }}
                  onClose={() => {
                    setActiveDropdown(null);
                    setActiveAnchor(null);
                  }}
                  theme={theme}
                  language={language}
                  hideInactiveModules={hideInactiveModules}
                  blur={false}
                  anchorEl={activeAnchor}
                  onMouseEnter={cancelClose}
                  onMouseLeave={handleMouseLeave}
                  onOpenInWindow={onOpenInWindow}
                  layout={navbarMenuLayout}
                />
              )}
            </div>
          );
        })}
    </div>
  );
};
