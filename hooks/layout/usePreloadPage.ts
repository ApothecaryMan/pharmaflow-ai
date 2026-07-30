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

export function preloadAllPages(): void {
  const start = () => {
    const allViews = Object.keys(PAGE_REGISTRY);
    let i = 0;
    const next = () => {
      if (i >= allViews.length) return;
      preloadPage(allViews[i++]);
      setTimeout(next, 0);
    };
    next();
  };

  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(start, { timeout: 3000 });
  } else {
    setTimeout(start, 1000);
  }
}
