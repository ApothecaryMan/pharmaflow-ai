import React, { useState, useRef } from 'react';
import { SaleTab } from '../types';
import { useContextMenu } from '../utils/ContextMenu';
import { useLongPress } from '../hooks/useLongPress';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
  MouseSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TabBarProps {
  tabs: SaleTab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
  onTabRename: (tabId: string, newName: string) => void;
  onTogglePin: (tabId: string) => void;
  onTabReorder: (newOrder: SaleTab[]) => void;
  maxTabs: number;
  color?: string; // Theme color
}

interface SortableTabProps {
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
  // Extra props for closing logic
  onCloseOthers: (id: string) => void;
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
  onCloseOthers
}: SortableTabProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id, disabled: tab.isPinned });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  };

  const hasItems = tab.cart.length > 0;
  const isPinned = tab.isPinned || false;
  const currentTouchTab = useRef<string | null>(null);

  const {
    onTouchStart: onTabTouchStart,
    onTouchEnd: onTabTouchEnd,
    onTouchMove: onTabTouchMove,
    isLongPress: isTabLongPress
  } = useLongPress({
    onLongPress: (e) => {
        // Prevent context menu if dragging
        if (isDragging) return;
        
        const touch = e.touches[0];
        showMenu(touch.clientX, touch.clientY, [
            { label: 'Close Tab', icon: 'close', action: () => onTabClose(tab.id) },
            { label: 'Close Others', icon: 'tab_close_right', action: () => onCloseOthers(tab.id) },
            { label: 'Duplicate Tab', icon: 'content_copy', action: () => onTabAdd() },
            { label: tab.isPinned ? 'Unpin' : 'Pin', icon: tab.isPinned ? 'push_pin' : 'keep_off', action: () => onTogglePin(tab.id) },
            { label: 'Rename', icon: 'edit', action: () => onRenameStart(tab) }
        ]);
    }
  });

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`
        group relative flex items-center gap-2 pl-3 pr-8 py-2 rounded-xl transition-all duration-200 ease-out cursor-pointer
        min-w-[100px] max-w-[180px] touch-manipulation
        ${isActive 
          ? `bg-gray-100 dark:bg-gray-800 shadow-sm border-2 border-gray-400` 
          : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800/50 text-gray-600 dark:text-gray-400'
        }
        ${isDragging ? 'shadow-xl scale-105 ring-2 ring-blue-500 z-50 bg-white dark:bg-gray-800' : ''}
      `}
      onContextMenu={(e) => {
        e.preventDefault();
        showMenu(e.clientX, e.clientY, [
          { label: 'Close Tab', icon: 'close', action: () => onTabClose(tab.id) },
          { label: 'Close Others', icon: 'tab_close_right', action: () => onCloseOthers(tab.id) },
          { label: 'Duplicate Tab', icon: 'content_copy', action: () => onTabAdd() },
          { label: tab.isPinned ? 'Unpin' : 'Pin', icon: tab.isPinned ? 'push_pin' : 'keep_off', action: () => onTogglePin(tab.id) },
          { label: 'Rename', icon: 'edit', action: () => onRenameStart(tab) }
        ]);
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
      {/* Pin Indicator */}
      {isPinned && (
        <span className={`material-symbols-rounded text-[14px] ${isActive ? `text-${color}-500` : 'text-gray-400'}`}>
          push_pin
        </span>
      )}

      {/* Tab Name or Input */}
      {editingTabId === tab.id ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={() => handleRename(tab.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename(tab.id);
            if (e.key === 'Escape') setEditingTabId(null);
          }}
          className="flex-1 w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-gray-900 dark:text-white"
          autoFocus
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag start on input interaction
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div 
            className="flex-1 flex items-center gap-2 overflow-hidden"
            onDoubleClick={() => onRenameStart(tab)}
        >
            <span className={`text-sm font-semibold truncate ${isActive ? 'text-gray-900 dark:text-white' : ''}`}>
                {tab.name}
            </span>
            
            {/* Cart Badge */}
            {hasItems && (
                <span className={`
                    flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[10px] font-bold
                    ${isActive 
                        ? `bg-${color}-100 dark:bg-${color}-900/50 text-${color}-700 dark:text-${color}-300` 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }
                `}>
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
            w-5 h-5 flex items-center justify-center rounded-full transition-all 
            opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100
            hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600
            bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm
            ${isActive ? 'text-gray-400' : 'text-gray-400'}
          `}
        >
          <span className="material-symbols-rounded text-[13px]">close</span>
        </button>
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
  maxTabs,
  color = 'blue'
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
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
        const oldIndex = tabs.findIndex((t) => t.id === active.id);
        const newIndex = tabs.findIndex((t) => t.id === over.id);
        
        // Don't allow dragging unpinned before pinned if we want to enforce structure?
        // Or just let arrayMove handle it and let the user sort?
        // User asked "pin reorder to first". If user drags unpinned to first, it stays?
        // If we want to strictly enforce Pinned > Unpinned, we might assume user dragging IS reordering.
        // But if we enforce pinned-first logic, dragging unpinned to pinned area should effectively pin it?
        // Or reorder within groups?
        // For simplicity: Allow free reordering, but Pin toggle enforces the sort.
        // If user drags unpinned above pinned, it just sits there until next pin toggle sort?
        // Or we can prevent crossing the boundary.
        // Let's allow free sort for now as per "drag drop function to reorder tab".
        
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
    tabs.forEach(t => {
        if (t.id !== tabId && !t.isPinned) onTabClose(t.id);
    });
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center gap-2 px-3 pb-2 pt-1 overflow-x-auto no-scrollbar select-none touch-pan-x">
        {/* Tabs Container */}
        <div className="flex items-center gap-2 flex-1">
          <SortableContext 
            items={tabs.map(t => t.id)}
            strategy={horizontalListSortingStrategy}
          >
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
              />
            ))}
          </SortableContext>
        </div>

        {/* Add Tab Button */}
        {tabs.length < maxTabs && (
          <button
            onClick={onTabAdd}
            className={`
              flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200
              hover:bg-white dark:hover:bg-gray-800 hover:shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-gray-700
              text-gray-500 hover:text-${color}-600 dark:text-gray-400 dark:hover:text-${color}-400
              shrink-0
            `}
            title="New Tab"
          >
            <span className="material-symbols-rounded text-[20px]">add</span>
          </button>
        )}
      </div>
    </DndContext>
  );
};
