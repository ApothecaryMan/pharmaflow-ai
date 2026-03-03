import type { ColumnDef } from '@tanstack/react-table';
import React, { useMemo, useState } from 'react';
import type { Drug, StockBatch } from '../../types';
import { formatCurrencyParts, formatCompactCurrencyParts } from '../../utils/currency';
import { getDisplayName } from '../../utils/drugDisplayName';
import { formatStock } from '../../utils/inventory';
import { SmallCard } from '../common/SmallCard';
import { ContextMenuItem, useContextMenu } from '../common/ContextMenu';
import { Modal } from '../common/Modal';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmartInput } from '../common/SmartInputs';
import { TanStackTable } from '../common/TanStackTable';
import { useStatusBar } from '../layout/StatusBar';
import { useAlert, useSettings } from '../../context';
import { stockMovementService } from '../../services/inventory';
import { batchService } from '../../services/inventory/batchService';
import { idGenerator } from '../../utils/idGenerator';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { parseExpiryEndOfMonth } from '../../utils/expiryUtils';

interface ExpiryManagementProps {
  inventory: Drug[];
  batches?: StockBatch[];
  color: string;
  t: any;
  language?: string;
  onUpdateInventory?: (drug: Drug, batch?: StockBatch, action?: string) => void;
}

interface BatchWithDrug extends StockBatch {
  drug: Drug;
}

