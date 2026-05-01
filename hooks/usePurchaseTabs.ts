import { useCallback, useEffect, useState } from 'react';
import { StorageKeys } from '../config/storageKeys';
import { PurchaseItem, PurchaseTab } from '../types';
import { storage } from '../utils/storage';
import { idGenerator } from '../utils/idGenerator';

const MAX_TABS = 10;

const createNewTab = (index: number): PurchaseTab => ({
  id: idGenerator.generateSync('tabs'),
  name: `Inv ${index}`,
  cart: [],
  supplierId: '',
  externalInvoiceId: '',
  taxMode: 'exclusive',
  paymentMethod: 'cash',
  createdAt: Date.now(),
});

export const usePurchaseTabs = (activeBranchId: string) => {
  const tabsKey = `${StorageKeys.PURCHASE_TABS}_${activeBranchId}`;
  const activeTabKey = `${StorageKeys.PURCHASE_ACTIVE_TAB_ID}_${activeBranchId}`;
  const closedTabsKey = `${StorageKeys.PURCHASE_CLOSED_TABS}_${activeBranchId}`;

  const [tabs, setTabs] = useState<PurchaseTab[]>(() => {
    const saved = storage.get<PurchaseTab[]>(tabsKey, []);
    return saved.length > 0 ? saved : [createNewTab(1)];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedId = storage.get<string>(activeTabKey, '');
    if (savedId && tabs.some((t) => t.id === savedId)) return savedId;
    return tabs[0]?.id || '';
  });

  const [closedTabs, setClosedTabs] = useState<PurchaseTab[]>(() => {
    return storage.get<PurchaseTab[]>(closedTabsKey, []);
  });

  useEffect(() => {
    // 1. Check for legacy data (Migration)
    const legacyItemsKey = `purchases_cart_${activeBranchId}_items`;
    const legacySupplierKey = `purchases_cart_${activeBranchId}_supplier`;
    const legacyItems = storage.get<PurchaseItem[]>(legacyItemsKey, []);
    
    let currentTabs = storage.get<PurchaseTab[]>(tabsKey, []);

    // 2. If legacy data exists and we don't have real tabs yet
    if (legacyItems.length > 0 && currentTabs.length <= 1 && (currentTabs[0]?.cart.length === 0)) {
      const legacySupplier = storage.get<string>(legacySupplierKey, '');
      
      const migratedTab: PurchaseTab = {
        ...createNewTab(1),
        cart: legacyItems,
        supplierId: legacySupplier,
        name: 'Migrated Inv',
      };

      currentTabs = [migratedTab];
      setTabs(currentTabs);
      setActiveTabId(migratedTab.id);

      // 3. Clean up legacy keys
      storage.remove(legacyItemsKey);
      storage.remove(legacySupplierKey);
      localStorage.removeItem(`purchases_cart_${activeBranchId}_selected`);
      console.log('Successfully migrated legacy purchase data to new Tab system');
    } else {
      const savedTabs = storage.get<PurchaseTab[]>(tabsKey, []);
      const newTabs = savedTabs.length > 0 ? savedTabs : [createNewTab(1)];
      setTabs(newTabs);

      const savedId = storage.get<string>(activeTabKey, '');
      if (savedId && newTabs.some((t) => t.id === savedId)) {
        setActiveTabId(savedId);
      } else {
        setActiveTabId(newTabs[0]?.id || '');
      }
    }

    setClosedTabs(storage.get<PurchaseTab[]>(closedTabsKey, []));
  }, [tabsKey, activeTabKey, closedTabsKey, activeBranchId]);

  // --- Cross-Tab Synchronization ---
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === tabsKey && e.newValue) {
        setTabs(JSON.parse(e.newValue));
      }
      if (e.key === activeTabKey && e.newValue) {
        // Only update if it's a valid ID (not empty string from a remove operation)
        const newId = JSON.parse(e.newValue);
        if (newId) setActiveTabId(newId);
      }
      if (e.key === closedTabsKey && e.newValue) {
        setClosedTabs(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [tabsKey, activeTabKey, closedTabsKey]);

  useEffect(() => {
    storage.set(tabsKey, tabs);
  }, [tabs, tabsKey]);

  useEffect(() => {
    storage.set(activeTabKey, activeTabId);
  }, [activeTabId, activeTabKey]);

  useEffect(() => {
    storage.set(closedTabsKey, closedTabs);
  }, [closedTabs, closedTabsKey]);

  const addTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) return;
    const newTab = createNewTab(tabs.length + 1);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length]);

  const removeTab = useCallback(
    (tabId: string) => {
      const tabToRemove = tabs.find((t) => t.id === tabId);
      if (tabToRemove && tabToRemove.cart.length > 0) {
        setClosedTabs((prev) => {
          const filtered = prev.filter(t => t.id !== tabId);
          return [{ ...tabToRemove, closedAt: Date.now() }, ...filtered].slice(0, 10);
        });
      }

      const newTabs = tabs.filter((t) => t.id !== tabId);
      if (newTabs.length === 0) {
        const newTab = createNewTab(1);
        setTabs([newTab]);
        setActiveTabId(newTab.id);
        return;
      }

      setTabs(newTabs);
      if (activeTabId === tabId) {
        const removedIndex = tabs.findIndex((t) => t.id === tabId);
        const newActiveIndex = Math.max(0, removedIndex - 1);
        setActiveTabId(newTabs[Math.min(newActiveIndex, newTabs.length - 1)].id);
      }
    },
    [tabs, activeTabId]
  );

  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  const updateTab = useCallback(
    (tabId: string, updates: Partial<PurchaseTab> | ((prev: PurchaseTab) => Partial<PurchaseTab>)) => {
      setTabs((prev) =>
        prev.map((tab) =>
          tab.id === tabId
            ? { ...tab, ...(typeof updates === 'function' ? updates(tab) : updates) }
            : tab
        )
      );
    },
    []
  );

  const renameTab = useCallback(
    (tabId: string, newName: string) => {
      updateTab(tabId, { name: newName });
    },
    [updateTab]
  );

  const togglePin = useCallback((tabId: string) => {
    setTabs((prev) => {
      const updated = prev.map((tab) =>
        tab.id === tabId ? { ...tab, isPinned: !tab.isPinned } : tab
      );
      const pinned = updated.filter((t) => t.isPinned);
      const unpinned = updated.filter((t) => !t.isPinned);
      return [...pinned, ...unpinned];
    });
  }, []);

  const restoreTab = useCallback(
    (tabId: string) => {
      if (tabs.length >= MAX_TABS) return;
      const tabToRestore = closedTabs.find((t) => t.id === tabId);
      if (!tabToRestore) return;
      setClosedTabs((prev) => prev.filter((t) => t.id !== tabId));
      setTabs((prev) => [...prev, tabToRestore]);
      setActiveTabId(tabToRestore.id);
    },
    [tabs.length, closedTabs]
  );

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  return {
    tabs,
    activeTab,
    activeTabId,
    addTab,
    removeTab,
    switchTab,
    updateTab,
    renameTab,
    togglePin,
    restoreTab,
    reorderTabs: (newOrder: PurchaseTab[]) => setTabs(newOrder),
    closedTabs,
    maxTabs: MAX_TABS,
  };
};
