import React, { useState, useMemo } from 'react';
import { TanStackTable } from '../common/TanStackTable';
import { ColumnDef } from '@tanstack/react-table';
import { Customer, Sale, Return } from '../../types';
import { SegmentedControl } from '../common/SegmentedControl';
import { TRANSLATIONS } from '../../i18n/translations';

interface CustomerHistoryProps {
  color: string;
  t: typeof TRANSLATIONS.EN.customers;
  language: 'EN' | 'AR';
  customers: Customer[];
  sales: Sale[];
  returns: Return[];
  navigationParams?: Record<string, any> | null;
}

export const CustomerHistory: React.FC<CustomerHistoryProps> = ({
  color,
  t,
  language,
  customers,
  sales,
  returns,
  navigationParams
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sales' | 'returns'>('sales');

  // Unify Transactions (Sales & Returns) - Filtered for registered customers only
  const registeredCodes = useMemo(() => new Set(customers.map(c => c.code)), [customers]);

  const salesWithCustomer = useMemo(() => {
    return sales.filter(s => {
      // If no customer code, it's a guest - include it
      if (!s.customerCode) return true;
      // If it has a code, ensure it's in our registered set
      return registeredCodes.has(s.customerCode);
    });
  }, [sales, registeredCodes]);

  const returnsWithCustomer = useMemo(() => {
    // Only include returns linked to sales of registered customers
    const registeredSaleIds = new Set(salesWithCustomer.map(s => s.id));
    
    return returns
      .filter(ret => registeredSaleIds.has(ret.saleId))
      .map(ret => {
        const sale = sales.find(s => s.id === ret.saleId);
        return {
          ...ret,
          customerName: sale?.customerName || '-',
          customerCode: sale?.customerCode || '-',
          customerPhone: sale?.customerPhone || '-'
        };
      });
  }, [returns, sales, salesWithCustomer]);

  // Handle passed initial search from navigation (optional)
  React.useEffect(() => {
     if (navigationParams?.customerId) {
         const customer = customers.find(c => c.id === navigationParams.customerId);
         if (customer) {
             // We can potentially set an initial filter for the table here if the table component supports pass-through filters
         }
     }
  }, [navigationParams, customers]);


  // Columns for Sales Table
  const salesColumns = useMemo<ColumnDef<Sale>[]>(() => [
    {
      accessorKey: 'date',
      header: t.customerHistory?.table.date || 'Date',
      cell: (info) => {
        try {
            return new Date(info.row.original.date).toLocaleDateString();
        } catch (e) { return '-'; }
      },
      meta: { width: 110 }
    },
    {
      accessorKey: 'customerName',
      header: t.headers.name || 'Customer',
      meta: { width: 180 }
    },
    {
        accessorKey: 'customerPhone',
        header: t.modal.phone || 'Phone',
        meta: { width: 130 }
    },
    {
      accessorKey: 'dailyOrderNumber', 
      header: t.customerHistory?.table.invoiceNo || 'Invoice #',
      cell: (info) => info.row.original.dailyOrderNumber ? `#${info.row.original.dailyOrderNumber}` : info.row.original.id.substring(0, 8),
      meta: { width: 100 }
    },
    {
        accessorKey: 'items',
        header: t.customerHistory?.table.items || 'Items',
        cell: (info) => info.row.original.items?.length || 0,
        meta: { align: 'center', width: 70 }
    },
    {
      accessorKey: 'total',
      header: t.customerHistory?.table.total || 'Total',
      cell: (info) => `$${info.row.original.total?.toFixed(2)}`,
      meta: { align: 'right', isNumeric: true, width: 90 }
    },
    {
      accessorKey: 'status',
      header: t.customerHistory?.table.status || 'Status',
      meta: { align: 'center', width: 100 },
      cell: (info) => {
        const status = info.row.original.status;
        const isCompleted = status === 'completed';
        const colorClasses = isCompleted 
          ? 'border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400' 
          : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400';
        const icon = isCompleted ? 'check_circle' : 'history';
        
        return (
            <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border bg-transparent text-[10px] font-bold uppercase tracking-wider ${colorClasses}`}>
                <span className="material-symbols-rounded text-sm">{icon}</span>
                {status}
            </span>
        );
      },
    },
  ], [t]);

  // Columns for Returns Table
  const returnsColumns = useMemo<ColumnDef<Return>[]>(() => [
      {
          accessorKey: 'date',
          header: t.customerHistory?.table.date || 'Date',
          cell: (info) => {
            try {
                return new Date(info.row.original.date).toLocaleDateString();
            } catch(e) { return '-'; }
          },
          meta: { width: 110 }
      },
      {
        accessorKey: 'customerName',
        header: t.headers.name || 'Customer',
        meta: { width: 180 }
      },
      {
          accessorKey: 'id',
          header: t.customerHistory?.table.returnNo || 'Return #',
          cell: (info) => info.row.original.id.substring(0, 8),
          meta: { width: 100 }
      },
      {
        accessorKey: 'totalRefund',
        header: t.customerHistory?.table.refundAmount || 'Refund',
        cell: (info) => `$${info.row.original.totalRefund?.toFixed(2)}`,
        meta: { align: 'right', isNumeric: true, width: 90 }
      },
      {
          accessorKey: 'reason',
          header: t.customerHistory?.table.reason || 'Reason',
      }
  ], [t]);

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                 <h2 className="text-2xl font-bold tracking-tight type-expressive">{t.customerHistory?.title || 'Customer History'}</h2>
                <p className="text-sm text-gray-500">{t.customerHistory?.subtitle || 'View detailed transaction history'}</p>
            </div>
        </div>

        {/* Unified Transactions Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex-1 flex flex-col min-h-[500px]">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                    <span className="material-symbols-rounded text-gray-400">history</span>
                    <span className="font-bold text-gray-700 dark:text-gray-200">{t.customerHistory?.title || 'History'}</span>
                </div>
                <SegmentedControl
                    value={activeTab}
                    onChange={(val) => setActiveTab(val as 'sales' | 'returns')}
                    color={color}
                    options={[
                        { label: t.customerHistory?.tabs.invoices || 'Invoices', value: 'sales', icon: 'receipt_long' },
                        { label: t.customerHistory?.tabs.returns || 'Returns', value: 'returns', icon: 'assignment_return' }
                    ]}
                />
            </div>
            
            <div className="flex-1 p-0">
                {activeTab === 'sales' ? (
                    <TanStackTable
                        data={salesWithCustomer}
                        columns={salesColumns}
                        tableId="cust_history_sales_v2"
                        color={color}
                        searchPlaceholder={t.customerHistory?.searchPlaceholder || "Search Name, Code, Phone, Invoice..."}
                    />
                ) : (
                    <TanStackTable
                        data={returnsWithCustomer}
                        columns={returnsColumns}
                        tableId="cust_history_returns_v2"
                        color={color}
                        searchPlaceholder={t.customerHistory?.searchPlaceholder || "Search Name, Code, Phone, Return..."}
                    />
                )}
            </div>
        </div>
    </div>
  );
};
