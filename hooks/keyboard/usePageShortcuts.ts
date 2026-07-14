import { useContext, useEffect } from 'react';
import { KeyboardContext } from './KeyboardProvider';
import type { PageShortcutMap, ShortcutScope } from './types';

export function usePageShortcuts(
  scope: ShortcutScope,
  shortcutMap: PageShortcutMap,
  deps: any[] = [shortcutMap]
): void {
  const { registerShortcuts } = useContext(KeyboardContext);

  useEffect(() => {
    const unregister = registerShortcuts(scope, shortcutMap);
    return () => unregister();
  }, deps);
}
