import React, { useEffect, useRef } from 'react';
import { useExpandingDropdown } from '../../hooks/useExpandingDropdown';

export interface PosDropdownProps<T> {
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
    variant?: 'minimal' | 'input'; // 'minimal' for grid pills, 'input' for search filters
    minHeight?: string | number;
    style?: React.CSSProperties;
    disabled?: boolean;
}

export function PosDropdown<T>({
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
    disabled = false
}: PosDropdownProps<T>) {
    
    const containerRef = useRef<HTMLDivElement>(null);
    
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

    return (
        <div ref={containerRef} className={`relative ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} style={style}>
             <div 
                tabIndex={disabled ? -1 : 0}
                onKeyDown={disabled ? undefined : handleKeyDown}
                onBlur={handleBlur}
                className={`absolute top-0 left-0 w-full flex flex-col overflow-hidden rounded-xl border transition-all outline-none
                    ${disabled ? 'cursor-not-allowed bg-gray-100 dark:bg-gray-800' : 'cursor-pointer'}
                    ${/* Base Style & Z-Index */ ''}
                    ${isOpen 
                        ? (isInput ? 'z-50 shadow-xl' : 'z-[5] shadow-xl') 
                        : 'z-0'}
                    ${/* Background & Border */ ''}
                    ${isOpen 
                        ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700' 
                        : (isInput 
                            ? (disabled ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700' : 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600') // Input Closed
                            : (isTransparent ? 'bg-transparent border-transparent' : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700') // Minimal Closed
                          )
                    }
                `}
                style={isOpen ? { borderColor: `var(--color-${color}-500)` } : {}}
                onClick={disabled ? undefined : handleClick}
            >
                {/* Trigger Area */}
                <div 
                    className={`w-full flex items-center 
                        ${isInput ? 'justify-between px-3 py-1' : 'justify-center items-center'}
                    `}
                    style={isInput ? { minHeight: minHeight || '42px' } : {}}
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

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="w-full border-t border-gray-100 dark:border-gray-800 max-h-40 overflow-y-auto bg-white dark:bg-gray-900">
                        {items
                            .filter(item => keyExtractor(item) !== (selectedItem ? keyExtractor(selectedItem) : ''))
                            .map(item => (
                                <div 
                                    key={keyExtractor(item)}
                                    className={`w-full cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 px-3 py-1`}
                                    onClick={(e) => handleOptionClick(e, item)}
                                >
                                    {renderItem(item, false)}
                                </div>
                        ))}
                    </div>
                )}
             </div>
        </div>
    );
}
