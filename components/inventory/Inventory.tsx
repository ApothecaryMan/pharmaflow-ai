import type { ColumnDef } from '@tanstack/react-table';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { UserRole } from '../../config/permissions';
import { useSettings } from '../../context';
import {
  getCategories,
  getLocalizedCategory,
  getLocalizedProductType,
  getProductTypes,
  isMedicineCategory,
} from '../../data/productCategories';
import { permissionsService } from '../../services/auth/permissionsService';
import { batchService } from '../../services/inventory/batchService';
import { DrugSearchEngine } from '../../services/search/drugSearchService';
import type { Drug, GroupedDrug, GroupingKey } from '../../types';
import { useAuthStore } from '../../stores/authStore';
import { useInventory } from '../../hooks/queries/useInventoryQuery';
import {
  useAddProduct,
  useUpdateProduct,
  useDeleteProduct,
} from '../../hooks/mutations/useInventoryMutations';
import { formatCompactCurrency, formatCurrency, formatCurrencyParts } from '../../utils/currency';
import { getDisplayName } from '../../utils/drugDisplayName';
import {
  formatExpiryDate,
  getExpiryColorClass,
  parseExpiryEndOfMonth,
} from '../../utils/expiryUtils';
import { formatStock, formatStockParts, validateStock } from '../../utils/inventory';
import { money } from '../../utils/money';
import { convertToPacks, resolveDisplayStock, resolveUnits } from '../../utils/stockUtils';
import {
  CARD_BASE,
  MODAL_FOOTER_BTN_CANCEL,
  MODAL_FOOTER_BTN_PRIMARY,
} from '../../utils/themeStyles';
import { HoverDropdown, SegmentedControl } from '../common';
import { useContextMenu, useContextMenuTrigger } from '../common/ContextMenu';
import type { FilterConfig } from '../common/FilterPill';
import { InteractiveCard } from '../common/InteractiveCard';
import { Modal } from '../common/Modal';
import { PageHeader } from '../common/PageHeader';
import { SearchEngineInput } from '../common/SearchEngineInput';
import { SmartDateInput, SmartInput, SmartTextarea } from '../common/SmartInputs';
import { PriceDisplay, TanStackTable } from '../common/TanStackTable';
import { useStatusBar } from '../layout/StatusBar';
import { AddProduct } from './AddProduct';
import { EditProductModal } from './EditProductModal';
import { useInventoryHeader } from './InventoryHeaderContext';
import { usePageShortcuts } from '../../hooks/keyboard';

/**
 * Maps a product category to a premium static status badge style,
 * providing clinical and clear category separation regardless of the workspace theme color.
 */
const getCategoryBadgeClass = (category: string): string => {
  const normalized = (category || 'General').toLowerCase();
  switch (normalized) {
    case 'medicine':
    case 'دواء':
      return 'badge-info';
    case 'cosmetics':
    case 'تجميل':
      return 'badge-purple';
    default:
      return 'badge-neutral';
  }
};

interface InventoryProps {
  color: string;
  t: Translations;
  onViewChange?: (view: string) => void;
}

