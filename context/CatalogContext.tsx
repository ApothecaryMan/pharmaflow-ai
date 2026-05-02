import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { DrugSearchEngine } from '../services/search/drugSearchEngine';
import { 
  openCatalogDB, 
  loadCatalogFromDB, 
  saveCatalogToDB, 
  getLastSyncTime,
  type DrugCatalogItem 
} from '../services/search/catalogCache';
import { supabase } from '../lib/supabase';

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
          
          // Background sync if it's been a while (optional)
          syncWithSource();
        } else {
          // 2. First-time sync from Supabase
          await syncWithSource();
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
    try {
      const db = await openCatalogDB();
      const lastTime = await getLastSyncTime(db);
      
      console.log(`[CatalogContext] Syncing with Supabase (last sync: ${lastTime || 'never'})...`);
      
      let query = supabase.from('global_drugs').select('*');
      
      // Delta Sync Logic
      if (lastTime) {
        query = query.gt('updated_at', lastTime);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[CatalogContext] Sync failed:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const mappedData: DrugCatalogItem[] = data.map(item => ({
          id: item.id,
          name: item.name_en,
          nameAr: item.name_ar || '',
          barcode: item.barcode || '',
          publicPrice: Number(item.public_price),
          category: item.category || '',
          activeSubstance: item.active_substance || '',
          genericName: item.active_substance ? item.active_substance.split(',').map(s => s.trim()) : [],
          updatedAt: item.updated_at
        }));

        await saveCatalogToDB(db, mappedData);
        
        // Reload EVERYTHING from local DB to ensure engine has the full set
        const allItems = await loadCatalogFromDB(db);
        engine.indexData(allItems);
        setTotalItems(allItems.length);
        
        setLastSync(new Date().toISOString());
        console.log(`[CatalogContext] Sync complete. ${data.length} new items added. Total: ${allItems.length}`);
      } else {
        console.log('[CatalogContext] Catalog is already up to date.');
        const allItems = await loadCatalogFromDB(db);
        if (totalItems !== allItems.length) {
          engine.indexData(allItems);
          setTotalItems(allItems.length);
        }
      }
    } catch (err) {
      console.error('[CatalogContext] Sync error:', err);
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
