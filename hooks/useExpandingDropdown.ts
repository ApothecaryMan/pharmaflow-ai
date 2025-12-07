import { KeyboardEvent, FocusEvent, MouseEvent } from 'react';

export interface UseExpandingDropdownProps<T> {
  items: T[];
  selectedItem: T | undefined;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (item: T) => void;
  keyExtractor: (item: T) => string;
  onEnter?: () => void;
}

export function useExpandingDropdown<T>({
  items,
  selectedItem,
  isOpen,
  onToggle,
  onSelect,
  keyExtractor,
  onEnter,
}: UseExpandingDropdownProps<T>) {
  
  const handleKeyDown = (e: KeyboardEvent) => {
    // Space to Toggle
    if (e.key === 'Space') {
      e.preventDefault();
      onToggle();
      return;
    }

    // Enter Actions
    if (e.key === 'Enter') {
      e.preventDefault();
      if (onEnter) {
        onEnter();
      } else if (isOpen && items.length > 0) {
        // Optional: If open and enter pressed without custom onEnter, maybe select first? 
        // Current implementation in component didn't select on Enter by default if closed,
        // but let's stick to the extracted logic.
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
    e.stopPropagation();
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
