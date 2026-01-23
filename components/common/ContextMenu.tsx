/**
 * ContextMenu Component Library
 * =============================
 * 
 * A comprehensive solution for custom context menus (right-click menus) in React applications.
 * 
 * Features:
 * - **Provider-based**: Single global menu instance managed via Context.
 * - **Flexible Content**: Supports both strict action lists (`ContextMenuAction[]`) and fully custom React components (`React.ReactNode`).
 * - **Smart Positioning**: Automatically adjusts position to keep the menu within the viewport (flipping edges).
 * - **Animations**: Built-in scale-in animations and glassmorphism support.
 * - **Reusable Components**: Exports atom components (`ContextMenuItem`, `ContextMenuSeparator`, `ContextMenuCheckboxItem`) for building consistent custom menus.
 * - **Touch Support**: Includes long-press detection for touch devices.
 * 
 * Usage:
 * 1. Wrap your app with `<ContextMenuProvider>`.
 * 2. Use `useContextMenu()` or `<ContextMenuTrigger>` to invoke the menu.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLongPress } from '../../hooks/useLongPress';

// --- Types ---
/**
 * Definition for a standard action item in the context menu.
 */
export interface ContextMenuAction {
  /** The text to display for the action. */
  label?: string;
  /** Material Symbol icon name (optional). */
  icon?: string;
  /** The function to execute when clicked. */
  action?: () => void;
  /** If true, renders the item in red to indicate a destructive action. */
  danger?: boolean;
  /** If true, the item is non-interactive. */
  disabled?: boolean;
  /** If true, renders a separator line instead of an item. */
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
  /**
   * Shows the context menu at the specified coordinates.
   * @param x - viewport x coordinate
   * @param y - viewport y coordinate
   * @param actionsOrContent - A list of actions OR a custom React Node to render.
   */
  showMenu: (x: number, y: number, actionsOrContent: ContextMenuAction[] | React.ReactNode) => void;
  /** Hides the currently visible menu. */
  hideMenu: () => void;
}

// --- Context ---
const ContextMenuContext = createContext<ContextMenuContextType | undefined>(undefined);

/**
 * Hook to access the ContextMenu API.
 * Must be used within a `ContextMenuProvider`.
 */
export const useContextMenu = () => {
  const context = useContext(ContextMenuContext);
  if (!context) {
    throw new Error('useContextMenu must be used within a ContextMenuProvider');
  }
  return context;
};

// --- Component ---
// Remove useSettings import if it was there and unused now
// We'll clean up imports in a separate check if needed, but for now just removing usage.

// --- Reusable Menu Components ---

/**
 * A simple horizontal separator line for the context menu.
 */
export const ContextMenuSeparator: React.FC = () => (
   <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2" />
);

interface ContextMenuItemProps extends Omit<ContextMenuAction, 'action' | 'separator'> {
    onClick?: () => void;
    className?: string; // Allow custom overrides
    children?: React.ReactNode; // Allow custom content override
}

/**
 * Standard item for the Context Menu.
 * Can be used when building custom menu content.
 */
export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({ 
    label, 
    icon, 
    onClick, 
    danger, 
    disabled, 
    className = "",
    children 
}) => {
    return (
        <button
            onClick={(e) => {
                if (!disabled && onClick) {
                    e.stopPropagation(); // Prevent bubbling if used inside other clickables
                    onClick();
                }
            }}
            disabled={disabled}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors
                ${danger 
                    ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' 
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                ${className}
            `}
        >
            {children ? children : (
                <>
                    {icon ? (
                        <span className="material-symbols-rounded text-[18px] opacity-70">{icon}</span>
                    ) : (
                        <span className="inline-block w-[18px] shrink-0"></span>
                    )}
                    <span className="font-medium">{label}</span>
                </>
            )}
        </button>
    );
};

/**
 * A toggleable checkbox item for the Context Menu.
 * Commonly used for visibility toggles or boolean settings.
 */
export const ContextMenuCheckboxItem: React.FC<{
    label: string | React.ReactNode;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
}> = ({ label, checked, onCheckedChange, disabled }) => {
    return (
        <button
            onClick={(e) => {
                if (!disabled) {
                    e.stopPropagation();
                    onCheckedChange(!checked);
                }
            }}
            disabled={disabled}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors group
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}
            `}
        >
             <span className={`text-sm font-medium transition-colors ${!checked ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300 group-hover:text-black dark:group-hover:text-white'}`}>
                {label}
            </span>
            <span className={`material-symbols-rounded text-[16px] transition-colors ${!checked ? 'text-gray-300 dark:text-gray-600' : 'text-emerald-500'}`}>
                {checked ? 'check_circle' : 'circle'}
            </span>
        </button>
    );
};

/**
 * Top-level provider that manages the global state of the Context Menu.
 * Place this at the root of your application (or at least above any component that needs a context menu).
 * 
 * @param enableGlassEffect - If true, applies a glassmorphism backdrop blur to the menu container.
 */
export const ContextMenuProvider: React.FC<{ children: React.ReactNode; enableGlassEffect?: boolean }> = ({ children, enableGlassEffect = false }) => {
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

    const handleOutsideClick = (e: MouseEvent) => {
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
    window.addEventListener('mousedown', handleOutsideClick, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', hideMenu);

    return () => {
      document.removeEventListener('contextmenu', handleGlobalContextMenu);
      window.removeEventListener('mousedown', handleOutsideClick, true);
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
            className={`fixed z-[9999] min-w-[180px] rounded-xl shadow-2xl border border-gray-200 dark:border-gray-800 py-1.5 animate-scale-in origin-top-left overflow-hidden
                ${enableGlassEffect
                    ? 'backdrop-blur-xl bg-white/60 dark:bg-gray-800/60 saturate-150 supports-[backdrop-filter]:bg-white/30' 
                    : 'bg-white dark:bg-gray-900'}
            `}
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
                            <ContextMenuSeparator key={index} />
                        ) : (
                            <ContextMenuItem
                                key={index}
                                label={action.label}
                                icon={action.icon}
                                danger={action.danger}
                                disabled={action.disabled}
                                onClick={() => {
                                    if(action.action) {
                                        action.action();
                                        hideMenu();
                                    }
                                }}
                            />
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

/**
 * Wrapper component to easily add a context menu to any element.
 * 
 * @example
 * <ContextMenuTrigger actions={[{ label: 'Delete', action: deleteItem }]}>
 *    <div className="p-4 card">Right click me</div>
 * </ContextMenuTrigger>
 */
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
