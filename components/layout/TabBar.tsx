import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToHorizontalAxis } from '@dnd-kit/modifiers';
import type React from 'react';
import { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLongPress } from '../../hooks/useLongPress';
import type { TRANSLATIONS } from '../../i18n/translations';
import type { SaleTab } from '../../types';
import { useContextMenu } from '../common/ContextMenu';
import { useSettings } from '../../context';

interface TabBarProps {
  tabs: SaleTab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
  onTabRename: (tabId: string, newName: string) => void;
  onTogglePin: (tabId: string) => void;
  onTabReorder: (newOrder: SaleTab[]) => void;
  onOpenClosedHistory: () => void;
  maxTabs: number;
  color?: string;
  t: typeof TRANSLATIONS.EN.pos; // Strict translation prop
  isLoading?: boolean;
}

interface SortableTabProps {
  key?: string;
  tab: SaleTab;
  isActive: boolean;
  color: string;
  tabsCount: number;
  onTabClick: (id: string) => void;
  onTabClose: (id: string) => void;
  onTogglePin: (id: string) => void;
  onTabAdd: () => void;
  onRenameStart: (tab: SaleTab) => void;
  editingTabId: string | null;
  editName: string;
  setEditName: (name: string) => void;
  handleRename: (id: string) => void;
  setEditingTabId: (id: string | null) => void;
  showMenu: (x: number, y: number, items: any[]) => void;
  onCloseOthers: (id: string) => void;
  t: typeof TRANSLATIONS.EN.pos;
  isLoading?: boolean;
}

