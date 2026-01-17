import React, { useEffect, useRef, useState } from 'react';
// ExpandingDropdown Component
import { useExpandingDropdown } from '../../hooks/useExpandingDropdown';

export interface ExpandingDropdownProps<T> {
    items: T[];
    selectedItem: T | undefined;
    isOpen: boolean;
    onToggle: () => void;
    onSelect: (item: T) => void;
    renderItem: (item: T, isSelected: boolean) => React.ReactNode;
    renderSelected: (item: T | undefined) => React.ReactNode;
    keyExtractor: (item: T) => string;
    onEnter?: () => void;
    className?: string;
    transparentIfSingle?: boolean;
    color?: string;
    variant?: 'minimal' | 'input';
    minHeight?: string | number;
    style?: React.CSSProperties;
    disabled?: boolean;
    centered?: boolean;
    rounded?: 'xl' | 'full';
    zIndexHigh?: string;
}

/**
 * ExpandingDropdown - A generic dropdown component.
 * 
 * @warning **LAYOUT BEHAVIOR NOTICE**
 * This component defaults to an **Accordion-style expansion**, meaning it naturally pushes sibling content down when opened.
 * 
 * **How to use for Floating/Overlay behavior (Standard Select):**
 * To make it float *over* content without pushing lines down:
 * 1. Wrap it in a relative container with fixed dimensions (e.g., `h-10 w-full`).
 * 2. Position the `ExpandingDropdown` itself as absolute.
 * 
 * @example
 * // Floating implementation
 * <div className="relative flex-1 h-10">
 *   <ExpandingDropdown 
 *      className="absolute top-0 left-0 w-full z-50" 
 *      ...props 
 *   />
 * </div>
 * 
 * @param {boolean} minHeight - Use minHeight={38} for standard 40px input alignment (approx 40px with borders).
 */
export function ExpandingDropdown<T>({

    items,
    selectedItem,
    isOpen,
    onToggle,
    onSelect,
    renderItem,
    renderSelected,
    keyExtractor,
    onEnter,
    className = "",
    transparentIfSingle = false,
    color = "blue",
    variant = 'minimal',
    minHeight,
    style,
    disabled = false,
    centered = false,
    rounded = 'xl',
    zIndexHigh = 'z-50'
}: ExpandingDropdownProps<T>) {
    
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const isClickingRef = useRef(false);

    // Sync isAnimating with isOpen but with a delay on close
    useEffect(() => {
        if (isOpen) {
            setIsAnimating(true);
        } else {
            const timer = setTimeout(() => setIsAnimating(false), 300); // Slightly longer than 200ms transition
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const handleFocus = (e: React.FocusEvent) => {
        // Only open on focus if NOT clicking (keyboard navigation)
        if (!isClickingRef.current && !isOpen && !disabled) {
            onToggle();
        }
    };

    const handleMouseDown = () => {
        isClickingRef.current = true;
        // Reset after short delay to ensure focus event sees it as true
        setTimeout(() => { isClickingRef.current = false; }, 200);
    };
    
    const { handleKeyDown, handleBlur, handleClick, handleOptionClick } = useExpandingDropdown({
        items,
        selectedItem,
        isOpen,
        onToggle,
        onSelect,
        keyExtractor,
        onEnter
    });

    // Click outside to close
    useEffect(() => {
        if (!isOpen) return;
        
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                onToggle();
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, onToggle]);

    const isSingle = items.length <= 1;
    const isTransparent = transparentIfSingle && isSingle;
    const isInput = variant === 'input';

    // 🔥 الحل: padding موحد لكل الحالات
    const itemPaddingClasses = 'px-3 py-1';

    return (
        <div ref={containerRef} className={`relative inline-block ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} style={style}>
             <div 
                tabIndex={disabled ? -1 : 0}
                onKeyDown={disabled ? undefined : handleKeyDown}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onMouseDown={handleMouseDown}
                className={`relative w-full flex flex-col overflow-hidden border transition-all outline-none
                    ${rounded === 'full' ? 'rounded-[20px]' : 'rounded-xl'}
                    ${disabled ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'cursor-pointer'}
                    ${(isOpen || isAnimating)
                        ? (isInput ? `${zIndexHigh}` : `${zIndexHigh}`) 
                        : 'z-0'}
                    ${isOpen 
                        ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700' 
                        : (isInput 
                            ? (disabled ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600')
                            : (isTransparent ? 'bg-transparent border-transparent' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700')
                          )
                    }
                `}
                style={isOpen ? { borderColor: `var(--color-${color}-500)` } : {}}
                onClick={disabled ? undefined : handleClick}
            >
                {/* Trigger Area - العنصر المحدد */}
                <div 
                    className={`w-full flex items-center 
                        ${isInput ? `justify-between ${itemPaddingClasses}` : `justify-center items-center ${itemPaddingClasses}`}
                    `}
                    style={isInput ? { minHeight: minHeight || '40px' } : {}}
                >
                    {isInput ? (
                        <>
                            <div className="flex-1 truncate text-sm font-medium text-gray-700 dark:text-gray-200">
                                {renderSelected(selectedItem)}
                            </div>
                            <span className="material-symbols-rounded text-gray-400 text-[20px] ml-2">expand_more</span>
                        </>
                    ) : (
                        renderSelected(selectedItem)
                    )}
                </div>

                {/* Dropdown Menu with Animation */}
                <div 
                    className="w-full overflow-hidden bg-white dark:bg-gray-900 transition-all duration-200 ease-out"
                    style={{
                        display: 'grid',
                        gridTemplateRows: isOpen ? '1fr' : '0fr',
                        transition: 'grid-template-rows 200ms ease-out'
                    }}
                >
                    <div className="min-h-0 overflow-hidden">
                        <div 
                            className={`expanding-dropdown-scroll mb-2 border-t border-gray-100 dark:border-gray-800 max-h-40 overflow-y-auto ${isOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgba(156, 163, 175, 0.6) transparent',
                            }}
                        >
                            <style>{`
                                .expanding-dropdown-scroll::-webkit-scrollbar {
                                    width: 2px;
                                    background: transparent;
                                }
                                .expanding-dropdown-scroll::-webkit-scrollbar-track {
                                    background: transparent;
                                    border: none;
                                    box-shadow: none;
                                }
                                .expanding-dropdown-scroll::-webkit-scrollbar-thumb {
                                    background: rgba(156, 163, 175, 0.6);
                                    border-radius: 9999px;
                                }
                                .expanding-dropdown-scroll::-webkit-scrollbar-corner {
                                    background: transparent;
                                }
                            `}</style>
                            {items
                                .filter(item => keyExtractor(item) !== (selectedItem ? keyExtractor(selectedItem) : ''))
                                .map(item => (
                                    <div 
                                        key={keyExtractor(item)}
                                        className={`w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${itemPaddingClasses} transition-colors`}
                                        onClick={(e) => handleOptionClick(e, item)}
                                    >
                                        {renderItem(item, false)}
                                    </div>
                            ))}
                        </div>
                    </div>
                </div>
             </div>
        </div>
    );
}
