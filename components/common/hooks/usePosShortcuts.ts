import { useEffect } from 'react';

interface UsePosShortcutsProps {
    onNavigate: (direction: 'up' | 'down') => void;
    onQuantityChange: (delta: number) => void;
    onDelete: () => void;
    onCheckout: () => void;
    onFocusSearch: () => void;
    enabled?: boolean;
}

export const usePosShortcuts = ({
    onNavigate,
    onQuantityChange,
    onDelete,
    onCheckout,
    onFocusSearch,
    enabled = true
}: UsePosShortcutsProps) => {
    useEffect(() => {
        if (!enabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if focus is in an input/textarea (except for specific overrides if needed)
            const activeTag = document.activeElement?.tagName;
            const isInputActive = activeTag === 'INPUT' || activeTag === 'TEXTAREA';

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
            if (isInputActive) return;

            switch (e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    onNavigate('up');
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    onNavigate('down');
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
    }, [enabled, onNavigate, onQuantityChange, onDelete, onCheckout, onFocusSearch]);
};
