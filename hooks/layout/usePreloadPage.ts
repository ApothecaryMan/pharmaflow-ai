import { PAGE_REGISTRY } from '../../config/pageRegistry';

export function preloadPage(viewId: string): void {
  const config = PAGE_REGISTRY[viewId];
  if (!config) return;

  const comp = config.component as any;
  if (typeof comp?._init === 'function') {
    try {
      comp._init(comp._payload);
    } catch {
      // React.lazy throws the pending promise to signal Suspense.
    }
    return;
  }

  config.preload?.();
}

export function preloadPages(viewIds: string[]): void {
  for (const id of viewIds) {
    preloadPage(id);
  }
}
