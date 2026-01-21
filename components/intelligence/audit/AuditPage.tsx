import React, { useState, useMemo } from 'react';
import { formatCurrency } from '../../../utils/currency';
import { TanStackTable } from '../../../components/common/TanStackTable';
import { SearchInput } from '../../../components/common/SearchInput';
import { TransactionDetailModal } from './TransactionDetailModal';
import { AuditTransaction } from '../../../types/intelligence';
import { useAudit } from '../../../hooks/useAudit';
import { createColumnHelper, ColumnDef } from '@tanstack/react-table';

interface AuditPageProps {
  t: any;
  language: string;
}

export const AuditPage: React.FC<AuditPageProps> = ({ t, language }) => {
  const { transactions, loading } = useAudit(200);
  const [selectedTransaction, setSelectedTransaction] = useState<AuditTransaction | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  // Define Columns
  const columnHelper = createColumnHelper<AuditTransaction>();
  const columns = useMemo<ColumnDef<AuditTransaction, any>[]>(() => [
    columnHelper.accessor('timestamp', {
      header: t.intelligence.audit.columns.timestamp,
      cell: info => <span dir="ltr" className="text-gray-600 dark:text-gray-300 font-medium">{new Date(info.getValue()).toLocaleTimeString(language === 'AR' ? 'ar-EG' : 'en-US', { hour: '2-digit', minute:'2-digit' })}</span>,
    }),
     columnHelper.accessor('type', {
      header: t.intelligence.audit.columns.type,
      cell: info => (
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
              info.getValue() === 'SALE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
              info.getValue() === 'RETURN' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
              info.getValue() === 'VOID' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
              'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          }`}>
              {info.getValue() === 'SALE' ? t.intelligence.audit.types.sale : 
               info.getValue() === 'RETURN' ? t.intelligence.audit.types.return : 
               info.getValue() === 'VOID' ? t.intelligence.audit.types.void : 
               t.intelligence.audit.types.adjustment}
          </span>
      ),
    }),
    columnHelper.accessor('product_name', {
      header: t.intelligence.audit.columns.product,
      cell: info => <span className="font-medium text-gray-900 dark:text-white">{info.getValue()}</span>
    }),
    columnHelper.accessor('quantity', {
      header: t.intelligence.audit.columns.quantity,
      cell: info => <span dir="ltr" className="text-gray-600 dark:text-gray-300">{info.getValue()}</span>,
    }),
    columnHelper.accessor('amount', {
      header: t.intelligence.audit.columns.amount,
        cell: info => <span dir="ltr" className="font-bold text-gray-900 dark:text-white">{formatCurrency(Math.abs(info.getValue()))}</span>,
    }),
    columnHelper.accessor('cashier_name', {
        header: t.intelligence.audit.columns.employee,
        cell: info => <span className="text-gray-600 dark:text-gray-300">{info.getValue()}</span>
    }),
    columnHelper.accessor('has_anomaly', {
        header: t.intelligence.audit.columns.notes,
        cell: info => info.getValue() ? (
            <span className="text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded-lg flex items-center justify-center gap-1 text-xs font-bold" title={info.row.original.anomaly_reason}>
                <span className="material-symbols-rounded text-sm">warning</span>
                {t.intelligence.audit.alert}
            </span>
        ) : '-'
    })
  ], [columnHelper, t, language]);

  const handleViewTransaction = (transaction: AuditTransaction) => {
    setSelectedTransaction(transaction);
    setIsDetailModalOpen(true);
  };

  return (
    <div className="h-full flex flex-col space-y-4 overflow-hidden">
       {/* Transaction Detail Modal */}
       <TransactionDetailModal
         isOpen={isDetailModalOpen}
         onClose={() => setIsDetailModalOpen(false)}
         transaction={selectedTransaction}
       />

        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex-1 flex flex-col overflow-hidden">
          <div className="flex justify-between items-center px-4 pt-4 mb-4 flex-shrink-0">
              <div className="flex items-center gap-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.intelligence.audit.title}</h3>
                  <div className="w-64">
                    <SearchInput 
                        value={globalFilter}
                        onSearchChange={setGlobalFilter}
                        onClear={() => setGlobalFilter('')}
                        placeholder={t.intelligence.audit.searchPlaceholder}
                    />
                  </div>
              </div>
              <div className="flex items-center gap-1">
                 <button 
                   type="button"
                   className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-100 dark:border-gray-700 transition-all active:scale-95"
                   title={t.intelligence.audit.exportCSV}
                 >
                    <span className="material-symbols-rounded">file_download</span>
                 </button>
              </div>
          </div>
          
          <div className="flex-1 overflow-hidden">
              <TanStackTable
                  data={transactions}
                  columns={columns}
                  isLoading={loading}
                  onRowClick={handleViewTransaction}
                  emptyMessage={t.intelligence.audit.emptyMessage}
                  tableId="audit-log-table"
                  enableSearch={false}
                  lite={true}
                  globalFilter={globalFilter}
              />
          </div>
       </div>
    </div>
  );
};
