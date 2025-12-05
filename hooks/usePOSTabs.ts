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
  const removeTab = useCallback((tabId: string) => {
    setTabs(prev => {
      const tabToRemove = prev.find(t => t.id === tabId);
      
      // Warn if tab has items - REMOVED per user request
      /* if (tabToRemove && tabToRemove.cart.length > 0) {
        if (!window.confirm('This tab has items. Are you sure you want to close it?')) {
          return prev;
        }
      } */

      const newTabs = prev.filter(t => t.id !== tabId);
      
      // If no tabs left, create a new one
      if (newTabs.length === 0) {
        const newTab = createNewTab(1);
        setActiveTabId(newTab.id);
        return [newTab];
      }

      // If active tab was removed, switch to first tab
      if (activeTabId === tabId) {
        setActiveTabId(newTabs[0].id);
      }

      return newTabs;
    });
  }, [activeTabId]);

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

  // Toggle pin
  const togglePin = useCallback((tabId: string) => {
    setTabs(prev => prev.map(tab => 
      tab.id === tabId ? { ...tab, isPinned: !tab.isPinned } : tab
    ));
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
    togglePin,
    maxTabs: MAX_TABS
  };
};
