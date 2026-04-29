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
  
  // Term Index for prefix/word matching
  // Maps a word/prefix to a Set of Drug IDs
  private termIndex = new Map<string, Set<string>>();

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
    this.termIndex.clear();

    for (const drug of data) {
      this.idMap.set(drug.id, drug);
      
      if (drug.barcode) {
        this.barcodeMap.set(drug.barcode, drug.id);
      }

      // Index words from EN and AR names for fast searching
      const words = this.extractTerms(drug);
      for (const word of words) {
        if (!this.termIndex.has(word)) {
          this.termIndex.set(word, new Set());
        }
        this.termIndex.get(word)!.add(drug.id);
      }
    }
    console.log(`[SearchEngine] Indexed ${data.length} drugs.`);
  }

  /**
   * Main Search Gateway
   */
  public search(query: string): DrugCatalogItem[] {
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
      return this.searchWithPriceRange(term);
    }

    // 4. Multi-word Name Search (Optimized)
    return this.searchByName(term);
  }

  private searchByName(query: string): DrugCatalogItem[] {
    const words = query.split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return [];

    // Intersection Search: 
    // We take the results for each word and find items that contain ALL words.
    let resultSet: Set<string> | null = null;

    for (const word of words) {
      const wordMatches = new Set<string>();
      
      // Look for prefix matches in the term index
      // In a more advanced version, we'd use a Trie for this.
      for (const [term, ids] of this.termIndex) {
        if (term.startsWith(word)) {
          for (const id of ids) wordMatches.add(id);
        }
      }

      if (resultSet === null) {
        resultSet = wordMatches;
      } else {
        // Intersect
        const nextSet = new Set<string>();
        for (const id of wordMatches) {
          if (resultSet.has(id)) nextSet.add(id);
        }
        resultSet = nextSet;
      }

      if (resultSet.size === 0) break;
    }

    if (!resultSet) return [];
    
    // Map IDs back to objects and sort by name relevance (prefix priority)
    return Array.from(resultSet)
      .map(id => this.idMap.get(id)!)
      .sort((a, b) => {
        // Simple priority: does the name start with the first word?
        const aStarts = a.nameEn.toLowerCase().startsWith(words[0]) || (a.nameAr?.startsWith(words[0]) ?? false);
        const bStarts = b.nameEn.toLowerCase().startsWith(words[0]) || (b.nameAr?.startsWith(words[0]) ?? false);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      })
      .slice(0, 50); // Limit to 50 results for UI performance
  }

  private searchByIngredient(query: string): DrugCatalogItem[] {
    if (!query) return [];
    const q = query.toLowerCase();
    return this.drugs.filter(d => 
      d.activeSubstance?.toLowerCase().includes(q)
    ).slice(0, 50);
  }

  private searchWithPriceRange(query: string): DrugCatalogItem[] {
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

    const matches = term ? this.searchByName(term) : this.drugs;
    
    return matches.filter(d => 
      d.publicPrice >= min && d.publicPrice <= max
    ).slice(0, 50);
  }

  private extractTerms(drug: DrugCatalogItem): string[] {
    const text = `${drug.nameEn} ${drug.nameAr || ''}`.toLowerCase();
    return text.split(/[\s,.-]+/).filter(w => w.length >= 2);
  }

  // Getter for all data (useful for initial lists)
  public getAll(): DrugCatalogItem[] {
    return this.drugs;
  }
}
