import { type DrugCatalogItem } from './catalogCache';

/**
 * DrugSearchEngine - High Performance In-Memory Search Engine.
 * Features:
 * - O(1) Barcode/Internal Code lookup.
 * - Optimized prefix matching for names.
 * - Specialized shortcuts (@ for ingredients, price range filtering).
 * - Multi-word intersection search.
 */
export class DrugSearchEngine {
  private drugs: DrugCatalogItem[] = [];
  
  // High-speed HashMaps for exact lookups
  private idMap = new Map<string, DrugCatalogItem>();
  private barcodeMap = new Map<string, string>(); // Barcode -> ID

  constructor(initialData: DrugCatalogItem[] = []) {
    if (initialData.length > 0) {
      this.indexData(initialData);
    }
  }

  /**
   * Builds the memory indexes from raw catalog data.
   * This should be called once on load or after a sync.
   */
  public indexData(data: DrugCatalogItem[]) {
    this.drugs = data;
    this.idMap.clear();
    this.barcodeMap.clear();

    for (const drug of data) {
      this.idMap.set(drug.id, drug);
      
      if (drug.barcode) {
        this.barcodeMap.set(drug.barcode, drug.id);
      }
    }
    console.log(`[SearchEngine] Indexed ${data.length} drugs.`);
  }

  /**
   * Main Search Gateway
   */
  public search(query: string, filters?: any): DrugCatalogItem[] {
    const rawTerm = query.toLowerCase();
    const term = query.trim().toLowerCase();
    if (!term) return [];

    // 1. O(1) Barcode Lookup (Priority 1)
    const idByBarcode = this.barcodeMap.get(term);
    if (idByBarcode) {
      const match = this.idMap.get(idByBarcode);
      return match ? [match] : [];
    }

    // 2. Specialized Shortcut: @ (Scientific/Ingredient Search)
    if (term.startsWith('@')) {
      const ingredientQuery = term.slice(1).trim();
      return this.searchByIngredient(ingredientQuery);
    }

    // 3. Specialized Shortcut: Price Range (e.g., 10/50/panadol)
    if (term.includes('/')) {
      return this.searchWithPriceRange(term, filters);
    }

    // 4. Multi-word Name Search (Optimized with pre-filtering)
    return this.searchByName(rawTerm, filters);
  }

  private searchByName(query: string, filters?: any): DrugCatalogItem[] {
    if (!query.trim()) return [];

    const startsWithSpace = query.startsWith(' ');
    const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];

    const [first, ...rest] = words;

    // --- Optimization: Pre-filter Pool based on Category ---
    let pool = this.getFilteredPool(filters);

    // --- Main Filtering ---
    return pool.filter(drug => {
      const nameEn = drug.name.toLowerCase();
      const nameAr = (drug.nameAr || '').toLowerCase();
      const generic = Array.isArray((drug as any).genericName) 
        ? (drug as any).genericName.join(' ').toLowerCase() 
        : String((drug as any).genericName || (drug as any).activeSubstance || '').toLowerCase();
      
      const fullName = `${nameEn} ${nameAr} ${generic}`;

      // Logic for first word
      if (startsWithSpace) {
        // "Contains" mode
        if (!fullName.includes(first)) return false;
      } else {
        // "Prefix" mode - check if either language starts with it
        if (!nameEn.startsWith(first) && !nameAr.startsWith(first)) return false;
      }

      // Logic for rest of words (always contains)
      if (rest.length > 0) {
        return rest.every(w => fullName.includes(w));
      }

      return true;
    })
    .sort((a, b) => {
      // Priority: Does it start with the first word in either language?
      const aStarts = a.name.toLowerCase().startsWith(first) || (a.nameAr?.toLowerCase().startsWith(first) ?? false);
      const bStarts = b.name.toLowerCase().startsWith(first) || (b.nameAr?.toLowerCase().startsWith(first) ?? false);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      // Secondary: Sort by name length (shorter names often more relevant)
      return a.name.length - b.name.length;
    })
    .slice(0, 50);
  }

  private searchByIngredient(query: string): DrugCatalogItem[] {
    if (!query) return [];
    const q = query.toLowerCase();
    return this.drugs.filter(d => {
      const substance = (d as any).activeSubstance?.toLowerCase() || '';
      const generic = Array.isArray((d as any).genericName) 
        ? (d as any).genericName.join(' ').toLowerCase() 
        : String((d as any).genericName || '').toLowerCase();
        
      return substance.includes(q) || generic.includes(q);
    }).slice(0, 50);
  }

  private searchWithPriceRange(query: string, filters?: any): DrugCatalogItem[] {
    const parts = query.split('/');
    // Format: min/max/term OR min/term
    let min = 0;
    let max = Infinity;
    let term = '';

    if (parts.length === 3) {
      min = parseFloat(parts[0]) || 0;
      max = parseFloat(parts[1]) || Infinity;
      term = parts[2].trim();
    } else if (parts.length === 2) {
      min = parseFloat(parts[0]) || 0;
      term = parts[1].trim();
    }

    const matches = term ? this.searchByName(term, filters) : this.getFilteredPool(filters);
    
    return matches.filter(d => 
      d.publicPrice >= min && d.publicPrice <= max
    ).slice(0, 50);
  }


  private getFilteredPool(filters?: any): DrugCatalogItem[] {
    let pool = this.drugs;

    // 1. Category Filter
    if (filters?.category && filters.category.length > 0) {
      const targetCat = filters.category[0].toLowerCase();
      pool = pool.filter(d => d.category?.toLowerCase() === targetCat);
    }

    // 2. Price Filter (if applicable)
    if (filters?.priceRange) {
      const { min, max } = filters.priceRange;
      pool = pool.filter(d => d.publicPrice >= min && d.publicPrice <= max);
    }

    return pool;
  }

  // Getter for all data (useful for initial lists)
  public getAll(): DrugCatalogItem[] {
    return this.drugs;
  }
}
