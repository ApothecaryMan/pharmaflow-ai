import { Drug } from '../../../../types';
import { parseSearchTerm } from '../../../../utils/searchUtils';

// Helper to map specific categories to broad groups
const getBroadCategory = (category: string): string => {
  const cosmetics = ['Skin Care', 'Personal Care'];
  const general = ['Medical Equipment', 'Medical Supplies', 'Baby Care'];

  if (cosmetics.includes(category)) return 'Cosmetics';
  if (general.includes(category)) return 'General';
  return 'Medicine';
};

// State held within the worker
let inventory: Drug[] = [];

// Handle incoming messages
self.onmessage = (e: MessageEvent) => {
  const { type } = e.data;

  if (type === 'LOAD_INVENTORY') {
    inventory = e.data.inventory || [];
    return;
  }

  if (type === 'FILTER') {
    const { search, category, stockFilter, activeBranchId } = e.data;

    const { mode, regex } = parseSearchTerm(search || '');
    const trimmedSearch = (search || '').trim();

    // Get search term without @ prefix for length check
    const searchTermForLength =
      mode === 'generic' ? (search || '').trimStart().substring(1).trim() : trimmedSearch;

    const results = inventory.filter((d) => {
      // Branch filtering
      if (activeBranchId && d.branchId !== activeBranchId) return false;

      const drugBroadCat = getBroadCategory(d.category);
      const matchesCategory = category === 'All' || drugBroadCat === category;

      let matchesSearch = false;

      // If search is empty, show nothing
      if (!trimmedSearch) {
        matchesSearch = false;
      }
      // Exact code match (barcode or internal code) - no minimum length
      else if (d.barcode === trimmedSearch || d.internalCode === trimmedSearch) {
        matchesSearch = true;
      }
      // Text search requires minimum 2 characters
      else if (searchTermForLength.length >= 2) {
        if (mode === 'generic') {
          matchesSearch = Array.isArray(d.genericName) 
            ? d.genericName.some(gn => regex.test(gn))
            : (d.genericName && regex.test(d.genericName as any));
        } else {
          const searchableText = [
            d.name,
            d.dosageForm,
            d.category,
            d.description,
            ...(Array.isArray(d.genericName) 
              ? d.genericName 
              : d.genericName 
                ? [d.genericName] 
                : []),
          ]
            .filter(Boolean)
            .join(' ');

          matchesSearch = regex.test(searchableText);
        }
      }

      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in_stock' && d.stock > 0) ||
        (stockFilter === 'out_of_stock' && d.stock <= 0);

      return matchesCategory && matchesSearch && matchesStock;
    });

    self.postMessage({ type: 'FILTER_RESULT', results });
  }
};
