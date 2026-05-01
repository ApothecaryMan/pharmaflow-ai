import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { DrugSearchEngine } from '../services/search/DrugSearchEngine';
import { 
  openCatalogDB, 
  loadCatalogFromDB, 
  saveCatalogToDB, 
  getLastSyncTime,
  type DrugCatalogItem 
} from '../services/search/catalogCache';
import { CSV_INVENTORY } from '../data/sample-inventory';

interface CatalogContextType {
  engine: DrugSearchEngine | null;
  isLoading: boolean;
  lastSync: string | null;
  totalItems: number;
  syncWithSource: () => Promise<void>;
}

const CatalogContext = createContext<CatalogContextType | undefined>(undefined);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [engine] = useState(() => new DrugSearchEngine());
  const [isLoading, setIsLoading] = useState(true);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [totalItems, setTotalItems] = useState(0);

  // Initialize Engine and Load Cache
  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const db = await openCatalogDB();
        
        // 1. Load from IndexedDB
        const cachedDrugs = await loadCatalogFromDB(db);
        const syncTime = await getLastSyncTime(db);
        
        if (cachedDrugs.length > 0) {
          engine.indexData(cachedDrugs);
          setTotalItems(cachedDrugs.length);
          setLastSync(syncTime);
          console.log(`[CatalogContext] Loaded ${cachedDrugs.length} items from IndexedDB.`);
        } else {
          // 2. Fallback to Sample Data if Cache is empty
          console.log('[CatalogContext] Cache empty. Loading from sample data...');
          const sampleData: DrugCatalogItem[] = CSV_INVENTORY.map(item => ({
            id: item.id,
            name: item.name,
            nameAr: (item as any).nameArabic || item.nameAr,
            barcode: item.barcode,
            publicPrice: item.publicPrice,
            category: item.category,
            activeSubstance: item.genericName?.join(', '),
            genericName: item.genericName,
            updatedAt: new Date().toISOString()
          }));
          
          await saveCatalogToDB(db, sampleData);
          engine.indexData(sampleData);
          setTotalItems(sampleData.length);
          setLastSync(new Date().toISOString());
        }
      } catch (error) {
        console.error('[CatalogContext] Initialization failed:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [engine]);

  const syncWithSource = async () => {
    // This will eventually call Supabase
    // For now, it just re-syncs with Sample Data to show the pattern
    setIsLoading(true);
    try {
      const db = await openCatalogDB();
      const sampleData: DrugCatalogItem[] = CSV_INVENTORY.map(item => ({
        id: item.id,
        name: item.name,
        nameAr: item.nameAr,
        barcode: item.barcode,
        publicPrice: item.publicPrice,
        category: item.category,
        activeSubstance: item.genericName?.join(', '),
        genericName: item.genericName,
        updatedAt: new Date().toISOString()
      }));
      
      await saveCatalogToDB(db, sampleData);
      engine.indexData(sampleData);
      setTotalItems(sampleData.length);
      setLastSync(new Date().toISOString());
    } finally {
      setIsLoading(false);
    }
  };

  const value = useMemo(() => ({
    engine,
    isLoading,
    lastSync,
    totalItems,
    syncWithSource
  }), [engine, isLoading, lastSync, totalItems]);

  return (
    <CatalogContext.Provider value={value}>
      {children}
    </CatalogContext.Provider>
  );
};

export const useCatalog = () => {
  const context = useContext(CatalogContext);
  if (context === undefined) {
    throw new Error('useCatalog must be used within a CatalogProvider');
  }
  return context;
};
