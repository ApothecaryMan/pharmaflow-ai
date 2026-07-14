import React, { type ComponentType } from 'react';

export function createLazyPage<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>
) {
  return {
    component: React.lazy(loader),
    preload: loader,
  };
}
