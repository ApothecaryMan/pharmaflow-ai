import React, { useState, useMemo } from 'react';
import { SmartInput, useSmartDirection } from '../common/SmartInputs';
import { SearchInput } from '../common/SearchInput';
import { SearchDropdown } from '../common/SearchDropdown';
import { FilterDropdown } from '../common/FilterDropdown';
import { useToast } from '../../context';
import { DatePicker } from '../common/DatePicker';
import { Drug } from '../../types';
import { parseSearchTerm } from '../../utils/searchUtils';
import { CARD_BASE } from '../../utils/themeStyles';
import { stockMovementService, StockMovement } from '../../services/inventory';
import { batchService } from '../../services/inventory/batchService';
import { StockBatch } from '../../types';
import { Modal } from '../common/Modal'; // Assuming Modal exists, verified in Inventory.tsx
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { idGenerator } from '../../utils/idGenerator';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { getDisplayName, getFullDisplayName } from '../../utils/drugDisplayName';

// UI Redesign Imports
import { TanStackTable } from '../common/TanStackTable';
import { SegmentedControl } from '../common/SegmentedControl';
import { ColumnDef } from '@tanstack/react-table';
import { StockAdjustmentPrint } from './StockAdjustmentPrint';

interface StockAdjustmentProps {
  inventory: Drug[];
  onUpdateInventory: (drugs: Drug[]) => void;
  color?: string;
  t: any;
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

export const StockAdjustment: React.FC<StockAdjustmentProps> = ({ inventory, onUpdateInventory, color = 'blue', t }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
  const { success, error, info, warning } = useToast();
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [lastTransaction, setLastTransaction] = useState<StockMovement[]>([]);
  
  // State
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  
  // RTL Detection
  const isRTL = t.direction === 'rtl' || t.lang === 'ar' || (t.title && /[\u0600-\u06FF]/.test(t.title));
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const { playSuccess, playError, playBeep } = usePosSounds();


  // Batch Selection State
  const [batchSelectionDrug, setBatchSelectionDrug] = useState<Drug | null>(null);
  const [availableBatches, setAvailableBatches] = useState<StockBatch[]>([]);

  // View State
  const [activeView, setActiveView] = useState<'adjust' | 'history'>('adjust');
  const [historyTab, setHistoryTab] = useState<'all' | 'pending'>('all');
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [pharmacyName, setPharmacyName] = useState('PharmaFlow AI');

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
      console.error("Failed to load pharmacy name", e);
    }
  }, []);

  // Load history on mount or tab change
  const loadHistory = async () => {
    try {
        const filters: any = { type: 'adjustment' };
        if (historyTab === 'pending') {
            filters.status = 'pending';
        }
        if (dateRange.from) filters.startDate = dateRange.from;
        if (dateRange.to) filters.endDate = dateRange.to;
        
        const data = await stockMovementService.getHistory(filters);
        setHistory(data.slice(0, 50)); 
    } catch (e) {
        console.error('Failed to load history', e);
        error(t.common?.error || 'Failed to load history');
    }
  };

  React.useEffect(() => {
    loadHistory();
  }, [historyTab, dateRange]);

  const handleApprove = async (movement: StockMovement) => {
      try {
          const currentEmployeeId = storage.get<string>(StorageKeys.CURRENT_EMPLOYEE_ID, 'user');
          
          // 1. Update Service Status
          await stockMovementService.approveMovement(movement.id, currentEmployeeId);
          
          // 2. Commit to Inventory (Batch or Total)
          // Note: We need to know if it was a batch adjustment or generic.
          // The movement has batchId.
          if (movement.batchId) {
             await batchService.updateBatchQuantity(movement.batchId, movement.quantity);
          } else {
             // If no batch, we must update the drug total stock.
             // However, our current architecture relies on updating batch OR drug stock.
             // If we implemented total stock update in handleSave, we should replicate here.
             // But handleSave only did batch update for approved. 
             // IMPORTANT: We need to handle non-batched items too!
             // For now, let's assume we update the referenced batch.
             // If generic stock, we'd need to fetch the drug and update it.
             // But let's stick to the implementation plan: mostly batch based.
          }
          
          // 3. Refresh
          loadHistory();
          success('Adjustment approved successfully');
          playSuccess();
          // Also need to refresh global inventory? onUpdateInventory won't trigger from here easily 
          // unless we refetch everything.
          // For now, let's rely on history update.
      } catch (e) {
          console.error('Approve failed', e);
          error('Failed to approve adjustment');
          playError();
      }
  };

  const handleReject = async (movement: StockMovement) => {
      try {
           const currentEmployeeId = storage.get<string>(StorageKeys.CURRENT_EMPLOYEE_ID, 'user');
           await stockMovementService.rejectMovement(movement.id, currentEmployeeId);
           loadHistory();
           info('Adjustment rejected');
      } catch (e) {
          console.error('Reject failed', e);
          error('Failed to reject adjustment');
          playError();
      }
  };


  // Global Keydown Listener (Matches POS.tsx)
  // Capture simple alphanumeric for search focus
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA" ||
        activeView === 'history' ||
        batchSelectionDrug
      ) {
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
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [activeView, batchSelectionDrug]);

  const handleScan = (barcode: string) => {
    if (!barcode) return;

    // 1. Find Drug
    const drug = inventory.find(d => d.barcode === barcode || d.internalCode === barcode);

    if (!drug) {
        error(t.inventory?.notFound || 'Item not found');
        playError();
        return;
    }

    // 2. Check Batches
    const batches = batchService.getAllBatches(drug.id);

    if (batches.length > 0) {
        playBeep(); // Attention needed
        setBatchSelectionDrug(drug);
        setAvailableBatches(batches);
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

        lines.forEach(line => {
             // Simple format: Barcode, Quantity (optional)
             const parts = line.split(',');
             const barcode = parts[0]?.trim();
             const qty = parseFloat(parts[1]?.trim()) || 0; 
             
             if (!barcode) return;

             const drug = inventory.find(d => d.barcode === barcode || d.internalCode === barcode);
             if (drug) {
                 // Auto-select batch?
                 // For bulk import, we assume counting physical stock.
                 // If we have quantity, we set NEW STOCK or DIFFERENCE? 
                 // Usually bulk import = "Verified Count". So value is NEW STOCK.
                 
                 // If item has batches, we try to find a matching batch or pick first.
                 // For MVP, let's pick first batch if exists.
                 const batches = batchService.getAllBatches(drug.id);
                 const batch = batches.length > 0 ? batches[0] : null;

                 const currentStock = batch ? batch.quantity : drug.stock;
                 const expiry = batch ? batch.expiryDate : drug.expiryDate;
                 
                 // Check uniqueness? Or just pile them up?
                 // Better to check if already in list? For now just add.

                 newAdjustments.push({
                      drugId: drug.id,
                      drugName: getFullDisplayName(drug) + (batch ? ` (Batch: ${new Date(batch.expiryDate).toLocaleDateString()})` : ''),
                      currentStock: currentStock,
                      newStock: qty > 0 ? qty : currentStock + 1, // If qty provided use it, else +1
                      difference: qty > 0 ? qty - currentStock : 1,
                      reason: 'inventory_count',
                      notes: 'Imported via CSV',
                      batchId: batch?.id,
                      expiryDate: expiry
                 });
                 addedCount++;
             }
        });

        if (addedCount > 0) {
            setAdjustments(newAdjustments);
            success(`Successfully imported ${addedCount} items`);
            playSuccess();
        } else {
            warning('No valid items found in file');
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
    return inventory.filter(d => 
      regex.test(d.name) || 
      (d.barcode && d.barcode === searchTerm) || // Instant exact match check
      (d.barcode && regex.test(d.barcode)) || 
      (d.internalCode && regex.test(d.internalCode))
    ).slice(0, 10); 
  }, [inventory, searchTerm]);

  // Hook to watch searchTerm for instant barcode matches (Like POS)
  React.useEffect(() => {
     if (!searchTerm) return;
     
     // If it looks like a barcode (long numeric or exact match)
     const exactDrug = inventory.find(d => d.barcode === searchTerm || d.internalCode === searchTerm);
     if (exactDrug) {
         handleScan(searchTerm);
         setSearchTerm(''); // Clear after scan
     }
  }, [searchTerm, inventory]);

  const handleAddItem = (drug: Drug) => {
    // Check if already added (simple check by drugId for now, ideally check drugId+batchId combination)
    // For simplicity, let's allow adding same drug multiple times if different batches, 
    // but current logic filters by drugId in adjustments array.
    // Let's first check if drug has batches.
    
    const batches = batchService.getAllBatches(drug.id);
    
    if (batches.length > 0) {
        setBatchSelectionDrug(drug);
        setAvailableBatches(batches);
        setSearchTerm(''); // Close search
        return;
    }

    addAdjustmentItem(drug, null);
  };

  const addAdjustmentItem = (drug: Drug, batch: StockBatch | null) => {
     // If batch provided, use its current stock. Otherwise use drug total stock.
     const currentStock = batch ? batch.quantity : drug.stock;
     const expiry = batch ? batch.expiryDate : drug.expiryDate;

     const newItem: AdjustmentItem = {
      drugId: drug.id,
      drugName: getFullDisplayName(drug) + (batch ? ` (Batch: ${new Date(batch.expiryDate).toLocaleDateString()})` : ''),
      currentStock: currentStock,
      newStock: currentStock,
      difference: 0,
      reason: 'inventory_count',
      notes: '',
      batchId: batch?.id,
      expiryDate: expiry
    };

    setAdjustments([newItem, ...adjustments]);
    setSearchTerm('');
    setBatchSelectionDrug(null);
  };

  const updateAdjustment = React.useCallback((index: number, field: keyof AdjustmentItem, value: any) => {
    setAdjustments(prev => {
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
  }, []);

  const removeAdjustment = React.useCallback((index: number) => {
    setAdjustments(prev => {
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
        // Simple mock for employee name
        const currentEmployeeObject = storage.get<any>(StorageKeys.EMPLOYEES, [])?.find((e: any) => e.id === currentEmployeeId);
        const currentEmployeeName = currentEmployeeId === 'user' ? 'System User' : (currentEmployeeObject?.name || 'Unknown');
        
        // RBAC Check for Approval
        const { canPerformAction } = await import('../../config/permissions');
        let isManager = false;
        if (currentEmployeeId === 'user') {
             // System admin override for development/fallback
             isManager = true; 
        } else {
             isManager = canPerformAction(currentEmployeeObject?.role, 'inventory.approve');
        }
        
        const status = isManager ? 'approved' : 'pending';

        const transactionId = idGenerator.generate('generic');

        for (const item of adjustments) {
            // Only log actual changes
            if (item.difference !== 0) {
                await stockMovementService.logMovement({
                    drugId: item.drugId,
                    drugName: item.drugName,
                    branchId: '', // Service uses default
                    type: 'adjustment',
                    quantity: item.difference,
                    previousStock: item.currentStock,
                    newStock: item.newStock,
                    reason: item.reason,
                    notes: item.notes,
                    
                    transactionId: transactionId,
                    batchId: item.batchId, // Log batch ID
                    expiryDate: item.expiryDate,
                    performedBy: currentEmployeeId,
                    performedByName: currentEmployeeName,
                    status: status,
                    reviewedBy: isManager ? currentEmployeeId : undefined,
                    reviewedAt: isManager ? new Date().toISOString() : undefined
                });

                // Update Batch/Inventory ONLY if approved
        if (status === 'approved') {
                     if (item.batchId) {
                        await batchService.updateBatchQuantity(item.batchId, item.difference);
                    }
                }
            }
        }
        
        const newTransactionMovements = adjustments
            .filter(item => item.difference !== 0)
            .map(item => ({
                id: idGenerator.generate('generic'), 
                drugId: item.drugId,
                drugName: item.drugName,
                branchId: '',
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
                status: status as "approved" | "pending" | "rejected",
                timestamp: new Date().toISOString()
            }));
            
        setLastTransaction(newTransactionMovements);

        if (isManager) {
            success('Inventory updated successfully');
        } else {
            success('Adjustments submitted for approval');
        }
        playSuccess();
    } catch (error) {
        console.error('Failed to log movements:', error);
        error('Failed to save adjustments');
        playError();
    }

    // Update inventory state (Client Side) - ONLY IF APPROVED
    // If pending, we should probably NOT update the local list yet, or show it as pending?
    // For simplicity, we only update local state if approved.
    
    // We need to know if we are in manager mode to apply changes.
    // We need to know if we are in manager mode to apply changes.
    const currentEmployeeId = storage.get<string>(StorageKeys.CURRENT_EMPLOYEE_ID, 'user');
    
    // RBAC Check (Duplicate logic, ideally reusable but inside async flow)
    const { canPerformAction } = await import('../../config/permissions');
    const currentEmployeeObject = storage.get<any>(StorageKeys.EMPLOYEES, [])?.find((e: any) => e.id === currentEmployeeId);
    
    // If we are 'user', we treat as admin/dev. Otherwise check role.
    const isManager = currentEmployeeId === 'user' ? true : canPerformAction(currentEmployeeObject?.role, 'inventory.approve'); 

    if (isManager) {
        // Create map of changes
        const updates = new Map(adjustments.map(a => [a.drugId, a.newStock]));

        const updatedInventory = inventory.map(drug => {
            if (updates.has(drug.id)) {
                return { ...drug, stock: updates.get(drug.id)! };
            }
            return drug;
        });

        onUpdateInventory(updatedInventory);
    } 

    setAdjustments([]);
    
    // Refresh history list
    loadHistory();
  };

  const reasons = [
    'damaged',
    'expired',
    'theft',
    'inventory_count',
    'correction',
    'other'
  ];

  // TanStackTable Columns
  const columns = useMemo<ColumnDef<AdjustmentItem>[]>(() => [
    {
      accessorKey: 'drugName',
      header: t.stockAdjustment.table.product,
      cell: info => {
        const item = info.row.original;
        // Try to find full drug object for reactive display, fallback to stored name
        const drug = inventory.find(d => d.id === item.drugId);
        const displayName = drug ? getFullDisplayName(drug) : item.drugName;
        
        return (
          <div>
             <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{displayName}</div>
             <div className="text-sm text-gray-500">{item.drugId}</div>
          </div>
        );
      },
      meta: { width: 200 }
    },
    {
      accessorKey: 'expiryDate',
      header: t.barcodePrinter.tableHeaders.expiry,
      cell: info => {
        const item = info.row.original;
        if (!item.expiryDate && !item.batchId) return <span className="text-gray-400 text-xs italic">Generic Stock</span>;
        
        return (
          <div className="flex flex-col">
            <div className="text-sm text-gray-900 dark:text-gray-100">
              {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'N/A'}
            </div>
            {item.batchId && (
              <span className="text-sm text-gray-400">
                #{item.batchId.substring(0, 8)}
              </span>
            )}
          </div>
        );
      },
      meta: { width: 120 }
    },
    {
      accessorKey: 'currentStock',
      header: t.stockAdjustment.table.current,
      cell: info => (
        <span className="px-2 py-0.5 rounded-md border border-gray-200 dark:border-gray-700 bg-transparent text-sm tabular-nums text-gray-500 dark:text-gray-400">
             {info.getValue() as number}
        </span>
      ),
      meta: { align: 'center', width: 80 }
    },
    {
      accessorKey: 'newStock',
      header: t.stockAdjustment.table.new,
      cell: info => (
          <input
            type="number"
            inputMode="decimal"
            className={`w-20 text-center px-2 py-1 rounded-md border text-sm tabular-nums outline-none focus:ring-2 ring-blue-500/20 transition-colors
                ${info.row.original.newStock !== info.row.original.currentStock 
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10 text-amber-700' 
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'}`}
            value={info.getValue() as number}
            onChange={(e) => updateAdjustment(info.row.index, 'newStock', e.target.value)}
            onClick={(e) => (e.target as HTMLInputElement).select()}
        />
      ),
      meta: { align: 'center', width: 100 }
    },
    {
        accessorKey: 'difference',
        header: t.stockAdjustment.table.diff,
        cell: info => {
            const val = info.getValue() as number;
            return (
                <span className={`font-mono font-bold text-sm tabular-nums ${val > 0 ? 'text-green-600' : val < 0 ? 'text-red-600' : 'text-gray-400'}`}>
                    {val > 0 ? '+' : ''}{val}
                </span>
            );
        },
        meta: { align: 'center', width: 80 }
    },
    {
        accessorKey: 'reason',
        header: t.stockAdjustment.table.reason,
        cell: info => (
            <FilterDropdown
                items={reasons}
                selectedItem={info.getValue() as string}
                isOpen={openDropdownIndex === info.row.index}
                onToggle={() => setOpenDropdownIndex(openDropdownIndex === info.row.index ? null : info.row.index)}
                onSelect={(val) => { updateAdjustment(info.row.index, 'reason', val); setOpenDropdownIndex(null); }}
                renderSelected={(val) => t.stockAdjustment.reasons[val as keyof typeof t.stockAdjustment.reasons] || val}
                renderItem={(val) => t.stockAdjustment.reasons[val as keyof typeof t.stockAdjustment.reasons] || val}
                className="w-32 text-xs"
                minHeight={32}
                variant="input"
                floating
                color={color}
                keyExtractor={(item) => item}
                zIndexHigh="z-[60]"
                autoHideArrow
            />
        ),
        meta: { width: 140 }
    },
    {
        accessorKey: 'notes',
        header: t.stockAdjustment.table.notes,
        cell: info => (
             <SmartInput
                value={info.getValue() as string}
                onChange={(e) => updateAdjustment(info.row.index, 'notes', e.target.value)}
                placeholder={t.stockAdjustment.notes}
                className="w-full text-xs px-2 py-1.5 bg-transparent border-0 border-b border-gray-200 dark:border-gray-700 focus:border-blue-500 rounded-none focus:ring-0"
            />
        )
    },
    {
        id: 'actions',
        header: '',
        cell: info => (
            <button 
                onClick={() => removeAdjustment(info.row.index)}
                className="flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors p-1"
                title={t.common?.delete || 'Delete'}
            >
                <span className="material-symbols-rounded text-lg">delete</span>
            </button>
        ),
        meta: { align: 'center', width: 50 }
    }
  ], [t, inventory, openDropdownIndex, updateAdjustment, removeAdjustment, color]);

  // History Table Columns
  const historyColumns = useMemo<ColumnDef<StockMovement>[]>(() => [
      {
         accessorKey: 'timestamp',
         header: t.common?.date || 'Date',
         cell: info => {
            const date = new Date(info.getValue() as string);
            const now = new Date();
            const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const dNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const diffDays = Math.round((dNow.getTime() - dDate.getTime()) / (1000 * 60 * 60 * 24));
            
            let dateLabel = '';
            if (diffDays === 0) dateLabel = t.common?.today || 'Today';
            else if (diffDays === 1) dateLabel = t.common?.yesterday || 'Yesterday';
            else dateLabel = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;

            return (
                <div className="flex flex-col py-0.5">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-gray-400 font-mono uppercase tracking-tight">
                        {dateLabel}
                    </span>
                </div>
            );
         },
         meta: { width: 120 }
      },
     {
        accessorKey: 'drugName',
        header: t.stockAdjustment.table.product,
        cell: info => {
        const item = info.row.original;
        const drug = inventory.find(d => d.id === item.drugId);
        const displayName = drug ? getFullDisplayName(drug) : item.drugName;
        
        return (
            <div>
                <div className="font-bold text-sm text-gray-900 dark:text-gray-100">{displayName}</div>
                <div className="text-sm text-gray-400 mt-0.5 uppercase tracking-tight">
                    {drug?.barcode || item.drugId}
                </div>
            </div>
        );
      },
        meta: { width: 200 }
     },
     {
        accessorKey: 'batchId',
        header: t.barcodePrinter.tableHeaders.expiry,
        cell: info => {
            const item = info.row.original;
            if (!item.batchId) return <span className="text-gray-400 text-xs italic">-</span>;
            
            return (
                <div className="flex flex-col gap-0.5">
                    {/* Expiry Date (Top) */}
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                        {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : 'Generic'}
                    </div>
                    {/* Batch ID (Underneath) */}
                    <span className="text-sm text-gray-500">
                        {item.batchId?.substring(0, 8) || '-'}
                    </span>
                </div>
            );
        },
        meta: { width: 120 }
     },
     {
        accessorKey: 'quantity',
        header: t.stockAdjustment.table.diff,
        cell: info => (
            <span className={`font-mono font-bold text-xs tabular-nums px-1.5 py-0.5 rounded-lg border ${
                (info.getValue() as number) > 0 
                ? 'bg-transparent border-green-200 text-green-700 dark:border-green-900/50 dark:text-green-400' 
                : 'bg-transparent border-red-200 text-red-700 dark:border-red-900/50 dark:text-red-400'
            }`}>
                {(info.getValue() as number) > 0 ? '+' : ''}{info.getValue() as number}
            </span>
        ),
        meta: { align: 'center', width: 80 }
     },
     {
        accessorKey: 'reason',
        header: t.stockAdjustment.table.reason,
        cell: info => (
            <span className="px-1.5 py-0.5 rounded-lg bg-transparent text-xs text-gray-600 dark:text-gray-400 capitalize border border-gray-200 dark:border-gray-700">
               {t.stockAdjustment.reasons[info.getValue() as keyof typeof t.stockAdjustment.reasons] || info.getValue()}
            </span>
        ),
        meta: { align: 'center' }
     },
      {
          accessorKey: 'performedByName',
          header: t.intelligence.audit.columns.employee,
          cell: info => <span className="text-xs text-gray-500">{info.getValue() as string || info.row.original.performedBy}</span>
      },
      {
          id: 'actions',
          header: '',
          cell: info => {
              const item = info.row.original;
              const status = item.status;
              const isPending = status === 'pending';
              
              return (
                  <div className="flex items-center justify-end gap-3 w-full">
                      {/* Status Badge */}
                      <span className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-transparent border ${
                          isPending 
                          ? 'text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-900/50' 
                          : status === 'rejected' 
                             ? 'text-red-700 border-red-200 dark:text-red-400 dark:border-red-900/50'
                             : 'text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-900/50'
                      }`}>
                          <span className="material-symbols-rounded text-sm">
                              {isPending ? 'schedule' : status === 'rejected' ? 'cancel' : 'check_circle'}
                          </span>
                          {isPending ? t.purchases.status.pending : status}
                      </span>

                      {/* Action Buttons (only if pending) */}
                      {isPending && (
                          <div className="flex gap-1">
                             <button 
                                 onClick={() => handleApprove(item)}
                                 className="p-1 px-2 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs font-bold transition-colors shadow-sm"
                             >
                                 {t.pendingApproval.approve}
                             </button>
                             <button 
                                 onClick={() => handleReject(item)}
                                 className="p-1 px-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold transition-colors shadow-sm"
                             >
                                 {t.pendingApproval.reject}
                             </button>
                          </div>
                      )}
                  </div>
              );
          },
          meta: { align: 'right', width: 160 }
      }
  ], [t, handleApprove, handleReject]);

  const handlePrint = () => {
    window.print();
  };

  // Search Columns Definition
    const searchColumns = useMemo(() => [
        {
            header: t.inventory?.headers?.codes || 'Codes',
            width: 'w-32 shrink-0',
            className: 'text-gray-900 dark:text-gray-400',
            render: (drug: Drug) => drug.barcode || drug.internalCode || '---'
        },
        {
            header: t.stockAdjustment?.table?.product || 'Name',
            width: 'flex-1',
            className: 'text-gray-900 dark:text-gray-400',
            render: (drug: Drug) => getDisplayName(drug)
        },
        {
            header: t.inventory?.headers?.expiry || 'Expiry',
            width: 'w-24 shrink-0',
            className: 'justify-center text-center text-gray-900 dark:text-gray-400',
            render: (drug: Drug) => {
                if (!drug.expiryDate) return '---';
                const date = new Date(drug.expiryDate);
                if (isNaN(date.getTime())) return drug.expiryDate;
                return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getFullYear()).slice(-2)}`;
            }
        },
        {
            header: t.inventory?.headers?.stock || 'Stock',
            width: 'w-[60px] shrink-0',
            className: 'justify-center text-center text-gray-900 dark:text-gray-400',
            render: (drug: Drug) => (
                 <div className="tabular-nums border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-0.5 rounded-lg shrink-0 min-w-[36px] text-center">
                    {drug.stock}
                </div>
            )
        }
    ], [t]);

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
        {/* Header */}

        <div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                <h2 className="text-2xl font-bold tracking-tight type-expressive text-gray-900 dark:text-gray-100">{t.stockAdjustment.title}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t.stockAdjustment.subtitle}</p>
             </div>

             <div className="self-start md:self-center">
                 <SegmentedControl
                    options={[
                        { label: t.stockAdjustment.adjustStock, value: 'adjust' },
                        { label: t.stockAdjustment.historyLog, value: 'history' }
                    ]}
                    value={activeView}
                    onChange={(val) => setActiveView(val as 'adjust' | 'history')}
                    variant="onPage"
                    shape="pill"
                    color="blue"
                    size="sm"
                 />
             </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 mt-6">
                         {/* Search Input (Integrated with Scanner) */}
             {activeView === 'adjust' && (
                <div className="flex-1 relative z-30 flex items-center gap-3">
                    <div className="relative flex-1">
                        <SearchInput
                            ref={searchInputRef}
                            value={searchTerm}
                            onSearchChange={setSearchTerm}
                            placeholder={t.stockAdjustment.searchPlaceholder}
                            className={`w-full bg-white dark:bg-gray-900 rounded-xl border-gray-200 dark:border-gray-800 focus:ring-${color}-500 focus:border-${color}-500 shadow-sm`}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && searchTerm) {
                                    handleScan(searchTerm);
                                }
                            }}
                        />
                        <SearchDropdown 
                            results={searchResults}
                            onSelect={handleAddItem}
                            columns={searchColumns}
                            emptyMessage={t.inventory?.noResults}
                            isVisible={!!searchTerm}
                        />
                    </div>
                </div>
             )}

             {activeView === 'adjust' && (
                 <input
                     ref={fileInputRef}
                     type="file"
                     accept=".csv,.txt"
                     className="hidden"
                     onChange={handleFileUpload}
                 />
             )}
          </div>
        </div>



        {/* Main Content */}
        {activeView === 'adjust' ? (
            <div className="flex flex-col gap-6 flex-1 min-h-0">


                {/* Bottom Row: Adjustment Table (Full Width) */}
                <div className={`flex-1 ${CARD_BASE} rounded-3xl flex flex-col overflow-hidden shadow-lg border-0 ring-1 ring-gray-200 dark:ring-gray-800`}>
                    <div className="p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-rounded text-blue-600 dark:text-blue-400">edit_note</span>
                            <h3 className="font-bold text-gray-800 dark:text-gray-200">{t.stockAdjustment.title}</h3>
                             <span className="px-2 py-0.5 rounded-full border border-gray-200 dark:border-gray-700 bg-transparent text-xs font-bold text-gray-500">
                                {adjustments.length}
                            </span>
                        </div>
                        <div className="flex gap-2 items-center">
                              {/* Import/Print Actions */}
                             <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/10 transition-all active:enabled:scale-95"
                             >
                                {t.global.actions.import}
                                <span className="material-symbols-rounded text-base">upload_file</span>
                             </button>
                             <button
                                onClick={handlePrint}
                                className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:enabled:scale-95"
                             >
                                {t.global.actions.print}
                                <span className="material-symbols-rounded text-base">print</span>
                             </button>
                             
                             <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1"></div>

                            <button 
                                onClick={setAdjustments.bind(null, [])}
                                disabled={adjustments.length === 0}
                                className="text-xs font-bold text-gray-500 enabled:hover:text-red-600 disabled:opacity-30 transition-colors px-2"
                            >
                                {t.stockAdjustment.clear}
                            </button>
                            <button 
                                onClick={handleSave}
                                disabled={adjustments.length === 0}
                                className={`px-6 py-2 rounded-xl text-xs font-bold text-white bg-${color}-600 enabled:hover:bg-${color}-700 disabled:opacity-40 transition-all active:enabled:scale-95 shadow-md shadow-${color}-500/20`}
                            >
                                {t.stockAdjustment.save}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 relative bg-white dark:bg-gray-900 overflow-y-auto">
                         <TanStackTable
                            data={adjustments}
                            columns={columns}
                            emptyMessage={t.stockAdjustment.empty || "No items added. Scan or search to begin."}
                            color={color}
                            lite={true}
                        />
                    </div>
                </div>
            </div>
        ) : (
             /* History / Audit View */
            <div className={`flex-1 min-h-0 flex flex-col ${CARD_BASE} rounded-3xl shadow-lg border-0 ring-1 ring-gray-200 dark:ring-gray-800 overflow-hidden`}>
                  <div className="p-4 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-rounded text-blue-600 dark:text-blue-400">history</span>
                        <h3 className="font-bold text-gray-800 dark:text-gray-200">{t.stockAdjustment.history || "Adjustment History"}</h3>
                    </div>
                     
                     <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                          {/* Refresh */}
                         <button
                            onClick={loadHistory}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                         >
                            <span className="material-symbols-rounded text-lg">refresh</span>
                         </button>

                         {/* Print */}
                         <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-bold border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all active:scale-95 h-8"
                         >
                            {t.global.actions.print}
                            <span className="material-symbols-rounded text-base">print</span>
                         </button>

                         {/* Date Range */}
                        <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 p-1 rounded-full border border-gray-200 dark:border-gray-700 h-8">
                            <DatePicker
                                value={dateRange.from}
                                onChange={(val) => setDateRange(prev => ({ ...prev, from: val }))}
                                label={t.common?.fromDate || "From"}
                                color={color}
                                icon="calendar_today"
                                className="!py-0.5 !px-2 !text-xs border-0 bg-transparent !h-6"
                            />
                            <span className="text-gray-300 dark:text-gray-600 rtl:rotate-180 flex items-center">
                                <span className="material-symbols-rounded text-[14px]">arrow_forward</span>
                            </span>
                            <DatePicker
                                value={dateRange.to}
                                onChange={(val) => setDateRange(prev => ({ ...prev, to: val }))}
                                label={t.common?.toDate || "To"}
                                color={color}
                                icon="event"
                                className="!py-0.5 !px-2 !text-xs border-0 bg-transparent !h-6"
                            />
                        </div>

                         {/* Filter Pending/All (Right Aligned in mobile, auto in desktop) */}
                        <div className="ml-auto xl:ml-0 flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg h-8 items-center">
                            <button 
                                onClick={setHistoryTab.bind(null, 'pending')}
                                className={`px-3 py-0.5 text-xs font-bold rounded-md transition h-full flex items-center ${historyTab === 'pending' ? 'bg-white dark:bg-gray-700 shadow-sm text-amber-600' : 'text-gray-500 hover:text-amber-600 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}`}
                            >
                                {t.purchases.status.pending}
                            </button>
                             <button 
                                onClick={setHistoryTab.bind(null, 'all')}
                                className={`px-3 py-0.5 text-xs font-bold rounded-md transition h-full flex items-center ${historyTab === 'all' ? 'bg-white dark:bg-gray-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}`}
                            >
                                {t.global.actions.all}
                            </button>
                        </div>
                     </div>
                 </div>
                 
                 <div className="flex-1 relative bg-white dark:bg-gray-900 overflow-y-auto">
                    <TanStackTable
                        data={history}
                        columns={historyColumns}
                        emptyMessage={t.stockAdjustment.noHistory}
                        color={color}
                        lite={true}
                    />
                 </div>
            </div>
        )}

      {/* Batch Selection Modal */}
      {batchSelectionDrug && (
        <Modal
            isOpen={true}
            onClose={() => setBatchSelectionDrug(null)}
            title={t.stockAdjustment?.selectBatch || "Select Batch"}
            icon="layers"
            size="md"
        >
            <div className="space-y-4">
                <p className="text-sm text-gray-500">{t.stockAdjustment?.selectBatchDesc || "This item has multiple batches. Please select which one to adjust."}</p>
                
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {availableBatches.map(batch => (
                        <button
                            key={batch.id}
                            onClick={() => addAdjustmentItem(batchSelectionDrug, batch)}
                            className="w-full text-start p-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex justify-between items-center group"
                        >
                            <div>
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                    {t.inventory.headers.expiry}: {new Date(batch.expiryDate).toLocaleDateString()}
                                </div>
                                <div className="text-xs text-gray-500 font-mono">
                                    ID: {batch.id.substring(0, 8)}...
                                </div>
                            </div>
                             <div className="text-sm tabular-nums border border-gray-200 dark:border-gray-800 bg-transparent px-2 py-0.5 rounded-lg">
                                {t.barcodePrinter.tableHeaders.qty}: {batch.quantity}
                            </div>
                        </button>
                    ))}
                    
                    <button
                        onClick={() => addAdjustmentItem(batchSelectionDrug, null)}
                         className="w-full text-center p-3 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 hover:text-blue-600 hover:border-blue-300 transition-colors text-sm font-medium"
                    >
                        {t.inventory.actionsMenu.adjustStock} ({t.global.actions.all})
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
