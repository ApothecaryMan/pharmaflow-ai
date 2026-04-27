import type { ColumnDef } from '@tanstack/react-table';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type UserRole } from '../../config/permissions';
import { permissionsService } from '../../services/auth/permissions';
import {
  getCategories,
  getLocalizedCategory,
  getLocalizedProductType,
  getProductTypes,
  isMedicineCategory,
} from '../../data/productCategories';
import type { Drug } from '../../types';
import { formatCurrency, formatCurrencyParts, formatCompactCurrency } from '../../utils/currency';
import { getDisplayName } from '../../utils/drugDisplayName';
import { formatStock, formatStockParts, validateStock } from '../../utils/inventory';
import { createSearchRegex, parseSearchTerm } from '../../utils/searchUtils';
import { formatExpiryDate, parseExpiryEndOfMonth } from '../../utils/expiryUtils';
import { CARD_BASE } from '../../utils/themeStyles';
import { FilterDropdown, SegmentedControl } from '../common';
import { useContextMenu, useContextMenuTrigger } from '../common/ContextMenu';
import type { FilterConfig } from '../common/FilterPill';
import { Modal } from '../common/Modal';
import { SmartDateInput, SmartInput, SmartTextarea } from '../common/SmartInputs';
import { TanStackTable, PriceDisplay } from '../common/TanStackTable';
import { InteractiveCard } from '../common/InteractiveCard';
import { AddProduct } from './AddProduct';
import { useStatusBar } from '../layout/StatusBar';
import { useSettings } from '../../context';

import * as stockOps from '../../utils/stockOperations';

interface InventoryProps {
  inventory: Drug[];
  onAddDrug: (drug: Omit<Drug, 'id' | 'branchId' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateDrug: (drug: Drug) => void;
  onDeleteDrug: (id: string) => void;
  color: string;
  t: any;
  isLoading?: boolean;
}

export const Inventory: React.FC<InventoryProps> = ({
  inventory,
  onAddDrug,
  onUpdateDrug,
  onDeleteDrug,
  color,
  t,
  isLoading = false,
}) => {
  const { getVerifiedDate } = useStatusBar();
  const { showMenu } = useContextMenu();
  const { textTransform } = useSettings();

  // Detect language direction/locale
  const isRTL =
    t.direction === 'rtl' || t.lang === 'ar' || (t.title && /[\u0600-\u06FF]/.test(t.title));
  const currentLang = isRTL ? 'ar' : 'en';

  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [viewingDrug, setViewingDrug] = useState<Drug | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({}); // groupId -> drugId
  const [openBatchDropdown, setOpenBatchDropdown] = useState<string | null>(null);
  const [isDataSettled, setIsDataSettled] = useState(false);

  // Synchronization Buffer: Ensures skeleton stays until data is actually available
  useEffect(() => {
    if (!isLoading) {
      // If we have data, settle quickly but not instantly to avoid flicker
      if (inventory.length > 0) {
        const timer = setTimeout(() => setIsDataSettled(true), 200);
        return () => clearTimeout(timer);
      } else {
        // If it's truly empty, wait a bit longer to be absolutely sure before showing "No results"
        const timer = setTimeout(() => setIsDataSettled(true), 1000);
        return () => clearTimeout(timer);
      }
    } else {
      setIsDataSettled(false);
    }
  }, [isLoading, inventory.length]);

  // Print Label Modal State
  const [printModalDrug, setPrintModalDrug] = useState<Drug | null>(null);
  const [printQuantity, setPrintQuantity] = useState(1);

  // Form State for Add Product
  const [formData, setFormData] = useState<Partial<Drug>>({
    name: '',
    nameArabic: '',
    genericName: [], // Changed to array
    category: 'General',
    price: 0,
    unitPrice: 0,
    costPrice: 0,
    unitCostPrice: 0,
    stock: 0,
    expiryDate: '',
    description: '',
    barcode: '',
    internalCode: '',
    unitsPerPack: 1,
    maxDiscount: 10,
    additionalBarcodes: [],
    dosageForm: '',
    status: 'active',
  });

  // Dropdown States
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false);
  const [isEditDosageOpen, setIsEditDosageOpen] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleViewDetails = (id: string) => {
    const drug = inventory.find((d) => d.id === id);
    if (drug) {
      setViewingDrug(drug);
    }
    setActiveMenuId(null);
  };

  const handlePrintBarcode = (drug: Drug) => {
    setActiveMenuId(null);
    // Open print modal
    setPrintModalDrug(drug);
    setPrintQuantity(1);
  };

  const handleConfirmPrint = () => {
    if (printModalDrug && printQuantity > 0) {
      import('./LabelPrinter').then(({ printSingleLabel }) => {
        printSingleLabel(printModalDrug, printQuantity);
      });
    }
    setPrintModalDrug(null);
  };

  /**
   * Generator Strategy Reference:
   * - Unique code: 'CUST-' + 6-digit random (e.g., CUST-123456)
   * - Serial ID: Max existing serial + 1
   * Delegated to: useEntityActions.handleAddCustomer
   */
  const handleOpenAdd = () => {
    setMode('add');
  };

