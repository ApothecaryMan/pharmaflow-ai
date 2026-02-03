import { useCallback, useEffect, useState } from 'react';
import { StorageKeys } from '../config/storageKeys';
import { CartItem, type SaleTab } from '../types';
import { storage } from '../utils/storage';

const MAX_TABS = 10;

import { idGenerator } from '../utils/idGenerator';

// ...

// Create new tab helper function (defined before use)
const createNewTab = (index: number): SaleTab => ({
  id: idGenerator.generate('tabs'),
  name: `Tab ${index}`,
  cart: [],
  customerName: '',
  customerCode: '',
  discount: 0,
  searchQuery: '',
  createdAt: Date.now(),
});

export const usePOSTabs = () => {
  const [tabs, setTabs] = useState<SaleTab[]>(() => {
    // Load from storage
    const saved = storage.get<SaleTab[]>(StorageKeys.POS_TABS, []);
    return saved.length > 0 ? saved : [createNewTab(1)];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const savedId = storage.get<string>(StorageKeys.POS_ACTIVE_TAB_ID, '');
    if (savedId && tabs.some((t) => t.id === savedId)) return savedId;
    return tabs[0]?.id || '';
  });

  // Save to storage whenever tabs change
  useEffect(() => {
    storage.set(StorageKeys.POS_TABS, tabs);
  }, [tabs]);

  // Save active tab ID whenever it changes
  useEffect(() => {
    storage.set(StorageKeys.POS_ACTIVE_TAB_ID, activeTabId);
  }, [activeTabId]);

  // Add new tab
  const addTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) {
      alert(`Maximum ${MAX_TABS} tabs allowed`);
      return;
    }
    const newTab = createNewTab(tabs.length + 1);
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length]);

  // Remove tab
  // Remove tab
  const removeTab = useCallback(
    (tabId: string) => {
      // We use current tabs state directly to calculate next state
      // preventing side effects inside the setter
      const newTabs = tabs.filter((t) => t.id !== tabId);

      // If no tabs left, create a new one
      if (newTabs.length === 0) {
        const newTab = createNewTab(1);
        setTabs([newTab]);
        setActiveTabId(newTab.id);
        return;
      }

      setTabs(newTabs);

      // If active tab was removed, switch to previous tab
      // We check against the current activeTabId
      if (activeTabId === tabId) {
        const removedIndex = tabs.findIndex((t) => t.id === tabId);
        // If we are closing the first tab (index 0), we go to the new first (which was second) -> index 0
        // If we are closing any other tab (index > 0), we go to the previous one -> index - 1
        const newActiveIndex = Math.max(0, removedIndex - 1);
        // Ensure index is within bounds of newTabs
        const safeIndex = Math.min(newActiveIndex, newTabs.length - 1);
        setActiveTabId(newTabs[safeIndex].id);
      }
    },
    [tabs, activeTabId]
  );

  // Switch tab
  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  // Update tab
  const updateTab = useCallback(
    (tabId: string, updates: Partial<SaleTab> | ((prev: SaleTab) => Partial<SaleTab>)) => {
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

  // Rename tab
  const renameTab = useCallback(
    (tabId: string, newName: string) => {
      updateTab(tabId, { name: newName });
    },
    [updateTab]
  );

  // Reorder tabs
  const reorderTabs = useCallback((newOrder: SaleTab[]) => {
    setTabs(newOrder);
  }, []);

  // Toggle pin
  const togglePin = useCallback((tabId: string) => {
    setTabs((prev) => {
      // 1. Toggle pin state
      const updated = prev.map((tab) =>
        tab.id === tabId ? { ...tab, isPinned: !tab.isPinned } : tab
      );

      // 2. Sort: Pinned first, then Unpinned
      // Maintaining relative order within groups
      // Except newly pinned entries should theoretically settle at the end of pinned group
      // But a simple stable sort based on isPinned is usually sufficient if we want them at the end of the group?
      // JS sort is stable in modern browsers.
      // false < true ? No, we want Pinned (true) first.

      // Separate groups to be explicit
      const pinned = updated.filter((t) => t.isPinned);
      const unpinned = updated.filter((t) => !t.isPinned);

      // If we want the newly pinned item to be *last* in the pinned list,
      // strict separation preserves the original relative order (which puts it at the end of pinned if it was after the others).
      // Wait, if I pin the *last* tab, it becomes the last pinned tab.
      // If I pin the *first* unpinned tab, it becomes the last pinned tab.
      // This is exactly "after other pined".

      return [...pinned, ...unpinned];
    });
  }, []);

  // Get active tab
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
    reorderTabs,
    togglePin,
    maxTabs: MAX_TABS,
  };
};
