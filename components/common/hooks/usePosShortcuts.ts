import { useEffect } from 'react';

interface UsePosShortcutsProps {
  onNavigate: (direction: 'up' | 'down') => void; // Cart navigation
  onTableNavigate?: (direction: 'up' | 'down') => void; // Table navigation
  onQuantityChange: (delta: number) => void;
  onDelete: () => void;
  onCheckout: () => void;
  onFocusSearch: () => void;
  onAddFromTable?: () => void; // Add highlighted table row to cart
  onTab?: () => void; // Handle Tab key
  focusMode?: 'table' | 'cart'; // Which area has focus for arrow keys
  enabled?: boolean;
}

export const usePosShortcuts = ({
  onNavigate,
  onTableNavigate,
  onQuantityChange,
  onDelete,
  onCheckout,
  onFocusSearch,
  onAddFromTable,
  onTab,
  focusMode = 'cart',
  enabled = true,
}: UsePosShortcutsProps) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check active element to avoid interfering with inputs
      const activeElement = document.activeElement as HTMLElement;
      const isInputActive =
        activeElement &&
        (activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.isContentEditable);

      // Global Shortcuts (Work even when input is active)
      if (e.key === 'F9') {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        onCheckout();
        return;
      }

      // Shortcuts that shouldn't trigger when typing in a field
      // EXCEPTION: Allow Arrow navigation to cart even when input is focused
      const isArrowKey = e.key === 'ArrowUp' || e.key === 'ArrowDown';
      const allowArrowsForCart = isArrowKey && focusMode === 'cart';
      if (isInputActive && !allowArrowsForCart) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (focusMode === 'table' && onTableNavigate) {
            onTableNavigate('up');
          } else {
            onNavigate('up');
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          if (focusMode === 'table' && onTableNavigate) {
            onTableNavigate('down');
          } else {
            onNavigate('down');
          }
          break;
        case 'Enter':
          // When table is focused, Enter adds the highlighted row to cart
          if (focusMode === 'table' && onAddFromTable) {
            e.preventDefault();
            onAddFromTable();
          }
          break;
        case '+':
        case '=': // Often sharing key with +
        case 'Add': // Numpad
          e.preventDefault();
          onQuantityChange(1);
          break;
        case '-':
        case '_': // Shift+-
        case 'Subtract': // Numpad
          e.preventDefault();
          onQuantityChange(-1);
          break;
        case 'Delete':
        case 'Backspace':
          onDelete();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    enabled,
    onNavigate,
    onTableNavigate,
    onQuantityChange,
    onDelete,
    onCheckout,
    onFocusSearch,
    onAddFromTable,
    focusMode,
  ]);
};
