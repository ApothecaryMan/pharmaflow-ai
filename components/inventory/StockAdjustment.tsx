import type { ColumnDef } from '@tanstack/react-table';
import React, { useMemo, useState } from 'react';
import { StorageKeys } from '../../config/storageKeys';
import { useAlert, useSettings } from '../../context';
import { type StockMovement, stockMovementService } from '../../services/inventory';
import { batchService } from '../../services/inventory/batchService';
import { permissionsService } from '../../services/auth/permissions';
import type { Drug, StockBatch } from '../../types';
import { getDisplayName, getFullDisplayName } from '../../utils/drugDisplayName';
import * as stockOps from '../../utils/stockOperations';
import { idGenerator } from '../../utils/idGenerator';
import { parseSearchTerm } from '../../utils/searchUtils';
import { storage } from '../../utils/storage';
import { CARD_BASE } from '../../utils/themeStyles';
import { DatePicker, DateRangePicker } from '../common/DatePicker';
import { FilterDropdown } from '../common/FilterDropdown';
import { formatExpiryDate } from '../../utils/expiryUtils';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { useData } from '../../services/DataContext';
import { Modal } from '../common/Modal';
import { SearchDropdown, useSearchKeyboardNavigation } from '../common/SearchDropdown';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmartInput, useSmartDirection } from '../common/SmartInputs';
// UI Redesign Imports
import { TanStackTable } from '../common/TanStackTable';
import { StockAdjustmentPrint } from './StockAdjustmentPrint';

interface StockAdjustmentProps {
  onUpdateInventory: (drugs: Drug[]) => void;
  color?: string;
  t: any;
  inventory: Drug[];
  batches: StockBatch[];
}

interface AdjustmentItem {
  drugId: string;
  drugName: string;
  currentStock: number;
  newStock: number;
  difference: number;
  reason: string;
  notes: string;
  batchId?: string; // Optional: specific batch
  expiryDate?: string; // Optional: for display
}

interface BatchSelectionModalProps {
  drug: Drug;
  batches: StockBatch[];
  onSelect: (batch: StockBatch | null) => void;
  onClose: () => void;
}

