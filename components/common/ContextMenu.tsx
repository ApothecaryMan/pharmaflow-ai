import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLongPress } from '../../hooks/useLongPress';

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
  content?: React.ReactNode;
}

interface ContextMenuContextType {
  showMenu: (x: number, y: number, actionsOrContent: ContextMenuAction[] | React.ReactNode) => void;
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
    content: undefined
  });

  const menuRef = useRef<HTMLDivElement>(null);

  const showMenu = useCallback((x: number, y: number, actionsOrContent: ContextMenuAction[] | React.ReactNode) => {
    if (Array.isArray(actionsOrContent)) {
        setMenu({
            isVisible: true,
            x,
            y,
            actions: actionsOrContent,
            content: undefined
        });
    } else {
        setMenu({
            isVisible: true,
            x,
            y,
            actions: [],
            content: actionsOrContent
        });
    }
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
      hideMenu(); 
    };

    const handleClick = (e: MouseEvent) => {
      if (menu.isVisible && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideMenu();
      }
    };
    
    const handleScroll = (e: Event) => {
        // Only hide if scrolling OUTSIDE the menu
        if (menu.isVisible && menuRef.current && !menuRef.current.contains(e.target as Node)) {
            hideMenu();
        }
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

  // State for adjusted position (updated after render)
  const [adjustedPos, setAdjustedPos] = useState({ top: 0, left: 0 });

  // Adjust position to keep in viewport - runs after menu renders
  React.useLayoutEffect(() => {
    if (!menu.isVisible || !menuRef.current) return;

    const { innerWidth, innerHeight } = window;
    const { offsetWidth, offsetHeight } = menuRef.current;
    
    let x = menu.x;
    let y = menu.y;

    // Check right edge
    if (x + offsetWidth > innerWidth) {
      x = menu.x - offsetWidth; // Flip to left side
      if (x < 10) x = innerWidth - offsetWidth - 10; // Fallback if still outside
    }
    
    // Check bottom edge
    if (y + offsetHeight > innerHeight) {
      y = menu.y - offsetHeight; // Flip to top
      if (y < 10) y = innerHeight - offsetHeight - 10; // Fallback if still outside
    }
    
    // Ensure it doesn't go off top/left
    x = Math.max(10, x);
    y = Math.max(10, y);

    setAdjustedPos({ top: y, left: x });
  }, [menu.isVisible, menu.x, menu.y]);

  const value = React.useMemo(() => ({ showMenu, hideMenu }), [showMenu, hideMenu]);

  return (
    <ContextMenuContext.Provider value={value}>
      {children}
      
      {menu.isVisible && (
        <div 
            ref={menuRef}
            className="fixed z-[9999] min-w-[180px] bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 py-1.5 animate-scale-in origin-top-left overflow-hidden"
            style={{ 
              top: adjustedPos.top || menu.y, 
              left: adjustedPos.left || menu.x,
              visibility: adjustedPos.top === 0 && adjustedPos.left === 0 ? 'hidden' : 'visible' // Hide until position calculated
            }}
            onContextMenu={(e) => e.preventDefault()}
        >
            {menu.content ? (
                menu.content
            ) : (
                menu.actions.length > 0 ? (
                    menu.actions.map((action, index) => (
                        action.separator ? (
                            <div key={index} className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />
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
                                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}
                                    ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                {action.icon ? (
                                    <span className="material-symbols-rounded text-[18px] opacity-70">{action.icon}</span>
                                ) : (
                                    <span className="inline-block w-[18px] shrink-0"></span>
                                )}
                                <span className="font-medium">{action.label}</span>
                            </button>
                        )
                    ))
                ) : (
                    <div className="px-3 py-2 text-xs text-gray-400 italic text-center">No actions</div>
                )
            )}
        </div>
      )}
    </ContextMenuContext.Provider>
  );
};

// --- Hook for Context Menu Trigger (use when you can't wrap with ContextMenuTrigger) ---
interface UseContextMenuTriggerOptions {
    actions?: ContextMenuAction[] | (() => ContextMenuAction[]);
    content?: React.ReactNode;
    disabled?: boolean;
    onOpen?: (x: number, y: number) => void;
}

/**
 * Hook that returns event handlers for context menu functionality.
 * Use this when you need context menu on elements that can't be wrapped (e.g., table rows).
 * 
 * @example
 * const { triggerProps } = useContextMenuTrigger({
 *   actions: [{ label: 'Edit', icon: 'edit', action: () => handleEdit() }]
 * });
 * 
 * return <tr {...triggerProps}>...</tr>;
 */
export const useContextMenuTrigger = ({ actions, content, disabled = false, onOpen }: UseContextMenuTriggerOptions) => {
    const { showMenu } = useContextMenu();

    const getActions = () => typeof actions === 'function' ? actions() : actions;

    const handleContextMenu = (e: React.MouseEvent) => {
        if (disabled) return;
        e.preventDefault();
        e.stopPropagation();
        
        const resolvedActions = getActions();
        if (onOpen) {
            onOpen(e.clientX, e.clientY);
        } else if (resolvedActions) {
            showMenu(e.clientX, e.clientY, resolvedActions);
        } else if (content) {
            showMenu(e.clientX, e.clientY, content);
        }
    };

    const { onTouchStart, onTouchEnd, onTouchMove } = useLongPress({
        threshold: 500,
        onLongPress: (e) => {
            if (disabled) return;
            const touch = e.touches[0];
            
            const resolvedActions = getActions();
            if (onOpen) {
                onOpen(touch.clientX, touch.clientY);
            } else if (resolvedActions) {
                showMenu(touch.clientX, touch.clientY, resolvedActions);
            } else if (content) {
                showMenu(touch.clientX, touch.clientY, content);
            }
        }
    });

    return {
        triggerProps: {
            onContextMenu: handleContextMenu,
            onTouchStart,
            onTouchEnd,
            onTouchMove
        }
    };
};

// --- Helper Component for Touch Support ---
interface ContextMenuTriggerProps {
    children: React.ReactNode;
    actions?: ContextMenuAction[];
    content?: React.ReactNode;
    className?: string;
    disabled?: boolean;
    as?: React.ElementType;
}

export const ContextMenuTrigger: React.FC<ContextMenuTriggerProps & { onOpen?: (x: number, y: number) => void } & Record<string, any>> = ({ 
    children, 
    actions, 
    content,
    className = "",
    disabled = false,
    onOpen,
    as: Component = 'div',
    ...rest
}) => {
    const { triggerProps } = useContextMenuTrigger({ actions, content, disabled, onOpen });

    return (
        <Component 
            className={className}
            {...triggerProps}
            {...rest}
        >
            {children}
        </Component>
    );
};
