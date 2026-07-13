import type { ColumnDef } from '@tanstack/react-table';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { StorageKeys } from '../../config/storageKeys';
import { useSettings } from '../../context';
import { permissionsService } from '../../services/auth/permissionsService';
import { purchaseService } from '../../services/purchases/purchaseService';
import { returnService } from '../../services/returns/returnService';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useAuthStore } from '../../stores/authStore';
import type { Drug, Employee, Purchase, PurchaseReturn, PurchaseReturnItem } from '../../types';
import { usePurchases } from '../../hooks/queries/usePurchasesQuery';
import { usePurchaseReturns } from '../../hooks/queries/useReturnsQuery';
import { useInventory } from '../../hooks/queries/useInventoryQuery';
import { useEmployees } from '../../hooks/queries/useEmployeesQuery';
import { useHandlerInfrastructure } from '../../hooks/useHandlerInfrastructure';
import { usePurchaseHandlers } from '../../hooks/purchases/usePurchaseHandlers';
import { formatCurrency } from '../../utils/currency';
import { getDisplayName } from '../../utils/drugDisplayName';
import { idGenerator } from '../../utils/idGenerator';
import { money } from '../../utils/money';
import { storage } from '../../utils/storage';
import {
  CARD_BASE,
  INPUT_BASE,
  MODAL_FOOTER_BTN_CANCEL,
  MODAL_FOOTER_BTN_PRIMARY,
} from '../../utils/themeStyles';
import {
  Modal,
  PriceDisplay,
  SearchDropdown,
  SearchInput,
  SegmentedControl,
  SmartInput,
  SmartTextarea,
  TanStackTable,
  useContextMenu,
  useSearchKeyboardNavigation,
} from '../common';

interface PurchaseReturnsProps {
  color: string;
  t: Translations;
  language: 'EN' | 'AR';
}