  const handleOpenEdit = (drug: Drug) => {
    setEditingDrug(drug);
    // Load stock as PACKS for editing
    const stockInPacks = stockOps.convertToPacks(drug.stock, drug.unitsPerPack);
    setFormData({
      ...drug,
      stock: stockInPacks,
      status: drug.status || 'active',
      maxDiscount: drug.maxDiscount ?? 10,
      genericName: Array.isArray(drug.genericName)
        ? drug.genericName
        : drug.genericName
          ? [drug.genericName]
          : [],
    });
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDuplicate = (drug: Drug) => {
    setEditingDrug(null); // Set as new drug
    const { id, ...rest } = drug;
    setFormData({
      ...rest,
      name: `${rest.name} (Copy)`,
      genericName: Array.isArray(rest.genericName)
        ? rest.genericName
        : rest.genericName
          ? [rest.genericName]
          : [],
    });
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleQuickStockAdjust = (drug: Drug) => {
    const currentPacks = drug.stock / (drug.unitsPerPack || 1);
    const newStock = prompt(`Adjust stock for ${drug.name} (in Packs):`, currentPacks.toString());
    if (newStock !== null) {
      const val = parseFloat(newStock);
      if (!isNaN(val)) {
        // Save as Total Units
        onUpdateDrug({ ...drug, stock: validateStock(stockOps.resolveUnits(val, false, drug.unitsPerPack)) });
      }
    }
    setActiveMenuId(null);
  };

  const handleDelete = (id: string) => {
    onDeleteDrug(id);
    setActiveMenuId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare data: Convert stock (Packs) to Total Units
    const submissionData = {
      ...formData,
      stock: validateStock(stockOps.resolveUnits(formData.stock || 0, false, formData.unitsPerPack)),
    };

    if (editingDrug) {
      onUpdateDrug({ ...editingDrug, ...submissionData } as Drug);
      setIsModalOpen(false);
    } else if (formData.name && formData.expiryDate) {
      // New drug (Add or Duplicate)
      onAddDrug(submissionData as Omit<Drug, 'id' | 'branchId' | 'createdAt' | 'updatedAt'>);
      setIsModalOpen(false);
      if (mode === 'add') setMode('list');
    }
  };

  const generateInternalCode = () => {
    // Find highest existing 6-digit numeric code
    const existingCodes = inventory
      .map((d) => d.internalCode)
      .filter((c) => c && /^\d{6}$/.test(c))
      .map((c) => parseInt(c!, 10));

    const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    const nextCode = String(maxCode + 1).padStart(6, '0');

    setFormData({ ...formData, internalCode: nextCode });
  };

  // Categories are now determined dynamically using helper
  const allCategories = getCategories(currentLang);

  const filteredInventory = useMemo(() => {
    // 1. First apply Search Text
    const { mode: searchMode, regex } = parseSearchTerm(searchTerm);

    let result = inventory.filter((d) => {
      if (searchMode === 'ingredient' || searchMode === 'generic') {
        return Array.isArray(d.genericName) 
          ? d.genericName.some((gn) => regex.test(gn))
          : (d.genericName as any) && regex.test(d.genericName as any);
      }

      // Normal search: Check composite string for cross-field matches (e.g. "Pana Tablet")
      const searchableText = getDisplayName(d) + ' ' + d.category;

      return (
        regex.test(searchableText) ||
        (d.barcode && regex.test(d.barcode)) ||
        (d.internalCode && regex.test(d.internalCode)) ||
        (Array.isArray(d.genericName) && d.genericName.some((gn) => regex.test(gn))) || // Search genericName array
        (!Array.isArray(d.genericName) && d.genericName && regex.test(d.genericName)) // Fallback for old string genericName
      );
    });

    // 2. Then apply Active Filters (Pills)
    Object.entries(activeFilters).forEach(([groupId, values]) => {
      const vals = values as any[];
      if (!vals || vals.length === 0) return;

      if (groupId === 'stock_status') {
        result = result.filter((d) => {
          if (vals.includes('in_stock') && vals.includes('out_of_stock')) return true;
          if (vals.includes('in_stock')) return d.stock > 0;
          if (vals.includes('out_of_stock')) return d.stock <= 0;
          return true;
        });
      } else if (groupId === 'expiry_status') {
        const now = getVerifiedDate();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const nearExpiredLimit = new Date(currentMonthStart);
        nearExpiredLimit.setMonth(currentMonthStart.getMonth() + 6);

        result = result.filter((d) => {
          if (!d.expiryDate) return vals.includes('all');
          const expiry = parseExpiryEndOfMonth(d.expiryDate);

          if (vals.includes('expired')) {
            return expiry < currentMonthStart;
          }
          if (vals.includes('near_expired')) {
            return expiry >= currentMonthStart && expiry < nearExpiredLimit;
          }
          return true; // 'all' or other values
        });
      } else {
        // Generic filter for other columns if added later
        result = result.filter((d) => {
          const val = (d as any)[groupId];
          return vals.includes(val);
        });
      }
    });

    return result;
  }, [inventory, searchTerm, activeFilters, t]);

  const groupedInventory = useMemo(() => {
    const groups: Record<string, Drug[]> = {};

    filteredInventory.forEach((d) => {
      // Group by barcode if available, otherwise by name + dosage form
      const key = d.barcode ? `BARCODE|${d.barcode}` : `NAME|${d.name}|${d.dosageForm || ''}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(d);
    });

    return Object.values(groups).map((group) => {
      // Sort batches by expiry date (FEFO)
      const sortedGroup = [...group].sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        const dateA = parseExpiryEndOfMonth(a.expiryDate).getTime();
        const dateB = parseExpiryEndOfMonth(b.expiryDate).getTime();
        return isNaN(dateA) ? 1 : isNaN(dateB) ? -1 : dateA - dateB;
      });

      // The representative drug for the row's display metadata
      const first = sortedGroup[0];

      // Calculate total stock for all batches in the group
      const totalStock = sortedGroup.reduce((sum, d) => sum + d.stock, 0);

      return {
        ...first,
        id: first.id, // Group row ID (uses first batch's ID as representative)
        stock: totalStock, // Summed stock
        group: sortedGroup, // All batches in this group
        groupId: first.barcode ? `B-${first.barcode}` : `N-${first.name}-${first.dosageForm || ''}`,
      };
    });
  }, [filteredInventory]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    return groupedInventory.reduce(
      (acc, drug) => {
        acc.totalItems += 1;
        acc.totalCost += (drug.costPrice || 0) * stockOps.convertToPacks(drug.stock || 0, drug.unitsPerPack || 1);
        acc.totalSaleValue += (drug.price || 0) * stockOps.convertToPacks(drug.stock || 0, drug.unitsPerPack || 1);

        const status = (drug as any).status || 'active';
        if (status === 'active') {
          if (drug.stock === 0) acc.criticalRestock += 1;
          else if (drug.stock <= (drug.minStock || 5)) acc.nearReorder += 1;
        } else if (status === 'discontinued') {
          acc.discontinuedCount += 1;
        }

        return acc;
      },
      {
        totalItems: 0,
        totalCost: 0,
        totalSaleValue: 0,
        criticalRestock: 0,
        nearReorder: 0,
        discontinuedCount: 0,
      }
    );
  }, [groupedInventory]);

    const getRowActions = (drugRow: any) => {
      const groupData = drugRow as Drug & { group: Drug[]; groupId: string };
      const selectedId = selectedBatches[groupData.groupId] || groupData.id;
      const drug = groupData.group.find((d) => d.id === selectedId) || groupData;

      const actions = [];
  
      if (permissionsService.can('inventory.update')) {
        actions.push({
          label: t.actionsMenu.edit,
          icon: 'edit',
          action: () => handleOpenEdit(drug),
        });
      }

      actions.push({
        label: t.actionsMenu.viewDetails || t.actionsMenu.view,
        icon: 'visibility',
        action: () => handleViewDetails(drug.id),
      });
      actions.push({ separator: true });
      actions.push({
        label: t.actionsMenu.printBarcode,
        icon: 'print',
        action: () => handlePrintBarcode(drug),
      });
      if (permissionsService.can('inventory.add')) {
        actions.push({
          label: t.actionsMenu.duplicate,
          icon: 'content_copy',
          action: () => handleDuplicate(drug),
        });
      }

      if (permissionsService.can('inventory.restock')) {
        actions.push({ separator: true });
        actions.push({
          label: t.actionsMenu.adjustStock,
          icon: 'inventory',
          action: () => handleQuickStockAdjust(drug),
        });
      }

      if (permissionsService.can('inventory.delete')) {
        actions.push({ separator: true });
        actions.push({
          label: t.actionsMenu.delete,
          icon: 'delete',
          action: () => handleDelete(drug.id),
          danger: true,
        });
      }

      return actions;
    };

  const canViewFinancials = permissionsService.can('reports.view_financial');

  const tableColumns = useMemo<ColumnDef<Drug>[]>(
    () => {
      const cols: ColumnDef<Drug>[] = [
      {
        id: 'code',
        header: t.headers.codes,
        cell: ({ row }) => {
          const drug = row.original;
          return (
            <div className='flex flex-col gap-0.5'>
              {drug.barcode && (
                <div className='text-gray-900 dark:text-gray-100 text-xs'>{drug.barcode}</div>
              )}
              {drug.internalCode && (
                <div className='text-gray-900 dark:text-gray-100 text-xs'>{drug.internalCode}</div>
              )}
              {!drug.barcode && !drug.internalCode && <span className='text-gray-400'>-</span>}
            </div>
          );
        },
        size: 150,
      },
      {
        accessorKey: 'name',
        header: t.headers.name,
        meta: {
          headerAlign: isRTL ? 'end' : 'start',
          disableAlignment: true,
        },
        cell: ({ row }) => {
          const drug = row.original;
          const displayName = getDisplayName(drug, textTransform);
          return (
            <div className='flex flex-col whitespace-normal items-start text-start w-full'>
              <div className='font-medium text-gray-900 dark:text-gray-100 text-xs drug-name'>
                {displayName}
              </div>
                <span className='text-gray-500 dark:text-gray-400'>
                  {Array.isArray(drug.genericName) 
                    ? drug.genericName.join(' + ') 
                    : (drug.genericName as any)}
                </span>
            </div>
          );
        },
        size: 250,
      },
      {
        accessorKey: 'category',
        header: t.headers.category,
        cell: ({ row }) => (
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-lg border border-current text-primary-700 dark:text-primary-400 text-xs font-bold uppercase tracking-wider bg-transparent`}
          >
            {getLocalizedCategory(row.original.category || 'General', currentLang)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t.headers.status || 'Status',
        cell: ({ row }) => {
          const status = row.original.status || 'active';
          const colors = {
            active: 'text-green-600 dark:text-green-400',
            inactive: 'text-amber-600 dark:text-amber-400',
            discontinued: 'text-red-600 dark:text-red-400',
          }[status as 'active' | 'inactive' | 'discontinued'] || 'text-gray-500';
          
          return (
             <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg border border-current bg-transparent text-xs font-bold uppercase tracking-wider ${colors}`}>
              {t[status] || status}
            </span>
          );
        },
        size: 150,
      },
      {
        accessorKey: 'stock',
        header: t.headers.stock,
        cell: ({ row }) => {
          if (row.original.stock <= 0) {
            return (
              <span className='inline-flex items-center px-1.5 py-0.5 rounded-lg border border-red-100 dark:border-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-black uppercase tracking-widest bg-red-50 dark:bg-red-900/10 shadow-xs shadow-red-500/10'>
                {t.outOfStockShort || 'OUT'}
              </span>
            );
          }

          const parts = formatStockParts(row.original.stock, row.original.unitsPerPack, {
            packs: t.details?.packs || 'Packs',
            outOfStock: t.outOfStock || 'Out of Stock',
          });

          return (
            <div
              className={`font-medium text-xs ${row.original.stock < (row.original.unitsPerPack || 1) ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}
            >
              {parts.value}{' '}
              {parts.label && (
                <span className='text-[10px] text-gray-400 font-normal'>{parts.label}</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'price',
        header: t.headers.price,
        cell: ({ row }) => {
          const parts = formatCurrencyParts(row.original.price);
          return (
            <span className='text-gray-700 dark:text-gray-300 text-xs font-bold'>
              {parts.amount}{' '}
              <span className='text-[10px] text-gray-400 font-normal'>{parts.symbol}</span>
            </span>
          );
        },
      },
      ];

      // Insert cost column only if authorized
      if (canViewFinancials) {
        cols.push({
          accessorKey: 'costPrice',
          header: t.headers.cost,
          cell: ({ row }) => {
            const groupData = row.original as any;
            const selectedId = selectedBatches[groupData.groupId] || groupData.id;
            const drug = groupData.group.find((d: any) => d.id === selectedId) || groupData;

            if (!drug.costPrice) return <span className='text-gray-500 text-xs'>-</span>;
            const parts = formatCurrencyParts(drug.costPrice);
            return (
              <span className='text-gray-900 dark:text-gray-100 text-xs font-medium'>
                {parts.amount}{' '}
                <span className='text-[10px] text-gray-400 font-normal'>{parts.symbol}</span>
              </span>
            );
          },
        });
      }

      // Add Expiry column
      cols.push({
        accessorKey: 'expiryDate',
        header: t.headers.expiry,
        cell: ({ row }) => {
          const groupData = row.original as any;
          const batches = groupData.group || [groupData];
          const selectedId = selectedBatches[groupData.groupId] || groupData.id;
          const drug = batches.find((d: any) => d.id === selectedId) || groupData;

          const renderDateWrapper = (val: string, isDropdownTrigger = false) => {
            if (!val) return <span className='text-gray-400'>-</span>;
            const date = new Date(val);
            const now = new Date();
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const sixMonthsFromNow = new Date(today);
            sixMonthsFromNow.setMonth(today.getMonth() + 6);
            const expiry = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            let colorClass = 'text-current';
            if (expiry <= today) {
              colorClass = 'text-red-500 font-bold';
            } else if (expiry <= sixMonthsFromNow) {
              colorClass = 'text-amber-500 font-bold';
            }

            return (
              <div
                className={`flex items-center justify-center w-full gap-1 tabular-nums text-xs ${colorClass} ${isDropdownTrigger ? 'cursor-pointer hover:opacity-70' : ''}`}
              >
                {formatExpiryDate(val)}
              </div>
            );
          };

          if (batches.length > 1) {
            return (
              <div className='flex justify-center'>
                <FilterDropdown
                  variant='input'
                  items={batches}
                  selectedItem={drug}
                  isOpen={openBatchDropdown === groupData.groupId}
                  onToggle={() =>
                    setOpenBatchDropdown(
                      openBatchDropdown === groupData.groupId ? null : groupData.groupId
                    )
                  }
                  onSelect={(b: any) => {
                    setSelectedBatches({ ...selectedBatches, [groupData.groupId]: b.id });
                    setOpenBatchDropdown(null);
                  }}
                  keyExtractor={(b: any) => b.id}
                  renderSelected={(b: any) => (
                    <div className='flex justify-center items-center w-full px-2 gap-1.5'>
                      <span>{renderDateWrapper(b.expiryDate, true)}</span>
                      <span className='text-[10px] text-gray-400 font-normal'>
                        ({formatStock(b.stock, b.unitsPerPack).replace(/ Packs?/g, '')})
                      </span>
                    </div>
                  )}
                  renderItem={(b: any) => (
                    <div className='flex justify-center items-center w-full px-2 gap-2'>
                      <span>{renderDateWrapper(b.expiryDate)}</span>
                      <span className='text-[10px] text-gray-400 font-normal'>
                        ({formatStock(b.stock, b.unitsPerPack).replace(/ Packs?/g, '')})
                      </span>
                    </div>
                  )}
                  className='h-8 w-[110px] mx-auto'
                  color={color}
                  floating
                  hideArrow={true}
                  minHeight={32}
                />
              </div>
            );
          }
          return <div className='flex justify-center'>{renderDateWrapper(drug.expiryDate)}</div>;
        },
        meta: { align: 'center', smartDate: false },
      });

      return cols;
    },
    [color, currentLang, t, selectedBatches, openBatchDropdown, textTransform]
  );

  // Define Filter Config
  const filterConfigs = useMemo<FilterConfig[]>(
    () => [
      {
        id: 'stock_status',
        label: t.headers.stock || 'Stock',
        icon: 'package_2',
        mode: 'single', // Use 'single' for mutually exclusive states "In Stock" vs "Out"
        options: [
          { label: t.all || 'All', value: 'all' },
          { label: t.available || 'Available', value: 'in_stock' },
          { label: t.outOfStock || 'Out of Stock', value: 'out_of_stock' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'expiry_status',
        label: t.expiryStatus || 'Expiry Status',
        icon: 'event_busy',
        mode: 'single',
        options: [
          { label: t.allExpiry || 'Show All', value: 'all' },
          { label: t.nearExpired || 'Near Expired', value: 'near_expired' },
          { label: t.expired || 'Expired', value: 'expired' },
        ],
        defaultValue: 'all',
      },
      {
        id: 'product_status_filter',
        label: t.headers.status || 'Status',
        icon: 'fact_check',
        mode: 'single',
        options: [
          { label: t.all || 'All', value: 'all' },
          { label: t.active || 'Active', value: 'active' },
          { label: t.inactive || 'Inactive', value: 'inactive' },
          { label: t.discontinued || 'Discontinued', value: 'discontinued' },
        ],
        defaultValue: 'all',
      },
    ],
    [t]
  );

  // Enhanced Columns with Hidden Helper
  const enhancedColumns = useMemo(
    () => [
      ...tableColumns,
      {
        id: 'stock_status',
        accessorFn: (row: Drug) => (row.stock > 0 ? 'in_stock' : 'out_of_stock'),
        header: t.headers.stock,
        meta: { hideFromSettings: true },
      },
      {
        id: 'product_status_filter',
        accessorFn: (row: Drug) => row.status || 'active',
        header: t.headers.status,
        meta: { hideFromSettings: true },
      },
      {
        id: 'expiry_status',
        accessorFn: (row: Drug) => {
          if (!row.expiryDate) return 'valid';
          const now = getVerifiedDate();
          const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          const expiry = parseExpiryEndOfMonth(row.expiryDate);
          if (expiry < currentMonthStart) return 'expired';
          const nearExpiredLimit = new Date(currentMonthStart);
          nearExpiredLimit.setMonth(currentMonthStart.getMonth() + 6);
          if (expiry < nearExpiredLimit) return 'near_expired';
          return 'valid';
        },
        header: t.expiryStatus,
        meta: { hideFromSettings: true },
      },
    ],
    [tableColumns, t, getVerifiedDate]
  );

  return (
    <div className='h-full flex flex-col space-y-4 animate-fade-in'>
      {/* Header with toggle */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight page-title'>
            {mode === 'list' ? t.title : t.addNewProduct || 'Add New Product'}
          </h1>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
            {mode === 'list'
              ? t.subtitle
              : t.addProductSubtitle || 'Add a new item to your inventory'}
          </p>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Summary Cards */}
          {mode === 'list' && (
            <>
              <InteractiveCard
                className={`flex flex-col min-w-[140px] px-5 py-2.5 rounded-2xl ${isRTL ? 'items-end' : 'items-start'}`}
                pages={[
                  {
                    theme: 'bg-primary-50 dark:bg-primary-900/20',
                    content: (
                      <div className={`flex flex-col w-full ${isRTL ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold uppercase text-primary-600 dark:text-primary-400">
                          {t.summary?.totalItems || 'Total Items'}
                        </span>
                        <span className="text-xl font-bold text-primary-900 dark:text-primary-100">
                          {summaryStats.totalItems >= 1000 
                            ? new Intl.NumberFormat('en-US', { notation: 'compact', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(summaryStats.totalItems)
                            : summaryStats.totalItems}
                        </span>
                      </div>
                    ),
                  }
                ]}
              />
              {canViewFinancials && (
                <InteractiveCard
                  className={`flex flex-col min-w-[180px] px-5 py-2.5 rounded-2xl ${isRTL ? 'items-end' : 'items-start'}`}
                  pages={[
                    {
                      theme: 'bg-green-50 dark:bg-green-900/20',
                      content: (
                        <div className={`flex flex-col w-full ${isRTL ? 'items-end' : 'items-start'}`}>
                          <span className="text-[10px] font-bold uppercase text-green-600 dark:text-green-400">
                            {t.summary?.totalCost || 'Inventory Cost'}
                          </span>
                          <span className="text-xl font-bold text-green-900 dark:text-primary-100 tabular-nums">
                            <PriceDisplay value={summaryStats.totalCost} compact={summaryStats.totalCost >= 1000} />
                          </span>
                        </div>
                      ),
                    },
                    {
                      theme: 'bg-indigo-50 dark:bg-indigo-900/20',
                      content: (
                        <div className={`flex flex-col w-full ${isRTL ? 'items-end' : 'items-start'}`}>
                          <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
                            {t.summary?.totalSaleValue || 'Sale Value'}
                          </span>
                          <span className="text-xl font-bold text-indigo-900 dark:text-primary-100 tabular-nums">
                            <PriceDisplay value={summaryStats.totalSaleValue} compact={summaryStats.totalSaleValue >= 1000} />
                          </span>
                        </div>
                      ),
                    }
                  ]}
                />
              )}
              <InteractiveCard
                className={`flex flex-col min-w-[160px] px-5 py-2.5 rounded-2xl ${isRTL ? 'items-end' : 'items-start'}`}
                pages={[
                  {
                    theme: 'bg-red-50 dark:bg-red-900/20',
                    content: (
                      <div className={`flex flex-col w-full ${isRTL ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold uppercase text-red-600 dark:text-red-400">
                          {t.summary?.restock || 'Critical Restock'}
                        </span>
                        <span className="text-xl font-bold text-red-900 dark:text-primary-100">
                          {summaryStats.criticalRestock}
                        </span>
                      </div>
                    ),
                  },
                  {
                    theme: 'bg-amber-50 dark:bg-amber-900/20',
                    content: (
                      <div className={`flex flex-col w-full ${isRTL ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400">
                          {t.summary?.nearReorder || 'Near Reorder'}
                        </span>
                        <span className="text-xl font-bold text-amber-900 dark:text-primary-100">
                          {summaryStats.nearReorder}
                        </span>
                      </div>
                    ),
                  },
                  {
                    theme: 'bg-gray-100 dark:bg-gray-800',
                    content: (
                      <div className={`flex flex-col w-full ${isRTL ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">
                          {t.summary?.discontinued || 'Discontinued'}
                        </span>
                        <span className="text-xl font-bold text-gray-700 dark:text-gray-300">
                          {summaryStats.discontinuedCount}
                        </span>
                      </div>
                    ),
                  }
                ]}
              />
            </>
          )}

          <SegmentedControl
            value={mode}
            onChange={(val) => {
              setMode(val);
              if (val === 'add') handleOpenAdd();
            }}
            options={[
              { label: t.allProducts || 'All Products', value: 'list' as const },
              ...(permissionsService.can('inventory.add')
                ? [{ label: t.addNewProduct || 'Add New Product', value: 'add' as const }]
                : []),
            ]}
            shape='pill'
            size='sm'
            color={color}
            fullWidth={false}
          />
        </div>
      </div>

      {mode === 'list' ? (
        <>
          {/* Table Card - Default Design */}
          <div className='flex-1 overflow-hidden'>
            <TanStackTable
              data={groupedInventory}
              columns={enhancedColumns}
              tableId='inventory_table'
              color={color}
              enableTopToolbar={true}
              enableSearch={true}
              searchPlaceholder={t.searchPlaceholder}
              globalFilter={searchTerm} // Sync state
              onSearchChange={setSearchTerm} // Update state
              manualFiltering={true} // Prevent double filtering
              onRowContextMenu={(e, row) => showMenu(e.clientX, e.clientY, getRowActions(row))}
              emptyMessage={t.noResults}
              lite={false} // Use standard card design
              dense={true} // Enable compact mode
              enablePagination={true}
              enableVirtualization={false}
              pageSize='auto'
              enableShowAll={true}
              // New Filter Props
              filterableColumns={filterConfigs}
              initialFilters={activeFilters}
              onFilterChange={setActiveFilters}
              defaultHiddenColumns={[]} // Helpers are now hidden via metadata
              isLoading={!isDataSettled && groupedInventory.length === 0}
            />
          </div>
        </>
      ) : (
        /* ADD PRODUCT FORM VIEW - COMPACT LAYOUT */
        <div className='flex-1 overflow-y-auto'>
          <AddProduct
            inventory={inventory}
            onAddDrug={(drug) => {
              onAddDrug(drug);
            }}
            color={color}
            t={t.addProduct || {}}
            language={currentLang.toUpperCase()}
            hideHeader={true}
            onCancel={() => setMode('list')}
          />
        </div>
      )}

      {/* Details View Modal */}
      {viewingDrug && (
        <Modal
          isOpen={true}
          onClose={() => setViewingDrug(null)}
          size='lg'
          zIndex={50}
          title={t.actionsMenu.view}
          icon='visibility'
        >
          <div className='space-y-6'>
            <div className='flex justify-between items-start'>
              <div>
                <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 page-title'>
                  {getDisplayName({ name: viewingDrug.name }, textTransform)}{' '}
                  {viewingDrug.dosageForm && (
                    <span className='text-lg text-gray-500 font-normal'>
                      {getDisplayName(
                        {
                          name: `(${getLocalizedProductType(viewingDrug.dosageForm, 'en')})`,
                        },
                        textTransform
                      )}
                    </span>
                  )}
                </h1>
                <p className='text-gray-500 font-medium text-start' dir='ltr'>
                  {Array.isArray(viewingDrug.genericName)
                    ? viewingDrug.genericName.join(' + ')
                    : (viewingDrug.genericName as any)}
                </p>
              </div>
              <span
                className={`inline-flex items-center px-1.5 py-0.5 rounded-lg border border-primary-200 dark:border-primary-900/50 text-primary-700 dark:text-primary-400 text-xs font-bold uppercase tracking-wider bg-transparent`}
              >
                {getLocalizedCategory(viewingDrug.category || 'General', currentLang)}
              </span>
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700'>
                <label className='text-[10px] font-bold text-gray-400 uppercase'>
                  {t.details?.stockLevel}
                </label>
                {(() => {
                  const stockParts = formatStockParts(viewingDrug.stock, viewingDrug.unitsPerPack, {
                    packs: t.details?.packs || 'Packs',
                    outOfStock: t.outOfStock || 'Out of Stock',
                  });
                  return (
                    <p
                      className={`text-xl font-bold ${viewingDrug.stock < (viewingDrug.unitsPerPack || 1) ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}
                    >
                      {stockParts.value}{' '}
                      {stockParts.label && (
                        <span className='text-xs font-normal text-gray-500'>
                          {stockParts.label}
                        </span>
                      )}
                    </p>
                  );
                })()}
              </div>
              <div className='p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700'>
                <label className='text-[10px] font-bold text-gray-400 uppercase'>
                  {t.modal?.expiry}
                </label>
                <p className='text-xl font-bold text-gray-700 dark:text-gray-300'>
                  {(() => {
                    const d = new Date(viewingDrug.expiryDate);
                    return !isNaN(d.getTime())
                      ? d.toLocaleDateString('en-US', { month: '2-digit', year: 'numeric' })
                      : viewingDrug.expiryDate;
                  })()}
                </p>
              </div>
            </div>

            <div className='space-y-3'>
              <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                <span className='text-sm text-gray-500'>{t.details?.sellingPrice}</span>
                <span className='text-sm font-bold text-gray-900 dark:text-gray-100'>
                  {formatCurrency(viewingDrug.price)}
                </span>
              </div>
              <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                <span className='text-sm text-gray-500'>{t.details?.costPrice}</span>
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  {formatCurrency(viewingDrug.costPrice || 0)}
                </span>
              </div>
              <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                <span className='text-sm text-gray-500'>{t.details?.unitsPerPack}</span>
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  {viewingDrug.unitsPerPack || 1}
                </span>
              </div>
              <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                <span className='text-sm text-gray-500'>{t.details?.barcode}</span>
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  {viewingDrug.barcode || 'N/A'}
                </span>
              </div>
              <div className='flex justify-between py-2 border-b border-gray-100 dark:border-gray-800'>
                <span className='text-sm text-gray-500'>{t.details?.internalCode}</span>
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  {viewingDrug.internalCode || 'N/A'}
                </span>
              </div>
            </div>

            <div>
              <label className='text-[10px] font-bold text-gray-400 uppercase mb-1 block'>
                {t.details?.description}
              </label>
              <p className='text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl'>
                {viewingDrug.description || t.details?.noDescription}
              </p>
            </div>
          </div>

          <div className='p-4 flex gap-3'>
            <button
              onClick={() => handlePrintBarcode(viewingDrug)}
              className={`flex-1 py-2.5 rounded-full font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 type-interactive`}
            >
              <span className='material-symbols-rounded'>qr_code_2</span>
              {t.actionsMenu.printBarcode}
            </button>
            {permissionsService.can('inventory.update') && (
              <button
                onClick={() => {
                  setViewingDrug(null);
                  handleOpenEdit(viewingDrug);
                }}
                className='flex-1 py-2.5 rounded-full font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors type-interactive'
              >
                {t.actionsMenu.edit}
              </button>
            )}
          </div>
        </Modal>
      )}

      {/* Add/Edit Modal Overlay */}
      {isModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          size='4xl'
          zIndex={50}
          title={editingDrug ? t.modal.edit : t.modal.add}
          icon={editingDrug ? 'edit' : 'add_circle'}
        >
          <form onSubmit={handleSubmit} className='h-full'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
              {/* LEFT COLUMN: Main Info */}
              <div className='md:col-span-2 space-y-4 flex flex-col'>
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.brand} *
                    </label>
                    <input
                      required
                      className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all text-sm'
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.nameArabic || 'Arabic Name'}
                    </label>
                    <input
                      className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all text-sm'
                      value={formData.nameArabic || ''}
                      onChange={(e) => setFormData({ ...formData, nameArabic: e.target.value })}
                      dir="rtl"
                    />
                  </div>
                  <div className='md:col-span-2 space-y-1'>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300'>
                      Generic Name
                    </label>
                    <input
                      className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all text-sm'
                      value={Array.isArray(formData.genericName) ? formData.genericName.join(', ') : formData.genericName || ''}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          genericName: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                        })
                      }
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.category} *
                    </label>
                    <FilterDropdown
                      variant='input'
                      items={getCategories(currentLang)}
                      selectedItem={formData.category} // English ID
                      isOpen={isEditCategoryOpen}
                      onToggle={() => setIsEditCategoryOpen(!isEditCategoryOpen)}
                      onSelect={(val) => {
                        setFormData({ ...formData, category: val, dosageForm: '' });
                        setIsEditCategoryOpen(false);
                      }}
                      keyExtractor={(c) => c}
                      renderSelected={(c) => getLocalizedCategory(c || 'General', currentLang)}
                      renderItem={(c) => getLocalizedCategory(c, currentLang)}
                      className='w-full h-[50px]'
                      color={color}
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Product Type
                    </label>
                    <FilterDropdown
                      variant='input'
                      items={getProductTypes(formData.category || 'General', currentLang)} // English IDs
                      selectedItem={formData.dosageForm || ''}
                      isOpen={isEditDosageOpen}
                      onToggle={() => setIsEditDosageOpen(!isEditDosageOpen)}
                      onSelect={(val) => {
                        setFormData({ ...formData, dosageForm: val });
                        setIsEditDosageOpen(false);
                      }}
                      keyExtractor={(c) => c}
                      renderSelected={(c) =>
                        c
                          ? getLocalizedProductType(c, currentLang)
                          : t.addProduct?.placeholders?.dosageForm || 'Select Type'
                      }
                      renderItem={(c) => getLocalizedProductType(c, currentLang)}
                      className='w-full h-[50px]'
                      color={color}
                    />
                  </div>
                </div>

                <div className='space-y-1.5'>
                  <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    {t.fields?.status || 'Product Status'}
                  </label>
                  <div className='flex bg-gray-50 dark:bg-gray-800/50 p-1 rounded-xl border border-gray-200 dark:border-gray-700'>
                    <button
                      type='button'
                      onClick={() => setFormData({ ...formData, status: 'active' })}
                      className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${formData.status === 'active' || !formData.status ? 'bg-white dark:bg-gray-700 shadow-sm text-green-600 dark:text-green-400' : 'text-gray-400'}`}
                    >
                      {t.active || 'Active'}
                    </button>
                    <button
                      type='button'
                      onClick={() => setFormData({ ...formData, status: 'inactive' })}
                      className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${formData.status === 'inactive' ? 'bg-white dark:bg-gray-700 shadow-sm text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}
                    >
                      {t.inactive || 'Inactive'}
                    </button>
                    <button
                      type='button'
                      onClick={() => setFormData({ ...formData, status: 'discontinued' })}
                      className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${formData.status === 'discontinued' ? 'bg-white dark:bg-gray-700 shadow-sm text-red-600 dark:text-red-400' : 'text-gray-400'}`}
                    >
                      {t.discontinued || 'Discontinued'}
                    </button>
                  </div>
                </div>

                {/* Multi-Barcode Input */}
                <div>
                  <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    {t.modal.barcode}
                  </label>
                  <div className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus-within:ring-2 focus-within:ring-blue-500 transition-all flex flex-wrap gap-2 items-center min-h-[42px]'>
                    {formData.barcode && (
                      <span className='inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium border border-gray-200 dark:border-blue-800'>
                        <span className='material-symbols-rounded text-[14px]'>qr_code_2</span>
                        {formData.barcode}
                        <button
                          type='button'
                          onClick={() => setFormData({ ...formData, barcode: '' })}
                          className='hover:text-blue-900 dark:hover:text-blue-100'
                        >
                          <span className='material-symbols-rounded text-[14px]'>close</span>
                        </button>
                      </span>
                    )}
                    {formData.additionalBarcodes?.map((code, idx) => (
                      <span
                        key={idx}
                        className='inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-300 dark:border-gray-600'
                      >
                        {code}
                        <button
                          type='button'
                          onClick={() => {
                            const newCodes = [...(formData.additionalBarcodes || [])];
                            newCodes.splice(idx, 1);
                            setFormData({ ...formData, additionalBarcodes: newCodes });
                          }}
                          className='hover:text-gray-900 dark:hover:text-gray-100'
                        >
                          <span className='material-symbols-rounded text-[14px]'>close</span>
                        </button>
                      </span>
                    ))}
                    <input
                      className='flex-1 bg-transparent border-none outline-hidden text-sm min-w-[120px]'
                      placeholder={!formData.barcode ? 'Scan primary barcode' : 'Add more...'}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim();
                          if (val) {
                            if (!formData.barcode) setFormData({ ...formData, barcode: val });
                            else
                              setFormData({
                                ...formData,
                                additionalBarcodes: [...(formData.additionalBarcodes || []), val],
                              });
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    {t.modal.internalCode}
                  </label>
                  <div className='relative'>
                    <input
                      className='w-full pl-3 pr-10 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all text-sm font-mono'
                      placeholder='Auto-generated'
                      value={formData.internalCode || ''}
                      onChange={(e) => setFormData({ ...formData, internalCode: e.target.value })}
                    />
                    <button
                      type='button'
                      onClick={generateInternalCode}
                      className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary-500 transition-colors'
                      title='Auto-Generate'
                    >
                      <span className='material-symbols-rounded text-[20px]'>autorenew</span>
                    </button>
                  </div>
                </div>

                <div className='flex-1 flex flex-col'>
                  <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    {t.modal.desc}
                  </label>
                  <SmartTextarea
                    className='w-full flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all text-sm resize-none'
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              {/* RIGHT COLUMN: Details */}
              <div className='space-y-4'>
                <div className='bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-4'>
                  <h4 className='text-xs font-bold text-gray-500 uppercase flex items-center gap-2'>
                    <span className='material-symbols-rounded text-base'>inventory</span> Inventory
                  </h4>
                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        {t.modal.stock}
                      </label>
                      <input
                        type='number'
                        step='0.01'
                        required
                        className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all text-sm'
                        value={formData.stock}
                        onChange={(e) =>
                          setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        {t.modal.unitsPerPack}
                      </label>
                      <input
                        type='number'
                        min='1'
                        className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all text-sm'
                        value={formData.unitsPerPack || 1}
                        onChange={(e) =>
                          setFormData({ ...formData, unitsPerPack: parseInt(e.target.value) || 1 })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.expiry}
                    </label>
                    <SmartDateInput
                      required
                      className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all text-sm'
                      value={formData.expiryDate}
                      onChange={(val) => setFormData({ ...formData, expiryDate: val })}
                    />
                  </div>
                </div>

                <div className='bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-4'>
                  <h4 className='text-xs font-bold text-gray-500 uppercase flex items-center gap-2'>
                    <span className='material-symbols-rounded text-base'>payments</span> Pricing
                  </h4>
                  <div className='space-y-4'>
                    <div>
                      <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        {t.modal.price}
                      </label>
                      <input
                        type='number'
                        step='0.01'
                        required
                        className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all text-sm font-bold text-green-600'
                        value={formData.price}
                        onChange={(e) =>
                          setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        {t.modal.cost}
                      </label>
                      <input
                        type='number'
                        step='0.01'
                        className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all text-sm'
                        value={formData.costPrice || 0}
                        onChange={(e) =>
                          setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-3'>
                    <div>
                      <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        {currentLang === 'ar' ? 'سعر الشريط' : 'Unit Price'}
                      </label>
                      <input
                        type='number'
                        step='0.01'
                        className='w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-amber-500 outline-hidden transition-all text-sm font-bold text-amber-600'
                        value={formData.unitPrice || 0}
                        placeholder={formData.price && formData.unitsPerPack ? (formData.price / formData.unitsPerPack).toFixed(2) : ''}
                        onChange={(e) =>
                          setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div>
                      <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                        {currentLang === 'ar' ? 'تكلفة الشريط' : 'Unit Cost'}
                      </label>
                      <input
                        type='number'
                        step='0.01'
                        className='w-full px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-900/30 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-amber-500 outline-hidden transition-all text-sm text-amber-700'
                        value={formData.unitCostPrice || 0}
                        placeholder={formData.costPrice && formData.unitsPerPack ? (formData.costPrice / formData.unitsPerPack).toFixed(2) : ''}
                        onChange={(e) =>
                          setFormData({ ...formData, unitCostPrice: parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      Max Discount (%)
                    </label>
                    <input
                      type='number'
                      min='0'
                      max='100'
                      className='w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all text-sm text-red-500'
                      value={formData.maxDiscount || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className='pt-6 flex gap-3 border-t border-gray-100 dark:border-gray-800 mt-6'>
              <button
                type='button'
                onClick={() => setIsModalOpen(false)}
                className='flex-1 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors'
              >
                {t.modal.cancel}
              </button>
              <button
                type='submit'
                className={`flex-1 py-3 rounded-xl font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-md transition-all active:scale-95`}
              >
                {t.modal.save}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Print Quantity Modal */}
      {printModalDrug && (
        <Modal
          isOpen={true}
          onClose={() => setPrintModalDrug(null)}
          size='sm'
          title={t.actionsMenu.printBarcode}
          icon='print'
        >
          <div className='space-y-4'>
            <div className='text-center'>
              <div className='font-medium text-gray-900 dark:text-gray-100'>
                {printModalDrug.name}
              </div>
              <div className='text-sm text-gray-500'>
                {Array.isArray(printModalDrug.genericName)
                  ? printModalDrug.genericName.join(' + ')
                  : (printModalDrug.genericName as any)}
              </div>
            </div>

            <div className='flex items-center justify-center gap-4'>
              <button
                type='button'
                onClick={() => setPrintQuantity(Math.max(1, printQuantity - 1))}
                className='w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors'
              >
                <span className='material-symbols-rounded text-xl'>remove</span>
              </button>

              <input
                type='number'
                min='1'
                max='100'
                value={printQuantity}
                onChange={(e) =>
                  setPrintQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))
                }
                className='w-20 h-12 text-center text-2xl font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-hidden'
              />

              <button
                type='button'
                onClick={() => setPrintQuantity(Math.min(100, printQuantity + 1))}
                className='w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors'
              >
                <span className='material-symbols-rounded text-xl'>add</span>
              </button>
            </div>

            <p className='text-xs text-center text-gray-400'>{t.actionsMenu.printQtyPrompt}</p>

            <div className='flex gap-3 pt-2'>
              <button
                type='button'
                onClick={() => setPrintModalDrug(null)}
                className='flex-1 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors'
              >
                {t.modal.cancel}
              </button>
              <button
                type='button'
                onClick={handleConfirmPrint}
                className={`flex-1 py-3 rounded-xl font-medium text-white bg-primary-600 hover:bg-primary-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2`}
              >
                <span className='material-symbols-rounded text-lg'>print</span>
                {t.actionsMenu.printBarcode}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
