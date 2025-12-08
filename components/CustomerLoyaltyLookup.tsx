import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Customer, Sale } from '../types';
import { useSmartDirection } from '../hooks/useSmartDirection';
import { SearchInput } from '../utils/SearchInput';

interface CustomerLoyaltyLookupProps {
  customers: Customer[];
  sales: Sale[];
  color: string;
  t: any;
  language: 'EN' | 'AR';
}

export const CustomerLoyaltyLookup: React.FC<CustomerLoyaltyLookupProps> = ({
  customers,
  sales,
  color,
  t,
  language
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return [];
    const term = searchTerm.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(term) || 
      (c.code && c.code.toLowerCase().includes(term)) ||
      (c.serialId && c.serialId.toString().includes(term)) ||
      (c.phone && c.phone.includes(term))
    ).slice(0, 10); // Limit results
  }, [customers, searchTerm]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchTerm('');
    setShowDropdown(false);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedCustomer(null);
  };

  // Get customer's sales history with points breakdown
  const customerSales = useMemo(() => {
    if (!selectedCustomer) return [];
    
    const customerSalesData = sales.filter(s => 
      (s.customerCode && (s.customerCode === selectedCustomer.code || 
       s.customerCode === selectedCustomer.serialId?.toString())) ||
      (!s.customerCode && s.customerName === selectedCustomer.name)
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Calculate points for each sale
    return customerSalesData.map((sale, index) => {
      // Order-level points
      let totalRate = 0;
      if (sale.total > 20000) totalRate = 0.05;
      else if (sale.total > 10000) totalRate = 0.04;
      else if (sale.total > 5000) totalRate = 0.03;
      else if (sale.total > 1000) totalRate = 0.02;
      else if (sale.total > 100) totalRate = 0.01;
      
      const orderPoints = sale.total * totalRate;
      
      // Item-level points
      let itemPoints = 0;
      sale.items.forEach(item => {
        let itemRate = 0;
        let price = item.price;
        if (item.isUnit && item.unitsPerPack) {
          price = item.price / item.unitsPerPack;
        }
        
        if (price > 20000) itemRate = 0.15;
        else if (price > 10000) itemRate = 0.12;
        else if (price > 5000) itemRate = 0.10;
        else if (price > 1000) itemRate = 0.05;
        else if (price > 500) itemRate = 0.03;
        else if (price > 100) itemRate = 0.02;

        if (itemRate > 0) {
          itemPoints += price * item.quantity * itemRate;
        }
      });

      const totalPoints = parseFloat((orderPoints + itemPoints).toFixed(1));
      
      // Calculate running balance (sum of all points up to this sale)
      const previousSales = customerSalesData.slice(index + 1);
      const previousPoints = previousSales.reduce((sum, s) => {
        let tRate = 0;
        if (s.total > 20000) tRate = 0.05;
        else if (s.total > 10000) tRate = 0.04;
        else if (s.total > 5000) tRate = 0.03;
        else if (s.total > 1000) tRate = 0.02;
        else if (s.total > 100) tRate = 0.01;
        
        const oPoints = s.total * tRate;
        let iPoints = 0;
        s.items.forEach(item => {
          let iRate = 0;
          let p = item.price;
          if (item.isUnit && item.unitsPerPack) p = item.price / item.unitsPerPack;
          if (p > 20000) iRate = 0.15;
          else if (p > 10000) iRate = 0.12;
          else if (p > 5000) iRate = 0.10;
          else if (p > 1000) iRate = 0.05;
          else if (p > 500) iRate = 0.03;
          else if (p > 100) iRate = 0.02;
          if (iRate > 0) iPoints += p * item.quantity * iRate;
        });
        return sum + parseFloat((oPoints + iPoints).toFixed(1));
      }, 0);

      return {
        ...sale,
        orderPoints: parseFloat(orderPoints.toFixed(1)),
        itemPoints: parseFloat(itemPoints.toFixed(1)),
        totalPoints,
        runningBalance: parseFloat((previousPoints + totalPoints).toFixed(1))
      };
    });
  }, [selectedCustomer, sales]);

  const getTierInfo = (points: number) => {
    if (points > 2000) return { 
      tier: 'Platinum', 
      color: 'text-purple-600 dark:text-purple-400', 
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      border: 'border-purple-200 dark:border-purple-800',
      icon: 'workspace_premium'
    };
    if (points > 1000) return { 
      tier: 'Gold', 
      color: 'text-yellow-600 dark:text-yellow-400', 
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: 'military_tech'
    };
    if (points > 500) return { 
      tier: 'Silver', 
      color: 'text-gray-500 dark:text-gray-400', 
      bg: 'bg-gray-100 dark:bg-gray-800',
      border: 'border-gray-200 dark:border-gray-700',
      icon: 'shield'
    };
    return { 
      tier: 'Bronze', 
      color: 'text-orange-600 dark:text-orange-400', 
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      border: 'border-orange-200 dark:border-orange-800',
      icon: 'badge'
    };
  };

  const tierInfo = selectedCustomer ? getTierInfo(selectedCustomer.points || 0) : null;
  const isRTL = language === 'AR';

  return (
    <div className="h-full overflow-y-auto pe-2 space-y-4 animate-fade-in pb-10" dir={isRTL ? 'rtl' : 'ltr'}>
      <h2 className="text-2xl font-medium tracking-tight mb-4 flex items-center gap-2">
        <span className="material-symbols-rounded text-blue-500">person_search</span>
        {t.loyalty?.lookup || 'Customer Loyalty Lookup'}
      </h2>

      {/* Search Section */}
      <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm relative z-20">
        <div className="relative" ref={dropdownRef}>
          <SearchInput
            value={searchTerm}
            onSearchChange={(val) => {
              setSearchTerm(val);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder={t.loyalty?.searchPlaceholder || 'Search by name, code, or phone...'}
            className="ps-10 pe-4 py-3 border-gray-200 dark:border-gray-800"
            style={{ '--tw-ring-color': 'var(--primary-500)' } as any}
          />
            
            {/* Autocomplete Dropdown */}
            {showDropdown && searchTerm && filteredCustomers.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto z-50">
                {filteredCustomers.map(customer => (
                  <button
                    key={customer.id}
                    onClick={() => handleCustomerSelect(customer)}
                    className="w-full text-left rtl:text-right px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 flex items-center justify-between group transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-0"
                  >
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200 text-sm">{customer.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{customer.phone}</p>
                    </div>
                    <div className="text-right rtl:text-left">
                      <span className="text-xs font-mono bg-gray-100 dark:bg-gray-900 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-400 block mb-1">
                        {customer.code || customer.serialId}
                      </span>
                      {customer.points && customer.points > 0 && (
                        <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center justify-end rtl:justify-start gap-0.5">
                          <span className="material-symbols-rounded text-[12px]">stars</span>
                          {customer.points.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedCustomer && (
            <button
              onClick={handleClear}
              className="px-6 py-3 rounded-xl font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
            >
              {t.clear || 'Clear'}
            </button>
          )}
        </div>

      {/* Results */}
      {selectedCustomer === null && searchTerm && !showDropdown && (
        <div className="p-8 rounded-3xl bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 text-center">
          <span className="material-symbols-rounded text-5xl text-gray-300 dark:text-gray-600 mb-2">person_search</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
            {t.loyalty?.startSearch || 'Search for a customer to view loyalty details'}
          </p>
        </div>
      )}

      {selectedCustomer && (
        <>
          {/* Customer Profile Card */}
          <div className={`p-6 rounded-3xl border ${tierInfo?.bg} ${tierInfo?.border} bg-white dark:bg-gray-900`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600 dark:text-${color}-300 flex items-center justify-center font-bold text-2xl`}>
                  {selectedCustomer.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                      {selectedCustomer.code || selectedCustomer.serialId}
                    </span>
                    <span className={`text-xs font-medium px-2 py-1 rounded ${selectedCustomer.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {selectedCustomer.status}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Tier Badge */}
              <div className={`flex flex-col items-center p-4 rounded-2xl ${tierInfo?.bg} ${tierInfo?.border} border-2 bg-white/50 dark:bg-gray-900/50`}>
                <span className={`material-symbols-rounded text-5xl ${tierInfo?.color}`}>{tierInfo?.icon}</span>
                <p className={`text-lg font-bold ${tierInfo?.color} mt-1`}>{tierInfo?.tier}</p>
              </div>
            </div>

            {/* Points Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t.loyalty?.currentPoints || 'Current Points'}</p>
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{(selectedCustomer.points || 0).toFixed(1)}</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t.loyalty?.totalPurchases || 'Total Purchases'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">${selectedCustomer.totalPurchases.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t.loyalty?.totalOrders || 'Total Orders'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{customerSales.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">{t.loyalty?.avgOrder || 'Avg Order'}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  ${customerSales.length > 0 ? (selectedCustomer.totalPurchases / customerSales.length).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>
          </div>

          {/* Points History */}
          <div className="p-5 rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
              <span className="material-symbols-rounded text-blue-500">receipt_long</span>
              {t.loyalty?.pointsHistory || 'Points History'}
            </h3>
            
            {customerSales.length === 0 ? (
              <div className="py-12 text-center text-gray-400">
                {t.loyalty?.noHistory || 'No purchase history'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className={`bg-${color}-50 dark:bg-${color}-900/20 text-${color}-900 dark:text-${color}-100 text-xs font-bold uppercase`}>
                    <tr>
                      <th className={`px-3 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t.date || 'Date'}</th>
                      <th className={`px-3 py-3 ${isRTL ? 'text-right' : 'text-left'}`}>{t.orderId || 'Order ID'}</th>
                      <th className={`px-3 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{t.orderTotal || 'Order Total'}</th>
                      <th className={`px-3 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{t.loyalty?.orderPoints || 'Order Pts'}</th>
                      <th className={`px-3 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{t.loyalty?.itemPoints || 'Item Pts'}</th>
                      <th className={`px-3 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{t.loyalty?.totalEarned || 'Total Earned'}</th>
                      <th className={`px-3 py-3 ${isRTL ? 'text-left' : 'text-right'}`}>{t.loyalty?.balance || 'Balance'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {customerSales.map((sale) => (
                      <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                          {new Date(sale.date).toLocaleDateString()}
                        </td>
                        <td className="px-3 py-3 text-sm font-mono text-gray-500">#{sale.id}</td>
                        <td className={`px-3 py-3 text-sm font-medium text-gray-900 dark:text-gray-100 ${isRTL ? 'text-left' : 'text-right'}`}>
                          ${sale.total.toFixed(2)}
                        </td>
                        <td className={`px-3 py-3 text-sm text-blue-600 dark:text-blue-400 ${isRTL ? 'text-left' : 'text-right'}`}>
                          {sale.orderPoints.toFixed(1)}
                        </td>
                        <td className={`px-3 py-3 text-sm text-purple-600 dark:text-purple-400 ${isRTL ? 'text-left' : 'text-right'}`}>
                          {sale.itemPoints.toFixed(1)}
                        </td>
                        <td className={`px-3 py-3 text-sm font-bold text-amber-600 dark:text-amber-400 ${isRTL ? 'text-left' : 'text-right'}`}>
                          +{sale.totalPoints.toFixed(1)}
                        </td>
                        <td className={`px-3 py-3 text-sm font-bold text-gray-900 dark:text-gray-100 ${isRTL ? 'text-left' : 'text-right'}`}>
                          {sale.runningBalance.toFixed(1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
