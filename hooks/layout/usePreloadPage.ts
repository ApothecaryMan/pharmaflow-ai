import { PAGE_REGISTRY } from '../../config/pageRegistry';

export function preloadPage(viewId: string): void {
  const config = PAGE_REGISTRY[viewId];
  if (!config) return;
  const comp = config.component as any;
  if (typeof comp?._init === 'function' && comp._payload !== undefined) {
    try {
      comp._init(comp._payload);
    } catch {
      // React.lazy throws the pending promise to signal Suspense.
      // We catch it silently — the dynamic import is already in progress.
    }
  }
}

export function preloadPages(viewIds: string[]): void {
  for (const id of viewIds) {
    preloadPage(id);
  }
}
