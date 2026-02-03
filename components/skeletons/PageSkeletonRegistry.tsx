import React from 'react';
import { PAGE_REGISTRY } from '../../config/pageRegistry';
import { GenericSkeleton } from './GenericSkeleton';

/**
 * Registry mapping view IDs to Skeleton Components
 * Dynamically retrieves the skeleton specific to a page from the PageRegistry.
 */

export const PageSkeletonRegistry = ({ view }: { view: string }) => {
  const config = PAGE_REGISTRY[view];
  const Skeleton = config?.skeleton || GenericSkeleton;
  const skeletonProps = config?.skeletonProps || {};

  return (
    <div className='animate-fade-in transition-opacity duration-300'>
      <Skeleton {...skeletonProps} />
    </div>
  );
};