export const Inventory: React.FC<InventoryProps> = ({ color, t, onViewChange }) => {
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: inventory = [], isLoading } = useInventory(activeBranchId);
  const addProduct = useAddProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { getVerifiedDate } = useStatusBar();
  const { showMenu } = useContextMenu();
  const { textTransform } = useSettings();

  // Detect language direction/locale
  const isRTL =
    t.direction === 'rtl' || t.lang === 'ar' || (t.title && /[\u0600-\u06FF]/.test(t.title));
  const currentLang = isRTL ? 'ar' : 'en';

  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [viewingDrug, setViewingDrug] = useState<Drug | null>(null);
  const [activeDetailsTab, setActiveDetailsTab] = useState<'general' | 'pharmacy'>('general');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  const viewingDrugBatches = useMemo(() => {
    if (!viewingDrug) return [];
    if (viewingDrug.barcode) {
      return inventory.filter((d) => d.barcode === viewingDrug.barcode);
    }
    return inventory.filter(
      (d) => d.name === viewingDrug.name && d.dosageForm === viewingDrug.dosageForm
    );
  }, [inventory, viewingDrug]);
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [selectedBatches, setSelectedBatches] = useState<Record<string, string>>({}); // groupId -> drugId
  const [selectedUnits, setSelectedUnits] = useState<Record<string, string>>({});
  const [isDataSettled, setIsDataSettled] = useState(false);

  useEffect(() => {
    if (searchTerm === '') {
      setDebouncedSearchTerm('');
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const {
    setLeftContent,
    setRightContent,
    setBottomContent,
    setShowStatsToggle,
    setShowStats,
    showStats,
  } = useInventoryHeader();

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

  // Initial Data for Add/Duplicate modal flow
  const [initialData, setInitialData] = useState<Partial<Drug> | null>(null);

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

  usePageShortcuts(
    'inventory',
    {
      'ctrl+n': () => {
        if (permissionsService.can('inventory.add')) {
          handleOpenAdd();
        }
      },
      'ctrl+f': () => {
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="text"][placeholder*="Search"], input[type="text"][placeholder*="بحث"]'
        );
        if (searchInput) {
          searchInput.focus();
        }
      },
    },
    []
  );

  const handleViewDetails = (drug: Drug) => {
    if (drug) {
      setViewingDrug(drug);
      setActiveDetailsTab('general');
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
    setInitialData(null);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDuplicate = (drug: Drug) => {
    setEditingDrug(null); // Set as new drug
    const { id, ...rest } = drug;
    setInitialData({
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
        updateProduct.mutateAsync({
          id: drug.id,
          updates: { stock: validateStock(resolveUnits(val, false, drug.unitsPerPack)) },
        });
      }
    }
    setActiveMenuId(null);
  };

  const handleDelete = (id: string) => {
    deleteProduct.mutateAsync(id);
    setActiveMenuId(null);
  };

  // Categories are now determined dynamically using helper
  const allCategories = getCategories(currentLang);

  // 1. Base filtering (Pills/Status only - No Search)
  const baseFilteredInventory = useMemo(() => {
    let result = [...inventory];

    // Apply Stock Status Filter
    const stockVals =
      activeFilters['stock_status'] && activeFilters['stock_status'].length > 0
        ? activeFilters['stock_status']
        : ['in_stock'];

    if (!stockVals.includes('all')) {
      result = result
        .map((d) => {
          if (d.batches && d.batches.length > 0) {
            return {
              ...d,
              batches: d.batches.filter((b: any) => {
                if (stockVals.includes('in_stock') && stockVals.includes('out_of_stock'))
                  return true;
                if (stockVals.includes('in_stock')) return b.stock > 0;
                if (stockVals.includes('out_of_stock')) return b.stock <= 0;
                return true;
              }),
            };
          }
          return d;
        })
        .filter((d) => {
          if (stockVals.includes('in_stock') && stockVals.includes('out_of_stock')) return true;
          if (stockVals.includes('in_stock')) return d.stock > 0;
          if (stockVals.includes('out_of_stock')) return d.stock <= 0;
          return true;
        });
    }

    // Apply other Active Filters (Pills)
    Object.entries(activeFilters).forEach(([groupId, values]) => {
      const vals = values as any[];
      if (!vals || vals.length === 0 || groupId === 'stock_status') return;

      if (groupId === 'expiry_status') {
        const now = getVerifiedDate();
        const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const nearExpiredLimit = new Date(currentMonthStart);
        nearExpiredLimit.setMonth(nearExpiredLimit.getMonth() + 3);

        result = result.filter((d) => {
          const expiry = parseExpiryEndOfMonth(d.expiryDate);
          if (vals.includes('expired')) return expiry < currentMonthStart;
          if (vals.includes('near_expiry'))
            return expiry >= currentMonthStart && expiry <= nearExpiredLimit;
          if (vals.includes('valid')) return expiry > nearExpiredLimit;
          return true;
        });
      } else if (groupId === 'category') {
        result = result.filter((d) => vals.includes(d.category));
      } else if (groupId === 'item_rank') {
        result = result.filter((d) => vals.includes(d.itemRank));
      } else if (groupId === 'product_status_filter') {
        if (!vals.includes('all')) {
          result = result.filter((d) => vals.includes(d.status || 'active'));
        }
      }
    });

    return result;
  }, [inventory, activeFilters, getVerifiedDate]);

  // Memoized Search Engine instance for the current baseFilteredInventory
  const searchEngine = useMemo(() => {
    return new DrugSearchEngine(baseFilteredInventory as any);
  }, [baseFilteredInventory]);

  // 2. Final filtering (Apply Search on top of Base)
  const filteredInventory = useMemo(() => {
    if (debouncedSearchTerm) {
      return searchEngine.search(debouncedSearchTerm, activeFilters) as Drug[];
    }
    return baseFilteredInventory;
  }, [baseFilteredInventory, searchEngine, debouncedSearchTerm, activeFilters]);

  const groupedInventory = useMemo(() => {
    const groups = batchService.groupInventory(filteredInventory);
    return groups.map((group) => {
      const selectedId = selectedBatches[group.groupId] || group.id;
      const selectedBatch = group.batches.find((d: any) => d.id === selectedId) || group;
      return {
        ...group,
        selectedBatchId: selectedId,
        selectedBatch,
      };
    });
  }, [filteredInventory, selectedBatches]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    return groupedInventory.reduce(
      (acc, drug) => {
        acc.totalItems += 1;
        const packs = convertToPacks(drug.totalStock || 0, drug.unitsPerPack || 1);

        acc.totalCost = money.add(acc.totalCost, money.multiply(drug.costPrice || 0, packs, 0));

        acc.totalSaleValue = money.add(
          acc.totalSaleValue,
          money.multiply(drug.publicPrice || 0, packs, 0)
        );

        const status = (drug as any).status || 'active';
        if (status === 'active') {
          if (drug.totalStock === 0) acc.criticalRestock += 1;
          else if (drug.totalStock <= (drug.minStock || 5) * (drug.unitsPerPack || 1))
            acc.nearReorder += 1;
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
    const groupData = drugRow as GroupedDrug & { selectedBatch?: Drug };
    const drug = groupData.selectedBatch || groupData;

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
      action: () => handleViewDetails(drug),
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

  const tableColumns = useMemo<ColumnDef<Drug>[]>(() => {
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
        size: 136,
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
        size: 700,
      },
      {
        accessorKey: 'category',
        header: t.headers.category,
        meta: { align: 'center' },
        cell: ({ row }) => (
          <span className={getCategoryBadgeClass(row.original.category)}>
            {getLocalizedCategory(row.original.category || 'General', currentLang)}
          </span>
        ),
        size: 76,
      },
      {
        accessorKey: 'status',
        header: t.headers.status || 'Status',
        cell: ({ row }) => {
          const status = row.original.status || 'active';
          const badgeClass =
            {
              active: 'badge-success',
              inactive: 'badge-warning',
              discontinued: 'badge-danger',
            }[status as 'active' | 'inactive' | 'discontinued'] || 'badge-neutral';

          return <span className={badgeClass}>{t[status] || status}</span>;
        },
        size: 79,
      },
      {
        accessorKey: 'stock',
        header: t.headers.stock,
        meta: { align: 'start' },
        cell: ({ row }) => {
          const drug = row.original;
          if (drug.stock <= 0) {
            return <span className='badge-danger'>{t.outOfStockShort || 'OUT'}</span>;
          }

          const hasDual = drug.unitsPerPack && drug.unitsPerPack > 1;
          const mode = (selectedUnits[drug.id] || 'pack') as 'pack' | 'unit';
          const unitLabel = currentLang === 'ar' ? 'وحدات' : 'Units';

          if (!hasDual) {
            const parts = formatStockParts(drug.stock, drug.unitsPerPack, {
              packs: t.details?.packs || 'Packs',
              outOfStock: t.outOfStock || 'Out of Stock',
            });
            return (
              <div
                className={`font-medium text-xs ${drug.stock < (drug.unitsPerPack || 1) ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}
              >
                {parts.value}{' '}
                {parts.label && (
                  <span className='text-[10px] text-gray-400 font-normal'>{parts.label}</span>
                )}
              </div>
            );
          }

          const displayValue = resolveDisplayStock(drug.stock, drug.unitsPerPack, mode);
          return (
            <div className='flex items-center justify-start overflow-visible'>
              <HoverDropdown
                trigger={
                  <div className='flex items-center justify-center font-bold h-7 w-16 mx-auto px-1.5 border-2 border-gray-300 dark:border-(--border-divider) rounded-md bg-(--bg-card) cursor-pointer text-xs'>
                    <span className='text-gray-700 dark:text-gray-300'>
                      {displayValue} {mode === 'unit' ? unitLabel : t.details?.packs || 'Packs'}
                    </span>
                  </div>
                }
              >
                {(['pack', 'unit'] as const).map((opt) => {
                  const isSelected = mode === opt;
                  return (
                    <div
                      key={opt}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUnits((prev) => ({ ...prev, [drug.id]: opt }));
                      }}
                      className={`px-3 py-1.5 rounded-md cursor-pointer transition-colors text-sm font-bold text-center ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                          : 'hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {opt === 'pack' ? t.details?.packs || 'Packs' : unitLabel}
                    </div>
                  );
                })}
              </HoverDropdown>
            </div>
          );
        },
        size: 110,
      },
      {
        accessorKey: 'publicPrice',
        header: t.headers.publicPrice,
        meta: { align: 'start' },
        cell: ({ row }) => {
          const parts = formatCurrencyParts(row.original.publicPrice);
          return (
            <span className='text-gray-700 dark:text-gray-300 text-xs font-bold'>
              {parts.amount}{' '}
              <span className='text-[10px] text-gray-400 font-normal'>{parts.symbol}</span>
            </span>
          );
        },
        size: 89,
      },
    ];

    // Insert cost column only if authorized
    if (canViewFinancials) {
      cols.push({
        accessorKey: 'costPrice',
        header: t.headers.cost,
        meta: { align: 'start' },
        cell: ({ row }) => {
          const groupData = row.original as GroupedDrug & { selectedBatch?: Drug };
          const drug = groupData.selectedBatch || groupData;

          if (!drug.costPrice) return <span className='text-gray-500 text-xs'>-</span>;
          const parts = formatCurrencyParts(drug.costPrice);
          return (
            <span className='text-gray-900 dark:text-gray-100 text-xs font-medium'>
              {parts.amount}{' '}
              <span className='text-[10px] text-gray-400 font-normal'>{parts.symbol}</span>
            </span>
          );
        },
        size: 90,
      });
    }

    // Add Expiry column
    cols.push({
      accessorKey: 'expiryDate',
      header: t.headers.expiry,
      cell: ({ row }) => {
        const groupData = row.original as GroupedDrug & { selectedBatch?: Drug };
        const batches = groupData.batches || [groupData];
        const drug = groupData.selectedBatch || groupData;

        const renderDateWrapper = (val: string, isDropdownTrigger = false) => {
          if (!val) return <span className='text-gray-400'>-</span>;
          const colorClass = getExpiryColorClass(val);

          return (
            <div
              className={`flex items-center justify-center w-full gap-1 tabular-nums text-xs ${colorClass} ${isDropdownTrigger ? 'cursor-pointer hover:opacity-70' : ''}`}
            >
              {formatExpiryDate(val)}
            </div>
          );
        };

        if (batches.length > 1) {
          const availableBatches = batches.filter((d: Drug) => d.stock > 0);
          const selectedBatchId = selectedBatches[groupData.groupId];
          const selectedBatchWithInventory = selectedBatchId
            ? availableBatches.find((d: Drug) => d.id === selectedBatchId)
            : null;
          const defaultBatch = availableBatches[0] || drug;
          const displayBatch = selectedBatchWithInventory || defaultBatch;
          const colorClass = getExpiryColorClass(displayBatch.expiryDate);

          return (
            <div className='flex justify-center overflow-visible'>
              <HoverDropdown
                panelWidth='min-w-[180px]'
                panelClassName='space-y-0.5 p-1.5'
                trigger={
                  <div
                    className={`flex items-center justify-center font-bold ${colorClass} h-7 w-28 mx-auto px-1.5 border-2 border-gray-300 dark:border-(--border-divider) rounded-md bg-(--bg-card) group-hover:bg-gray-200 dark:group-hover:bg-gray-600/80 cursor-pointer`}
                  >
                    <span className='flex-1 text-center text-sm'>
                      {formatExpiryDate(displayBatch.expiryDate)}
                    </span>
                    <span className='w-px self-stretch bg-current opacity-20 shrink-0' />
                    <span className='flex-1 text-center text-sm tabular-nums'>
                      {formatStock(displayBatch.stock, displayBatch.unitsPerPack, {
                        packs: '',
                        outOfStock: t.outOfStockShort || 'Out',
                      }).trim()}
                    </span>
                  </div>
                }
              >
                <div className='text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-2 py-1'>
                  {availableBatches.length} {t.batches || 'batches'}
                </div>
                {availableBatches.map((batch) => {
                  const isSelected = (selectedBatchWithInventory || defaultBatch)?.id === batch.id;
                  const c = getExpiryColorClass(batch.expiryDate);
                  return (
                    <div
                      key={batch.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBatches((prev) => ({ ...prev, [groupData.groupId]: batch.id }));
                      }}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors text-sm ${
                        isSelected
                          ? 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                          : 'hover:bg-primary-50 dark:hover:bg-primary-900/20 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <span className={`font-bold w-[44px] text-center ${c}`}>
                        {formatExpiryDate(batch.expiryDate)}
                      </span>
                      <span className='ml-auto rtl:mr-auto rtl:ml-0 tabular-nums font-bold'>
                        {formatStock(batch.stock, batch.unitsPerPack, {
                          packs: '',
                          outOfStock: t.outOfStockShort || 'Out',
                        }).trim()}
                      </span>
                    </div>
                  );
                })}
              </HoverDropdown>
            </div>
          );
        }
        return <div className='flex justify-center'>{renderDateWrapper(drug.expiryDate)}</div>;
      },
      meta: { align: 'center', smartDate: false },
      size: 143,
    });

    return cols;
  }, [color, currentLang, t, textTransform, canViewFinancials]);

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
          { label: t.outOfStockShort || 'Out', value: 'out_of_stock' },
        ],
        defaultValue: 'in_stock',
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

  // Memoized header slot elements
  const leftContentElement = useMemo(() => {
    if (mode !== 'list') return null;
    return (
      <div className='relative flex-1 max-w-xl'>
        <SearchEngineInput
          value={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilters={activeFilters}
          filterConfigs={filterConfigs}
          onUpdateFilter={(id, vals) => setActiveFilters((prev) => ({ ...prev, [id]: vals }))}
          onClear={() => setSearchTerm('')}
          placeholder={t.searchPlaceholder}
          color={color}
          inventory={baseFilteredInventory}
        />
      </div>
    );
  }, [mode, searchTerm, activeFilters, filterConfigs, t, color, baseFilteredInventory]);

  const bottomContentElement = useMemo(() => {
    if (mode !== 'list') return null;
    return (
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 '>
        <InteractiveCard
          isLoading={isLoading || !isDataSettled}
          className={`flex flex-col w-full px-5 py-2.5 rounded-2xl ${isRTL ? 'items-end' : 'items-start'}`}
          pages={[
            {
              theme: 'bg-primary-50 dark:bg-primary-200',
              content: (
                <div className={`flex flex-col w-full ${isRTL ? 'items-end' : 'items-start'}`}>
                  <span className='text-[10px] font-bold uppercase text-primary-600 dark:text-primary-700'>
                    {t.summary?.totalItems || 'Total Items'}
                  </span>
                  <span className='text-xl font-bold text-primary-900 dark:text-primary-900'>
                    {summaryStats.totalItems >= 1000
                      ? new Intl.NumberFormat('en-US', {
                          notation: 'compact',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(summaryStats.totalItems)
                      : summaryStats.totalItems}
                  </span>
                </div>
              ),
            },
          ]}
        />
        {canViewFinancials && (
          <InteractiveCard
            isLoading={isLoading || !isDataSettled}
            className={`flex flex-col w-full px-5 py-2.5 rounded-2xl ${isRTL ? 'items-end' : 'items-start'}`}
            pages={[
              {
                theme: 'bg-green-50 dark:bg-green-200',
                content: (
                  <div className={`flex flex-col w-full ${isRTL ? 'items-end' : 'items-start'}`}>
                    <span className='text-[10px] font-bold uppercase text-green-600 dark:text-green-700'>
                      {t.summary?.totalCost || 'Inventory Cost'}
                    </span>
                    <span className='text-xl font-bold text-green-900 dark:text-green-900 tabular-nums'>
                      <PriceDisplay
                        value={summaryStats.totalCost}
                        compact={summaryStats.totalCost >= 1000}
                      />
                    </span>
                  </div>
                ),
              },
              {
                theme: 'bg-indigo-50 dark:bg-indigo-200',
                content: (
                  <div className={`flex flex-col w-full ${isRTL ? 'items-end' : 'items-start'}`}>
                    <span className='text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-700'>
                      {t.summary?.totalSaleValue || 'Sale Value'}
                    </span>
                    <span className='text-xl font-bold text-indigo-900 dark:text-indigo-900 tabular-nums'>
                      <PriceDisplay
                        value={summaryStats.totalSaleValue}
                        compact={summaryStats.totalSaleValue >= 1000}
                      />
                    </span>
                  </div>
                ),
              },
            ]}
          />
        )}
        <InteractiveCard
          isLoading={isLoading || !isDataSettled}
          className={`flex flex-col w-full px-5 py-2.5 rounded-2xl ${isRTL ? 'items-end' : 'items-start'}`}
          pages={[
            {
              theme: 'bg-red-50 dark:bg-red-200',
              content: (
                <div className={`flex flex-col w-full ${isRTL ? 'items-end' : 'items-start'}`}>
                  <span className='text-[10px] font-bold uppercase text-red-600 dark:text-red-700'>
                    {t.summary?.restock || 'Critical Restock'}
                  </span>
                  <span className='text-xl font-bold text-red-900 dark:text-red-900'>
                    {summaryStats.criticalRestock}
                  </span>
                </div>
              ),
            },
            {
              theme: 'bg-amber-50 dark:bg-amber-200',
              content: (
                <div className={`flex flex-col w-full ${isRTL ? 'items-end' : 'items-start'}`}>
                  <span className='text-[10px] font-bold uppercase text-amber-600 dark:text-amber-700'>
                    {t.summary?.nearReorder || 'Near Reorder'}
                  </span>
                  <span className='text-xl font-bold text-amber-900 dark:text-amber-900'>
                    {summaryStats.nearReorder}
                  </span>
                </div>
              ),
            },
            {
              theme: 'bg-gray-100 dark:bg-gray-200',
              content: (
                <div className={`flex flex-col w-full ${isRTL ? 'items-end' : 'items-start'}`}>
                  <span className='text-[10px] font-bold uppercase text-gray-500 dark:text-gray-600'>
                    {t.summary?.discontinued || 'Discontinued'}
                  </span>
                  <span className='text-xl font-bold text-gray-700 dark:text-gray-800'>
                    {summaryStats.discontinuedCount}
                  </span>
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  }, [mode, isLoading, isDataSettled, isRTL, t, summaryStats, canViewFinancials]);

  // Set header slots dynamically when the elements change
  useEffect(() => {
    setLeftContent(leftContentElement);
    return () => {
      setLeftContent(null);
    };
  }, [leftContentElement, setLeftContent]);

  useEffect(() => {
    setBottomContent(bottomContentElement);
    setShowStatsToggle(mode === 'list');
    return () => {
      setBottomContent(null);
      setShowStatsToggle(false);
    };
  }, [bottomContentElement, mode, setBottomContent, setShowStatsToggle]);

  return (
    <div className='h-full flex flex-col gap-2 overflow-y-auto'>
      {/* Header slots are registered in the useEffect above */}

      {mode === 'list' ? (
        <div className='flex flex-col flex-1 min-h-0'>
          {/* Table Card - Default Design */}
          <div className='flex-1 overflow-hidden'>
            <TanStackTable
              data={groupedInventory}
              columns={enhancedColumns}
              tableId='inventory_table'
              color={color}
              enableTopToolbar={false} // Disabled since we have our custom hub above
              manualFiltering={true}
              onRowContextMenu={(e, row) => showMenu(e.clientX, e.clientY, getRowActions(row))}
              emptyMessage={t.noResults}
              lite={false}
              dense={true}
              enablePagination={true}
              enableVirtualization={true}
              pageSize='auto'
              enableShowAll={true}
              initialFilters={activeFilters}
              onFilterChange={setActiveFilters}
              isLoading={!isDataSettled}
            />
          </div>
        </div>
      ) : (
        /* ADD PRODUCT FORM VIEW - COMPACT LAYOUT */
        <div className='flex-1 overflow-y-auto'>
          <AddProduct
            color={color}
            t={t.addProduct || {}}
            language={currentLang.toUpperCase()}
            onViewChange={onViewChange}
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
          disabled={isLoading}
          tabs={[
            { label: t.generalInfo || 'معلومات عامة', value: 'general', icon: 'info' },
            {
              label: t.pharmacyDetails || 'تفاصيل الصيدلية',
              value: 'pharmacy',
              icon: 'storefront',
            },
          ]}
          activeTab={activeDetailsTab}
          onTabChange={setActiveDetailsTab}
          hideCloseButton={true}
          footer={
            <div className='flex gap-3'>
              <button
                onClick={() => handlePrintBarcode(viewingDrug)}
                className={MODAL_FOOTER_BTN_CANCEL}
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
                  className={MODAL_FOOTER_BTN_PRIMARY}
                >
                  <span className='material-symbols-rounded'>edit</span>
                  {t.actionsMenu.edit}
                </button>
              )}
              <button onClick={() => setViewingDrug(null)} className={MODAL_FOOTER_BTN_CANCEL}>
                <span className='material-symbols-rounded'>close</span>
              </button>
            </div>
          }
        >
          <div className='space-y-6 pt-2 pb-4'>
            {activeDetailsTab === 'general' ? (
              <div className='space-y-6 '>
                <div className='flex justify-between items-start bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700'>
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
                    <p className='text-gray-500 font-medium text-start mt-1' dir='ltr'>
                      {Array.isArray(viewingDrug.genericName)
                        ? viewingDrug.genericName.join(' + ')
                        : (viewingDrug.genericName as any)}
                    </p>
                  </div>
                  <span className={getCategoryBadgeClass(viewingDrug.category)}>
                    {getLocalizedCategory(viewingDrug.category || 'General', currentLang)}
                  </span>
                </div>

                <div className='space-y-3'>
                  <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-800 items-center'>
                    <div className='flex items-center gap-2 text-gray-500'>
                      <span className='material-symbols-rounded text-lg'>inventory_2</span>
                      <span className='text-sm'>{t.details?.unitsPerPack || 'Units per Pack'}</span>
                    </div>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full'>
                      {viewingDrug.unitsPerPack || 1}
                    </span>
                  </div>
                  <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-800 items-center'>
                    <div className='flex items-center gap-2 text-gray-500'>
                      <span className='material-symbols-rounded text-lg'>barcode</span>
                      <span className='text-sm'>{t.details?.barcode || 'Barcode'}</span>
                    </div>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                      {viewingDrug.barcode || 'N/A'}
                    </span>
                  </div>
                  <div className='flex justify-between py-3 border-b border-gray-100 dark:border-gray-800 items-center'>
                    <div className='flex items-center gap-2 text-gray-500'>
                      <span className='material-symbols-rounded text-lg'>tag</span>
                      <span className='text-sm'>{t.details?.internalCode || 'Internal Code'}</span>
                    </div>
                    <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                      {viewingDrug.internalCode || 'N/A'}
                    </span>
                  </div>
                </div>

                <div>
                  <label className='text-[10px] font-bold text-gray-400 uppercase mb-2 flex items-center gap-1'>
                    <span className='material-symbols-rounded text-[14px]'>description</span>
                    {t.details?.description || 'Description'}
                  </label>
                  <p className='text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700'>
                    {viewingDrug.description ||
                      t.details?.noDescription ||
                      'No description available.'}
                  </p>
                </div>
              </div>
            ) : (
              <div className='space-y-6 '>
                <div className='overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900/50'>
                  <table className='w-full text-center text-sm'>
                    <thead className='border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50'>
                      <tr>
                        <th className='px-4 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs'>
                          {t.modal?.expiry ||
                            (currentLang === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date')}
                        </th>
                        <th className='px-4 py-3 font-bold text-gray-500 uppercase tracking-wider text-xs'>
                          {t.details?.stockLevel || (currentLang === 'ar' ? 'الكمية' : 'Total Qty')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-100 dark:divide-gray-800/50'>
                      {Object.entries(
                        viewingDrugBatches.reduce((acc: Record<string, number>, batch) => {
                          const date = batch.expiryDate;
                          acc[date] = (acc[date] || 0) + batch.stock;
                          return acc;
                        }, {})
                      )
                        .sort(
                          ([dateA], [dateB]) =>
                            parseExpiryEndOfMonth(dateA).getTime() -
                            parseExpiryEndOfMonth(dateB).getTime()
                        )
                        .map(([expiryDate, rawStock], idx) => {
                          const totalStock = rawStock as number;
                          const stockParts = formatStockParts(
                            totalStock,
                            viewingDrug.unitsPerPack,
                            {
                              packs: t.details?.packs || 'Packs',
                              outOfStock: t.outOfStock || 'Out of Stock',
                            }
                          );

                          return (
                            <tr
                              key={idx}
                              className='hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors'
                            >
                              <td className='px-4 py-3'>
                                <span
                                  className={`font-medium tabular-nums ${getExpiryColorClass(expiryDate)}`}
                                >
                                  {formatExpiryDate(expiryDate)}
                                </span>
                              </td>
                              <td className='px-4 py-3'>
                                <span
                                  className={`font-bold tabular-nums ${totalStock < (viewingDrug.unitsPerPack || 1) ? 'text-red-500' : 'text-primary-600 dark:text-primary-400'}`}
                                >
                                  {stockParts.value}{' '}
                                  {stockParts.label && (
                                    <span className='text-xs font-normal opacity-80'>
                                      {stockParts.label}
                                    </span>
                                  )}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>

                <div className='bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 space-y-4'>
                  <div className='flex justify-between items-center'>
                    <div className='flex items-center gap-2 text-gray-500'>
                      <span className='material-symbols-rounded text-lg'>sell</span>
                      <span className='text-sm font-medium'>
                        {t.details?.sellingPrice || 'Selling Price'}
                      </span>
                    </div>
                    <span className='text-xl font-bold text-green-600 dark:text-green-400'>
                      {formatCurrency(viewingDrug.publicPrice)}
                    </span>
                  </div>
                  <div className='h-px bg-gray-200 dark:bg-gray-700 w-full'></div>
                  <div className='flex justify-between items-center'>
                    <div className='flex items-center gap-2 text-gray-500'>
                      <span className='material-symbols-rounded text-lg'>shopping_cart</span>
                      <span className='text-sm font-medium'>
                        {t.details?.costPrice || 'Cost Price'}
                      </span>
                    </div>
                    <span className='text-lg font-bold text-gray-700 dark:text-gray-300'>
                      {formatCurrency(viewingDrug.costPrice || 0)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
      {/* Add/Edit Modal Overlay */}
      <EditProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDrug(null);
          setInitialData(null);
        }}
        editingDrug={editingDrug}
        initialData={initialData}
        inventory={inventory}
        onAddDrug={(drug) => addProduct.mutateAsync(drug)}
        onUpdateDrug={(drug) => updateProduct.mutateAsync({ id: drug.id, updates: drug })}
        color={color}
        t={t}
      />

      {/* Print Quantity Modal */}
      {printModalDrug && (
        <Modal
          isOpen={true}
          onClose={() => setPrintModalDrug(null)}
          size='sm'
          title={t.actionsMenu.printBarcode}
          icon='print'
          disabled={isLoading}
          footer={
            <div className='flex gap-3'>
              <button
                type='button'
                onClick={() => setPrintModalDrug(null)}
                className={MODAL_FOOTER_BTN_CANCEL}
              >
                {t.modal.cancel}
              </button>
              <button
                type='button'
                onClick={handleConfirmPrint}
                className={MODAL_FOOTER_BTN_PRIMARY}
              >
                <span className='material-symbols-rounded text-lg'>print</span>
                {t.actionsMenu.printBarcode}
              </button>
            </div>
          }
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
          </div>
        </Modal>
      )}
    </div>
  );
};
