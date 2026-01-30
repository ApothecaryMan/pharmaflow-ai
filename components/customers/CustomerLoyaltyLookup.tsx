import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Customer, Sale } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { useSmartDirection } from '../common/SmartInputs';
import { SearchInput } from '../common/SearchInput';
import { TanStackTable, PriceDisplay } from '../common/TanStackTable';
import { ColumnDef } from '@tanstack/react-table';
import { SmallCard } from '../common/SmallCard';
import { SearchDropdown, SearchDropdownColumn } from '../common/SearchDropdown';

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
  // Helper to calculate points for a single sale based on business rules
  const calculateSalePoints = (sale: Sale) => {
    let totalRate = 0;
    if (sale.total > 20000) totalRate = 0.05;
    else if (sale.total > 10000) totalRate = 0.04;
    else if (sale.total > 5000) totalRate = 0.03;
    else if (sale.total > 1000) totalRate = 0.02;
    else if (sale.total > 100) totalRate = 0.01;
    
    const orderPoints = sale.total * totalRate;
    
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

    return {
      orderPoints: parseFloat(orderPoints.toFixed(1)),
      itemPoints: parseFloat(itemPoints.toFixed(1)),
      totalEarned: parseFloat((orderPoints + itemPoints).toFixed(1))
    };
  };

  const customerSales = useMemo(() => {
    if (!selectedCustomer) return [];
    
    const filteredSales = sales.filter(s => 
      (s.customerCode && (s.customerCode === selectedCustomer.code || 
       s.customerCode === selectedCustomer.serialId?.toString())) ||
      (!s.customerCode && s.customerName === selectedCustomer.name)
    );

    // Sort sales by date ascending to calculate running balance correctly
    const sortedSales = [...filteredSales]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const enrichedSales = sortedSales.map(sale => {
      const points = calculateSalePoints(sale);
      runningBalance = parseFloat((runningBalance + points.totalEarned).toFixed(1));
      
      return {
        ...sale,
        ...points,
        totalPoints: points.totalEarned,
        runningBalance
      };
    });

    // Return reversed for the table (most recent first)
    return enrichedSales.reverse();
  }, [selectedCustomer, sales]);

  // Derived totals for cards to ensure data consistency
  const derivedTotals = useMemo(() => {
    return {
      totalPoints: customerSales.length > 0 ? customerSales[0].runningBalance : 0,
      totalPurchases: customerSales.reduce((sum, s) => sum + s.total, 0),
      totalOrders: customerSales.length
    };
  }, [selectedCustomer, sales]);

  const columns = useMemo<ColumnDef<any>[]>(() => [
    {
      accessorKey: 'date',
      header: t.date || 'Date',
      cell: info => info.getValue() as string, // Let TanStackTable handle smart formatting
      meta: { align: 'start' }
    },
    {
      accessorKey: 'id',
      header: t.orderId || 'Order ID',
      cell: info => <span className="font-mono text-gray-500">#{info.getValue() as string}</span>,
      meta: { align: 'start' }
    },
    {
      accessorKey: 'total',
      header: t.orderTotal || 'Order Total',
      cell: info => <PriceDisplay value={info.getValue() as number} />,
      meta: { align: 'start' }
    },
    {
      accessorKey: 'orderPoints',
      header: t.loyalty?.orderPoints || 'Order',
      cell: info => (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/30 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-transparent">
          <span className="material-symbols-rounded text-sm">stars</span>
          {(info.getValue() as number).toFixed(1)}
        </span>
      ),
      meta: { align: 'center' }
    },
    {
      accessorKey: 'itemPoints',
      header: t.loyalty?.itemPoints || 'Item',
      cell: info => (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-purple-100 dark:border-purple-900/30 text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 bg-transparent">
          <span className="material-symbols-rounded text-sm">stars</span>
          {(info.getValue() as number).toFixed(1)}
        </span>
      ),
      meta: { align: 'center' }
    },
    {
      accessorKey: 'totalPoints',
      header: t.loyalty?.totalEarned || 'Total Earned',
      cell: info => (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-amber-100 dark:border-amber-900/30 text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-transparent">
          <span className="material-symbols-rounded text-sm">stars</span>
          +{(info.getValue() as number).toFixed(1)}
        </span>
      ),
      meta: { align: 'center' }
    },
    {
      accessorKey: 'runningBalance',
      header: t.loyalty?.balance || 'Balance',
      cell: info => (
        <span className="font-bold text-gray-900 dark:text-gray-100">
          {(info.getValue() as number).toFixed(1)}
          <span className="ms-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest text-gray-400">pts</span>
        </span>
      ),
      meta: { align: 'start' }
    }
  ], [t, color]);

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

  // Columns for the SearchDropdown
  const dropdownColumns: SearchDropdownColumn<Customer>[] = [
    {
      header: t.customers?.code || 'Code',
      width: 'w-24',
      className: 'justify-center',
      render: (customer) => (
        <span className="font-bold text-gray-500 font-mono tracking-tight">
          {customer.code || customer.serialId}
        </span>
      )
    },
    {
      header: t.customers?.name || 'Customer',
      render: (customer) => (
        <div className="flex flex-col">
          <span className="font-bold text-gray-800 dark:text-gray-200">{customer.name}</span>
          <span className="text-[10px] opacity-60 font-medium">{customer.phone}</span>
        </div>
      )
    }
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden animate-fade-in" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 flex-shrink-0 pe-2">
        <h2 className="text-2xl font-medium tracking-tight flex items-center gap-2">
          <span className="material-symbols-rounded text-gray-900 dark:text-gray-100">person_search</span>
          {t.loyalty?.lookup || 'Customer Loyalty Lookup'}
        </h2>

        {/* Search Section */}
        <div className="flex items-center gap-2 flex-1 max-w-md relative z-30">
          <div className="relative flex-1" ref={dropdownRef}>
            <SearchInput
              value={searchTerm}
              onSearchChange={(val) => {
                setSearchTerm(val);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              icon="person_search"
              placeholder={t.loyalty?.searchPlaceholder || 'Search by name, code, or phone...'}
              className="pe-4 py-2.5 border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm"
              style={{ '--tw-ring-color': 'var(--primary-500)' } as any}
            />
              
              <SearchDropdown
                results={filteredCustomers}
                onSelect={handleCustomerSelect}
                columns={dropdownColumns}
                isVisible={showDropdown && !!searchTerm}
                emptyMessage={t.loyalty?.noCustomerFound || "No customer found"}
              />
            </div>

            {selectedCustomer && (
              <button
                onClick={handleClear}
                className="px-4 py-2.5 rounded-xl font-medium text-xs text-gray-600 dark:text-gray-300 bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700/50 backdrop-blur-sm transition-all whitespace-nowrap"
              >
                {t.clear || 'Clear'}
              </button>
            )}
          </div>
        </div>

      {/* Results */}
      {selectedCustomer === null && searchTerm && !showDropdown && (
        <div className={`p-8 rounded-3xl bg-gray-50 dark:bg-gray-900/50 ${CARD_BASE} text-center`}>
          <span className="material-symbols-rounded text-5xl text-gray-300 dark:text-gray-600 mb-2">person_search</span>
          <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
            {t.loyalty?.startSearch || 'Search for a customer to view loyalty details'}
          </p>
        </div>
      )}

      {selectedCustomer && (
        <div className="flex-1 flex flex-col min-h-0 pb-4 pe-2">
          {/* Customer Profile Card */}
          <div className={`p-6 rounded-3xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-100 dark:border-gray-800 ${CARD_BASE} flex flex-col h-full overflow-hidden`}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600 dark:text-${color}-300 flex items-center justify-center font-bold text-2xl`}>
                  {selectedCustomer.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{selectedCustomer.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="font-bold text-gray-500 font-mono tracking-tight text-xs">
                      {selectedCustomer.code || selectedCustomer.serialId}
                    </span>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider bg-transparent ${
                      selectedCustomer.status === 'active' 
                        ? 'border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400' 
                        : 'border-gray-200 dark:border-gray-800 text-gray-500 dark:text-gray-400'
                    }`}>
                      <span className="material-symbols-rounded text-sm">
                        {selectedCustomer.status === 'active' ? 'check_circle' : 'pause_circle'}
                      </span>
                      {selectedCustomer.status}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Tier Badge */}
              <div className={`flex flex-col items-center p-3 rounded-2xl border-2 ${tierInfo?.bg} ${tierInfo?.border} bg-white/50 dark:bg-gray-900/50 min-w-[100px]`}>
                <span className={`material-symbols-rounded text-4xl ${tierInfo?.color}`}>{tierInfo?.icon}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${tierInfo?.color} mt-1`}>{tierInfo?.tier}</span>
              </div>
            </div>

            {/* Points Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SmallCard
                title={t.loyalty?.currentPoints || 'Current Points'}
                value={derivedTotals.totalPoints}
                icon="stars"
                iconColor="amber"
                fractionDigits={1}
                // Detailed breakdown of tiered earning rules for Order and Item points
                iconTooltip={
                  <div className="space-y-3 min-w-[200px] p-1">
                    <div>
                      <p className="font-bold text-amber-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <span className="material-symbols-rounded text-sm">receipt</span>
                        {t.loyalty?.orderPoints || 'Order Points'}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] opacity-90">
                        <span>&gt; 20,000 L.E</span> <span className="text-right font-bold text-amber-500">5%</span>
                        <span>&gt; 10,000 L.E</span> <span className="text-right font-bold text-amber-500">4%</span>
                        <span>&gt; 5,000 L.E</span> <span className="text-right font-bold text-amber-500">3%</span>
                        <span>&gt; 1,000 L.E</span> <span className="text-right font-bold text-amber-500">2%</span>
                        <span>&gt; 100 L.E</span> <span className="text-right font-bold text-amber-500">1%</span>
                      </div>
                    </div>
                    <div className="border-t border-white/10 pt-2">
                      <p className="font-bold text-purple-400 mb-1 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                        <span className="material-symbols-rounded text-sm">inventory_2</span>
                        {t.loyalty?.itemPoints || 'Item Points'}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] opacity-90">
                        <span>&gt; 20,000 L.E</span> <span className="text-right font-bold text-purple-500">15%</span>
                        <span>&gt; 10,000 L.E</span> <span className="text-right font-bold text-purple-500">12%</span>
                        <span>&gt; 5,000 L.E</span> <span className="text-right font-bold text-purple-500">10%</span>
                        <span>&gt; 1,000 L.E</span> <span className="text-right font-bold text-purple-500">5%</span>
                        <span>&gt; 500 L.E</span> <span className="text-right font-bold text-purple-500">3%</span>
                        <span>&gt; 100 L.E</span> <span className="text-right font-bold text-purple-500">2%</span>
                      </div>
                    </div>
                  </div>
                }
              />
              <SmallCard
                title={t.loyalty?.totalPurchases || 'Total Purchases'}
                value={derivedTotals.totalPurchases}
                icon="payments"
                iconColor="emerald"
                type="currency"
              />
              <SmallCard
                title={t.loyalty?.totalOrders || 'Total Orders'}
                value={derivedTotals.totalOrders}
                icon="receipt_long"
                iconColor="blue"
              />
              <SmallCard
                title={t.loyalty?.avgOrder || 'Avg Order'}
                value={derivedTotals.totalOrders > 0 ? (derivedTotals.totalPurchases / derivedTotals.totalOrders) : 0}
                icon="analytics"
                iconColor="purple"
                type="currency"
                // Shows the mathematical breakdown: Total Purchases / Total Orders
                iconTooltip={
                  <div className="p-1 min-w-[180px]">
                    <p className="font-bold text-purple-400 mb-2 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <span className="material-symbols-rounded text-sm">calculate</span>
                      {t.loyalty?.avgOrder || 'Avg Order'} Formula
                    </p>
                    <div className="space-y-2 text-[10px]">
                      <div className="flex justify-between gap-4 border-b border-white/10 pb-1">
                        <span className="opacity-70">{t.loyalty?.totalPurchases || 'Total Purchases'}</span>
                        <span>{derivedTotals.totalPurchases.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-white/10 pb-1">
                        <span className="opacity-70">÷ {t.loyalty?.totalOrders || 'Total Orders'}</span>
                        <span>{derivedTotals.totalOrders}</span>
                      </div>
                      <div className="flex justify-between gap-4 pt-1 text-amber-400 font-bold uppercase tracking-widest text-[9px]">
                        <span>Result</span>
                        <span className="text-xs">
                          {(derivedTotals.totalOrders > 0 ? derivedTotals.totalPurchases / derivedTotals.totalOrders : 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                }
              />
            </div>

            {/* Points History (Integrated) - Flexible Section */}
            <div className="flex-1 min-h-0 flex flex-col mt-4">
              <div className="flex items-center justify-between mb-2">
                 <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 opacity-70">
                   {t.loyalty?.history || 'Transaction History'}
                 </h4>
              </div>
              
              <div className="flex-1 overflow-y-auto min-h-0 border-t border-gray-100 dark:border-gray-800/50">
                {customerSales.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm italic">
                    {t.loyalty?.noHistory || 'No purchase history found for this customer.'}
                  </div>
                ) : (
                  <TanStackTable
                    data={customerSales}
                    columns={columns}
                    lite
                    dense
                    enableSearch={false}
                    tableId="customer-loyalty-history"
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
