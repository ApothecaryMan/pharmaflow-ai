import { useEffect } from 'react';

export function useBrowserOverride(): void {
  useEffect(() => {
    const isTauri = !!(window as any).__TAURI_INTERNALS__;
    if (isTauri) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        return;
      }

      if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
          case 'p':
          case 'f':
          case 's':
          case 'n':
          case 'k':
          case 'd':
          case 'e':
            e.preventDefault();
            return;
        }
      }
    };

    window.addEventListener('keydown', handler, { capture: true });
    return () => window.removeEventListener('keydown', handler, { capture: true });
  }, []);
}
