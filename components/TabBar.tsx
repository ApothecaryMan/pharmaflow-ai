import React, { useState, useRef } from 'react';
import { SaleTab } from '../types';
import { useContextMenu } from './ContextMenu';
import { useLongPress } from '../hooks/useLongPress';

interface TabBarProps {
  tabs: SaleTab[];
  activeTabId: string;
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onTabAdd: () => void;
  onTabRename: (tabId: string, newName: string) => void;
  onTogglePin: (tabId: string) => void;
  maxTabs: number;
  color?: string; // Theme color
}

export const TabBar: React.FC<TabBarProps> = ({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
  onTabAdd,
  onTabRename,
  onTogglePin,
  maxTabs,
  color = 'blue'
}) => {
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const { showMenu } = useContextMenu();
  const currentTouchTab = useRef<string | null>(null);

  const {
    onTouchStart: onTabTouchStart,
    onTouchEnd: onTabTouchEnd,
    onTouchMove: onTabTouchMove,
    isLongPress: isTabLongPress
  } = useLongPress({
    onLongPress: (e) => {
        if (currentTouchTab.current) {
            const tabId = currentTouchTab.current;
            const touch = e.touches[0];
            showMenu(touch.clientX, touch.clientY, [
                { label: 'Close Tab', icon: 'close', action: () => onTabClose(tabId) },
                { label: 'Close Others', icon: 'tab_close_right', action: () => {
                    tabs.forEach(t => {
                        if (t.id !== tabId && !t.isPinned) onTabClose(t.id);
                    });
                }},
                { label: 'Duplicate Tab', icon: 'content_copy', action: () => onTabAdd() },
                { label: tabs.find(t => t.id === tabId)?.isPinned ? 'Unpin' : 'Pin', icon: tabs.find(t => t.id === tabId)?.isPinned ? 'push_pin' : 'keep_off', action: () => onTogglePin(tabId) },
                { label: 'Rename', icon: 'edit', action: () => {
                    const tab = tabs.find(t => t.id === tabId);
                    if (tab) handleDoubleClick(tab);
                }}
            ]);
        }
    }
  });

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

  return (
    <div className="flex items-center gap-2 px-3 pb-2 pt-1 overflow-x-auto no-scrollbar select-none">
      {/* Tabs Container */}
      <div className="flex items-center gap-2 flex-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const hasItems = tab.cart.length > 0;
          const isPinned = tab.isPinned || false;

          return (
            <div
              key={tab.id}
              className={`
                group relative flex items-center gap-2 pl-3 pr-8 py-2 rounded-xl transition-all duration-200 ease-out cursor-pointer border
                min-w-[100px] max-w-[180px]
                ${isActive 
                  ? `bg-white dark:bg-slate-800 border-${color}-200 dark:border-${color}-800 shadow-sm ring-1 ring-${color}-100 dark:ring-${color}-900` 
                  : 'bg-transparent border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                }
              `}
              onContextMenu={(e) => {
                e.preventDefault();
                showMenu(e.clientX, e.clientY, [
                  { label: 'Close Tab', icon: 'close', action: () => onTabClose(tab.id) },
                  { label: 'Close Others', icon: 'tab_close_right', action: () => {
                      tabs.forEach(t => {
                          if (t.id !== tab.id && !t.isPinned) onTabClose(t.id);
                      });
                  }},
                  { label: 'Duplicate Tab', icon: 'content_copy', action: () => onTabAdd() },
                  { label: tab.isPinned ? 'Unpin' : 'Pin', icon: tab.isPinned ? 'push_pin' : 'keep_off', action: () => onTogglePin(tab.id) },
                  { label: 'Rename', icon: 'edit', action: () => handleDoubleClick(tab) }
                ]);
              }}
              onTouchStart={(e) => {
                  currentTouchTab.current = tab.id;
                  onTabTouchStart(e);
              }}
              onTouchEnd={onTabTouchEnd}
              onTouchMove={onTabTouchMove}
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
                <span className={`material-symbols-rounded text-[14px] ${isActive ? `text-${color}-500` : 'text-slate-400'}`}>
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
                  className="flex-1 w-full bg-transparent border-none focus:ring-0 p-0 text-sm font-semibold text-slate-900 dark:text-white"
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div 
                    className="flex-1 flex items-center gap-2 overflow-hidden"
                    onDoubleClick={() => handleDoubleClick(tab)}
                >
                    <span className={`text-sm font-semibold truncate ${isActive ? 'text-slate-900 dark:text-white' : ''}`}>
                        {tab.name}
                    </span>
                    
                    {/* Cart Badge */}
                    {hasItems && (
                        <span className={`
                            flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[10px] font-bold
                            ${isActive 
                                ? `bg-${color}-100 dark:bg-${color}-900/50 text-${color}-700 dark:text-${color}-300` 
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                            }
                        `}>
                            {tab.cart.length}
                        </span>
                    )}
                </div>
              )}

              {/* Close Button - Absolute Positioned */}
              {tabs.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                  className={`
                    absolute right-1.5 top-1/2 -translate-y-1/2
                    w-5 h-5 flex items-center justify-center rounded-full transition-all 
                    opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100
                    hover:bg-red-100 dark:hover:bg-red-900/50 hover:text-red-600
                    bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-sm
                    ${isActive ? 'text-slate-400' : 'text-slate-400'}
                  `}
                >
                  <span className="material-symbols-rounded text-[13px]">close</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Tab Button */}
      {tabs.length < maxTabs && (
        <button
          onClick={onTabAdd}
          className={`
            flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200
            hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm border border-transparent hover:border-slate-200 dark:hover:border-slate-700
            text-slate-500 hover:text-${color}-600 dark:text-slate-400 dark:hover:text-${color}-400
          `}
          title="New Tab"
        >
          <span className="material-symbols-rounded text-[20px]">add</span>
        </button>
      )}
    </div>
  );
};
