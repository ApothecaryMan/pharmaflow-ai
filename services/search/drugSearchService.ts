import { type DrugCatalogItem } from './catalogCacheService';
import type { Drug } from '../../types';
import { getLocalizedProductType } from '../../data/productCategories';

type SearchableDrug = DrugCatalogItem | Drug;

/**
 * DrugSearchEngine - High Performance In-Memory Search Engine.
 * Features:
 * - O(1) Barcode/Internal Code lookup.
 * - Optimized prefix matching for names.
 * - Specialized shortcuts (@ for ingredients, price range filtering).
 * - Multi-word intersection search.
 */
export class DrugSearchEngine {
  // High-speed HashMaps for exact lookups
  private idMap = new Map<string, SearchableDrug>();
  private barcodeMap = new Map<string, string>(); // Barcode -> ID
  
  private cachedArray: SearchableDrug[] = [];
  private nameSearchKeys = new Map<string, string>(); // ID -> name-only search string
  private ingredientSearchKeys = new Map<string, string>(); // ID -> generic-only search string
  
  // Batching / Throttling system
  private pendingUpdates = new Map<string, SearchableDrug>();
  private batchTimeout: NodeJS.Timeout | null = null;

  constructor(initialData: SearchableDrug[] = []) {
    if (initialData.length > 0) {
      this.indexData(initialData);
    }
  }

  /**
   * Builds the memory indexes from raw catalog data.
   * This should be called once on load or after a full sync.
   */
  public indexData(data: SearchableDrug[]) {
    this.idMap.clear();
    this.barcodeMap.clear();

    for (const drug of data) {
      this.addOrUpdateToMap(drug);
    }
    
    this.refreshCache();
    console.log(`[SearchEngine] Indexed ${data.length} drugs.`);
  }

