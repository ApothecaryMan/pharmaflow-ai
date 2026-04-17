import { useEffect, useRef, useState } from 'react';
import type { Drug } from '../../../../types';
import SearchWorker from '../workers/inventorySearchWorker?worker';

interface UsePOSSearchWorkerProps {
  inventory: Drug[];
  search: string;
  selectedCategory: string;
  stockFilter: string;
  activeBranchId: string;
}

export const usePOSSearchWorker = ({
  inventory,
  search,
  selectedCategory,
  stockFilter,
  activeBranchId,
}: UsePOSSearchWorkerProps) => {
  const workerRef = useRef<Worker | null>(null);
  const [filteredDrugs, setFilteredDrugs] = useState<Drug[]>([]);

  // Initialize worker once
  useEffect(() => {
    workerRef.current = new SearchWorker();
    workerRef.current.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'FILTER_RESULT') {
        setFilteredDrugs(e.data.results);
      }
    };

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Update worker with inventory data when it changes
  useEffect(() => {
    if (workerRef.current && inventory.length > 0) {
      workerRef.current.postMessage({ type: 'LOAD_INVENTORY', inventory });
      // Trigger an initial filter run to populate results immediately if there's an active search
      // or to just clear things out nicely.
      workerRef.current.postMessage({
        type: 'FILTER',
        search,
        category: selectedCategory,
        stockFilter,
        activeBranchId,
      });
    }
  }, [inventory]); // Only run on inventory changes

  // Send filter requests on search/filter state changes (debounced)
  useEffect(() => {
    if (!workerRef.current) return;

    // Small debounce to prevent blocking when typing extremely fast
    // 80ms is usually low enough to feel instant but high enough to drop intermediate keystrokes
    const timer = setTimeout(() => {
      workerRef.current?.postMessage({
        type: 'FILTER',
        search,
        category: selectedCategory,
        stockFilter,
        activeBranchId,
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [search, selectedCategory, stockFilter, activeBranchId]);

  return { filteredDrugs };
};
