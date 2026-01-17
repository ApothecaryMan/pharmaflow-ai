import React, { useState, useMemo } from 'react';
import { MaterialTabs } from '../common/MaterialTabs';
import { Modal } from '../common/Modal';
import { TanStackTable } from '../common/TanStackTable';
import { createColumnHelper } from '@tanstack/react-table';
import { Sale, Employee, Language } from '../../types';
import { SegmentedControl } from '../common/SegmentedControl';
import { ExpandingDropdown } from '../common/ExpandingDropdown';
import { formatCurrency } from '../../utils/currency';
import { SearchInput } from '../common/SearchInput';

const DriverSelect = ({ 
  driverId, 
  drivers, 
  onSelect,
  t,
  disabled = false
}: { 
  driverId?: string, 
  drivers: Employee[], 
  onSelect: (d: Employee) => void,
  t: any,
  disabled?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const selected = drivers.find(d => d.id === driverId);

  return (
    <div className="relative w-full h-10">
       <ExpandingDropdown
          items={drivers}
          selectedItem={selected}
          isOpen={isOpen}
          onToggle={() => setIsOpen(!isOpen)}
          onSelect={(d) => {
              onSelect(d);
              setIsOpen(false);
          }}
          renderItem={(d) => <div className="p-2 font-medium">{d.name}</div>}
          renderSelected={(d) => <div className="px-2 font-bold whitespace-nowrap overflow-hidden text-ellipsis">{d ? d.name : (t.selectDriver || 'Select Driver')}</div>}
          keyExtractor={(d) => d.id}
          className="absolute top-0 left-0 w-full"
          zIndexHigh="z-[200]"
          color="blue"
          variant="input"
          disabled={disabled}
       />
    </div>
  );
};

export type DeliveryTab = 'pending' | 'active' | 'completed';

export interface DeliveryOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  sales: Sale[];
  employees: Employee[];
  onUpdateSale: (saleId: string, updates: Partial<Sale>) => void;
  language?: Language;
  t: any;
  color?: string;
}

