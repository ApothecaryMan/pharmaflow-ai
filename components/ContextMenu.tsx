import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';

// --- Types ---
export interface ContextMenuAction {
  label?: string;
  icon?: string;
  action?: () => void;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
}

interface ContextMenuState {
  isVisible: boolean;
  x: number;
  y: number;
  actions: ContextMenuAction[];
}

interface ContextMenuContextType {
  showMenu: (x: number, y: number, actions: ContextMenuAction[]) => void;
  hideMenu: () => void;
}

// --- Context ---
const ContextMenuContext = createContext<ContextMenuContextType | undefined>(undefined);

export const useContextMenu = () => {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider');
  }
  return context;
};

// --- Component ---
export const ContextMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menu, setMenu] = useState<ContextMenuState>({
    isVisible: false,
    x: 0,
    y: 0,
    actions: [],
  });

  const menuRef = useRef<HTMLDivElement>(null);

  const showMenu = useCallback((x: number, y: number, actions: ContextMenuAction[]) => {
    setMenu({
      isVisible: true,
      x,
      y,
      actions,
    });
  }, []);

  const hideMenu = useCallback(() => {
    setMenu(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Global Context Menu Prevention & Close on interaction
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      // If the event was already handled (e.g. by a React component), do nothing.
      if (e.defaultPrevented) return;

      // Allow default context menu on inputs and textareas
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }
      
      e.preventDefault();
      // Optionally, we could show a default global menu here if no specific menu was triggered.
      // For now, we just prevent the default one as requested.
      hideMenu(); // Close any open custom menu if clicking elsewhere
    };

    const handleClick = (e: MouseEvent) => {
      if (menu.isVisible && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideMenu();
      }
    };
    
    const handleScroll = () => {
        if(menu.isVisible) hideMenu();
    }

    document.addEventListener('contextmenu', handleGlobalContextMenu);
    window.addEventListener('click', handleClick);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', hideMenu);

    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', hideMenu);
    };
  }, [menu.isVisible, hideMenu]);

  // Adjust position to keep in viewport
  const getAdjustedPosition = () => {
      if (!menuRef.current) return { top: menu.y, left: menu.x };
      
      const { innerWidth, innerHeight } = window;
      const { offsetWidth, offsetHeight } = menuRef.current;
      
      let x = menu.x;
      let y = menu.y;

      if (x + offsetWidth > innerWidth) {
          x = innerWidth - offsetWidth - 10;
      }
      if (y + offsetHeight > innerHeight) {
          y = innerHeight - offsetHeight - 10;
      }

      return { top: y, left: x };
  };

  const { top, left } = getAdjustedPosition();

  return (
    <ContextMenuContext.Provider value={{ showMenu, hideMenu }}>
      {children}
      
      {menu.isVisible && (
        <div 
            ref={menuRef}
            className="fixed z-[9999] min-w-[180px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 animate-scale-in origin-top-left overflow-hidden"
            style={{ top, left }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {menu.actions.length > 0 ? (
                menu.actions.map((action, index) => (
                    action.separator ? (
                        <div key={index} className="h-px bg-slate-100 dark:bg-slate-800 my-1 mx-2" />
                    ) : (
                        <button
                            key={index}
                            onClick={() => {
                                if(!action.disabled && action.action) {
                                    action.action();
                                    hideMenu();
                                }
                            }}
                            disabled={action.disabled}
                            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors
                                ${action.danger 
                                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' 
                                    : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}
                                ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                            `}
                        >
                            {action.icon && <span className="material-symbols-rounded text-[18px] opacity-70">{action.icon}</span>}
                            <span className="font-medium">{action.label}</span>
                        </button>
                    )
                ))
            ) : (
                <div className="px-3 py-2 text-xs text-slate-400 italic text-center">No actions</div>
            )}
        </div>
      )}
    </ContextMenuContext.Provider>
  );
};
