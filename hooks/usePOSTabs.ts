import { useState, useEffect, useCallback } from 'react';
import { SaleTab, CartItem } from '../types';

const MAX_TABS = 10;
const STORAGE_KEY = 'pharma_pos_tabs';

// Create new tab helper function (defined before use)
const createNewTab = (index: number): SaleTab => ({
  id: `tab-${Date.now()}-${Math.random()}`,
  name: `Tab ${index}`,
  cart: [],
  customerName: '',
  customerCode: '',
  discount: 0,
  searchQuery: '',
  createdAt: Date.now()
});

export const usePOSTabs = () => {
  const [tabs, setTabs] = useState<SaleTab[]>(() => {
    // Load from localStorage
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.length > 0 ? parsed : [createNewTab(1)];
        } catch {
          return [createNewTab(1)];
        }
      }
    }
    return [createNewTab(1)];
  });

  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0]?.id || '');

  // Save to localStorage whenever tabs change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tabs));
    }
  }, [tabs]);

  // Add new tab
  const addTab = useCallback(() => {
    if (tabs.length >= MAX_TABS) {
      alert(`Maximum ${MAX_TABS} tabs allowed`);
      return;
    }
    const newTab = createNewTab(tabs.length + 1);
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  }, [tabs.length]);

  // Remove tab
  // Remove tab
  const removeTab = useCallback((tabId: string) => {
    // We use current tabs state directly to calculate next state
    // preventing side effects inside the setter
    const newTabs = tabs.filter(t => t.id !== tabId);
    
    // If no tabs left, create a new one
    if (newTabs.length === 0) {
      const newTab = createNewTab(1);
      setTabs([newTab]);
      setActiveTabId(newTab.id);
      return;
    }

    setTabs(newTabs);

    // If active tab was removed, switch to first tab
    // We check against the current activeTabId
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  }, [tabs, activeTabId]);

  // Switch tab
  const switchTab = useCallback((tabId: string) => {
    setActiveTabId(tabId);
  }, []);

  // Update tab
  const updateTab = useCallback((tabId: string, updates: Partial<SaleTab>) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, ...updates } : tab
    ));
  }, []);

  // Rename tab
  const renameTab = useCallback((tabId: string, newName: string) => {
    updateTab(tabId, { name: newName });
  }, [updateTab]);

  // Reorder tabs
  const reorderTabs = useCallback((newOrder: SaleTab[]) => {
    setTabs(newOrder);
  }, []);

  // Toggle pin
  const togglePin = useCallback((tabId: string) => {
    setTabs(prev => {
      // 1. Toggle pin state
      const updated = prev.map(tab => 
        tab.id === tabId ? { ...tab, isPinned: !tab.isPinned } : tab
      );
      
      // 2. Sort: Pinned first, then Unpinned
      // Maintaining relative order within groups
      // Except newly pinned entries should theoretically settle at the end of pinned group
      // But a simple stable sort based on isPinned is usually sufficient if we want them at the end of the group?
      // JS sort is stable in modern browsers.
      // false < true ? No, we want Pinned (true) first.
      
      // Separate groups to be explicit
      const pinned = updated.filter(t => t.isPinned);
      const unpinned = updated.filter(t => !t.isPinned);
      
      // If we want the newly pinned item to be *last* in the pinned list, 
      // strict separation preserves the original relative order (which puts it at the end of pinned if it was after the others).
      // Wait, if I pin the *last* tab, it becomes the last pinned tab.
      // If I pin the *first* unpinned tab, it becomes the last pinned tab.
      // This is exactly "after other pined".
      
      return [...pinned, ...unpinned];
    });
  }, []);

  // Get active tab
  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

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
    maxTabs: MAX_TABS
  };
};
