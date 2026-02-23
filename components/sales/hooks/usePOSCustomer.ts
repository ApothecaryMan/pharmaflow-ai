import { useState, useCallback, useEffect } from 'react';
import { useFilterDropdown } from '../../../hooks/useFilterDropdown';
import type { Customer } from '../../../types';

interface UsePOSCustomerProps {
  activeTab: any;
  activeTabId: string;
  updateTab: (id: string, updates: any) => void;
  customers: Customer[];
}

export const usePOSCustomer = ({ activeTab, activeTabId, updateTab, customers }: UsePOSCustomerProps) => {
  const customerName = activeTab?.customerName || '';
  const setCustomerName = useCallback(
    (name: string) => updateTab(activeTabId, { customerName: name }),
    [activeTabId, updateTab]
  );

  const customerCode = activeTab?.customerCode || '';
  const setCustomerCode = useCallback(
    (code: string) => updateTab(activeTabId, { customerCode: code }),
    [activeTabId, updateTab]
  );

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0);

  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [filteredByCode, setFilteredByCode] = useState<Customer[]>([]);

  const handleCustomerSelect = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerName(customer.name);
    setCustomerCode(customer.code || '');
    setShowCustomerDropdown(false);
    setShowCodeDropdown(false);
    setFilteredCustomers([]);
    setFilteredByCode([]);
  }, [setCustomerName, setCustomerCode]);

  const clearCustomerSelection = useCallback(() => {
    setSelectedCustomer(null);
    setCustomerName('');
    setCustomerCode('');
  }, [setCustomerName, setCustomerCode]);

  // Filter customers when name changes
  useEffect(() => {
    if (customerName && showCustomerDropdown && !selectedCustomer) {
      const term = customerName.toLowerCase();
      const results = customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.phone.includes(term) ||
            (c.code && c.code.toLowerCase().includes(term)) ||
            (c.serialId && c.serialId.toString().includes(term))
        )
        .slice(0, 5);
      setFilteredCustomers(results);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerName, customers, showCustomerDropdown, selectedCustomer]);

  // Sync selectedCustomer with activeTab.customerCode (for persistence)
  useEffect(() => {
    if (
      customerCode &&
      (!selectedCustomer ||
        (selectedCustomer.code !== customerCode &&
          selectedCustomer.serialId?.toString() !== customerCode))
    ) {
      const found = customers.find(
        (c) => c.code === customerCode || c.serialId?.toString() === customerCode
      );
      if (found) {
        setSelectedCustomer(found);
      }
    } else if (!customerCode && selectedCustomer) {
      setSelectedCustomer(null);
    }
  }, [customerCode, customers, selectedCustomer]);

  // Hook for Customer Search Navigation
  const customerDropdownHook = useFilterDropdown<Customer>({
    items: filteredCustomers,
    selectedItem: filteredCustomers[highlightedCustomerIndex],
    isOpen: showCustomerDropdown,
    onToggle: () => setShowCustomerDropdown((prev) => !prev),
    onSelect: (customer) => {
      const idx = filteredCustomers.indexOf(customer);
      if (idx !== -1) setHighlightedCustomerIndex(idx);
    },
    keyExtractor: (c) => c.id,
    onEnter: () => {
      if (showCustomerDropdown && filteredCustomers.length > 0) {
        handleCustomerSelect(filteredCustomers[highlightedCustomerIndex]);
      }
    },
    preventDefaultOnSpace: false,
    onEscape: () => setShowCustomerDropdown(false),
  });

  return {
    customerName,
    setCustomerName,
    customerCode,
    setCustomerCode,
    selectedCustomer,
    setSelectedCustomer,
    showCustomerDropdown,
    setShowCustomerDropdown,
    filteredCustomers,
    setFilteredCustomers,
    highlightedCustomerIndex,
    setHighlightedCustomerIndex,
    showCodeDropdown,
    setShowCodeDropdown,
    filteredByCode,
    setFilteredByCode,
    handleCustomerSelect,
    clearCustomerSelection,
    customerDropdownHook,
  };
};