export const ExpiryManagement: React.FC<ExpiryManagementProps> = ({
  inventory,
  batches = [], // Default to empty if not passed
  color,
  t,
  language,
  onUpdateInventory,
}) => {
  const { getVerifiedDate } = useStatusBar();
  const { success, error } = useAlert();
  const { showMenu, hideMenu } = useContextMenu();
  const { textTransform } = useSettings();

  const [filterMode, setFilterMode] = useState<'all' | 'expired' | 'near30' | 'near90'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Action State
  const [selectedActionBatch, setSelectedActionBatch] = useState<BatchWithDrug | null>(null);
  const [activeModal, setActiveModal] = useState<'damage' | 'return' | null>(null);
  const [actionQty, setActionQty] = useState('');
  const [actionNotes, setActionNotes] = useState('');

  const openActionModal = (batch: BatchWithDrug, type: 'damage' | 'return') => {
    setSelectedActionBatch(batch);
    setActionQty(batch.quantity.toString());
    setActionNotes('');
    setActiveModal(type);
    hideMenu();
  };

  const handleSaveAction = async () => {
    if (!selectedActionBatch || !activeModal) return;
    const qty = parseFloat(actionQty);
    if (isNaN(qty) || qty <= 0 || qty > selectedActionBatch.quantity) {
      error(t.expiryManagement?.invalidQuantity || 'Invalid quantity');
      return;
    }

    try {
      const currentEmployeeId = storage.get<string>(StorageKeys.CURRENT_EMPLOYEE_ID, 'user');
      const employees = storage.get<any[]>(StorageKeys.EMPLOYEES, []);
      const employee = employees.find(e => e.id === currentEmployeeId);
      
      const typeStr = activeModal === 'damage' ? 'adjustment' : 'purchase_return';
      const reasonStr = activeModal === 'damage' ? 'expired' : 'other';
      const defaultNote = activeModal === 'damage' ? 'Damaged from Expiry Module' : 'Returned from Expiry Module';
      const entityType = activeModal === 'damage' ? 'generic' : 'returns';
      
      await stockMovementService.logMovement({
        drugId: selectedActionBatch.drugId,
        drugName: selectedActionBatch.drug.name,
        branchId: '', 
        type: typeStr as any,
        quantity: -qty, // Deducting
        previousStock: selectedActionBatch.quantity,
        newStock: selectedActionBatch.quantity - qty,
        reason: reasonStr,
        notes: actionNotes || defaultNote,
        transactionId: idGenerator.generate(entityType),
        batchId: selectedActionBatch.id,
        expiryDate: selectedActionBatch.expiryDate,
        performedBy: currentEmployeeId,
        performedByName: employee?.name || 'System User',
        status: 'approved',
      });

      await batchService.updateBatchQuantity(selectedActionBatch.id, -qty);

      success(
        t.expiryManagement?.actionSuccess || 
        `Successfully ${activeModal === 'damage' ? 'damaged' : 'returned'} stock`
      );
      
      if (onUpdateInventory) {
        onUpdateInventory({ ...selectedActionBatch.drug, stock: Math.max(0, selectedActionBatch.drug.stock - qty) }, selectedActionBatch); 
      }
      
      // Update local batches logic ideally triggers from parent re-fetch, but typically we close the modal and rely on that.
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      error(t.common?.error || 'Failed to update stock');
    }
  };

  const getRowActions = (row: BatchWithDrug) => (
    <div className="font-sans min-w-[160px]">
      <div className="px-3 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
        {t.expiryManagement?.actions || 'Actions'} {row.batchNumber ? `- ${row.batchNumber}` : ''}
      </div>
      <ContextMenuItem
        icon="keyboard_return"
        label={t.expiryManagement?.returnToSupplier || 'Return to Supplier'}
        onClick={() => openActionModal(row, 'return')}
      />
      <ContextMenuItem
        icon="delete_forever"
        label={t.expiryManagement?.damageStock || 'Damage Stock'}
        danger
        onClick={() => openActionModal(row, 'damage')}
      />
    </div>
  );

  const { enrichedBatches, stats } = useMemo(() => {
    let expiredValue = 0;
    let near30Value = 0;
    let near90Value = 0;
    let expiredCount = 0;
    let near30Count = 0;
    let near90Count = 0;

    const enriched: BatchWithDrug[] = [];
    const now = getVerifiedDate();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const near30Date = new Date(today);
    near30Date.setDate(today.getDate() + 30);

    const near90Date = new Date(today);
    near90Date.setDate(today.getDate() + 90);

    // Map batches to drugs
    batches.forEach((batch) => {
      const parentDrug = inventory.find((d) => d.id === batch.drugId);
      if (!parentDrug) return; // Skip orphaned batches

      // Only show batches that still have stock
      if (batch.quantity <= 0) return;

      const expiry = parseExpiryEndOfMonth(batch.expiryDate);
      const isExpired = expiry < today;
      const isNear30 = !isExpired && expiry <= near30Date;
      const isNear90 = !isExpired && !isNear30 && expiry <= near90Date;

      const batchValue = batch.quantity * batch.costPrice;

      if (isExpired) {
        expiredValue += batchValue;
        expiredCount++;
      } else if (isNear30) {
        near30Value += batchValue;
        near30Count++;
      } else if (isNear90) {
        near90Value += batchValue;
        near90Count++;
      }

      enriched.push({ ...batch, drug: parentDrug });
    });

    return {
      enrichedBatches: enriched,
      stats: {
        expiredValue,
        near30Value,
        near90Value,
        expiredCount,
        near30Count,
        near90Count,
      },
    };
  }, [batches, inventory, getVerifiedDate]);

  const filteredData = useMemo(() => {
    const now = getVerifiedDate();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const near30Date = new Date(today);
    near30Date.setDate(today.getDate() + 30);
    const near90Date = new Date(today);
    near90Date.setDate(today.getDate() + 90);

    return enrichedBatches.filter((item) => {
      const expiry = parseExpiryEndOfMonth(item.expiryDate);
      if (filterMode === 'expired') return expiry < today;
      if (filterMode === 'near30') return expiry >= today && expiry <= near30Date;
      if (filterMode === 'near90') return expiry > near30Date && expiry <= near90Date;
      return true;
    });
  }, [enrichedBatches, filterMode, getVerifiedDate]);

  const columns = useMemo<ColumnDef<BatchWithDrug>[]>(() => {
    return [
      {
        id: 'codeOrBatch',
        accessorFn: (row) => `${row.drug.barcode || ''} ${row.batchNumber || ''} ${row.id}`,
        header: t.expiryManagement?.table?.codeOrBatch || 'Code / Batch',
        cell: ({ row }) => {
          const item = row.original;
          const drug = item.drug;
          return (
            <div className="flex flex-col">
              {drug.barcode && <span className="font-mono text-xs text-gray-600 dark:text-gray-400">BC: {drug.barcode}</span>}
              <span className="font-mono text-xs text-gray-500">
                {item.batchNumber ? `B: ${item.batchNumber}` : `ID: ${item.id.substring(0,6)}`}
              </span>
            </div>
          );
        },
        meta: { width: 120 },
      },
      {
        id: 'name',
        accessorFn: (row) => getDisplayName(row.drug, textTransform),
        header: t.expiryManagement?.table?.name || 'الاسم',
        cell: ({ row }) => {
          const item = row.original;
          const drug = item.drug;
          const displayName = getDisplayName(drug, textTransform);
          return (
            <span className="font-bold text-gray-900 dark:text-gray-100">{displayName}</span>
          );
        },
        meta: { width: 170 }, // Decreased width
      },
      {
        accessorKey: 'quantity',
        header: t.expiryManagement?.table?.remainingQty || 'Remaining Qty',
        cell: ({ row }) => {
          const item = row.original;
          return (
            <span className="font-medium text-gray-800 dark:text-gray-200">
              {formatStock(item.quantity, item.drug.unitsPerPack, {
                packs: t.expiryManagement?.details?.packs || 'Packs',
                outOfStock: t.expiryManagement?.status?.outOfStock || 'Out of Stock'
              })}
            </span>
          );
        },
        meta: { align: 'center' },
      },
      {
        accessorKey: 'costPrice',
        header: t.expiryManagement?.table?.costPrice || 'Cost Price',
        cell: ({ row }) => {
          const parts = formatCurrencyParts(row.original.costPrice);
          return (
            <span className="text-gray-600 dark:text-gray-400 font-medium">
              {parts.amount} <span className="text-xs font-normal">{parts.symbol}</span>
            </span>
          );
        },
        meta: { align: 'center' },
      },
      {
        id: 'potentialLoss',
        accessorFn: (row) => row.quantity * row.costPrice,
        header: t.expiryManagement?.table?.potentialLoss || 'Potential Loss',
        meta: { align: 'center' },
        cell: ({ getValue }) => {
          const loss = getValue<number>();
          const parts = formatCompactCurrencyParts(loss);
          return (
            <span className="text-red-600 dark:text-red-400 font-bold">
              {parts.amount} <span className="text-xs font-normal">{parts.symbol}</span>
            </span>
          );
        },
      },
      {
        accessorKey: 'expiryDate',
        header: t.expiryManagement?.table?.expiryDate || 'Expiry Date',
        cell: ({ row }) => {
          const expiry = parseExpiryEndOfMonth(row.original.expiryDate);
          const now = getVerifiedDate();
          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          
          let colorClass = 'text-green-600 bg-green-50 dark:bg-green-900/20';
          let statusText = t.expiryManagement?.status?.valid || 'Valid';
          
          if (expiry < today) {
            colorClass = 'text-red-600 bg-red-50 dark:bg-red-900/20 shadow-red-500/10 font-bold';
            statusText = t.expiryManagement?.status?.expired || 'Expired';
          } else {
            const daysLeft = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (daysLeft <= 30) {
              colorClass = 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 font-bold';
              statusText = `< 30 ${t.expiryManagement?.time?.days || 'Days'}`;
            } else if (daysLeft <= 90) {
              colorClass = 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 font-medium';
              statusText = `< 90 ${t.expiryManagement?.time?.days || 'Days'}`;
            }
          }

          return (
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-medium tabular-nums">
                {expiry.toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' })}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${colorClass}`}>
                {statusText}
              </span>
            </div>
          );
        },
        meta: { smartDate: false, align: 'center' },
      },
    ];
  }, [t, getVerifiedDate, textTransform]);

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight page-title">
            {t.expiryManagement?.title || 'Expiry Management'}
          </h1>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <SmallCard
          title={t.expiryManagement?.expiredItems || 'Expired Items'}
          value={stats.expiredValue}
          type="currency"
          currencyLabel={formatCurrencyParts(0).symbol}
          icon="event_busy"
          iconColor="rose"
          subValue={stats.expiredCount.toString()}
        />

        <SmallCard
          title={t.expiryManagement?.nearExpiry30 || 'Expiring < 30 Days'}
          value={stats.near30Value}
          type="currency"
          currencyLabel={formatCurrencyParts(0).symbol}
          icon="warning"
          iconColor="orange"
          subValue={stats.near30Count.toString()}
        />

        <SmallCard
          title={t.expiryManagement?.nearExpiry90 || 'Expiring < 90 Days'}
          value={stats.near90Value}
          type="currency"
          currencyLabel={formatCurrencyParts(0).symbol}
          icon="calendar_month"
          iconColor="amber"
          subValue={stats.near90Count.toString()}
        />
      </div>

      {/* Filters & Table Wrapper */}
      <div className="flex-1 flex flex-col min-h-0 gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0">
          <div className="w-full max-w-xl">
            <SearchInput
              value={searchQuery}
              onSearchChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              placeholder={t.expiryManagement?.searchPlaceholder || 'Search batches...'}
              color={color}
            />
          </div>

          <SegmentedControl
            options={[
              { label: t.expiryManagement?.all || 'All', value: 'all' },
              { label: t.expiryManagement?.expired || 'Expired', value: 'expired' },
              { label: t.expiryManagement?.nearExpiry30 || '< 30 Days', value: 'near30' },
              { label: t.expiryManagement?.nearExpiry90 || '< 90 Days', value: 'near90' },
            ]}
            value={filterMode}
            onChange={(val) => setFilterMode(val as any)}
            color={color}
          />
        </div>

        <div className="flex-1 min-h-0 overflow-hidden">
          <TanStackTable
            data={filteredData}
            columns={columns}
            tableId="expiry_management_table"
            color={color}
            enableTopToolbar={false}
            enableSearch={false}
            globalFilter={searchQuery}
            emptyMessage={t.expiryManagement?.noRecords || 'No batches found matching criteria'}
            enablePagination={true}
            enableShowAll={true}
            pageSize="auto"
            enableVirtualization={false}
            onRowContextMenu={(e, row) => showMenu(e.clientX, e.clientY, getRowActions(row))}
          />
        </div>
      </div>

      {/* Action Modal (Damage/Return) */}
      <Modal
        isOpen={activeModal !== null}
        onClose={() => setActiveModal(null)}
        title={activeModal === 'damage' ? (t.expiryManagement?.damageStock || 'Damage Stock') : (t.expiryManagement?.returnToSupplier || 'Return to Supplier')}
        icon={activeModal === 'damage' ? 'delete_forever' : 'keyboard_return'}
        size="md"
      >
        <div className="p-6 space-y-6">
          <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
            <h4 className="font-bold text-gray-900 dark:text-gray-100">{selectedActionBatch?.drug.name}</h4>
            <div className="mt-1 flex text-sm text-gray-500 gap-4">
              <span>{t.expiryManagement?.batch || 'Batch'}: {selectedActionBatch?.batchNumber || 'N/A'}</span>
              <span>{t.expiryManagement?.available || 'Available'}: <span className="font-bold">{selectedActionBatch?.quantity}</span></span>
            </div>
            {activeModal === 'damage' && (
              <div className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-lg inline-block">
                {t.expiryManagement?.potentialLoss || 'Potential Loss'}: {formatCurrencyParts((selectedActionBatch?.quantity || 0) * (selectedActionBatch?.costPrice || 0)).amount} {formatCurrencyParts(0).symbol}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.expiryManagement?.quantity || 'Quantity'}
              </label>
              <input
                type="number"
                max={selectedActionBatch?.quantity}
                value={actionQty}
                onChange={(e) => setActionQty(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t.expiryManagement?.notes || 'Notes'} ({t.expiryManagement?.optional || 'Optional'})
              </label>
              <SmartInput
                value={actionNotes}
                onChange={(e) => setActionNotes(e.target.value)}
                placeholder={t.expiryManagement?.addNotes || 'Add any reason or details...'}
                className="w-full"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setActiveModal(null)}
              className="px-4 py-2 font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              {t.expiryManagement?.cancel || 'Cancel'}
            </button>
            <button
              onClick={handleSaveAction}
              className={`px-4 py-2 font-medium text-white rounded-xl transition-colors ${
                activeModal === 'damage' 
                  ? 'bg-red-600 hover:bg-red-700' 
                  : `bg-${color}-600 hover:bg-${color}-700`
              }`}
            >
              {t.expiryManagement?.confirm || 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ExpiryManagement;