  /**
   * Queues an update to be applied in the next batch.
   * This prevents UI flickering and CPU spikes during high-volume events.
   */
  public queueUpdate(item: SearchableDrug) {
    this.pendingUpdates.set(item.id, item);
    
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => this.flushPending(), 300);
    }
  }

  /**
   * Immediately applies all pending updates.
   * Called automatically by search() to ensure data integrity.
   */
  public flushPending() {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    if (this.pendingUpdates.size === 0) return;

    for (const item of this.pendingUpdates.values()) {
      this.addOrUpdateToMap(item);
    }
    
    this.pendingUpdates.clear();
    this.refreshCache();
  }

  /**
   * O(1) Incremental Update (Direct).
   */
  public updateItem(item: SearchableDrug) {
    this.addOrUpdateToMap(item);
    this.refreshCache();
  }

  /**
   * O(1) Incremental Removal.
   */
  public removeItem(id: string) {
    const item = this.idMap.get(id);
    this.idMap.delete(id);
    this.nameSearchKeys.delete(id);
    this.ingredientSearchKeys.delete(id);
    this.refreshCache();
  }

  private refreshCache() {
    this.cachedArray = Array.from(this.idMap.values());
    
    // Pre-compute search keys separately for Trade Name and Ingredients
    for (const drug of this.cachedArray) {
      const nameEn = (drug.name || '').toLowerCase();
      const nameAr = ((drug as any).nameArabic || drug.nameAr || '').toLowerCase();
      const dosageEn = (drug as any).dosageForm || '';
      const dosageAr = getLocalizedProductType(dosageEn, 'ar');
      
      const substance = (drug as DrugCatalogItem).activeSubstance || '';
      const generic = Array.isArray((drug as Drug).genericName) 
        ? (drug as Drug).genericName.join(' ').toLowerCase() 
        : String(substance).toLowerCase();
        
      // Trade Name Key: includes Name (with strength) + Dosage (EN/AR) + Arabic Name
      const searchKey = `${nameEn} ${dosageEn.toLowerCase()} ${nameAr} ${dosageAr}`;
      this.nameSearchKeys.set(drug.id, searchKey);
      this.ingredientSearchKeys.set(drug.id, generic);
    }
  }

  private addOrUpdateToMap(drug: SearchableDrug) {
    // If it had a previous barcode, clean it up
    const old = this.idMap.get(drug.id);
    if (old?.barcode && old.barcode !== drug.barcode) {
      this.barcodeMap.delete(old.barcode);
    }

    this.idMap.set(drug.id, drug);
    
    if (drug.barcode) {
      this.barcodeMap.set(drug.barcode, drug.id);
    }
  }

  /**
   * Main Search Gateway
   */
  public search(query: string, filters?: any): SearchableDrug[] {
    this.flushPending();
    const rawTerm = query.toLowerCase();
    const term = query.trim().toLowerCase();
    if (!term) return [];

    // 1. O(1) Barcode Lookup (Priority 1)
    const idByBarcode = this.barcodeMap.get(term);
    if (idByBarcode) {
      const match = this.idMap.get(idByBarcode);
      if (match && this.matchesFilters(match, filters)) {
        return [this.transformResult(match, filters)];
      }
    }

    // 2. Specialized Shortcut: @ (Scientific/Ingredient Search)
    if (term.startsWith('@')) {
      const ingredientQuery = term.slice(1).trim();
      return this.searchByIngredient(ingredientQuery, filters);
    }

    // 3. Specialized Shortcut: Price Range (e.g., 10/50/panadol)
    if (term.includes('/')) {
      return this.searchWithPriceRange(term, filters);
    }

    // 4. Multi-word Name Search
    return this.searchByName(rawTerm, filters);
  }

  private searchByName(query: string, filters?: any): SearchableDrug[] {
    return this.internalSearchByName(query, filters)
      .slice(0, 50)
      .map(d => this.transformResult(d, filters));
  }

  private searchByIngredient(query: string, filters?: any): SearchableDrug[] {
    if (!query) return [];
    const q = query.toLowerCase();

    return this.cachedArray
      .filter(d => {
        const key = this.ingredientSearchKeys.get(d.id) || '';
        return key.includes(q) && this.matchesFilters(d, filters);
      })
      .slice(0, 50)
      .map(d => this.transformResult(d, filters));
  }

  private searchWithPriceRange(query: string, filters?: any): SearchableDrug[] {
    const parts = query.split('/');
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

    const initialMatches = term ? this.internalSearchByName(term, filters) : this.cachedArray;
    
    return initialMatches
      .filter(d => 
        d.publicPrice >= min && d.publicPrice <= max && (term ? true : this.matchesFilters(d, filters))
      )
      .slice(0, 50)
      .map(d => this.transformResult(d, filters));
  }

  /**
   * Internal search to avoid double transformation.
   */
  private internalSearchByName(query: string, filters?: any): SearchableDrug[] {
    const rawTerm = query.toLowerCase();
    const startsWithSpace = rawTerm.startsWith(' ');
    const words = rawTerm.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];
    const [first, ...rest] = words;

    let matches = this.cachedArray.filter(drug => {
      const searchKey = this.nameSearchKeys.get(drug.id) || '';
      const nameEn = (drug.name || '').toLowerCase();
      const nameAr = ((drug as any).nameArabic || drug.nameAr || '').toLowerCase();
      
      const matchesFirst = startsWithSpace 
        ? (nameEn.includes(first) || nameAr.includes(first))
        : (nameEn.startsWith(first) || nameAr.startsWith(first));

      if (!matchesFirst) return false;

      // Sequential Match Logic:
      // We start looking for the rest of the words AFTER the first word's position
      let firstWordIndex = nameEn.startsWith(first) ? 0 : searchKey.indexOf(first);
      if (firstWordIndex === -1) return false;

      let lastIndex = firstWordIndex + first.length;
      
      for (const word of rest) {
        const index = searchKey.indexOf(word, lastIndex);
        if (index === -1) return false;
        lastIndex = index + word.length;
      }
      
      return true;
    });

    if (filters) {
      matches = matches.filter(d => this.matchesFilters(d, filters));
    }

    return matches.sort((a, b) => {
      const nameArA = ((a as any).nameArabic || a.nameAr || '').toLowerCase();
      const nameArB = ((b as any).nameArabic || b.nameAr || '').toLowerCase();
      
      const aStarts = a.name.toLowerCase().startsWith(first) || nameArA.startsWith(first);
      const bStarts = b.name.toLowerCase().startsWith(first) || nameArB.startsWith(first);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      return a.name.length - b.name.length;
    });
  }

  /**
   * Fast Boolean Filter check.
   * No object creation, just logic.
   */
  private matchesFilters(d: SearchableDrug, filters: any): boolean {
    if (!filters) return true;

    // 1. Branch Filter
    if (filters.branchId && (d as Drug).branchId !== filters.branchId) return false;

    // 2. Category Filter
    if (filters.category && filters.category.length > 0) {
      const targetCats = filters.category.map((c: string) => c.toLowerCase());
      if (!targetCats.includes('all')) {
        if (!d.category || !targetCats.includes(d.category.toLowerCase())) return false;
      }
    }

    // 3. Stock Status Filter
    if (filters.stock_status && filters.stock_status.length > 0) {
      const status = filters.stock_status;
      if (!status.includes('all')) {
        const showInStock = status.includes('in_stock');
        const showOut = status.includes('out_of_stock');
        const s = (d as Drug).stock || 0;

        if (showInStock && !showOut && s <= 0) return false;
        if (showOut && !showInStock && s > 0) return false;
      }
    }

    // 4. Price Filter
    if (filters.priceRange) {
      const { min, max } = filters.priceRange;
      if (d.publicPrice < min || d.publicPrice > max) return false;
    }

    return true;
  }

  /**
   * Final transformation applied only to the visible results.
   * Handles batch filtering and object creation.
   */
  private transformResult(d: SearchableDrug, filters: any): SearchableDrug {
    const drug = d as Drug;
    if (!filters?.stock_status || filters.stock_status.includes('all')) return d;
    if (!drug.batches || drug.batches.length === 0) return d;

    const showInStock = filters.stock_status.includes('in_stock');
    const showOut = filters.stock_status.includes('out_of_stock');

    const filteredBatches = drug.batches.filter(b => {
      const qty = (b as Drug).stock ?? (b as any).quantity ?? 0;
      if (showInStock && showOut) return true;
      if (showInStock) return qty > 0;
      if (showOut) return qty <= 0;
      return true;
    });

    // We only create a new object if we actually modified the batches
    if (filteredBatches.length === drug.batches.length) return d;

    return { ...d, batches: filteredBatches };
  }

  // Getter for all data (useful for initial lists)
  public getAll(): SearchableDrug[] {
    return this.cachedArray;
  }
}

/**
 * Singleton instance for branch-specific inventory search.
 * This prevents recreating the engine on every render/update.
 */
export const inventorySearchEngine = new DrugSearchEngine();
