import { useEffect } from 'react';
import { Language } from '../types';
import { batchService } from '../services/inventory/batchService';

interface GlobalEventHandlersProps {
  language: Language;
  inventory: any[];
  isLoading: boolean;
  // Handlers for shortcuts
  onToggleSidebar: () => void;
  onNavigate: (view: string) => void;
}

/**
 * useGlobalEventHandlers centralizes global side-effects and event listeners.
 * This includes document attributes, keyboard shortcuts, and background tasks.
 */
export const useGlobalEventHandlers = ({ 
  language, 
  inventory, 
  isLoading,
  onToggleSidebar,
  onNavigate 
}: GlobalEventHandlersProps) => {
  
  // 1. Document Level Attributes (Lang/Dir)
  useEffect(() => {
    document.documentElement.lang = language.toLowerCase();
    document.documentElement.dir = language === 'AR' ? 'rtl' : 'ltr';
  }, [language]);

  // 2. Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid shortcuts when typing in inputs
      const activeElement = document.activeElement as HTMLElement;
      const isInputActive = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable
      );

      // Global shortcuts (Work even in inputs if needed, but usually not)
      if (e.ctrlKey && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        onToggleSidebar();
        return;
      }

      if (isInputActive) return;

      // Navigation Shortcuts
      switch (e.key) {
        case 'F2':
          e.preventDefault();
          onNavigate('dashboard');
          break;
        case 'F3':
          e.preventDefault();
          onNavigate('pos');
          break;
        case 'F4':
          e.preventDefault();
          onNavigate('inventory');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onToggleSidebar, onNavigate]);

  // 3. Background Tasks (Inventory Migration)
  useEffect(() => {
    if (!isLoading && inventory.length > 0) {
      const count = batchService.migrateInventoryToBatches(inventory);
      if (count > 0) {
        console.log(`[Batch System] Migrated ${count} items to batches.`);
      }
    }
  }, [isLoading, inventory]);
};
