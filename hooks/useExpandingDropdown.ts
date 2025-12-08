import { KeyboardEvent, FocusEvent, MouseEvent } from 'react';

export interface UseExpandingDropdownProps<T> {
  items: T[];
  selectedItem: T | undefined;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (item: T) => void;
  keyExtractor: (item: T) => string;
  onEnter?: () => void;
  // Configuration
  preventDefaultOnSpace?: boolean;
  onEscape?: () => void;
}

export function useExpandingDropdown<T>({
  items,
  selectedItem,
  isOpen,
  onToggle,
  onSelect,
  keyExtractor,
  onEnter,
  preventDefaultOnSpace = true,
  onEscape,
}: UseExpandingDropdownProps<T>) {
  
  const handleKeyDown = (e: KeyboardEvent) => {
    // Escape
    if (e.key === 'Escape') {
        if (onEscape) onEscape();
        else if (isOpen) onToggle();
        return;
    }

    // Space to Toggle
    if (e.key === 'Space') {
      if (preventDefaultOnSpace) {
        e.preventDefault();
        onToggle();
      }
      return;
    }

    // Enter Actions
    if (e.key === 'Enter') {
      // Don't prevent default if we want to submit a form, but usually we do for dropdowns
      // If onEnter is provided, we assume we're handling it.
      if (isOpen || onEnter) e.preventDefault();
      
      if (onEnter) {
        onEnter();
      } else if (isOpen && items.length > 0) {
        // Default: toggle closed if just selecting? 
        // Or do nothing? Existing logic was minimal.
        // For Combobox, Enter usually performs the selection.
      }
      return;
    }

    // Navigation
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      
      // Calculate next index
      const currentKey = selectedItem ? keyExtractor(selectedItem) : null;
      const currentIndex = currentKey 
        ? items.findIndex(item => keyExtractor(item) === currentKey) 
        : -1;

      let nextIndex;
      if (currentIndex === -1) {
          nextIndex = 0; // Start at 0 if nothing selected
      } else {
          if (e.key === 'ArrowDown') {
            nextIndex = (currentIndex + 1) % items.length;
          } else {
            nextIndex = (currentIndex - 1 + items.length) % items.length;
          }
      }
      
      const nextItem = items[nextIndex];
      if (nextItem) {
        onSelect(nextItem);
      }
    }
  };

  const handleBlur = (e: FocusEvent) => {
    // Close if focus leaves the dropdown container
    if (!e.currentTarget.contains(e.relatedTarget)) {
      if (isOpen) onToggle();
    }
  };

  const handleClick = (e: MouseEvent) => {
    // e.stopPropagation(); // Removed strict propagation to allow flexibility
    onToggle();
  };

  const handleOptionClick = (e: MouseEvent, item: T) => {
    e.stopPropagation();
    onSelect(item);
    onToggle(); // Close after selection
  };

  return {
    handleKeyDown,
    handleBlur,
    handleClick,
    handleOptionClick
  };
}