export const PurchaseReturns: React.FC<PurchaseReturnsProps> = ({ color, t, language }) => {
  const { textTransform } = useSettings();
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const { data: purchases = [] } = usePurchases(activeBranchId);
  const { data: purchaseReturns = [] } = usePurchaseReturns(activeBranchId);
  const { data: drugs = [] } = useInventory(activeBranchId);
  const queryClient = useQueryClient();
  const activeOrgId = useAuthStore((s) => s.activeOrgId);
  const currentEmployeeId = useAuthStore((s) => s.currentEmployee?.id ?? null);
  const { data: employees = [] } = useEmployees(activeBranchId);
  const infra = useHandlerInfrastructure();
  const { handleCreatePurchaseReturn } = usePurchaseHandlers({
    currentEmployeeId,
    employees,
    activeBranchId,
    activeOrgId,
    purchases,
    setPurchases: infra.setPurchases,
    purchaseReturns,
    setPurchaseReturns: infra.setPurchaseReturns,
    currentShift: infra.currentShift,
    addPurchase: infra.addPurchase,
    approvePurchase: infra.approvePurchase,
    markAsReceived: infra.markAsReceived,
    createPurchaseReturn: infra.createPurchaseReturn,
  });
  const { showMenu } = useContextMenu();
  const [mode, setMode] = useState<'create' | 'history'>('create');
  const [search, setSearch] = useState('');

  // Pagination states for History Table
  const [page, setPage] = useState(1);
  const [pagedReturns, setPagedReturns] = useState<PurchaseReturn[]>(purchaseReturns || []);
  const [totalReturns, setTotalReturns] = useState(purchaseReturns?.length || 0);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const pageSize = 50;

  useEffect(() => {
    let isMounted = true;
    const fetchPage = async () => {
      try {
        setIsPageLoading(true);
        const serverFilters = { search: search || undefined };
        const result = await returnService.listPurchaseReturnsPage({
          page,
          pageSize,
          filters: serverFilters,
        });
        if (isMounted) {
          setPagedReturns(result.rows);
          setTotalReturns(result.total);
        }
      } catch (err) {
        console.error('Failed to load purchase returns page', err);
      } finally {
        if (isMounted) setIsPageLoading(false);
      }
    };
    fetchPage();
    return () => {
      isMounted = false;
    };
  }, [page, search, activeBranchId]);

  // Create Return state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [notes, setNotes] = useState('');

  // Helper: Get total returned quantity for an item
  const getReturnedQuantity = (purchaseId: string, drugId: string): number => {
    return purchaseReturns
      .filter((r) => r.purchaseId === purchaseId)
      .reduce((sum, r) => {
        const item = r.items.find((i) => i.drugId === drugId);
        return sum + (item?.quantityReturned || 0);
      }, 0);
  };

  // Get available purchases (not fully returned)
  const availablePurchases = purchases.filter((p) => {
    if (p.status !== 'completed' && p.status !== 'received') return false;

    // Check if all items are fully returned
    const allReturned = p.items.every((item) => {
      const returned = getReturnedQuantity(p.id, item.drugId);
      return returned >= item.quantity;
    });

    return !allReturned;
  });

  // Search PO state
  const [poSearch, setPoSearch] = useState('');
  const [isPoDropdownOpen, setIsPoDropdownOpen] = useState(false);
  const poDropdownRef = useRef<HTMLDivElement>(null);

  // Live Inline Return selection states
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [returnReasons, setReturnReasons] = useState<Record<string, PurchaseReturnItem['reason']>>(
    {}
  );
  const [returnConditions, setReturnConditions] = useState<
    Record<string, PurchaseReturnItem['condition']>
  >({});

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (poDropdownRef.current && !poDropdownRef.current.contains(e.target as Node)) {
        setIsPoDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const [searchedPurchases, setSearchedPurchases] = useState<Purchase[]>([]);
  const [isSearchingPo, setIsSearchingPo] = useState(false);

  // Instead of static filtering, we search the server dynamically
  useEffect(() => {
    let isMounted = true;
    if (!poSearch) {
      setSearchedPurchases([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingPo(true);
        const result = await purchaseService.listPage({
          page: 1,
          pageSize: 20,
          filters: { search: poSearch },
        });

        if (isMounted) {
          // Filter to only completed/received that are not fully returned
          const available = result.rows.filter((p) => {
            if (p.status !== 'completed' && p.status !== 'received') return false;
            // Note: getReturnedQuantity checks locally. If the user returns an old PO that is not in memory,
            // getReturnedQuantity will return 0. Ideally, this should be server-side too,
            // but we'll leave it as a client-side best-effort check for now.
            const allReturned = p.items.every((item) => {
              const returned = getReturnedQuantity(p.id, item.drugId);
              return returned >= item.quantity;
            });
            return !allReturned;
          });
          setSearchedPurchases(available);
        }
      } catch (err) {
        console.error('Failed to search POs', err);
      } finally {
        if (isMounted) setIsSearchingPo(false);
      }
    }, 500); // 500ms debounce

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [poSearch, activeBranchId]);

  const { highlightedIndex, onKeyDown } = useSearchKeyboardNavigation({
    results: searchedPurchases,
    onSelect: (purchase) => {
      setSelectedPurchase(purchase);
      setPoSearch('');
      setIsPoDropdownOpen(false);
      setReturnQuantities({});
      setReturnReasons({});
      setReturnConditions({});
    },
    isOpen: isPoDropdownOpen,
    onClose: () => setIsPoDropdownOpen(false),
  });

  // Calculate live total refund
  const calculatedTotalRefund = useMemo(() => {
    if (!selectedPurchase) return 0;
    return selectedPurchase.items.reduce((sum, item) => {
      const qty = returnQuantities[item.drugId] || 0;
      return money.add(sum, money.multiply(qty, item.costPrice, 2));
    }, 0);
  }, [selectedPurchase, returnQuantities]);

  const poColumns = useMemo(
    () => [
      {
        header: t.purchaseReturns?.tableHeaders?.purchaseId || 'PO ID',
        width: 'w-36 shrink-0',
        className: 'text-gray-900 dark:text-gray-400 justify-center text-center font-mono text-xs',
        render: (p: Purchase) => `PO #${p.id.slice(0, 8)}`,
      },
      {
        header: t.purchaseReturns?.tableHeaders?.supplier || 'Supplier',
        width: 'flex-1',
        className: 'text-gray-900 dark:text-gray-400 font-bold',
        render: (p: Purchase) => p.supplierName,
      },
      {
        header: t.purchaseReturns?.tableHeaders?.refund || 'Total Cost',
        width: 'w-32 shrink-0',
        className: 'justify-end text-end text-gray-900 dark:text-gray-400 font-bold',
        render: (p: Purchase) =>
          formatCurrency(p.totalCost, 'EGP', language === 'AR' ? 'ar' : 'en'),
      },
      {
        header: t.purchaseReturns?.tableHeaders?.date || 'Date',
        width: 'w-28 shrink-0',
        className: 'justify-center text-center text-gray-900 dark:text-gray-400 text-xs',
        render: (p: Purchase) => new Date(p.date).toLocaleDateString(),
      },
    ],
    [t, language]
  );

  // Details modal state
  const [viewingReturn, setViewingReturn] = useState<PurchaseReturn | null>(null);

  // Helper: Get row context menu actions
  const getRowActions = (returnRecord: PurchaseReturn) => [
    {
      label: t.purchaseReturns?.contextMenu?.viewDetails || 'View Details',
      icon: 'visibility',
      action: () => handleViewDetails(returnRecord),
    },
  ];

  // Table columns definition
  const columns = useMemo<ColumnDef<PurchaseReturn>[]>(
    () => [
      {
        accessorKey: 'id',
        header: t.purchaseReturns?.tableHeaders?.id || 'Return ID',
        size: 100,
        meta: { align: 'start' },
      },
      {
        accessorKey: 'date',
        header: t.purchaseReturns?.tableHeaders?.date || 'Date',
        size: 120,
        meta: { align: 'center' },
      },
      {
        accessorKey: 'purchaseId',
        header: t.purchaseReturns?.tableHeaders?.purchaseId || 'Purchase ID',
        size: 120,
        meta: { align: 'start' },
      },
      {
        accessorKey: 'supplierName',
        header: t.purchaseReturns?.tableHeaders?.supplier || 'Supplier',
        size: 180,
        meta: { align: 'start' },
        cell: ({ getValue }) => (
          <span className='text-sm font-bold text-gray-800 dark:text-gray-100 truncate'>
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'totalRefund',
        header: t.purchaseReturns?.tableHeaders?.refund || 'Total Refund',
        size: 130,
        meta: { align: 'end' },
        cell: ({ getValue }) => (
          <span className='text-sm font-bold text-red-600 dark:text-red-400 truncate'>
            <PriceDisplay value={getValue() as number} />
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t.purchaseReturns?.tableHeaders?.status || 'Status',
        size: 120,
        meta: { align: 'center' },
        cell: ({ getValue }) => {
          const val = getValue() as string;
          let badgeClass = 'badge-warning';
          let icon = 'hourglass_top';
          if (val === 'completed') {
            badgeClass = 'badge-success';
            icon = 'check_circle';
          } else if (val === 'approved') {
            badgeClass = 'badge-info';
            icon = 'verified';
          }

          return (
            <span className={`${badgeClass} inline-flex items-center gap-1.5`}>
              <span className='material-symbols-rounded text-sm'>{icon}</span>
              <span>{t.purchaseReturns?.status?.[val] || val}</span>
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: t.purchaseReturns?.tableHeaders?.action || 'Action',
        size: 80,
        meta: { align: 'center' },
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              showMenu(e.clientX, e.clientY, getRowActions(row.original));
            }}
            className='p-1.5 text-gray-400 hover:text-primary-600 transition-colors outline-hidden'
            title='Actions'
          >
            <span className='material-symbols-rounded text-[20px]'>more_vert</span>
          </button>
        ),
      },
    ],
    [t, getRowActions, textTransform]
  ); // getRowActions is stable component reference but we just in case include it

  // Submit return
  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPurchase || calculatedTotalRefund === 0) {
      alert(
        t.purchaseReturns?.messages?.selectPurchaseAlert ||
          'Please select a purchase and add items to return'
      );
      return;
    }

    const itemsToSubmit: PurchaseReturnItem[] = selectedPurchase.items
      .filter((item) => (returnQuantities[item.drugId] || 0) > 0)
      .map((item) => {
        const qty = returnQuantities[item.drugId];
        return {
          id: idGenerator.generateSync('returnItem', activeBranchId),
          drugId: item.drugId,
          name: item.name,
          quantityReturned: qty,
          costPrice: item.costPrice,
          refundAmount: money.multiply(qty, item.costPrice, 2),
          dosageForm: item.dosageForm,
          reason: returnReasons[item.drugId] || 'damaged',
          condition: returnConditions[item.drugId] || 'damaged',
        };
      });

    const nextId = idGenerator.generateSync('returns', activeBranchId);

    const newReturn: PurchaseReturn = {
      id: nextId,
      purchaseId: selectedPurchase.id,
      supplierId: selectedPurchase.supplierId,
      supplierName: selectedPurchase.supplierName,
      date: new Date().toISOString(),
      items: itemsToSubmit,
      totalRefund: calculatedTotalRefund,
      status: 'pending',
      notes,
      branchId: activeBranchId || '',
      orgId: activeOrgId,
    } as PurchaseReturn;

    await handleCreatePurchaseReturn(newReturn);
    queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.returns });
    queryClient.invalidateQueries({ queryKey: queryKeys.prefixes.inventory });

    // Reset form
    setSelectedPurchase(null);
    setReturnQuantities({});
    setReturnReasons({});
    setReturnConditions({});
    setNotes('');
    setIsCreateModalOpen(false);
  };

  // View details
  const handleViewDetails = (returnRecord: PurchaseReturn) => {
    setViewingReturn(returnRecord);
  };

  // Return all items from purchase
  const handleReturnAll = () => {
    if (!selectedPurchase) return;
    const quantities: Record<string, number> = {};
    selectedPurchase.items.forEach((item) => {
      const returnedQty = getReturnedQuantity(selectedPurchase.id, item.drugId);
      quantities[item.drugId] = item.quantity - returnedQty;
    });
    setReturnQuantities(quantities);
  };

  return (
    <div className='h-full flex flex-col space-y-4 overflow-hidden'>
      {/* Header */}
      <div className='flex justify-between items-center shrink-0'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight page-title'>
            {t.purchaseReturns?.returnHistory || 'Return History'}
          </h1>
          <p className='text-sm text-gray-500'>
            {t.purchaseReturns?.historySubtitle || 'View all purchase returns'}
          </p>
        </div>
        <div className='flex items-center gap-4 h-10'>
          {/* Pagination Controls */}
          <div className='h-10 rounded-full border border-(--border-divider) bg-white dark:bg-gray-900 flex items-center overflow-hidden'>
            <button
              type='button'
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isPageLoading}
              className='h-full w-10 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              title={language === 'AR' ? 'السابق' : 'Previous'}
            >
              <span className='material-symbols-rounded text-lg'>chevron_left</span>
            </button>
            <span className='px-3 text-[13px] font-bold tabular-nums text-gray-600 dark:text-gray-300'>
              {page} / {Math.ceil(totalReturns / pageSize) || 1}
            </span>
            <button
              type='button'
              onClick={() =>
                setPage((p) => Math.min(Math.ceil(totalReturns / pageSize) || 1, p + 1))
              }
              disabled={page >= (Math.ceil(totalReturns / pageSize) || 1) || isPageLoading}
              className='h-full w-10 flex items-center justify-center disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors'
              title={language === 'AR' ? 'التالي' : 'Next'}
            >
              <span className='material-symbols-rounded text-lg'>chevron_right</span>
            </button>
          </div>

          {permissionsService.can('purchase.return') && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className={`flex items-center gap-2 px-4 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold shadow-lg shadow-primary-200 dark:shadow-none transition-all active:scale-95`}
            >
              <span className='material-symbols-rounded text-[20px]'>add_circle</span>
              {t.purchaseReturns?.createReturn || 'Create Return'}
            </button>
          )}
        </div>
      </div>

      {/* RETURN HISTORY TABLE (Always visible now) */}
      <div className='shrink-0'>
        <SearchInput
          value={search}
          onSearchChange={setSearch}
          placeholder={t.purchaseReturns?.searchPlaceholder || 'Search returns...'}
          wrapperClassName='w-full max-w-xl'
          color={color}
          className='p-3'
        />
      </div>

      <div className={`flex-1 overflow-hidden ${CARD_BASE} rounded-xl p-0 flex flex-col`}>
        <TanStackTable
          data={pagedReturns}
          columns={columns}
          tableId='purchase_returns_history'
          globalFilter={search}
          onSearchChange={setSearch}
          enableTopToolbar={false}
          searchPlaceholder={t.purchaseReturns?.searchPlaceholder || 'Search returns...'}
          onRowClick={(row) => handleViewDetails(row as PurchaseReturn)}
          onRowContextMenu={(e, row) =>
            showMenu(e.clientX, e.clientY, getRowActions(row as PurchaseReturn))
          }
          color={color}
          enablePagination={true}
          enableVirtualization={false}
          pageSize={pageSize}
          isLoading={isPageLoading}
          enableShowAll={false}
        />
      </div>

      {/* CREATE RETURN MODAL */}
      {isCreateModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => {
            setIsCreateModalOpen(false);
            setSelectedPurchase(null);
            setReturnQuantities({});
            setReturnReasons({});
            setReturnConditions({});
            setNotes('');
          }}
          size='3xl'
          zIndex={50}
          title={t.purchaseReturns?.createReturn || 'Create Return'}
          icon='add_circle'
          disabled={isPageLoading}
          footer={
            <div className='flex justify-end gap-3 w-full'>
              <button
                type='button'
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setSelectedPurchase(null);
                  setReturnQuantities({});
                  setReturnReasons({});
                  setReturnConditions({});
                  setNotes('');
                }}
                className={MODAL_FOOTER_BTN_CANCEL}
              >
                {t.modal?.cancel || 'Cancel'}
              </button>
              <button
                onClick={(e) => handleSubmitReturn(e as any)}
                disabled={calculatedTotalRefund === 0}
                className={MODAL_FOOTER_BTN_PRIMARY}
              >
                <span className='material-symbols-rounded'>check_circle</span>
                {t.purchaseReturns?.submit || 'Submit Return'}
              </button>
            </div>
          }
        >
          <div className='space-y-6'>
            {/* Purchase Selection */}
            <div className='relative' ref={poDropdownRef}>
              <h3 className='text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4'>
                <span className='material-symbols-rounded text-[18px]'>receipt_long</span>
                {t.purchaseReturns?.selectPurchase || 'Select Purchase Order'}
              </h3>

              <div onKeyDown={onKeyDown}>
                <SearchInput
                  value={
                    poSearch ||
                    (selectedPurchase
                      ? `PO #${selectedPurchase.id.slice(0, 8)} - ${selectedPurchase.supplierName}`
                      : '')
                  }
                  onSearchChange={(val) => {
                    setPoSearch(val);
                    setIsPoDropdownOpen(true);
                  }}
                  onFocus={() => setIsPoDropdownOpen(true)}
                  onClear={() => {
                    setPoSearch('');
                    setSelectedPurchase(null);
                    setReturnQuantities({});
                    setReturnReasons({});
                    setReturnConditions({});
                  }}
                  placeholder={
                    t.purchaseReturns?.selectPlaceholder || 'Search and select purchase order...'
                  }
                  className='h-11 text-sm'
                />
              </div>

              <SearchDropdown
                results={searchedPurchases}
                onSelect={(purchase) => {
                  setSelectedPurchase(purchase);
                  setPoSearch('');
                  setIsPoDropdownOpen(false);
                  setReturnQuantities({});
                  setReturnReasons({});
                  setReturnConditions({});
                }}
                isVisible={isPoDropdownOpen}
                highlightedIndex={highlightedIndex}
                columns={poColumns}
                className='left-0 right-0'
              />
            </div>

            {/* Selected Purchase Info & Interactive Items Table */}
            {selectedPurchase ? (
              <div className='space-y-5 '>
                {/* PO Summary Card */}
                <div className='p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-2xl border border-gray-100 dark:border-gray-800/80 flex flex-wrap gap-4 justify-between items-center'>
                  <div className='space-y-1'>
                    <p className='text-xs font-bold text-gray-400 uppercase tracking-wider'>
                      {t.purchaseReturns?.selectedPO || 'Selected PO'}
                    </p>
                    <p className='text-sm font-bold text-gray-800 dark:text-gray-100'>
                      PO #{selectedPurchase.id.slice(0, 8)} — {selectedPurchase.supplierName}
                    </p>
                  </div>
                  <div className='flex gap-3 items-center'>
                    <button
                      type='button'
                      onClick={handleReturnAll}
                      className='px-4 py-2 rounded-xl bg-primary-50 hover:bg-primary-100 dark:bg-primary-950/20 dark:hover:bg-primary-950/40 text-primary-600 dark:text-primary-400 text-xs font-bold transition-all flex items-center gap-1.5 border border-primary-100/50 dark:border-primary-900/20'
                    >
                      <span className='material-symbols-rounded text-base'>assignment_return</span>
                      {t.purchaseReturns?.returnAll || 'Return All Items'}
                    </button>
                  </div>
                </div>

                {/* Interactive Items Table */}
                <div className='space-y-3'>
                  <h4 className='text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest flex items-center gap-2'>
                    <div className='h-[2px] w-6 bg-gray-200 dark:bg-gray-800 rounded-full' />
                    {t.purchaseReturns?.itemsToReturn || 'Items to Return'}
                  </h4>

                  <div className='overflow-x-auto border border-gray-100 dark:border-gray-800/60 rounded-2xl bg-white dark:bg-gray-950'>
                    <table className='w-full text-sm text-start border-collapse'>
                      <thead>
                        <tr className='bg-gray-50/50 dark:bg-zinc-900/50 border-b border-gray-100 dark:border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider'>
                          <th className='p-3 text-start font-bold'>
                            {t.purchaseReturns?.itemName || 'Item'}
                          </th>
                          <th className='p-3 text-center font-bold w-24'>
                            {t.purchaseReturns?.cost || 'Cost'}
                          </th>
                          <th className='p-3 text-center font-bold w-40'>
                            {t.purchaseReturns?.quantity || 'Qty (Max)'}
                          </th>
                          <th className='p-3 text-center font-bold w-36'>
                            {t.purchaseReturns?.reason || 'Reason'}
                          </th>
                          <th className='p-3 text-center font-bold w-36'>
                            {t.purchaseReturns?.condition || 'Condition'}
                          </th>
                          <th className='p-3 text-end font-bold w-28'>
                            {t.purchaseReturns?.totalRefund || 'Refund'}
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-100 dark:divide-gray-800/60'>
                        {selectedPurchase.items.map((item) => {
                          const returnedQty = getReturnedQuantity(selectedPurchase.id, item.drugId);
                          const maxQty = item.quantity - returnedQty;
                          const qty = returnQuantities[item.drugId] || 0;
                          const reason = returnReasons[item.drugId] || 'damaged';
                          const condition = returnConditions[item.drugId] || 'damaged';
                          const refundAmount = money.multiply(qty, item.costPrice, 2);

                          if (maxQty <= 0) return null; // Already fully returned

                          return (
                            <tr
                              key={item.drugId}
                              className={`transition-colors duration-150 ${
                                qty > 0
                                  ? 'bg-primary-50/10 dark:bg-primary-500/5 hover:bg-primary-50/20 dark:hover:bg-primary-500/10'
                                  : 'hover:bg-gray-50/50 dark:hover:bg-zinc-900/30'
                              }`}
                            >
                              <td className='p-3 font-medium text-gray-800 dark:text-gray-100'>
                                <div className='truncate max-w-[180px] font-bold' title={item.name}>
                                  {getDisplayName(item, textTransform)}
                                </div>
                                {item.expiryDate && (
                                  <p className='text-[10px] text-gray-400 font-mono mt-0.5'>
                                    Exp: {item.expiryDate}
                                  </p>
                                )}
                              </td>
                              <td className='p-3 text-center text-gray-500 dark:text-gray-400 tabular-nums font-medium'>
                                <PriceDisplay value={item.costPrice} size='sm' />
                              </td>
                              <td className='p-3 text-center'>
                                <div className='flex items-center justify-center gap-1.5'>
                                  <button
                                    type='button'
                                    onClick={() =>
                                      setReturnQuantities((prev) => ({
                                        ...prev,
                                        [item.drugId]: Math.max(0, qty - 1),
                                      }))
                                    }
                                    disabled={qty === 0}
                                    className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all text-xs font-bold cursor-pointer ${
                                      qty === 0
                                        ? 'border-gray-100 text-gray-300 dark:border-gray-800 dark:text-gray-600 cursor-not-allowed'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 active:scale-95'
                                    }`}
                                  >
                                    —
                                  </button>
                                  <input
                                    type='number'
                                    min='0'
                                    max={maxQty}
                                    value={qty || ''}
                                    onChange={(e) => {
                                      const val = Math.min(
                                        maxQty,
                                        Math.max(0, parseInt(e.target.value) || 0)
                                      );
                                      setReturnQuantities((prev) => ({
                                        ...prev,
                                        [item.drugId]: val,
                                      }));
                                    }}
                                    className='w-12 text-center py-0.5 px-1 rounded-md bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-xs font-black focus:ring-1 focus:ring-primary-500 outline-hidden'
                                    placeholder='0'
                                  />
                                  <button
                                    type='button'
                                    onClick={() =>
                                      setReturnQuantities((prev) => ({
                                        ...prev,
                                        [item.drugId]: Math.min(maxQty, qty + 1),
                                      }))
                                    }
                                    disabled={qty >= maxQty}
                                    className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all text-xs font-bold cursor-pointer ${
                                      qty >= maxQty
                                        ? 'border-gray-100 text-gray-300 dark:border-gray-800 dark:text-gray-600 cursor-not-allowed'
                                        : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-800 active:scale-95'
                                    }`}
                                  >
                                    +
                                  </button>
                                  <span className='text-[10px] text-gray-400 font-bold ml-1 shrink-0'>
                                    / {maxQty}
                                  </span>
                                </div>
                              </td>
                              <td className='p-3 text-center'>
                                <select
                                  value={reason}
                                  disabled={qty === 0}
                                  onChange={(e) =>
                                    setReturnReasons((prev) => ({
                                      ...prev,
                                      [item.drugId]: e.target.value as any,
                                    }))
                                  }
                                  className={`${INPUT_BASE} py-1 px-2 text-xs h-8 ${
                                    qty === 0 ? 'opacity-30 cursor-not-allowed' : ''
                                  }`}
                                >
                                  <option value='damaged'>
                                    {t.purchaseReturns?.reasons?.damaged || 'Damaged'}
                                  </option>
                                  <option value='expired'>
                                    {t.purchaseReturns?.reasons?.expired || 'Expired'}
                                  </option>
                                  <option value='wrong_item'>
                                    {t.purchaseReturns?.reasons?.wrong_item || 'Wrong Item'}
                                  </option>
                                  <option value='defective'>
                                    {t.purchaseReturns?.reasons?.defective || 'Defective'}
                                  </option>
                                  <option value='overage'>
                                    {t.purchaseReturns?.reasons?.overage || 'Overage'}
                                  </option>
                                  <option value='other'>
                                    {t.purchaseReturns?.reasons?.other || 'Other'}
                                  </option>
                                </select>
                              </td>
                              <td className='p-3 text-center'>
                                <select
                                  value={condition}
                                  disabled={qty === 0}
                                  onChange={(e) =>
                                    setReturnConditions((prev) => ({
                                      ...prev,
                                      [item.drugId]: e.target.value as any,
                                    }))
                                  }
                                  className={`${INPUT_BASE} py-1 px-2 text-xs h-8 ${
                                    qty === 0 ? 'opacity-30 cursor-not-allowed' : ''
                                  }`}
                                >
                                  <option value='damaged'>
                                    {t.purchaseReturns?.conditions?.damaged || 'Damaged'}
                                  </option>
                                  <option value='expired'>
                                    {t.purchaseReturns?.conditions?.expired || 'Expired'}
                                  </option>
                                  <option value='other'>
                                    {t.purchaseReturns?.conditions?.other || 'Other'}
                                  </option>
                                </select>
                              </td>
                              <td className='p-3 text-end font-black text-red-600 dark:text-red-400 tabular-nums'>
                                {qty > 0 ? <PriceDisplay value={refundAmount} /> : '---'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Refund Live Total Box */}
                {calculatedTotalRefund > 0 && (
                  <div className='flex justify-between items-center p-4 rounded-2xl bg-red-50/50 dark:bg-red-950/10 border border-red-100/50 dark:border-red-900/20 shadow-xs animate-scale-up'>
                    <span className='text-sm text-gray-500 font-bold dark:text-gray-400'>
                      {t.purchaseReturns?.totalRefund || 'Total Refund'}
                    </span>
                    <span className='text-xl font-black text-red-600 dark:text-red-400 tabular-nums'>
                      <PriceDisplay value={calculatedTotalRefund} />
                    </span>
                  </div>
                )}

                {/* Additional Notes */}
                <div className='space-y-1.5'>
                  <label className='block text-xs font-bold text-gray-700 dark:text-gray-300'>
                    {t.purchaseReturns?.additionalNotes || 'Additional Notes'}
                  </label>
                  <SmartTextarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    placeholder={
                      t.purchaseReturns?.notesPlaceholder ||
                      'Add any additional notes about this return...'
                    }
                  />
                </div>
              </div>
            ) : (
              <div className='py-12 flex flex-col items-center justify-center text-gray-400 space-y-3 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800 m-2'>
                <span className='material-symbols-rounded text-4xl opacity-20'>receipt_long</span>
                <p className='text-xs opacity-75 font-medium'>
                  {t.purchaseReturns?.selectPurchaseToStart ||
                    'Select a purchase order to start returning items.'}
                </p>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Details View Modal */}
      {viewingReturn && (
        <Modal
          isOpen={true}
          onClose={() => setViewingReturn(null)}
          size='2xl'
          zIndex={50}
          title={t.purchaseReturns?.returnDetails || 'Return Details'}
          icon='assignment_return'
          disabled={isPageLoading}
          footer={
            <div className='flex justify-end'>
              <button onClick={() => setViewingReturn(null)} className={MODAL_FOOTER_BTN_CANCEL}>
                {t.modal?.close || 'Close'}
              </button>
            </div>
          }
        >
          <div className='space-y-6'>
            {/* Return Information Section */}
            <div>
              <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-2'>
                <span className='material-symbols-rounded text-[18px]'>info</span>
                {t.purchaseReturns?.returnInfo || 'Return Information'}
              </h3>

              <div className='grid grid-cols-2 gap-y-6 gap-x-4'>
                <div>
                  <label className='block text-xs font-medium text-gray-500 mb-1'>
                    {t.purchaseReturns?.tableHeaders?.id || 'Return ID'}
                  </label>
                  <p className='font-bold text-gray-900 dark:text-white font-mono text-sm'>
                    {viewingReturn.id}
                  </p>
                </div>
                <div>
                  <label className='block text-xs font-medium text-gray-500 mb-1'>
                    {t.purchaseReturns?.tableHeaders?.date || 'Date'}
                  </label>
                  <p className='font-bold text-gray-900 dark:text-white text-sm'>
                    {new Date(viewingReturn.date).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-500 mb-1'>
                    {t.purchaseReturns?.tableHeaders?.purchaseId || 'Purchase ID'}
                  </label>
                  <p className='font-bold text-gray-900 dark:text-white font-mono text-sm'>
                    {viewingReturn.purchaseId}
                  </p>
                </div>
                <div>
                  <label className='block text-xs font-medium text-gray-500 mb-1'>
                    {t.purchaseReturns?.tableHeaders?.supplier || 'Supplier'}
                  </label>
                  <p className='font-bold text-gray-900 dark:text-white text-sm'>
                    {viewingReturn.supplierName}
                  </p>
                </div>

                <div>
                  <label className='block text-xs font-medium text-gray-500 mb-1'>
                    {t.purchaseReturns?.tableHeaders?.status || 'Status'}
                  </label>
                  {(() => {
                    const status = viewingReturn.status;
                    let badgeClass = 'badge-warning';
                    let icon = 'hourglass_top';
                    if (status === 'completed') {
                      badgeClass = 'badge-success';
                      icon = 'check_circle';
                    } else if (status === 'approved') {
                      badgeClass = 'badge-info';
                      icon = 'verified';
                    }

                    return (
                      <span className={`${badgeClass} inline-flex items-center gap-1.5`}>
                        <span className='material-symbols-rounded text-sm'>{icon}</span>
                        <span>{t.purchaseReturns?.status?.[status] || status}</span>
                      </span>
                    );
                  })()}
                </div>
                <div>
                  <label className='block text-xs font-medium text-gray-500 mb-1'>
                    {t.purchaseReturns?.totalRefund || 'Total Refund'}
                  </label>
                  <p className='font-bold text-red-600 text-sm'>
                    <PriceDisplay value={viewingReturn.totalRefund} />
                  </p>
                </div>
              </div>
            </div>

            {/* Returned Items Section */}
            <div>
              <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2'>
                <span className='material-symbols-rounded text-[18px]'>inventory_2</span>
                {t.purchaseReturns?.returnedItems || 'Returned Items'}
              </h3>

              <div className='space-y-2'>
                {viewingReturn.items.map((item, index) => (
                  <div
                    key={index}
                    className='p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center group hover:border-gray-200 dark:hover:border-gray-700 transition-colors'
                  >
                    <div>
                      <p className='font-bold text-gray-900 dark:text-white text-sm mb-1'>
                        {getDisplayName(
                          {
                            ...item,
                            dosageForm:
                              item.dosageForm ||
                              drugs.find((d) => d.id === item.drugId)?.dosageForm,
                          },
                          textTransform
                        )}
                      </p>
                      <p className='text-xs text-gray-500'>
                        <span className='opacity-70'>{t.purchaseReturns?.quantity || 'Qty'}:</span>{' '}
                        {item.quantityReturned} <span className='mx-1 opacity-30'>|</span>
                        <span className='opacity-70'>
                          {t.purchases?.detailsModal?.cost || 'Cost'}:
                        </span>{' '}
                        <PriceDisplay value={item.costPrice} size='sm' />{' '}
                        <span className='mx-1 opacity-30'>|</span>
                        <span className='opacity-70'>{t.purchaseReturns?.reason || 'Reason'}:</span>{' '}
                        {t.purchaseReturns?.reasons?.[item.reason] || item.reason}
                      </p>
                    </div>
                    <p className='font-bold text-red-600 text-sm'>
                      <PriceDisplay value={item.refundAmount} />
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {viewingReturn.notes && (
              <div>
                <h3 className='text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-2'>
                  <span className='material-symbols-rounded text-[18px]'>notes</span>
                  {t.purchaseReturns?.notes || 'Notes'}
                </h3>
                <div className='p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 text-amber-900 dark:text-amber-100 border border-amber-100 dark:border-amber-900/30 text-sm'>
                  {viewingReturn.notes}
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
