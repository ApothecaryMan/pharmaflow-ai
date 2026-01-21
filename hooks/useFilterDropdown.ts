import { KeyboardEvent, FocusEvent, MouseEvent } from 'react';

export interface UseFilterDropdownProps<T> {
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

export function useFilterDropdown<T>({
  items,
  selectedItem,
  isOpen,
  onToggle,
  onSelect,
  keyExtractor,
  onEnter,
  preventDefaultOnSpace = true,
  onEscape,
}: UseFilterDropdownProps<T>) {
  
  const handleKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation(); // Prevent row actions (like add to cart) from triggering on keydown
    
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
      e.preventDefault();
      
      if (isOpen) {
        // Confirm selection and close
        onToggle();
      } else if (onEnter) {
        // Execute main action (e.g. Add to Cart)
        onEnter();
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
    e.stopPropagation(); // Prevent click from bubbling to parent (e.g. table row)
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
