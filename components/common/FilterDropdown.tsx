import React, { useEffect, useRef, useState } from 'react';
// FilterDropdown Component
import { useFilterDropdown } from '../../hooks/useFilterDropdown';

export interface FilterDropdownProps<T> {
    items: T[];
    selectedItem: T | undefined;
    isOpen?: boolean;
    onToggle?: () => void;
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
    /** 
     * When true, wraps the dropdown in a fixed-height container with absolute positioning.
     * This makes it float over content instead of pushing sibling elements down.
     * Useful for toolbars and filter bars.
     */
    floating?: boolean;
    /** If true, the arrow icon will be hidden. */
    hideArrow?: boolean;
    /** If true, hides the arrow automatically if the rendered text is long (string length > 4). */
    autoHideArrow?: boolean;
}

/**
 * FilterDropdown - A generic dropdown/combobox component.
 * 
 * @warning **LAYOUT BEHAVIOR NOTICE**
 * This component defaults to an **Accordion-style expansion**, meaning it naturally pushes sibling content down when opened.
 * Use `floating={true}` prop to make it float over content instead.
 * 
 * @param {boolean} floating - Set to true to make dropdown float over content.
 * @param {boolean} minHeight - Use minHeight={38} for standard 40px input alignment.
 */
export function FilterDropdown<T>({

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
    zIndexHigh = 'z-40',
    floating = false,
    hideArrow = false,
    autoHideArrow = false
}: FilterDropdownProps<T>) {
    
    const containerRef = useRef<HTMLDivElement>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const isClickingRef = useRef(false);

    const handleMouseDown = () => {
        isClickingRef.current = true;
        // Reset after short delay to ensure focus event sees it as true
        setTimeout(() => { isClickingRef.current = false; }, 200);
    };
    
    // State for uncontrolled mode
    const [internalIsOpen, setInternalIsOpen] = useState(false);
    
    // Determine controlled vs uncontrolled state
    const isControlled = isOpen !== undefined && onToggle !== undefined;
    const effectiveIsOpen = isControlled ? isOpen : internalIsOpen;
    const handleToggle = isControlled ? onToggle : () => setInternalIsOpen(prev => !prev);
    
    // Sync isAnimating with effectiveIsOpen
    useEffect(() => {
        if (effectiveIsOpen) {
            setIsAnimating(true);
        } else {
            const timer = setTimeout(() => setIsAnimating(false), 300);
            return () => clearTimeout(timer);
        }
    }, [effectiveIsOpen]);

    const handleFocus = (e: React.FocusEvent) => {
        if (!isClickingRef.current && !effectiveIsOpen && !disabled) {
            handleToggle();
        }
    };
    
    // Click outside handler
    useEffect(() => {
        if (!effectiveIsOpen) return;
        
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                if (isControlled) {
                    onToggle(); // Call parent's toggle
                } else {
                    setInternalIsOpen(false);
                }
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [effectiveIsOpen, isControlled, onToggle]);

    const { handleKeyDown, handleBlur, handleClick, handleOptionClick } = useFilterDropdown({
        items,
        selectedItem,
        isOpen: effectiveIsOpen,
        onToggle: handleToggle,
        onSelect: (item) => {
             onSelect(item);
             if (!isControlled) setInternalIsOpen(false);
        },
        keyExtractor,
        onEnter
    });

    const isSingle = items.length <= 1;
    const isTransparent = transparentIfSingle && isSingle;
    const isInput = variant === 'input';

    // Padding settings
    const itemPaddingClasses = 'px-3 py-1';

    // Floating styles
    const outerClasses = `relative inline-block ${className}`;
        
    const outerStyle = floating && minHeight 
        ? { ...style, height: minHeight, minHeight } 
        : style;

    const innerClasses = `relative w-full flex flex-col overflow-hidden border transition-all outline-none
                    ${rounded === 'full' ? 'rounded-[20px]' : 'rounded-xl'}
                    ${disabled ? 'cursor-not-allowed bg-transparent border-gray-200 dark:bg-gray-800' : 'cursor-pointer'}
                    ${(effectiveIsOpen || isAnimating)
                        ? `${zIndexHigh}` 
                        : 'z-0'}
                    ${effectiveIsOpen 
                        ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700' 
                        : (isInput 
                            ? (disabled ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600')
                            : (isTransparent ? 'bg-transparent border-transparent' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700')
                          )
                    }
                    ${floating ? 'absolute top-0 left-0' : ''}
                `;

    return (
        <div ref={containerRef} className={outerClasses} style={outerStyle}>
             <div 
                tabIndex={disabled ? -1 : 0}
                onKeyDown={disabled ? undefined : handleKeyDown}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onMouseDown={handleMouseDown}
                className={innerClasses}
                style={effectiveIsOpen ? { borderColor: `var(--color-${color}-500)` } : {}}
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
                            {!(hideArrow || (autoHideArrow && (() => {
                                const findText = (node: any): string => {
                                    if (typeof node === 'string' || typeof node === 'number') return String(node);
                                    if (!node) return '';
                                    if (React.isValidElement(node)) {
                                        const children = (node.props as any).children;
                                        if (Array.isArray(children)) {
                                            return children.map(findText).join('');
                                        }
                                        return findText(children);
                                    }
                                    if (Array.isArray(node)) {
                                        return node.map(findText).join('');
                                    }
                                    return '';
                                };

                                const selected = renderSelected(selectedItem);
                                const text = findText(selected);
                                return text.length > 3;
                            })())) && (
                                <span className="material-symbols-rounded text-gray-400 text-[20px] ml-1 shrink-0">expand_more</span>
                            )}
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
                        gridTemplateRows: effectiveIsOpen ? '1fr' : '0fr',
                        transition: 'grid-template-rows 200ms ease-out'
                    }}
                >
                    <div className="min-h-0 overflow-hidden">
                        <div 
                            className={`filter-dropdown-scroll border-t border-gray-100 dark:border-gray-800 max-h-40 overflow-y-auto ${effectiveIsOpen ? 'opacity-100' : 'opacity-0'} transition-opacity duration-150`}
                            style={{
                                scrollbarWidth: 'thin',
                                scrollbarColor: 'rgba(156, 163, 175, 0.6) transparent',
                            }}
                        >
                            <style>{`
                                .filter-dropdown-scroll::-webkit-scrollbar {
                                    width: 2px;
                                    background: transparent;
                                }
                                .filter-dropdown-scroll::-webkit-scrollbar-track {
                                    background: transparent;
                                    border: none;
                                    box-shadow: none;
                                }
                                .filter-dropdown-scroll::-webkit-scrollbar-thumb {
                                    background: rgba(156, 163, 175, 0.6);
                                    border-radius: 9999px;
                                }
                                .filter-dropdown-scroll::-webkit-scrollbar-corner {
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
