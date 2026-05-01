import { Drug } from '../../../../types';

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
    const rawSearch = search || '';
    const trimmedSearch = rawSearch.trim().toLowerCase();
    const startsWithSpace = rawSearch.startsWith(' ');

    // 1. If search is empty, show nothing (to avoid heavy lists unless needed)
    if (!trimmedSearch) {
      self.postMessage({ type: 'FILTER_RESULT', results: [] });
      return;
    }

    const words = trimmedSearch.split(/\s+/).filter(w => w.length > 0);
    const [first, ...rest] = words;

    const results = inventory.filter((d) => {
      // --- A. Essential Filters (O(1)) ---
      if (activeBranchId && d.branchId !== activeBranchId) return false;

      // --- B. Category Filter ---
      const drugBroadCat = getBroadCategory(d.category);
      if (category !== 'All' && drugBroadCat !== category) return false;

      // --- C. Stock Filter ---
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in_stock' && d.stock > 0) ||
        (stockFilter === 'out_of_stock' && d.stock <= 0);
      if (!matchesStock) return false;

      // --- D. Exact Code Match (Priority - ignores 2 char limit) ---
      if (d.barcode === trimmedSearch || d.internalCode === trimmedSearch) return true;

      // --- E. Intelligent Text Search (The Core) ---
      // Minimum 2 chars for text search
      if (trimmedSearch.length < 2) return false;

      const isScientific = trimmedSearch.startsWith('@');
      const searchTerm = isScientific ? trimmedSearch.slice(1).trim() : trimmedSearch;

      if (isScientific) {
        // Generic Name Search
        const generics = Array.isArray(d.genericName) 
          ? d.genericName 
          : d.genericName ? [d.genericName] : [];
        
        return generics.some(gn => gn.toLowerCase().includes(searchTerm));
      }

      const nameEn = (d.name || '').toLowerCase();
      const nameAr = (d.nameAr || '').toLowerCase();
      const fullName = `${nameEn} ${nameAr}`;

      // 1. First Word Matching
      if (startsWithSpace) {
        // "Contains" mode
        if (!fullName.includes(first)) return false;
      } else {
        // "Prefix" mode - check if either language starts with it
        if (!nameEn.startsWith(first) && !nameAr.startsWith(first)) return false;
      }

      // 2. Rest of Words (Always Contains)
      if (rest.length > 1 || (rest.length > 0 && !isScientific)) {
        const remainingWords = isScientific ? words : rest;
        return remainingWords.every(w => fullName.includes(w));
      }

      return true;
    });

    // Sort results to prioritize prefix matches and shorter names
    const sorted = results.sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const aAr = (a.nameAr || '').toLowerCase();
      const bAr = (b.nameAr || '').toLowerCase();

      const aStarts = aName.startsWith(first) || aAr.startsWith(first);
      const bStarts = bName.startsWith(first) || bAr.startsWith(first);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      return aName.length - bName.length;
    }).slice(0, 50);

    self.postMessage({ type: 'FILTER_RESULT', results: sorted });
  }
};