export const DeliveryOrdersModal: React.FC<DeliveryOrdersModalProps> = ({
  isOpen,
  onClose,
  sales,
  employees,
  onUpdateSale,
  language = 'EN',
  t
}) => {
  const [activeTab, setActiveTab] = useState<DeliveryTab>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  const selectedSale = useMemo(() => {
    return sales.find(s => s.id === selectedSaleId);
  }, [sales, selectedSaleId]);
  
  // Filter sales based on active tab
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      if (s.saleType !== 'delivery') return false;
      
      if (activeTab === 'pending') {
        return s.status === 'pending';
      }
      if (activeTab === 'active') {
        return s.status === 'with_delivery' || s.status === 'on_way';
      }
      if (activeTab === 'completed') {
        return s.status === 'completed' || s.status === 'cancelled';
      }
      return false;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, activeTab]);

  const deliveryDrivers = useMemo(() => {
    return employees.filter(e => e.role === 'delivery');
  }, [employees]);

  const columnHelper = createColumnHelper<Sale>();

  const columns = useMemo(() => [
    // Order daily number (ID)
    columnHelper.accessor('dailyOrderNumber', {
      header: 'ID',
      size: 60,
      cell: info => <span className="font-mono font-bold">#{info.getValue()}</span>
    }),
    // Customer name and code badge
    columnHelper.accessor('customerName', {
      header: t.customer || 'Customer',
      size: 150,
      cell: info => (
        <div className="leading-tight">
          <span className="font-bold text-gray-900 dark:text-gray-100 block mb-1">{info.getValue()}</span>
          {info.row.original.customerCode && (
              <span className="inline-block text-[10px] bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-mono font-bold leading-none border border-gray-200 dark:border-gray-700">
                  #{info.row.original.customerCode}
              </span>
          )}
        </div>
      )
    }),
    // Customer address
    columnHelper.accessor('customerAddress', {
      header: t.address || 'Address',
      size: 200,
      cell: info => (
        <div className="text-xs whitespace-normal line-clamp-2" title={info.getValue()}>
             {info.row.original.customerStreetAddress && (
                 <div className="font-bold text-gray-900 dark:text-gray-100">{info.row.original.customerStreetAddress}</div>
             )}
             <div className="text-gray-400">{info.getValue() || '-'}</div>
        </div>
      )
    }),
    // Order total amount
    columnHelper.accessor('total', {
      header: t.total || 'Total',
      size: 100,
      cell: info => <span className="font-bold text-green-600">${info.getValue().toFixed(2)}</span>
    }),
    // Delivery driver selection
    columnHelper.accessor('deliveryEmployeeId', {
      header: t.deliveryMan || 'Delivery Man',
      size: 180,
      cell: info => {
        const s = info.row.original;
        const isSelectDisabled = s.status === 'completed' || s.status === 'cancelled';
        
        return (
          <div onClick={(e) => e.stopPropagation()}>
            <DriverSelect 
               driverId={info.getValue()} 
               drivers={deliveryDrivers} 
               onSelect={(d) => onUpdateSale(s.id, { deliveryEmployeeId: d.id })}
               t={t}
               disabled={isSelectDisabled}
            />
          </div>
        );
      }
    }),
    // Action column for status changes
    columnHelper.display({
      id: 'actions',
      header: '',
      size: 140,
      cell: info => {
        const s = info.row.original;
        
        return (
          <div className="flex gap-2 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
             {/* Start button (when order is pending) */}
             {s.status === 'pending' && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateSale(s.id, { status: 'with_delivery' }); }}
                    className="h-8 px-3 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200 transition-colors flex items-center justify-center whitespace-nowrap"
                 >
                    {t.start || 'Start'}
                 </button>
             )}
             {/* 'On Way' button */}
             {s.status === 'with_delivery' && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateSale(s.id, { status: 'on_way' }); }}
                    className="h-8 px-3 bg-orange-100 text-orange-700 rounded-lg text-xs font-bold hover:bg-orange-200 transition-colors flex items-center justify-center whitespace-nowrap"
                 >
                    {t.onWay || 'On Way'}
                 </button>
             )}
             {/* Complete button with Undo feature */}
             {s.status === 'on_way' && (
                 <div className="flex items-center gap-1">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateSale(s.id, { status: 'pending' }); }}
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        title="Back to Pending"
                    >
                        <span className="material-symbols-rounded text-lg text-[18px]">undo</span>
                    </button>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateSale(s.id, { status: 'completed' }); }}
                        className="h-8 px-3 bg-green-100 text-green-700 rounded-lg text-xs font-bold hover:bg-green-200 transition-colors flex items-center justify-center whitespace-nowrap"
                    >
                        {t.complete || 'Complete'}
                    </button>
                 </div>
             )}
             {/* Cancel button (icon only) */}
             {(s.status === 'pending' || s.status === 'with_delivery' || s.status === 'on_way') && (
                 <button 
                    onClick={(e) => { e.stopPropagation(); onUpdateSale(s.id, { status: 'cancelled' }); }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors ml-1"
                    title={t.cancel || 'Cancel'}
                 >
                    <span className="material-symbols-rounded text-xl">block</span>
                 </button>
             )}
             {/* Final completed state (icon + text) */}
             {s.status === 'completed' && (
                 <div className="flex items-center gap-1 text-green-600 px-1" title={t.completed || 'Completed'}>
                    <span className="material-symbols-rounded text-xl">task_alt</span>
                    <span className="text-[10px] font-bold uppercase">{t.completed || 'Done'}</span>
                 </div>
             )}
             {/* Final cancelled state */}
             {s.status === 'cancelled' && (
                 <div className="flex items-center gap-1 text-red-600 px-1" title={t.cancelled || 'Cancelled'}>
                    <span className="material-symbols-rounded text-xl">cancel</span>
                    <span className="text-[10px] font-bold uppercase">{t.cancelled || 'Void'}</span>
                 </div>
             )}
          </div>
        )
      }
    })
  ], [t, deliveryDrivers, onUpdateSale, activeTab]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.deliveryOrders || 'Delivery Orders'}
      icon="local_shipping"
      size="6xl"
      headerActions={
        <div className="flex items-center gap-3">
           {/* Search Input */}
           <div className="w-64">
               <SearchInput
                  value={searchQuery}
                  onSearchChange={setSearchQuery}
                  onClear={() => setSearchQuery('')}
                  placeholder={t.searchOrder || "Search orders..."}
                  autoFocus={true}
               />
           </div>

           {/* Tabs */}
           <div className="min-w-[300px]">
               <SegmentedControl
                   options={[
                     { label: `${t.pending || 'Pending'} (${sales.filter(s => s.status === 'pending' && s.saleType === 'delivery').length})`, value: 'pending', icon: 'pending' },
                     { label: `${t.active || 'Active'} (${sales.filter(s => (s.status === 'with_delivery' || s.status === 'on_way') && s.saleType === 'delivery').length})`, value: 'active', icon: 'local_shipping' },
                     { label: t.history || 'History', value: 'completed', icon: 'history' }
                   ]}
                   value={activeTab}
                   onChange={(val) => setActiveTab(val as DeliveryTab)}
                   size="sm"
                   variant="onCard"
                />
           </div>
        </div>
      }
      hideCloseButton={true}
    >
      <div className="flex flex-col h-[70vh]">
          
         {selectedSaleId && selectedSale ? (
             <div className="flex-1 flex flex-col overflow-hidden">
                 {/* Details Header / Breadcrumb */}
                 <div className="flex items-center gap-2 mb-4">
                     <button 
                        onClick={() => setSelectedSaleId(null)}
                        className="transition-all duration-200 group flex items-center justify-center mr-1"
                     >
                         <span className="material-symbols-rounded text-gray-400 group-hover:text-blue-600 transition-colors">arrow_back</span>
                     </button>
                     <div className="flex flex-col">
                         <div className="flex items-center gap-2">
                             <span className="text-lg font-bold">#{selectedSale.dailyOrderNumber}</span>
                             <div className={`flex items-center gap-1 text-[11px] font-bold uppercase ${
                                 selectedSale.status === 'completed' ? 'text-green-600' :
                                 selectedSale.status === 'cancelled' ? 'text-red-600' :
                                 'text-blue-600'
                             }`}>
                                 <span className="material-symbols-rounded text-base">
                                     {selectedSale.status === 'completed' ? 'task_alt' :
                                      selectedSale.status === 'cancelled' ? 'cancel' :
                                      selectedSale.status === 'on_way' ? 'local_shipping' :
                                      selectedSale.status === 'with_delivery' ? 'delivery_dining' : 'pending'}
                                 </span>
                                 <span>{t[selectedSale.status] || selectedSale.status}</span>
                             </div>
                         </div>
                         <div className="flex items-center gap-2 text-sm text-gray-500">
                             <span>{selectedSale.customerName}</span>
                             {selectedSale.customerCode && <span className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border border-gray-200 dark:border-gray-700">#{selectedSale.customerCode}</span>}
                             <span className="text-xs font-medium text-gray-400" dir="ltr">({selectedSale.customerPhone})</span>
                         </div>
                     </div>
                 </div>

                 {/* Medicines List using MaterialTabs */}
                 <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                     <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                         {selectedSale.items.map((item, idx) => {
                             const rowIdx = Math.floor(idx / 2);
                             const rowCount = Math.ceil(selectedSale.items.length / 2);
                             
                             return (
                                 <MaterialTabs 
                                    key={`${item.id}-${idx}`}
                                    index={rowIdx} 
                                    total={rowCount}
                                    color="blue"
                                    isSelected={false}
                                    className="!h-auto py-3"
                                 >
                                     <div className="flex items-center justify-between w-full" dir="ltr">
                                         <div className="flex items-center gap-4">
                                             <div className="flex flex-col text-left">
                                                 <span className="font-bold text-gray-900 dark:text-gray-100">{item.name}</span>
                                                 <span className="text-xs text-gray-500">{item.genericName}</span>
                                             </div>
                                         </div>

                                         <div className="flex items-center gap-6">
                                             <div className="flex flex-col items-end">
                                                 <span className="text-xs text-gray-400 uppercase tracking-wider text-[10px]">{t.quantity || 'Qty'}</span>
                                                 <span className="font-mono font-bold text-base">x{item.quantity}</span>
                                             </div>
                                             <div className="flex flex-col items-end min-w-[70px]">
                                                 <span className="text-xs text-gray-400 uppercase tracking-wider text-[10px]">{t.price || 'Price'}</span>
                                                 <span className="font-bold text-green-600 text-sm">{formatCurrency(item.price)}</span>
                                             </div>
                                         </div>
                                     </div>
                                 </MaterialTabs>
                             );
                         })}
                     </div>
                 </div>
             </div>
         ) : (
             /* Table View */
             <div className="flex-1 overflow-hidden border rounded-xl border-gray-200 dark:border-gray-800">
                <TanStackTable
                   data={filteredSales}
                   columns={columns}
                   enableSearch={false} 
                   enableTopToolbar={false}
                   globalFilter={searchQuery}
                   searchPlaceholder={t.searchOrder || "Search orders..."}
                   emptyMessage={t.noOrders || "No delivery orders found"}
                   onRowClick={(row) => setSelectedSaleId(row.id)}
                />
             </div>
         )}
         
         {/* Footer Summary */}
         <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
             <span>{t.totalPending || 'Pending Value'}: <strong>{formatCurrency(sales.filter(s => s.status === 'pending' && s.saleType === 'delivery').reduce((sum, s) => sum + s.total, 0))}</strong></span>
             
             <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
            >
                {t.close || 'Close'}
            </button>
         </div>
      </div>
    </Modal>
  );
};