const SortableTab = ({
  tab,
  isActive,
  color,
  tabsCount,
  onTabClick,
  onTabClose,
  onTogglePin,
  onTabAdd,
  onRenameStart,
  editingTabId,
  editName,
  setEditName,
  handleRename,
  setEditingTabId,
  showMenu,
  onCloseOthers,
  t,
  isLoading,
}: SortableTabProps) => {
  const { tooltipBlur } = useSettings();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
    disabled: tab.isPinned,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: 1,
    zIndex: isDragging ? 100 : 'auto',
  };

  const hasItems = tab.cart.length > 0;
  const isPinned = tab.isPinned || false;
  const currentTouchTab = useRef<string | null>(null);
  const tabRef = useRef<HTMLDivElement | null>(null);

  const [showTooltip, setShowTooltip] = useState(false);
  const badgeRef = useRef<HTMLElement | null>(null);

  const handleBadgeMouseEnter = () => {
    if (!hasItems) return;
    setShowTooltip(true);
  };

  const handleBadgeMouseLeave = () => {
    setShowTooltip(false);
  };

  // Helper: Get tab context menu actions
  const getTabActions = () => [
    { label: t.tabs?.closeTab || 'Close Tab', icon: 'close', action: () => onTabClose(tab.id) },
    {
      label: t.tabs?.closeOthers || 'Close Others',
      icon: 'tab_close_right',
      action: () => onCloseOthers(tab.id),
    },
    {
      label: t.tabs?.duplicateTab || 'Duplicate Tab',
      icon: 'content_copy',
      action: () => onTabAdd(),
    },
    {
      label: tab.isPinned ? t.tabs?.unpin || 'Unpin' : t.tabs?.pin || 'Pin',
      icon: tab.isPinned ? 'push_pin' : 'keep_off',
      action: () => onTogglePin(tab.id),
    },
    { label: t.tabs?.rename || 'Rename', icon: 'edit', action: () => onRenameStart(tab) },
  ];

  const {
    onTouchStart: onTabTouchStart,
    onTouchEnd: onTabTouchEnd,
    onTouchMove: onTabTouchMove,
    isLongPress: isTabLongPress,
  } = useLongPress({
    onLongPress: (e) => {
      // Prevent context menu if dragging
      if (isDragging) return;

      const touch = e.touches[0];
      showMenu(touch.clientX, touch.clientY, getTabActions());
    },
  });

  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        tabRef.current = node;
      }}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        group relative flex items-center gap-2 pl-3 pr-8 py-2 rounded-xl transition-all duration-200 ease-out cursor-pointer
        min-w-[100px] max-w-[180px] touch-manipulation backdrop-blur-md
        ${
          isActive
            ? `bg-white/80 dark:bg-(--bg-surface-neutral) border border-gray-200/50 dark:border-(--border-divider) shadow-xs text-gray-900 dark:text-white`
            : 'bg-transparent border border-transparent hover:bg-white/40 dark:hover:bg-(--bg-surface-neutral) hover:border-gray-200/30 dark:hover:border-(--border-divider) text-gray-600 dark:text-gray-400'
        }
        ${isDragging ? 'z-[100] shadow-2xl bg-white/95 dark:bg-gray-800/90 border-primary-500/50' : ''}
      `}
      onContextMenu={(e) => {
        e.preventDefault();
        showMenu(e.clientX, e.clientY, getTabActions());
      }}
      onTouchStart={(e) => {
        listeners?.onTouchStart?.(e);
        onTabTouchStart(e);
      }}
      onTouchEnd={(e) => {
        listeners?.onTouchEnd?.(e);
        onTabTouchEnd();
      }}
      onTouchMove={(e) => {
        // listeners might not have onTouchMove if it relies on pointer events, but safe to check
        // listeners?.onTouchMove?.(e);
        onTabTouchMove(e);
      }}
      onClick={(e) => {
        if (isTabLongPress.current) {
          isTabLongPress.current = false;
          return;
        }
        onTabClick(tab.id);
      }}
    >
      {/* Pin or Loading Indicator */}
      {isActive && isLoading ? (
        <span className='w-4 h-4 border-2 border-primary-500/30 border-t-primary-500 rounded-full animate-spin shrink-0' />
      ) : isPinned ? (
        <span
          className={`material-symbols-rounded ${isActive ? `text-primary-500` : 'text-gray-400'}`}
          style={{ fontSize: 'var(--icon-sm)' }}
        >
          push_pin
        </span>
      ) : null}

      {/* Tab Name or Input */}
      {editingTabId === tab.id ? (
        <input
          type='text'
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => handleRename(tab.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename(tab.id);
            if (e.key === 'Escape') setEditingTabId(null);
          }}
          className='flex-1 w-full bg-white/60 dark:bg-(--bg-surface-neutral) border-none rounded px-1.5 py-0 m-0 h-5 text-sm font-bold text-primary-900 dark:text-primary-100 focus:outline-none focus:ring-1 focus:ring-primary-500/40 shadow-inner'
          dir='auto'
          autoFocus
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on input interaction
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className='flex-1 flex items-center gap-2 overflow-hidden'
          onDoubleClick={() => onRenameStart(tab)}
        >
          <span
            className={`text-sm font-semibold truncate ${isActive ? 'text-gray-900 dark:text-white' : ''}`}
          >
            {tab.name}
          </span>

          {/* Cart Badge */}
          {hasItems && (
            <span
              ref={badgeRef}
              onMouseEnter={handleBadgeMouseEnter}
              onMouseLeave={handleBadgeMouseLeave}
              className={`
                    flex items-center justify-center h-4.5 min-w-[18px] px-1.5 rounded-full text-[9px] font-black
                    transition-all duration-300 animate-scale-in
                    ${
                      isActive
                        ? `bg-primary-500 dark:bg-primary-400 text-gray-50 dark:text-(--bg-surface-neutral) shadow-none`
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 opacity-60'
                    }
                `}
            >
              {tab.cart.length}
            </span>
          )}
        </div>
      )}

      {/* Close Button - Absolute Positioned */}
      {tabsCount > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTabClose(tab.id);
          }}
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when clicking close
          className={`
            absolute right-1.5 top-1/2 -translate-y-1/2
            w-5 h-5 flex items-center justify-center rounded-full transition-colors 
            ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
          `}
        >
          <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>close</span>
        </button>
      )}

      {/* Cart Items Tooltip (Immediate hover on badge) rendered in Portal */}
      {showTooltip && hasItems && !isDragging && badgeRef.current && createPortal(
        <div 
          className={`
            fixed z-[9999] shadow-xl border rounded-xl p-2 min-w-[200px] pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-200
            ${
              tooltipBlur
                ? 'backdrop-blur-2xl bg-(--bg-menu)/30 saturate-200 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] border-(--border-divider)'
                : 'bg-(--bg-menu) border-(--border-divider)'
            }
            text-(--text-primary)
          `}
          style={{
            top: badgeRef.current.getBoundingClientRect().bottom + 8,
            left: badgeRef.current.getBoundingClientRect().left - 100 + (badgeRef.current.offsetWidth / 2),
          }}
        >
          <div className="text-[10px] font-black uppercase tracking-wider mb-2 border-b border-(--border-divider) pb-1 text-(--text-tertiary) flex items-center justify-between">
            <span>{t.cartTitle || 'Cart Items'}</span>
          </div>
          <ul className="flex flex-col gap-1.5 no-scrollbar">
            {tab.cart.map(item => (
              <li key={item.id} className="text-[11px] flex items-center justify-between gap-3 font-semibold">
                <span className="truncate flex-1" dir="auto" style={{ color: 'var(--text-primary)' }}>{item.name} {item.dosageForm}</span>
                <span className="tabular-nums text-primary-600 dark:text-primary-400 font-black">
                  {item.quantity}{item.isUnit ? ' U' : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
};

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabAdd,
  onTabRename,
  onTogglePin,
  onTabReorder,
  onOpenClosedHistory,
  maxTabs,
  color = 'blue',
  t,
  isLoading,
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { showMenu } = useContextMenu();

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex((t) => t.id === active.id);
      const newIndex = tabs.findIndex((t) => t.id === over.id);
      onTabReorder(arrayMove(tabs, oldIndex, newIndex));
    }
  };

  const handleDoubleClick = (tab: SaleTab) => {
    setEditingTabId(tab.id);
    setEditName(tab.name);
  };

  const handleRename = (tabId: string) => {
    if (editName.trim()) {
      onTabRename(tabId, editName.trim());
    }
    setEditingTabId(null);
    setEditName('');
  };

  const handleCloseOthers = (tabId: string) => {
    tabs.forEach((t) => {
      if (t.id !== tabId && !t.isPinned) onTabClose(t.id);
    });
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragEnd={handleDragEnd}
      modifiers={[restrictToHorizontalAxis]}
    >
      <div className='flex items-center gap-2 px-3 pb-2 pt-1 overflow-x-auto no-scrollbar select-none touch-pan-x'>
        {/* Tabs Container */}
        <div className='flex items-center gap-2 flex-1'>
          <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
            {tabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                color={color}
                tabsCount={tabs.length}
                onTabClick={onTabClick}
                onTabClose={onTabClose}
                onTogglePin={onTogglePin}
                onTabAdd={onTabAdd}
                onRenameStart={handleDoubleClick}
                editingTabId={editingTabId}
                editName={editName}
                setEditName={setEditName}
                handleRename={handleRename}
                setEditingTabId={setEditingTabId}
                showMenu={showMenu}
                onCloseOthers={handleCloseOthers}
                t={t}
                isLoading={isLoading}
              />
            ))}
          </SortableContext>
        </div>

        {/* Add Tab Button */}
        {tabs.length < maxTabs && (
          <button
            onClick={onTabAdd}
            onContextMenu={(e) => {
              e.preventDefault();
              showMenu(e.clientX, e.clientY, [
                {
                  label: t.viewClosedTabs || 'View Closed Tabs History',
                  icon: 'history',
                  action: () => onOpenClosedHistory(),
                }
              ]);
            }}
            className={`
              flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200 backdrop-blur-md
              hover:bg-white/80 dark:hover:bg-(--bg-surface-neutral) hover:shadow-xs border border-transparent hover:border-gray-200/50 dark:hover:border-(--border-divider)
              text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400
              shrink-0
            `}
            title={t.tabs?.newTab || 'New Tab'}
          >
            <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-navbar-main)' }}>add</span>
          </button>
        )}
      </div>
    </DndContext>
  );
};