export const StockAdjustment: React.FC<StockAdjustmentProps> = ({
  inventory,
  batches,
  onUpdateInventory,
  color = 'blue',
  t,
}) => {
  const { branchCode, language, textTransform } = useSettings();
  const { activeBranchId } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
  const { success, error: alertError, info, warning } = useAlert();
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [lastTransaction, setLastTransaction] = useState<StockMovement[]>([]);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);

  // State
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const printButtonRef = React.useRef<HTMLButtonElement>(null);

  // RTL Detection
  const isRTL =
    t.direction === 'rtl' || t.lang === 'ar' || (t.title && /[\u0600-\u06FF]/.test(t.title));
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { playSuccess, playError, playBeep } = usePosSounds();

  // Batch Selection State
  // View State
  // Batch Selection State
  const [batchSelectionDrug, setBatchSelectionDrug] = useState<Drug | null>(null);
  const [availableBatches, setAvailableBatches] = useState<StockBatch[]>([]);

  // View State
  const [activeView, setActiveView] = useState<'adjust' | 'history'>('adjust');
  const [historyTab, setHistoryTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [pharmacyName, setPharmacyName] = useState('ZINC');

  // Load pharmacy name from settings (ReceiptDesigner)
  React.useEffect(() => {
    try {
      const savedTemplates = localStorage.getItem('receipt_templates');
      const activeId = localStorage.getItem('receipt_active_template_id');
      if (savedTemplates && activeId) {
        const templates = JSON.parse(savedTemplates);
        const active = templates.find((t: any) => t.id === activeId);
        if (active && active.options?.storeName) {
          setPharmacyName(active.options.storeName);
        }
      }
    } catch (e) {
      console.error('Failed to load pharmacy name', e);
    }
  }, []);

  // Load history on mount or tab change
  const loadHistory = React.useCallback(async () => {
    try {
      const filters: any = { type: 'adjustment', branchId: activeBranchId };
      if (historyTab === 'pending') {
        filters.status = 'pending';
      } else if (historyTab === 'approved') {
        filters.status = 'approved';
      } else if (historyTab === 'rejected') {
        filters.status = 'rejected';
      }
      if (dateRange.from) filters.startDate = dateRange.from;
      if (dateRange.to) filters.endDate = dateRange.to;

      const data = await stockMovementService.getHistory(filters);
      const historyItems = Array.isArray(data) ? data : (data as any).items || [];
      setHistory(historyItems.slice(0, 50));
    } catch (err) {
      console.error('Failed to load history', err);
      alertError(t.common?.error || 'Failed to load history');
    }
  }, [historyTab, dateRange, activeBranchId, t.common?.error, alertError]);

  React.useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleApprove = async (movement: StockMovement) => {
    try {
      const currentEmployeeId = storage.get<string>(StorageKeys.CURRENT_EMPLOYEE_ID, 'user');

      // 1. Update Service Status
      await stockMovementService.approveMovement(movement.id, currentEmployeeId);

      // 2. Commit to Inventory (Batch or Total)
      if (movement.batchId) {
        await batchService.updateBatchQuantity(movement.batchId, movement.quantity);
      }

      // 3. Persist stock change to inventoryService (durable)
      try {
        const { inventoryService } = await import('../../services/inventory/inventoryService');
        await inventoryService.updateStockBulk([{
          id: movement.drugId,
          quantity: movement.quantity, // The difference
        }]);
      } catch (persistErr) {
        console.error('Failed to persist stock to service:', persistErr);
      }

      // 4. Sync Drug.stock with React state
      const drug = inventory.find(d => d.id === movement.drugId);
      if (drug) {
        const updatedDrug = { ...drug, stock: movement.newStock };
        onUpdateInventory(
          inventory.map(d => d.id === drug.id ? updatedDrug : d)
        );
      }

      // 5. Refresh
      loadHistory();
      success(language === 'AR' ? 'تم الموافقة على التعديل بنجاح' : 'Adjustment approved successfully');
      playSuccess();
    } catch (err) {
      console.error('Approve failed', err);
      alertError(language === 'AR' ? 'فشل في الموافقة على التعديل' : 'Failed to approve adjustment');
      playError();
    }
  };

  const handleReject = async (movement: StockMovement) => {
    try {
      const currentEmployeeId = storage.get<string>(StorageKeys.CURRENT_EMPLOYEE_ID, 'user');
      await stockMovementService.rejectMovement(movement.id, currentEmployeeId);
      loadHistory();
      info(language === 'AR' ? 'تم رفض التعديل' : 'Adjustment rejected');
    } catch (err) {
      console.error('Reject failed', err);
      alertError(language === 'AR' ? 'فشل في رفض التعديل' : 'Failed to reject adjustment');
      playError();
    }
  };

  const handleApproveAll = async () => {
    const pendingItems = history.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) {
      info(language === 'AR' ? 'لا توجد تعديلات معلقة للموافقة عليها' : 'No pending adjustments to approve');
      return;
    }

    try {
      // Best effort parallel execution
      const promises = pendingItems.map(item => handleApprove(item));
      await Promise.all(promises);
      success(language === 'AR' ? `تمت الموافقة على ${pendingItems.length} تعديلات بنجاح` : `Successfully approved ${pendingItems.length} adjustments`);
    } catch (err) {
      console.error('Failed to approve all:', err);
      alertError(language === 'AR' ? 'حدث خطأ أثناء موافقة الكل. يرجى المحاولة مرة أخرى.' : 'An error occurred while approving all. Please try again.');
    }
  };

  const handleRejectAll = async () => {
    const pendingItems = history.filter(item => item.status === 'pending');
    if (pendingItems.length === 0) {
      info(language === 'AR' ? 'لا توجد تعديلات معلقة لرفضها' : 'No pending adjustments to reject');
      return;
    }

    try {
      const currentEmployeeId = storage.get<string>(StorageKeys.CURRENT_EMPLOYEE_ID, 'user');
      const promises = pendingItems.map(item => stockMovementService.rejectMovement(item.id, currentEmployeeId));
      await Promise.all(promises);
      loadHistory();
      info(language === 'AR' ? `تم رفض ${pendingItems.length} تعديلات` : `Rejected ${pendingItems.length} adjustments`);
    } catch (err) {
      console.error('Failed to reject all:', err);
      alertError(language === 'AR' ? 'حدث خطأ أثناء رفض الكل. يرجى المحاولة مرة أخرى.' : 'An error occurred while rejecting all. Please try again.');
    }
  };

  // Global Keydown Listener (Matches POS.tsx)
  // Capture simple alphanumeric for search focus
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        activeView === 'history' ||
        batchSelectionDrug
      ) {
        return;
      }

      // 0. Print Shortcut
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 'ح')) {
        e.preventDefault();
        if (printButtonRef.current?.disabled) {
          playError();
        } else {
          printButtonRef.current?.click();
        }
        return;
      }

      // Capture simple alphanumeric for search focus
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Only focus if we are in adjustment view
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchTerm((prev) => prev + e.key);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, { capture: true });
  }, [activeView, batchSelectionDrug]);

  const handleScan = (barcode: string) => {
    if (!barcode) return;

    // 1. Find Drug
    const drug = inventory.find((d) => d.barcode === barcode || d.internalCode === barcode);

    if (!drug) {
      alertError(t.inventory?.notFound || 'Item not found');
      playError();
      return;
    }

    // 2. Check Batches
    const drugBatches = batches.filter(b => b.drugId === drug.id);

    if (drugBatches.length > 0) {
      playBeep(); // Attention needed
      setBatchSelectionDrug(drug);
      setAvailableBatches(drugBatches);
      return;
    }

    // 3. Auto Add
    addAdjustmentItem(drug, null);
    playSuccess();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r\n|\n/);
      const newAdjustments = [...adjustments];
      let addedCount = 0;

      lines.forEach((line) => {
        // Simple format: Barcode, Quantity (optional)
        const parts = line.split(',');
        const barcode = parts[0]?.trim();
        const qty = parseFloat(parts[1]?.trim()) || 0;

        if (!barcode) return;

        const drug = inventory.find((d) => d.barcode === barcode || d.internalCode === barcode);
        if (drug) {
          // Auto-select batch?
          // For bulk import, we assume counting physical stock.
          // If we have quantity, we set NEW STOCK or DIFFERENCE?
          // Usually bulk import = "Verified Count". So value is NEW STOCK.

          // If item has batches, we try to find a matching batch or pick first.
          // For MVP, let's pick first batch if exists.
          const drugBatches = batches.filter(b => b.drugId === drug.id);
          const batch = drugBatches.length > 0 ? drugBatches[0] : null;

          const currentStock = batch ? batch.quantity : drug.stock;
          const expiry = batch ? batch.expiryDate : drug.expiryDate;

          // Check uniqueness? Or just pile them up?
          // Better to check if already in list? For now just add.

          newAdjustments.push({
            drugId: drug.id,
            drugName: getFullDisplayName(drug, textTransform),
            currentStock: currentStock,
            newStock: qty > 0 ? qty : currentStock + 1, // If qty provided use it, else +1
            difference: qty > 0 ? qty - currentStock : 1,
            reason: 'inventory_count',
            notes: 'Imported via CSV',
            batchId: batch?.id,
            expiryDate: expiry,
          });
          addedCount++;
        }
      });

      if (addedCount > 0) {
        setAdjustments(newAdjustments);
        success(language === 'AR' ? `تم استيراد ${addedCount} عنصر بنجاح` : `Successfully imported ${addedCount} items`);
        playSuccess();
      } else {
        warning(language === 'AR' ? 'لم يتم العثور على عناصر صحيحة في الملف' : 'No valid items found in file');
        playError();
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = '';
  };

  // Filter inventory for search (Integrated scanning logic)
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) return [];

    // POS-like Scanner logic: If exact barcode match, we don't necessarily wait for Enter
    // but here we rely on the user selection or Enter key.
    // However, the user asked to "Auto Add" if barcode matches.

    const { regex } = parseSearchTerm(searchTerm);
    return inventory
      .filter(
        (d) =>
          regex.test(d.name) ||
          (d.barcode && d.barcode === searchTerm) || // Instant exact match check
          (d.barcode && regex.test(d.barcode)) ||
          (d.internalCode && regex.test(d.internalCode))
      )
      .slice(0, 10);
  }, [inventory, searchTerm]);

  const handleAddItem = (drug: Drug) => {
    // Check if drug has batches.
    const drugBatches = batches.filter(b => b.drugId === drug.id);

    if (drugBatches.length > 0) {
      setBatchSelectionDrug(drug);
      setAvailableBatches(drugBatches);
      setSearchTerm(''); // Close search
      return;
    }

    addAdjustmentItem(drug, null);
  };

  const {
    highlightedIndex,
    onKeyDown,
    setHighlightedIndex: _setHighlightedIndex,
  } = useSearchKeyboardNavigation({
    results: searchResults,
    onSelect: (item) => {
      handleAddItem(item);
    },
    isOpen: !!searchTerm,
    onEnterNoHighlight: () => {
      if (searchTerm) {
        handleScan(searchTerm);
      }
    },
  });

  // Hook to watch searchTerm for instant barcode matches (Like POS)
  React.useEffect(() => {
    if (!searchTerm) return;

    // If it looks like a barcode (long numeric or exact match)
    const exactDrug = inventory.find(
      (d) => d.barcode === searchTerm || d.internalCode === searchTerm
    );
    if (exactDrug) {
      handleScan(searchTerm);
      setSearchTerm(''); // Clear after scan
    }
  }, [searchTerm, inventory]);

  const addAdjustmentItem = (drug: Drug, batch: StockBatch | null) => {
    // If batch provided, use its current stock. Otherwise use drug total stock.
    const currentStock = batch ? batch.quantity : drug.stock;
    const expiry = batch ? batch.expiryDate : drug.expiryDate;

    const newItem: AdjustmentItem = {
      drugId: drug.id,
      drugName: getFullDisplayName(drug, textTransform),
      currentStock: currentStock,
      newStock: currentStock,
      difference: 0,
      reason: 'inventory_count',
      notes: '',
      batchId: batch?.id,
      expiryDate: expiry,
    };

    setAdjustments([newItem, ...adjustments]);
    setSearchTerm('');
    setBatchSelectionDrug(null);
  };

  const updateAdjustment = React.useCallback(
    (index: number, field: keyof AdjustmentItem, value: any) => {
      setAdjustments((prev) => {
        const newAdjustments = [...prev];
        const item = newAdjustments[index];

        if (field === 'newStock') {
          const newStock = parseFloat(value) || 0;
          item.newStock = newStock;
          item.difference = newStock - item.currentStock;
        } else if (field === 'difference') {
          const diff = parseFloat(value) || 0;
          item.difference = diff;
          item.newStock = item.currentStock + diff;
        } else {
          (item as any)[field] = value;
        }

        return newAdjustments;
      });
    },
    []
  );

  const removeAdjustment = React.useCallback((index: number) => {
    setAdjustments((prev) => {
      const newAdjustments = [...prev];
      newAdjustments.splice(index, 1);
      return newAdjustments;
    });
  }, []);

  const handleSave = async () => {
    if (adjustments.length === 0) return;

    // Log movements for each adjustment
    try {
      const currentEmployeeId = storage.get<string>(StorageKeys.CURRENT_EMPLOYEE_ID, 'user');
      const currentEmployeeObject = storage
        .get<any>(StorageKeys.EMPLOYEES, [])
        ?.find((e: any) => e.id === currentEmployeeId);
      const currentEmployeeName =
        currentEmployeeId === 'user'
          ? (import.meta.env.VITE_SUPER_USER || 'System User')
          : (currentEmployeeObject?.name || currentEmployeeObject?.username || (language === 'AR' ? 'مستخدم' : 'User'));

      // RBAC Check for Approval
      const isManager = permissionsService.can('inventory.approve');

      const status = isManager ? 'approved' : 'pending';

      const transactionId = idGenerator.generate('movement', activeBranchId);
      const stockMutations: { id: string; quantity: number }[] = [];

      for (const item of adjustments) {
        // Only log actual changes
        if (item.difference !== 0) {
          const drug = inventory.find(d => d.id === item.drugId);
          if (!drug) continue;

          await stockOps.adjustStock(
            drug,
            item.newStock,
            item.reason,
            {
              branchId: activeBranchId, // Fixed: use activeBranchId instead of branchCode
              performedBy: currentEmployeeId,
              performedByName: currentEmployeeName,
            },
            {
              batchId: item.batchId,
              notes: item.notes,
              transactionId: transactionId,
              status: status,
              expiryDate: item.expiryDate,
            }
          );

          // Track mutations for bulk persistence
          if (status === 'approved') {
            stockMutations.push({
              id: drug.id,
              quantity: item.difference, // The exact difference to add/subtract
            });
          }
        }
      }

      // PERSISTENCE: Apply immediately to local indexedDB if approved (in bulk)
      if (stockMutations.length > 0) {
        import('../../services/inventory/inventoryService').then(({ inventoryService }) => {
          inventoryService.updateStockBulk(stockMutations).catch(console.error);
        });
      }

      const newTransactionMovements = adjustments
        .filter((item) => item.difference !== 0)
        .map((item) => ({
          id: idGenerator.generate('generic', activeBranchId),
          drugId: item.drugId,
          drugName: item.drugName,
          branchId: activeBranchId, // Fixed: use activeBranchId instead of branchCode
          type: 'adjustment' as const,
          quantity: item.difference,
          previousStock: item.currentStock,
          newStock: item.newStock,
          reason: item.reason,
          notes: item.notes,
          transactionId: transactionId,
          batchId: item.batchId,
          expiryDate: item.expiryDate,
          performedBy: currentEmployeeId,
          performedByName: currentEmployeeName,
          status: status as 'approved' | 'pending' | 'rejected',
          timestamp: new Date().toISOString(),
        }));

      setLastTransaction(newTransactionMovements);

      if (isManager) {
        success(language === 'AR' ? 'تم تحديث المخزون بنجاح' : 'Inventory updated successfully');
      } else {
        success(language === 'AR' ? 'تم إرسال التعديلات للموافقة' : 'Adjustments submitted for approval');
      }
      playSuccess();

      // Update inventory state (Client Side) - ONLY IF APPROVED
      if (isManager) {
        // Create map of changes
        const updates = new Map(adjustments.map((a) => [a.drugId, a.newStock]));

        const updatedInventory = inventory.map((drug) => {
          if (updates.has(drug.id)) {
            return { ...drug, stock: updates.get(drug.id)! };
          }
          return drug;
        });

        onUpdateInventory(updatedInventory);
      }

      setAdjustments([]);
      loadHistory();
    } catch (err) {
      console.error('Failed to log movements:', err);
      alertError(language === 'AR' ? 'فشل في حفظ التعديلات' : 'Failed to save adjustments');
      playError();
    }
  };

  const reasons = ['damaged', 'expired', 'theft', 'inventory_count', 'correction', 'other'];

  // TanStackTable Columns
  const columns = useMemo<ColumnDef<AdjustmentItem>[]>(
    () => [
      {
        accessorKey: 'drugName',
        header: t.stockAdjustment.table.product,
        cell: (info) => {
          const item = info.row.original;
          // Try to find full drug object for reactive display, fallback to stored name
          const drug = inventory.find((d) => d.id === item.drugId);
          const displayName = drug ? getFullDisplayName(drug, textTransform) : item.drugName;

          return (
            <div>
              <div className='font-bold text-sm text-gray-900 dark:text-gray-100'>
                {displayName}
              </div>
              <div className='text-sm text-gray-500'>{item.drugId}</div>
            </div>
          );
        },
        meta: { width: 200 },
      },
      {
        accessorKey: 'expiryDate',
        header: t.barcodePrinter.tableHeaders.expiry,
        cell: (info) => {
          const item = info.row.original;
          if (!item.expiryDate && !item.batchId)
            return <span className='text-gray-400 text-xs italic'>Generic Stock</span>;

          return (
            <div className='flex flex-col'>
              <div className='text-sm text-gray-900 dark:text-gray-100'>
                {item.expiryDate ? formatExpiryDate(item.expiryDate) : 'N/A'}
              </div>
              {item.batchId && (
                <div className='mt-0.5 text-[10px] font-bold text-gray-400 opacity-80 uppercase' dir='ltr'>
                  {item.batchId}
                </div>
              )}
            </div>
          );
        },
        meta: { width: 120 },
      },
      {
        accessorKey: 'currentStock',
        header: t.stockAdjustment.table.current,
        cell: (info) => (
          <span className='px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent text-sm tabular-nums text-gray-500 dark:text-gray-400'>
            {info.getValue() as number}
          </span>
        ),
        meta: { align: 'center', width: 80 },
      },
      {
        accessorKey: 'newStock',
        header: t.stockAdjustment.table.new,
        cell: (info) => (
          <input
            type='number'
            inputMode='decimal'
            className={`w-20 text-center px-2 py-1 rounded-md border text-sm tabular-nums outline-hidden focus:ring-2 ring-blue-500/20 transition-colors
                ${
                  info.row.original.newStock !== info.row.original.currentStock
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10 text-amber-700'
                    : 'border-(--border-divider) bg-(--bg-input) text-(--text-primary)'
                }`}
            value={info.getValue() as number}
            onChange={(e) => updateAdjustment(info.row.index, 'newStock', e.target.value)}
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
        ),
        meta: { align: 'center', width: 100 },
      },
      {
        accessorKey: 'difference',
        header: t.stockAdjustment.table.diff,
        cell: (info) => {
          const val = info.getValue() as number;
          return (
            <span
              className={`font-mono font-bold text-sm tabular-nums ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-gray-400'}`}
            >
              {val > 0 ? '+' : ''}
              {val}
            </span>
          );
        },
        meta: { align: 'center', width: 80 },
      },
      {
        accessorKey: 'reason',
        header: t.stockAdjustment.table.reason,
        cell: (info) => (
          <FilterDropdown
            items={reasons}
            selectedItem={info.getValue() as string}
            isOpen={openDropdownIndex === info.row.index}
            onToggle={() =>
              setOpenDropdownIndex(openDropdownIndex === info.row.index ? null : info.row.index)
            }
            onSelect={(val) => {
              updateAdjustment(info.row.index, 'reason', val);
              setOpenDropdownIndex(null);
            }}
            renderSelected={(val) =>
              t.stockAdjustment.reasons[val as keyof typeof t.stockAdjustment.reasons] || val
            }
            renderItem={(val) =>
              t.stockAdjustment.reasons[val as keyof typeof t.stockAdjustment.reasons] || val
            }
            className='w-32 text-xs'
            minHeight={32}
            variant='input'
            floating
            color={color}
            keyExtractor={(item) => item}
            zIndexHigh='z-60'
          />
        ),
        meta: { width: 140 },
      },
      {
        accessorKey: 'notes',
        header: t.stockAdjustment.table.notes,
        cell: (info) => (
          <button
            onClick={() => setEditingNoteIndex(info.row.index)}
            className='w-full text-start text-xs px-2 py-1.5 bg-transparent border-0 border-b border-(--border-divider) hover:border-primary-500 rounded-none transition-colors text-(--text-secondary) truncate cursor-pointer italic'
          >
            {info.getValue() as string || t.stockAdjustment.notes}
          </button>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: (info) => (
          <button
            onClick={() => removeAdjustment(info.row.index)}
            className='flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors p-1'
            title={t.common?.delete || 'Delete'}
          >
            <span className='material-symbols-rounded text-lg'>delete</span>
          </button>
        ),
        meta: { align: 'center', width: 50 },
      },
    ],
    [t, inventory, openDropdownIndex, updateAdjustment, removeAdjustment, color, textTransform]
  );

  // History Table Columns
  const historyColumns = useMemo<ColumnDef<StockMovement>[]>(
    () => [
      {
        accessorKey: 'transactionId',
        header: t.common?.id || 'ID',
        cell: (info) => {
          const val = info.getValue() as string;
          return val ? (
            <span className='text-sm text-gray-500 dark:text-gray-400'>{val}</span>
          ) : (
            <span className='text-gray-400 text-xs italic'>-</span>
          );
        },
        meta: { width: 140 },
      },
      {
        accessorKey: 'timestamp',
        header: t.common?.date || 'Date',
        meta: { width: 120, align: 'center' },
      },
      {
        accessorKey: 'drugName',
        header: t.stockAdjustment.table.product,
        cell: (info) => {
          const item = info.row.original;
          const drug = inventory.find((d) => d.id === item.drugId);
          const displayName = drug ? getFullDisplayName(drug, textTransform) : item.drugName;

          return (
            <div>
              <div className='font-bold text-sm text-(--text-primary)'>
                {displayName}
              </div>
              <div className='text-sm text-gray-400 mt-0.5 uppercase tracking-tight'>
                {drug?.barcode || item.drugId}
              </div>
            </div>
          );
        },
        meta: { width: 200 },
      },
      {
        accessorKey: 'expiryDate',
        header: t.barcodePrinter.tableHeaders.expiry,
        cell: (info) => {
          const item = info.row.original;
          const hasExpiry = !!item.expiryDate;

          if (!hasExpiry && !item.batchId) {
            return <span className='text-gray-400 text-xs italic'>-</span>;
          }
          return (
            <div className='flex flex-col'>
              <span className='text-sm text-(--text-primary)'>
                {hasExpiry ? formatExpiryDate(item.expiryDate) : (language === 'AR' ? 'عام' : 'Generic')}
              </span>
              {item.batchId && (
                <div className='mt-0.5 text-[10px] font-bold text-gray-400 opacity-80 uppercase' dir='ltr'>
                  {item.batchId}
                </div>
              )}
            </div>
          );
        },
        meta: { width: 120 },
      },
      {
        accessorKey: 'quantity',
        header: t.stockAdjustment.table.diff,
        cell: (info) => (
          <span
            className={`font-mono font-bold text-xs tabular-nums px-1.5 py-0.5 rounded-lg border ${
              (info.getValue() as number) > 0
                ? 'bg-transparent border-green-200 text-green-700 dark:border-green-900/50 dark:text-green-400'
                : 'bg-transparent border-red-200 text-red-700 dark:border-red-900/50 dark:text-red-400'
            }`}
          >
            {(info.getValue() as number) > 0 ? '+' : ''}
            {info.getValue() as number}
          </span>
        ),
        meta: { align: 'center', width: 80 },
      },
      {
        accessorKey: 'reason',
        header: t.stockAdjustment.table.reason,
        cell: (info) => (
          <span className='px-1.5 py-0.5 rounded-lg bg-transparent text-xs text-(--text-secondary) capitalize border border-(--border-divider)'>
            {t.stockAdjustment.reasons[info.getValue() as keyof typeof t.stockAdjustment.reasons] ||
              info.getValue()}
          </span>
        ),
        meta: { align: 'center' },
      },
      {
        accessorKey: 'performedByName',
        header: t.intelligence.audit.columns.employee,
        cell: (info) => (
          <span className='text-xs text-gray-500'>
            {(info.getValue() as string) || info.row.original.performedBy}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: (info) => {
          const item = info.row.original;
          const status = item.status;
          const isPending = status === 'pending';

          return (
            <div className='flex items-center justify-end gap-3 w-full'>
              {/* Status Badge */}
              <span
                className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-transparent border ${
                  isPending
                    ? 'text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-900/50'
                    : status === 'rejected'
                      ? 'text-red-700 border-red-200 dark:text-red-400 dark:border-red-900/50'
                      : 'text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-900/50'
                }`}
              >
                <span className='material-symbols-rounded text-sm'>
                  {isPending ? 'schedule' : status === 'rejected' ? 'cancel' : 'check_circle'}
                </span>
                {isPending ? t.purchases.status.pending : status}
              </span>

              {/* Action Buttons (only if pending) */}
              {isPending && permissionsService.can('inventory.approve') && (
                <div className='flex gap-1'>
                  <button
                    onClick={() => handleApprove(item)}
                    className='p-1 px-2 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-transparent text-emerald-700 dark:text-emerald-400 text-xs font-bold transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10 active:scale-95 cursor-pointer'
                  >
                    {t.pendingApproval.approve}
                  </button>
                  <button
                    onClick={() => handleReject(item)}
                    className='p-1 px-2 rounded-lg border border-red-200 dark:border-red-500/30 bg-transparent text-red-700 dark:text-red-400 text-xs font-bold transition-all hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 cursor-pointer'
                  >
                    {t.pendingApproval.reject}
                  </button>
                </div>
              )}
            </div>
          );
        },
        meta: { align: 'end', width: 160 },
      },
    ],
    [t, handleApprove, handleReject, inventory, textTransform]
  );

  const handlePrint = () => {
    window.print();
  };

  // Search Columns Definition
  const searchColumns = useMemo(
    () => [
      {
        header: t.inventory?.headers?.codes || 'Codes',
        width: 'w-32 shrink-0',
        className: 'text-gray-900 dark:text-gray-400',
        render: (drug: Drug) => drug.barcode || drug.internalCode || '---',
      },
      {
        header: t.stockAdjustment?.table?.product || 'Name',
        width: 'flex-1',
        className: 'text-gray-900 dark:text-gray-400',
        render: (drug: Drug) => getDisplayName(drug, textTransform), // Passed textTransform
      },
      {
        header: t.inventory?.headers?.expiry || 'Expiry',
        width: 'w-24 shrink-0',
        className: 'justify-center text-center text-gray-900 dark:text-gray-400',
        render: (drug: Drug) => {
          if (!drug.expiryDate) return '---';
          return formatExpiryDate(drug.expiryDate);
        },
      },
      {
        header: t.inventory?.headers?.stock || 'Stock',
        width: 'w-[60px] shrink-0',
        className: 'justify-center text-center text-gray-900 dark:text-gray-400',
        render: (drug: Drug) => (
          <div className='tabular-nums border border-(--border-divider) text-(--text-secondary) bg-transparent px-2 py-0.5 rounded-lg shrink-0 min-w-[36px] text-center'>
            {drug.stock}
          </div>
        ),
      },
    ],
    [t, textTransform] // Added textTransform to dependencies
  );

  return (
    <div className='h-full flex flex-col space-y-4 animate-fade-in'>
      {/* Header */}

      <div>
        <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div>
            <h1 className='text-2xl font-bold tracking-tight text-(--text-primary) page-title'>
              {t.stockAdjustment.title}
            </h1>
            <p className='text-sm text-(--text-secondary)'>{t.stockAdjustment.subtitle}</p>
          </div>

          <div className='self-start md:self-center'>
            <SegmentedControl
              options={[
                { label: t.stockAdjustment.adjustStock, value: 'adjust' },
                { label: t.stockAdjustment.historyLog, value: 'history' },
              ]}
              value={activeView}
              onChange={(val) => setActiveView(val as 'adjust' | 'history')}
              variant='onPage'
              shape='pill'
              color='blue'
              size='sm'
            />
          </div>
        </div>

        <div className='flex flex-wrap items-center gap-4 mt-6'>
          {activeView === 'adjust' && (
            <div className='flex-1 relative z-30 flex items-center gap-3 max-w-xl'>
              <div className='relative flex-1'>
                <SearchInput
                  ref={searchInputRef}
                  value={searchTerm}
                  onSearchChange={setSearchTerm}
                  placeholder={t.stockAdjustment.searchPlaceholder}
                  className='w-full'
                  onKeyDown={(e) => {
                    if (!searchTerm || searchResults.length === 0) return;
                    onKeyDown(e);
                  }}
                />
                <SearchDropdown
                  results={searchResults}
                  onSelect={handleAddItem}
                  columns={searchColumns}
                  emptyMessage={t.inventory?.noResults}
                  isVisible={!!searchTerm}
                  highlightedIndex={highlightedIndex}
                />
              </div>
            </div>
          )}

          {activeView === 'adjust' && (
            <input
              ref={fileInputRef}
              type='file'
              accept='.csv,.txt'
              className='hidden'
              onChange={handleFileUpload}
            />
          )}
        </div>
      </div>

      {/* Main Content */}
      {activeView === 'adjust' ? (
        <div className='flex flex-col gap-6 flex-1 min-h-0'>
          {/* Bottom Row: Adjustment Table (Full Width) */}
          <div
            className={`flex-1 ${CARD_BASE} rounded-3xl flex flex-col overflow-hidden shadow-lg border-0 ring-1 ring-(--border-divider)`}
          >
            <div className='p-4 flex justify-between items-center'>
              <div className='flex items-center gap-2'>
                <h3 className='font-bold text-gray-800 dark:text-gray-200'>
                  {t.stockAdjustment.title}
                </h3>
                <span className='px-2 py-0.5 rounded-full border border-(--border-divider) bg-transparent text-xs font-bold text-(--text-tertiary)'>
                  {adjustments.length}
                </span>
              </div>
              <div className='flex gap-2 items-center'>
                {/* Import/Print Actions */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className='flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border border-(--border-divider) bg-(--bg-card) text-(--text-secondary) hover:bg-(--bg-hover) transition-all active:enabled:scale-95 cursor-pointer'
                >
                  {t.global.actions.import}
                  <span className='material-symbols-rounded text-base'>upload_file</span>
                </button>
                <button
                  ref={printButtonRef}
                  onClick={handlePrint}
                  disabled={adjustments.length === 0}
                  className='flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border border-(--border-divider) bg-(--bg-card) text-(--text-secondary) hover:bg-(--bg-hover) transition-all active:enabled:scale-95 disabled:opacity-50 disabled:grayscale cursor-pointer'
                >
                  {t.global.actions.print}
                  <span className='material-symbols-rounded text-base'>print</span>
                </button>

                <div className='w-px h-6 bg-(--border-divider) mx-1'></div>

                <button
                  onClick={setAdjustments.bind(null, [])}
                  disabled={adjustments.length === 0}
                  className='text-xs font-bold text-(--text-tertiary) enabled:hover:text-red-600 disabled:opacity-30 transition-colors px-2 cursor-pointer'
                >
                  {t.stockAdjustment.clear}
                </button>
                <button
                  onClick={handleSave}
                  disabled={adjustments.length === 0}
                  className={`px-6 py-2 rounded-xl text-xs font-extrabold text-white dark:text-black bg-black dark:bg-white enabled:hover:bg-black/80 dark:enabled:hover:bg-white/80 disabled:opacity-40 transition-all active:enabled:scale-95 cursor-pointer`}
                >
                  {t.stockAdjustment.save}
                </button>
              </div>
            </div>

            <div className='flex-1 relative bg-(--bg-card) overflow-y-auto'>
              <TanStackTable
                data={adjustments}
                columns={columns}
                emptyMessage={t.stockAdjustment.empty || 'No items added. Scan or search to begin.'}
                color={color}
                lite={true}
                enablePagination={true}
                enableVirtualization={false}
                pageSize='auto'
                enableShowAll={true}
              />
            </div>
          </div>
        </div>
      ) : (
        /* History / Audit View */
        <div
          className={`flex-1 min-h-0 flex flex-col ${CARD_BASE} rounded-3xl shadow-lg border-0 ring-1 ring-(--border-divider) overflow-hidden`}
        >
          <div className='p-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-(--border-divider)'>
            <div className='flex items-center gap-2'>
              <h3 className='font-bold text-(--text-primary)'>
                {t.stockAdjustment.history || 'Adjustment History'}
              </h3>
            </div>

            <div className='flex flex-wrap items-center gap-2 w-full xl:w-auto'>
              {/* Refresh */}
              <button
                onClick={loadHistory}
                className='w-8 h-8 flex items-center justify-center rounded-lg text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-hover) transition-colors'
              >
                <span className='material-symbols-rounded text-lg'>refresh</span>
              </button>

              {/* Print */}
              <button
                ref={printButtonRef}
                onClick={handlePrint}
                disabled={history.length === 0}
                className='flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border border-(--border-divider) bg-(--bg-card) text-(--text-secondary) hover:bg-(--bg-hover) transition-all active:scale-95 h-8 disabled:opacity-50 disabled:grayscale'
              >
                {t.global.actions.print}
                <span className='material-symbols-rounded text-base'>print</span>
              </button>

              {/* Date Range */}
              <DateRangePicker
                startDate={dateRange.from}
                endDate={dateRange.to}
                onStartDateChange={(val) => setDateRange((prev) => ({ ...prev, from: val }))}
                onEndDateChange={(val) => setDateRange((prev) => ({ ...prev, to: val }))}
                color={color}
                locale={language === 'AR' ? 'ar-EG' : 'en-US'}
              />

              {/* Bulk Actions (Visible if pending tab) */}
              {historyTab === 'pending' && history.some(i => i.status === 'pending') && permissionsService.can('inventory.approve') && (
                <div className="flex gap-1.5 items-center">
                  <button
                    onClick={handleApproveAll}
                    title={language === 'AR' ? 'موافقة الكل' : 'Approve All'}
                    className='h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 dark:border-emerald-500/30 bg-transparent text-emerald-700 dark:text-emerald-400 font-bold text-xs transition-all hover:bg-emerald-50 dark:hover:bg-emerald-500/10 active:scale-95 cursor-pointer'
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: '16px' }}>done_all</span>
                    <span>{language === 'AR' ? 'موافقة الكل' : 'Approve All'}</span>
                  </button>
                  <button
                    onClick={handleRejectAll}
                    title={language === 'AR' ? 'رفض الكل' : 'Reject All'}
                    className='h-8 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 dark:border-red-500/30 bg-transparent text-red-700 dark:text-red-400 font-bold text-xs transition-all hover:bg-red-50 dark:hover:bg-red-500/10 active:scale-95 cursor-pointer'
                  >
                    <span className='material-symbols-rounded' style={{ fontSize: '16px' }}>close</span>
                    <span>{language === 'AR' ? 'رفض الكل' : 'Reject All'}</span>
                  </button>
                </div>
              )}

              {/* Filter Tabs */}
              <div className='ml-auto xl:ml-0 overflow-x-auto min-w-0 max-w-[full] flex'>
                <SegmentedControl<'all' | 'pending' | 'approved' | 'rejected'>
                  value={historyTab}
                  onChange={(v) => setHistoryTab(v)}
                  options={[
                    { label: t.purchases.status.pending, value: 'pending' as const, icon: 'pending_actions', activeColor: 'amber' },
                    { label: language === 'AR' ? 'موافق عليه' : 'Approved', value: 'approved' as const, icon: 'check_circle', activeColor: 'emerald' },
                    { label: language === 'AR' ? 'مرفوض' : 'Rejected', value: 'rejected' as const, icon: 'cancel', activeColor: 'red' },
                    { label: t.global.actions.all, value: 'all' as const },
                  ]}
                  size='xs'
                  iconSize='--icon-md'
                  color={color}
                  fullWidth={false}
                />
              </div>
            </div>
          </div>

          <div className='flex-1 relative bg-transparent overflow-y-auto'>
            <TanStackTable
              data={history}
              columns={historyColumns}
              emptyMessage={t.stockAdjustment.noHistory}
              color={color}
              lite={true}
              dense={true}
              enablePagination={true}
              enableVirtualization={false}
              pageSize='auto'
              enableShowAll={true}
            />
          </div>
        </div>
      )}

      {/* Batch Selection Modal */}
      {batchSelectionDrug && (
        <Modal
          isOpen={true}
          onClose={() => setBatchSelectionDrug(null)}
          title={t.stockAdjustment?.selectBatch || 'Select Batch'}
          icon='layers'
          size='md'
        >
          <div className='space-y-4'>
            <div>
              <h4 className='font-black text-base text-gray-900 dark:text-white'>
                {getDisplayName(batchSelectionDrug, textTransform)}
              </h4>
              <p className='text-xs text-gray-500'>
                {t.inventory?.selectBatchSubtitle || 'Select a batch for adjustment'}
              </p>
            </div>

            <div className='space-y-2 max-h-[300px] overflow-y-auto'>
              {availableBatches.map((batch) => (
                <button
                  key={batch.id}
                  onClick={() => addAdjustmentItem(batchSelectionDrug, batch)}
                  className='w-full text-start p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex justify-between items-center group'
                >
                  <div>
                    <div className='text-sm font-bold text-gray-800 dark:text-gray-200'>
                      {t.inventory.headers.expiry}:{' '}
                      {new Date(batch.expiryDate).toLocaleDateString()}
                    </div>
                    <div className='mt-0.5 text-[10px] font-bold text-gray-400 opacity-80 uppercase' dir='ltr'>
                      {batch.id}
                    </div>
                  </div>
                  <div className='text-sm tabular-nums border border-gray-200 dark:border-gray-800 bg-transparent px-2 py-0.5 rounded-lg'>
                    {t.barcodePrinter.tableHeaders.qty}: {batch.quantity}
                  </div>
                </button>
              ))}

              <button
                onClick={() => addAdjustmentItem(batchSelectionDrug, null)}
                className='w-full text-center p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:text-primary-600 hover:border-blue-300 transition-colors text-sm font-medium'
              >
                {t.inventory.actionsMenu.adjustStock} ({t.global.actions.all})
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Notes Modal */}
      {editingNoteIndex !== null && (
        <Modal
          isOpen={true}
          onClose={() => setEditingNoteIndex(null)}
          hideCloseButton={true}
          title={t.stockAdjustment.notes}
          size='sm'
          bodyClassName='p-1.5'
          icon='edit_note'
        >
          <div className='flex flex-col gap-2'>
            <div className='bg-zinc-50 dark:bg-zinc-900/50 p-2.5 rounded-xl border border-zinc-100 dark:border-zinc-800/50'>
              <div className='flex flex-col gap-1'>
                <label className='text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest'>
                  {t.stockAdjustment.table.notes}
                </label>
                <textarea
                  autoFocus
                  className='w-full bg-transparent border-0 outline-hidden !py-1.5 text-sm min-h-[100px] text-(--text-primary) resize-none'
                  value={adjustments[editingNoteIndex]?.notes || ''}
                  onChange={(e) => updateAdjustment(editingNoteIndex, 'notes', e.target.value)}
                  placeholder={t.stockAdjustment.notes}
                />
              </div>
            </div>

            <div className='flex justify-end gap-1.5 p-1'>
              <button
                onClick={() => setEditingNoteIndex(null)}
                className='px-4 py-1.5 text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-all cursor-pointer'
              >
                {t.common?.cancel || 'Cancel'}
              </button>
              <button
                onClick={() => setEditingNoteIndex(null)}
                className='px-6 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest text-white dark:text-black bg-black dark:bg-white hover:opacity-90 transition-all active:scale-95 cursor-pointer shadow-lg shadow-black/10 dark:shadow-white/5'
              >
                {t.common?.save || 'Save'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable Section (Hidden on Screen) */}
      <StockAdjustmentPrint
        isRTL={isRTL}
        t={t}
        pharmacyName={pharmacyName}
        activeView={activeView}
        data={activeView === 'history' ? history : lastTransaction}
      />
    </div>
  );
};
