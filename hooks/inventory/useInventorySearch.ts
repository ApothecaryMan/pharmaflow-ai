import { useMemo } from 'react';
import type { Drug } from '../../types';
import { DrugSearchEngine } from '../../services/search/drugSearchService';

interface UseInventorySearchProps {
  inventory: Drug[];
  search: string;
  category?: string;
  stockFilter?: string;
  activeBranchId?: string;
}

/**
 * Global hook for inventory search logic.
 * Performs searches directly on the main thread using DrugSearchEngine.
 */
export const useInventorySearch = ({
  inventory,
  search,
  category = 'All',
  stockFilter = 'all',
  activeBranchId,
}: UseInventorySearchProps) => {
  
  const { filteredDrugs, totalResults } = useMemo(() => {
    if (!search || search.trim().length === 0) {
      return { filteredDrugs: [], totalResults: 0 };
    }

    const engine = new DrugSearchEngine(inventory);
    const filters = {
      branchId: activeBranchId,
      category: category === 'All' ? ['all'] : [category],
      stock_status: stockFilter === 'all' ? ['all'] : [stockFilter]
    };

    const results = engine.search(search, filters) as Drug[];

    // Calculate total count based on unique groups (Name + Dosage Form)
    const uniqueGroups = new Set();
    for (const d of results) {
      uniqueGroups.add(`${d.name}|${d.dosageForm || ''}`);
    }
    
    return { 
      filteredDrugs: results, 
      totalResults: uniqueGroups.size 
    };
  }, [inventory, search, category, stockFilter, activeBranchId]);

  return { filteredDrugs, totalResults };
};
