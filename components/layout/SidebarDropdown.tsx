import React from 'react';
import type { MenuItem } from '../../config/menuData';
import { getMenuTranslation } from '../../i18n/menuTranslations';
import { TRANSLATIONS } from '../../i18n/translations';
import type { ViewState } from '../../types';
import { ContextMenuTrigger } from '../common/ContextMenu';
import { preloadPage } from '../../hooks/layout/usePreloadPage';

interface SidebarDropdownProps {
  module: MenuItem;
  currentView: ViewState | string;
  onNavigate: (viewId: ViewState) => void;
  onClose: () => void;
  theme: string;
  hideInactiveModules?: boolean;
  anchorEl: HTMLElement | null;
  language: 'EN' | 'AR';
  blur?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onOpenInWindow?: (view: ViewState) => void;
  layout?: 'single' | 'multi';
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
  onMouseLeave,
  onOpenInWindow,
  layout = 'single',
}) => {
  const [position, setPosition] = React.useState<{
    top: number;
    left?: number;
    right?: number;
  } | null>(null);

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
            right: window.innerWidth - rect.right,
          });
        } else {
          // LTR: Align left
          setPosition({
            top,
            left: rect.left,
          });
        }
      };

      updatePosition();

      let frameId: number | null = null;
      const handleScroll = () => {
        if (frameId !== null) return;
        frameId = requestAnimationFrame(() => {
          updatePosition();
          frameId = null;
        });
      };

      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

      return () => {
        window.removeEventListener('resize', updatePosition);
        window.removeEventListener('scroll', handleScroll, true);
        if (frameId !== null) cancelAnimationFrame(frameId);
      };
    }
  }, [anchorEl, language]);

  // Filter submenus if hideInactiveModules is true
  const filteredSubmenus = React.useMemo(() => {
    if (!hideInactiveModules) return module.submenus;

    return module.submenus
      ?.map((submenu) => {
        // Filter items
        const visibleItems = submenu.items.filter((item) => {
          return typeof item === 'object' && !!item.view;
        });

        if (visibleItems.length === 0) return null;
        return { ...submenu, items: visibleItems };
      })
      .filter(Boolean) as typeof module.submenus;
  }, [module.submenus, hideInactiveModules]);

  const isMulti = layout === 'multi';
  const submenusArray = hideInactiveModules ? filteredSubmenus : module.submenus;

  const columns = React.useMemo(() => {
    if (!isMulti || !submenusArray || submenusArray.length <= 1)
      return submenusArray ? [submenusArray] : [];

    const numCols = Math.min(submenusArray.length, 3);

    const counts = submenusArray.map((sm) => ({
      sm,
      count: hideInactiveModules
        ? sm.items.filter((i) => typeof i === 'object' && !!i.view).length
        : sm.items.length,
    }));

    const sorted = [...counts].sort((a, b) => b.count - a.count);

    const bins: Array<{ items: typeof counts; total: number }> = Array.from(
      { length: numCols },
      () => ({ items: [], total: 0 })
    );

    for (const item of sorted) {
      let minBin = 0;
      for (let i = 1; i < numCols; i++) {
        if (bins[i].total < bins[minBin].total) minBin = i;
      }
      bins[minBin].items.push(item);
      bins[minBin].total += item.count;
    }

    const origIdx = new Map(submenusArray.map((sm, i) => [sm.id, i]));
    return bins.map((bin) =>
      bin.items
        .sort((a, b) => Number(origIdx.get(a.sm.id) ?? 0) - Number(origIdx.get(b.sm.id) ?? 0))
        .map((item) => item.sm)
    );
  }, [isMulti, submenusArray, hideInactiveModules]);

  const multiStyle = React.useMemo(() => {
    if (!position || !isMulti) return undefined;
    const style: React.CSSProperties = {};
    const viewportWidth = window.innerWidth;
    const margin = 16;
    const colCount = columns.length;
    const idealWidth = colCount * 220 + 40;

    if (position.left !== undefined) {
      style.maxWidth = Math.max(320, Math.min(idealWidth, viewportWidth - position.left - margin));
    } else if (position.right !== undefined) {
      style.maxWidth = Math.max(320, Math.min(idealWidth, viewportWidth - position.right - margin));
    }
    return style;
  }, [position, isMulti, columns.length]);

  if (!module.submenus || !anchorEl || !position) return null;
  if (hideInactiveModules && (!submenusArray || submenusArray.length === 0)) return null;

  const submenusToRender = submenusArray;

  return (
    <div
      className={`fixed ${isMulti ? 'min-w-[300px]' : 'w-64'} rounded-2xl shadow-xl border border-(--border-divider) overflow-hidden z-[99999] animate-fade-in origin-top ${
        blur ? 'glass-surface' : 'bg-(--bg-menu)'
      }`}
      style={{
        top: position.top,
        left: position.left,
        right: position.right,
        ...(isMulti ? { width: 'max-content', ...multiStyle } : {}),
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className={`max-h-[60vh] overflow-y-auto ${isMulti ? 'p-3' : 'py-2'}`}>
        {isMulti ? (
          <div className='flex gap-3'>
            {columns.map((col, colIdx) => (
              <div
                key={colIdx}
                className='flex flex-col gap-0'
                style={{ minWidth: 220, maxWidth: 280, flex: '1 1 0%' }}
              >
                {col.map((submenu) => (
                  <div key={submenu.id}>
                    <div className='px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider'>
                      {getMenuTranslation(submenu.label, language)}
                    </div>
                    <div className='flex flex-col gap-1 px-1 mb-3'>
                      {submenu.items.map((item, idx) => {
                        const itemLabel = typeof item === 'string' ? item : item.label;
                        const itemView = typeof item === 'object' && item.view ? item.view : null;
                        const itemIcon = typeof item === 'object' && item.icon ? item.icon : null;
                        const isImplemented = !!itemView;
                        const isActive = itemView === currentView;

                        return (
                          <ContextMenuTrigger
                            key={idx}
                            actions={[
                              {
                                label: TRANSLATIONS[language].global.actions.openInWindow,
                                icon: 'open_in_new',
                                action: () => itemView && onOpenInWindow?.(itemView),
                              },
                            ]}
                          >
                            <button
                              disabled={!isImplemented}
                              onMouseEnter={() => itemView && preloadPage(itemView)}
                              onClick={() => {
                                if (itemView) {
                                  onNavigate(itemView);
                                  onClose();
                                }
                              }}
                              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all text-start whitespace-nowrap ${
                                !isImplemented
                                  ? 'opacity-50 cursor-not-allowed text-gray-400'
                                  : isActive
                                    ? `bg-(--bg-menu-hover) text-primary-900 dark:text-primary-400 font-semibold`
                                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-(--bg-menu-hover)'
                              }`}
                            >
                              <div className='flex items-center gap-2.5'>
                                {itemIcon && (
                                  <span
                                    className={`material-symbols-rounded ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`}
                                    style={{ fontSize: 'var(--icon-navbar-dropdown)' }}
                                  >
                                    {itemIcon}
                                  </span>
                                )}
                                <span>{getMenuTranslation(itemLabel, language)}</span>
                              </div>
                              {!isImplemented && (
                                <span className='text-[10px] items-center px-1.5 py-0.5 rounded-full border border-(--border-divider) bg-(--bg-input) text-gray-400'>
                                  Soon
                                </span>
                              )}
                            </button>
                          </ContextMenuTrigger>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ) : (
          submenusToRender!.map((submenu, submenuIdx) => (
            <div key={submenu.id}>
              <div className='px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider'>
                {getMenuTranslation(submenu.label, language)}
              </div>
              <div className='flex flex-col gap-1 px-2 mb-2'>
                {submenu.items.map((item, idx) => {
                  const itemLabel = typeof item === 'string' ? item : item.label;
                  const itemView = typeof item === 'object' && item.view ? item.view : null;
                  const itemIcon = typeof item === 'object' && item.icon ? item.icon : null;
                  const isImplemented = !!itemView;
                  const isActive = itemView === currentView;

                  return (
                    <ContextMenuTrigger
                      key={idx}
                      actions={[
                        {
                          label: TRANSLATIONS[language].global.actions.openInWindow,
                          icon: 'open_in_new',
                          action: () => itemView && onOpenInWindow?.(itemView),
                        },
                      ]}
                    >
                      <button
                        disabled={!isImplemented}
                        onMouseEnter={() => itemView && preloadPage(itemView)}
                        onClick={() => {
                          if (itemView) {
                            onNavigate(itemView);
                            onClose();
                          }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-all text-start ${
                          !isImplemented
                            ? 'opacity-50 cursor-not-allowed text-gray-400'
                            : isActive
                              ? `bg-(--bg-menu-hover) text-primary-900 dark:text-primary-400 font-semibold`
                              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-(--bg-menu-hover)'
                        }`}
                      >
                        <div className='flex items-center gap-2.5'>
                          {itemIcon && (
                            <span
                              className={`material-symbols-rounded ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`}
                              style={{ fontSize: 'var(--icon-navbar-dropdown)' }}
                            >
                              {itemIcon}
                            </span>
                          )}
                          <span>{getMenuTranslation(itemLabel, language)}</span>
                        </div>
                        {!isImplemented && (
                          <span className='text-[10px] items-center px-1.5 py-0.5 rounded-full border border-(--border-divider) bg-(--bg-input) text-gray-400'>
                            Soon
                          </span>
                        )}
                      </button>
                    </ContextMenuTrigger>
                  );
                })}
              </div>
              {submenuIdx < (submenusToRender!.length || 0) - 1 && (
                <div className='border-b border-(--border-divider) mx-4 my-1' />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
