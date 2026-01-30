import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SmartDateInput, SmartInput } from '../common/SmartInputs';
import { FilterDropdown, SegmentedControl } from '../common';
import { useContextMenu, useContextMenuTrigger } from '../common/ContextMenu';
import { SearchInput } from '../common/SearchInput';
import { TanStackTable } from '../common/TanStackTable';
import { ColumnDef } from '@tanstack/react-table';
import { Drug } from '../../types';
import { createSearchRegex, parseSearchTerm } from '../../utils/searchUtils';
import { CARD_BASE } from '../../utils/themeStyles';
import { formatStock, formatStockParts, validateStock } from '../../utils/inventory';
import { formatCurrency, formatCurrencyParts } from '../../utils/currency';
import { Modal } from '../common/Modal';
import { getCategories, getProductTypes, isMedicineCategory, getLocalizedCategory, getLocalizedProductType } from '../../data/productCategories';
import { useStatusBar } from '../layout/StatusBar';
import { getDisplayName } from '../../utils/drugDisplayName';
import { UserRole, canPerformAction } from '../../config/permissions';

interface InventoryProps {
  inventory: Drug[];
  onAddDrug: (drug: Drug) => void;
  onUpdateDrug: (drug: Drug) => void;
  onDeleteDrug: (id: string) => void;
  color: string;
  t: any;
  userRole: UserRole;
}

export const Inventory: React.FC<InventoryProps> = ({ inventory, onAddDrug, onUpdateDrug, onDeleteDrug, color, t, userRole }) => {
  const { getVerifiedDate } = useStatusBar();
  const { showMenu } = useContextMenu();

  // Detect language direction/locale
  const isRTL = t.direction === 'rtl' || t.lang === 'ar' || (t.title && /[\u0600-\u06FF]/.test(t.title));
  const currentLang = isRTL ? 'ar' : 'en';

  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [viewingDrug, setViewingDrug] = useState<Drug | null>(null);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  // Print Label Modal State
  const [printModalDrug, setPrintModalDrug] = useState<Drug | null>(null);
  const [printQuantity, setPrintQuantity] = useState(1);

  // Form State for Add Product
  const [formData, setFormData] = useState<Partial<Drug>>({
    name: '', genericName: '', category: 'General', price: 0, costPrice: 0, stock: 0, expiryDate: '', description: '', barcode: '', internalCode: '', unitsPerPack: 1, maxDiscount: 10,
    additionalBarcodes: [], dosageForm: '', activeIngredients: []
  });

  // Dropdown States
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [isAddDosageOpen, setIsAddDosageOpen] = useState(false);
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
    const drug = inventory.find(d => d.id === id);
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

  const handleOpenAdd = () => {
    setMode('add');
    setFormData({
      name: '', genericName: '', category: 'General', price: 0, costPrice: 0, stock: 0, expiryDate: '', description: '', barcode: '', internalCode: '', unitsPerPack: 1, maxDiscount: 10
    });
  };

  const handleOpenEdit = (drug: Drug) => {
    setEditingDrug(drug);
    // Load stock as PACKS for editing
    const stockInPacks = drug.stock / (drug.unitsPerPack || 1);
    setFormData({ ...drug, stock: stockInPacks, maxDiscount: drug.maxDiscount ?? 10 });
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const handleDuplicate = (drug: Drug) => {
    setEditingDrug(null); // Set as new drug
    const { id, ...rest } = drug;
    setFormData({ ...rest, name: `${rest.name} (Copy)` });
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
              onUpdateDrug({ ...drug, stock: validateStock(val * (drug.unitsPerPack || 1)) });
          }
      }
      setActiveMenuId(null);
  };

  const handleDelete = (id: string) => {
      onDeleteDrug(id);
      setActiveMenuId(null);
  };

  const handleSubmit = (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    
    // Prepare data: Convert stock (Packs) to Total Units
    const submissionData = {
        ...formData,
        stock: validateStock((formData.stock || 0) * (formData.unitsPerPack || 1))
    };

    if (editingDrug) {
      onUpdateDrug({ ...editingDrug, ...submissionData } as Drug);
      setIsModalOpen(false);
    } else {
      const newDrug: Drug = {
        id: getVerifiedDate().getTime().toString(),
        ...submissionData as Omit<Drug, 'id'>
      };
      onAddDrug(newDrug);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      if (addAnother) {
        const currentCategory = formData.category;
        setFormData({
          name: '', genericName: '', category: currentCategory, price: 0, costPrice: 0, stock: 0, expiryDate: '', description: '', barcode: '', internalCode: '', unitsPerPack: 1, maxDiscount: 10
        });
      } else {
        setMode('list');
      }
    }
  };

  const handleClear = () => {
    setFormData({
      name: '', genericName: '', category: 'General', price: 0, costPrice: 0, stock: 0, expiryDate: '', description: '', barcode: '', internalCode: '', unitsPerPack: 1, maxDiscount: 10
    });
  };
  
  const generateInternalCode = () => {
    // Find highest existing 6-digit numeric code
    const existingCodes = inventory
      .map(d => d.internalCode)
      .filter(c => c && /^\d{6}$/.test(c))
      .map(c => parseInt(c!, 10));

    const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : 0;
    const nextCode = String(maxCode + 1).padStart(6, '0');
    
    setFormData({ ...formData, internalCode: nextCode });
  };

  // Categories are now determined dynamically using helper
  const allCategories = getCategories(currentLang);

  const filteredInventory = useMemo(() => {
    const { mode, regex } = parseSearchTerm(searchTerm);
    
    return inventory.filter(d => {
      if (mode === 'ingredient') {
        return d.activeIngredients && d.activeIngredients.some(ing => regex.test(ing));
      }

      // Normal search: Check composite string for cross-field matches (e.g. "Pana Tablet")
      const searchableText = getDisplayName(d) + ' ' + d.category;
      
      return (
        regex.test(searchableText) ||
        (d.barcode && regex.test(d.barcode)) ||
        (d.internalCode && regex.test(d.internalCode))
      );
    });
  }, [inventory, searchTerm]);

  // Helper: Get row context menu actions
  const getRowActions = (drug: Drug) => {
    const actions = [];
    
    if (canPerformAction(userRole, 'inventory.update')) {
      actions.push({ label: t.actionsMenu.edit, icon: 'edit', action: () => handleOpenEdit(drug) });
    }
    
    actions.push({ label: t.actionsMenu.viewDetails || t.actionsMenu.view, icon: 'visibility', action: () => handleViewDetails(drug.id) });
    actions.push({ separator: true });
    actions.push({ label: t.actionsMenu.printBarcode, icon: 'print', action: () => handlePrintBarcode(drug) });
    if (canPerformAction(userRole, 'inventory.add')) {
      actions.push({ label: t.actionsMenu.duplicate, icon: 'content_copy', action: () => handleDuplicate(drug) });
    }
    
    if (canPerformAction(userRole, 'inventory.restock')) {
      actions.push({ separator: true });
      actions.push({ label: t.actionsMenu.adjustStock, icon: 'inventory', action: () => handleQuickStockAdjust(drug) });
    }
    
    if (canPerformAction(userRole, 'inventory.delete')) {
      actions.push({ separator: true });
      actions.push({ label: t.actionsMenu.delete, icon: 'delete', action: () => handleDelete(drug.id), danger: true });
    }
    
    return actions;
  };

  const tableColumns = useMemo<ColumnDef<Drug>[]>(() => [
    {
      id: 'code',
      header: t.headers.codes,
      cell: ({ row }) => {
        const drug = row.original;
        return (
          <div className="flex flex-col gap-0.5">
            {drug.barcode && <div className="text-gray-900 dark:text-gray-100 text-sm">{drug.barcode}</div>}
            {drug.internalCode && <div className="text-gray-900 dark:text-gray-100 text-sm">{drug.internalCode}</div>}
            {!drug.barcode && !drug.internalCode && <span className="text-gray-400">-</span>}
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'name',
      header: t.headers.name,
      cell: ({ row }) => {
        const drug = row.original;
        return (
          <div className="flex flex-col text-start" dir="ltr">
            <div className="font-medium text-gray-900 dark:text-gray-100 text-sm drug-name">
              {getDisplayName({ name: drug.name })} {drug.dosageForm && <span className="text-gray-500 font-normal">{getDisplayName({ name: `(${getLocalizedProductType(drug.dosageForm, 'en')})` })}</span>}
            </div>
            <div className="text-xs text-gray-500 w-full text-start">
              <span>{drug.genericName?.length > 35 ? drug.genericName.substring(0, 35) + '...' : drug.genericName}</span>
            </div>
          </div>
        );
      },
      size: 250,
    },
    {
      accessorKey: 'category',
      header: t.headers.category,
      cell: ({ row }) => (
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg border border-${color}-200 dark:border-${color}-900/50 text-${color}-700 dark:text-${color}-400 text-xs font-bold uppercase tracking-wider bg-transparent`}>
          {getLocalizedCategory(row.original.category || 'General', currentLang)}
        </span>
      ),
    },
    {
      accessorKey: 'stock',
      header: t.headers.stock,
      cell: ({ row }) => {
        const parts = formatStockParts(row.original.stock, row.original.unitsPerPack, {
          packs: t.details?.packs || 'Packs',
          outOfStock: t.outOfStock || 'Out of Stock'
        });
        
        return (
          <div className={`font-medium text-sm ${row.original.stock < (row.original.unitsPerPack || 1) ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
            {parts.value} {parts.label && <span className="text-[10px] text-gray-400 font-normal">{parts.label}</span>}
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
          <span className="text-gray-700 dark:text-gray-300 text-sm font-bold">
            {parts.amount} <span className="text-[10px] text-gray-400 font-normal">{parts.symbol}</span>
          </span>
        );
      },
    },
    {
      accessorKey: 'costPrice',
      header: t.headers.cost,
      cell: ({ row }) => {
        if (!row.original.costPrice) return <span className="text-gray-500 text-sm">-</span>;
        const parts = formatCurrencyParts(row.original.costPrice);
        return (
           <span className="text-gray-900 dark:text-gray-100 text-sm font-medium">
            {parts.amount} <span className="text-[10px] text-gray-400 font-normal">{parts.symbol}</span>
           </span>
        );
      },
    },
    {
      accessorKey: 'expiryDate',
      header: t.headers.expiry,
      cell: ({ row }) => {
        const date = new Date(row.original.expiryDate);
        const formatted = date.toLocaleDateString('en-US', { month: '2-digit', year: '2-digit' });
        return <span className="text-gray-900 dark:text-gray-100 text-sm font-medium">{formatted}</span>;
      },
    },
  ], [color, currentLang, t]);

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
      {/* Header with toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight type-expressive">{mode === 'list' ? t.title : (t.addNewProduct || 'Add New Product')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{mode === 'list' ? t.subtitle : (t.addProductSubtitle || 'Add a new item to your inventory')}</p>
        </div>
        <SegmentedControl
          value={mode}
          onChange={(val) => { 
            setMode(val); 
            if (val === 'add') handleOpenAdd(); 
          }}
          options={[
            { label: t.allProducts || 'All Products', value: 'list' as const },
            ...(canPerformAction(userRole, 'inventory.add') ? [{ label: t.addNewProduct || 'Add New Product', value: 'add' as const }] : [])
          ]}
          shape="pill"
          size="sm"
          color={color}
          fullWidth={false}
        />
      </div>

      {/* Success Message */}
      {showSuccess && mode === 'add' && (
        <div className={`p-4 rounded-2xl bg-${color}-50 dark:bg-${color}-950/30 border border-${color}-200 dark:border-${color}-800 flex items-center gap-3 animate-fade-in`}>
          <span className={`material-symbols-rounded text-${color}-600 dark:text-${color}-400`}>check_circle</span>
          <span className={`text-sm font-medium text-${color}-700 dark:text-${color}-300`}>{t.productAddedSuccess || 'Product added successfully!'}</span>
        </div>
      )}

      {mode === 'list' ? (
        <>
      {/* Table Card - Default Design */}
      <div className="flex-1 overflow-hidden">
        <TanStackTable 
            data={filteredInventory} 
            columns={tableColumns}
            tableId="inventory_table"
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
            enablePagination={true}
            pageSize={20}
        />
      </div>
      </>

      ) : (
        /* ADD PRODUCT FORM VIEW - COMPACT LAYOUT */
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={(e) => handleSubmit(e, false)} className="grid grid-cols-1 xl:grid-cols-3 gap-6 pb-20">
            
            {/* LEFT COLUMN: Main Info */}
            <div className="xl:col-span-2 space-y-6">
              {/* Basic Details Card */}
              <div className={`${CARD_BASE} rounded-3xl p-6`}>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                  <span className="material-symbols-rounded text-blue-500">info</span>
                  {t.basicInfo || 'Basic Information'}
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.brand} *</label>
                    <SmartInput
                      required
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                      placeholder="e.g., Panadol Extra"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.generic} *</label>
                    <SmartInput
                      required
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                      placeholder="e.g., Paracetamol"
                      value={formData.genericName}
                      onChange={e => setFormData({ ...formData, genericName: e.target.value })}
                    />
                  </div>
                  
                  {/* Category & Dosage Form */}
                  <div className="grid grid-cols-2 gap-4 md:col-span-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.category} *</label>
                      <FilterDropdown
                        variant="input"
                        items={getCategories(currentLang)}
                        selectedItem={formData.category} // English ID
                        isOpen={isAddCategoryOpen}
                        onToggle={() => setIsAddCategoryOpen(!isAddCategoryOpen)}
                        onSelect={(val) => { setFormData({ ...formData, category: val, dosageForm: '' }); setIsAddCategoryOpen(false); }}
                        keyExtractor={(c) => c}
                        renderSelected={(c) => getLocalizedCategory(c || 'General', currentLang)}
                        renderItem={(c) => getLocalizedCategory(c, currentLang)}
                        className="w-full h-[50px]"
                        color={color}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.addProduct?.fields?.dosageForm || 'Product Type'}</label>
                      <FilterDropdown
                        variant="input"
                        items={getProductTypes(formData.category || 'General', currentLang)} // English IDs
                        selectedItem={formData.dosageForm || ''}
                        isOpen={isAddDosageOpen}
                        onToggle={() => setIsAddDosageOpen(!isAddDosageOpen)}
                        onSelect={(val) => { setFormData({ ...formData, dosageForm: val }); setIsAddDosageOpen(false); }}
                        keyExtractor={(c) => c}
                        renderSelected={(c) => c ? getLocalizedProductType(c, currentLang) : (t.addProduct?.placeholders?.dosageForm || 'Select Type')}
                        renderItem={(c) => getLocalizedProductType(c, currentLang)}
                        className="w-full h-[50px]"
                        color={color}
                      />
                    </div>
                  </div>

                  {/* Active Ingredients - Only for Medicine */}
                  {isMedicineCategory(formData.category || '') && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Active Ingredients (Comma separated)</label>
                    <SmartInput
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                      placeholder="e.g., Paracetamol, Caffeine"
                      value={formData.activeIngredients?.join(', ') || ''}
                      onChange={e => setFormData({ ...formData, activeIngredients: e.target.value.split(',').map(s => s.trim()) })}
                    />
                  </div>
                  )}

                  {/* Barcode & Internal Code - Side by Side */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                    {/* Barcode Input */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.barcode}</label>
                      <div className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus-within:ring-2 focus-within:ring-blue-500 transition-all flex flex-wrap gap-2 items-center min-h-[42px]">
                        {/* Primary Barcode Chip */}
                        {formData.barcode && (
                          <span className="inline-flex items-center gap-1.5 px-1.5 py-0 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-[11px] font-bold border border-blue-200 dark:border-blue-800 h-6">
                            <span className="material-symbols-rounded text-[13px]">qr_code_2</span>
                            {formData.barcode}
                            <button 
                              type="button"
                              onClick={() => setFormData({ ...formData, barcode: '' })}
                              className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                            >
                              <span className="material-symbols-rounded text-[12px]">close</span>
                            </button>
                          </span>
                        )}
                        
                        {/* Additional Barcodes Chips */}
                        {formData.additionalBarcodes?.map((code, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-1.5 py-0 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[11px] font-bold border border-blue-200/50 dark:border-blue-800/50 h-6">
                            <span className="material-symbols-rounded text-[13px]">qr_code_2</span>
                            {code}
                            <button 
                              type="button"
                              onClick={() => {
                                const newCodes = [...(formData.additionalBarcodes || [])];
                                newCodes.splice(idx, 1);
                                setFormData({ ...formData, additionalBarcodes: newCodes });
                              }}
                              className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors"
                            >
                              <span className="material-symbols-rounded text-[12px]">close</span>
                            </button>
                          </span>
                        ))}

                        <input
                          className="flex-1 bg-transparent border-none outline-none text-sm min-w-[80px]"
                          placeholder={!formData.barcode ? "Scan barcode" : "More..."}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = e.currentTarget.value.trim();
                              if (val) {
                                if (!formData.barcode) {
                                  setFormData({ ...formData, barcode: val });
                                } else {
                                  setFormData({ 
                                    ...formData, 
                                    additionalBarcodes: [...(formData.additionalBarcodes || []), val] 
                                  });
                                }
                                e.currentTarget.value = '';
                              }
                            }
                          }}
                        />
                      </div>
                    </div>

                    {/* Internal Code */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.internalCode}</label>
                      <div className="relative group">
                        <input
                          className="w-full pl-3 pr-10 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-mono"
                          placeholder="Auto-generated or custom"
                          value={formData.internalCode || ''}
                          onChange={e => setFormData({ ...formData, internalCode: e.target.value })}
                        />
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center">
                          <button
                            type="button"
                            onClick={generateInternalCode}
                            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 active:scale-90"
                            title={t.autoGenerate || 'Auto-Generate'}
                          >
                            <span className="material-symbols-rounded text-[20px]">magic_button</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.desc}</label>
                    <SmartInput
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                      placeholder="Description..."
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Details */}
            <div className="xl:col-span-1 space-y-6">
              {/* Stock & Pricing Card */}
              <div className={`${CARD_BASE} rounded-3xl p-6 h-full`}>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                  <span className="material-symbols-rounded text-blue-500">inventory</span>
                  Inventory & Pricing
                </h3>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.stock} *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.unitsPerPack}</label>
                      <input
                        type="number"
                        min="1"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        value={formData.unitsPerPack || 1}
                        onChange={e => setFormData({ ...formData, unitsPerPack: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.expiry} *</label>
                    <SmartDateInput
                      required
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                      value={formData.expiryDate}
                      onChange={val => setFormData({ ...formData, expiryDate: val })}
                    />
                  </div>

                  <div className="border-t border-gray-100 dark:border-gray-800 my-4"></div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.price} *</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-green-600"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.cost}</label>
                      <input
                        type="number"
                        step="0.01"
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        value={formData.costPrice || 0}
                        onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Discount (%)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-red-500"
                      value={formData.maxDiscount || ''}
                      onChange={e => setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="xl:col-span-3 flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClear}
                className="px-6 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors font-medium text-sm type-interactive"
              >
                {t.clearForm || 'Clear Form'}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className={`px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl transition-all font-medium text-sm type-interactive`}
              >
                {t.saveAndAddAnother || 'Save & Add Another'}
              </button>
              <button
                type="submit"
                className={`px-8 py-2.5 bg-${color}-600 hover:bg-${color}-700 text-white rounded-xl shadow-lg shadow-${color}-200 dark:shadow-none transition-all font-medium text-sm type-interactive`}
              >
                {t.addDrug}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Details View Modal */}
      {viewingDrug && (
        <Modal
            isOpen={true}
            onClose={() => setViewingDrug(null)}
            size="lg"
            zIndex={50}
            title={t.actionsMenu.view}
            icon="visibility"
        >
            
            <div className="space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                            {getDisplayName({ name: viewingDrug.name })} {viewingDrug.dosageForm && <span className="text-lg text-gray-500 font-normal">{getDisplayName({ name: `(${getLocalizedProductType(viewingDrug.dosageForm, 'en')})` })}</span>}
                        </h2>
                        <p className="text-gray-500 font-medium text-start" dir="ltr">{viewingDrug.genericName}</p>
                    </div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-lg border border-${color}-200 dark:border-${color}-900/50 text-${color}-700 dark:text-${color}-400 text-xs font-bold uppercase tracking-wider bg-transparent`}>
                        {getLocalizedCategory(viewingDrug.category || 'General', currentLang)}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t.details?.stockLevel}</label>
                        {(() => {
                            const stockParts = formatStockParts(viewingDrug.stock, viewingDrug.unitsPerPack, {
                                packs: t.details?.packs || 'Packs',
                                outOfStock: t.outOfStock || 'Out of Stock'
                            });
                            return (
                                <p className={`text-xl font-bold ${viewingDrug.stock < (viewingDrug.unitsPerPack || 1) ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                    {stockParts.value} {stockParts.label && <span className="text-xs font-normal text-gray-500">{stockParts.label}</span>}
                                </p>
                            );
                        })()}
                    </div>
                    <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{t.modal?.expiry}</label>
                        <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                            {new Date(viewingDrug.expiryDate).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-gray-500">{t.details?.sellingPrice}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{formatCurrency(viewingDrug.price)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-gray-500">{t.details?.costPrice}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{formatCurrency(viewingDrug.costPrice || 0)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-gray-500">{t.details?.unitsPerPack}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{viewingDrug.unitsPerPack || 1}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-gray-500">{t.details?.barcode}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{viewingDrug.barcode || 'N/A'}</span>
                    </div>
                     <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="text-sm text-gray-500">{t.details?.internalCode}</span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{viewingDrug.internalCode || 'N/A'}</span>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">{t.details?.description}</label>
                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                        {viewingDrug.description || t.details?.noDescription}
                    </p>
                </div>
            </div>

            <div className="p-4 flex gap-3">
                <button 
                    onClick={() => handlePrintBarcode(viewingDrug)}
                    className={`flex-1 py-2.5 rounded-full font-medium text-white bg-${color}-600 hover:bg-${color}-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 type-interactive`}
                >
                    <span className="material-symbols-rounded">qr_code_2</span>
                    {t.actionsMenu.printBarcode}
                </button>
                 {canPerformAction(userRole, 'inventory.update') && (
                   <button 
                      onClick={() => {
                          setViewingDrug(null);
                          handleOpenEdit(viewingDrug);
                      }}
                      className="flex-1 py-2.5 rounded-full font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors type-interactive"
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
            size="4xl"
            zIndex={50}
            title={editingDrug ? t.modal.edit : t.modal.add}
            icon={editingDrug ? 'edit' : 'add_circle'}
        >
            
            <form onSubmit={handleSubmit} className="h-full">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* LEFT COLUMN: Main Info */}
                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.brand} *</label>
                      <input required className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                        value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.generic} *</label>
                      <input required className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                        value={formData.genericName} onChange={e => setFormData({...formData, genericName: e.target.value})} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.category} *</label>
                      <FilterDropdown
                        variant="input"
                        items={getCategories(currentLang)}
                        selectedItem={formData.category} // English ID
                        isOpen={isEditCategoryOpen}
                        onToggle={() => setIsEditCategoryOpen(!isEditCategoryOpen)}
                        onSelect={(val) => { setFormData({ ...formData, category: val, dosageForm: '' }); setIsEditCategoryOpen(false); }}
                        keyExtractor={(c) => c}
                        renderSelected={(c) => getLocalizedCategory(c || 'General', currentLang)}
                        renderItem={(c) => getLocalizedCategory(c, currentLang)}
                        className="w-full h-[50px]"
                        color={color}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Product Type</label>
                      <FilterDropdown
                        variant="input"
                        items={getProductTypes(formData.category || 'General', currentLang)} // English IDs
                        selectedItem={formData.dosageForm || ''}
                        isOpen={isEditDosageOpen}
                        onToggle={() => setIsEditDosageOpen(!isEditDosageOpen)}
                        onSelect={(val) => { setFormData({ ...formData, dosageForm: val }); setIsEditDosageOpen(false); }}
                        keyExtractor={(c) => c}
                        renderSelected={(c) => c ? getLocalizedProductType(c, currentLang) : (t.addProduct?.placeholders?.dosageForm || 'Select Type')}
                        renderItem={(c) => getLocalizedProductType(c, currentLang)}
                        className="w-full h-[50px]"
                         color={color}
                      />
                    </div>
                  </div>

                  {isMedicineCategory(formData.category || '') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Active Ingredients</label>
                    <input className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                      placeholder="e.g., Paracetamol, Caffeine"
                      value={formData.activeIngredients?.join(', ') || ''}
                      onChange={e => setFormData({ ...formData, activeIngredients: e.target.value.split(',').map(s => s.trim()) })}
                    />
                  </div>
                  )}

                  {/* Multi-Barcode Input */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.barcode}</label>
                    <div className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus-within:ring-2 focus-within:ring-blue-500 transition-all flex flex-wrap gap-2 items-center min-h-[42px]">
                      {formData.barcode && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800">
                          <span className="material-symbols-rounded text-[14px]">qr_code_2</span>
                          {formData.barcode}
                          <button type="button" onClick={() => setFormData({ ...formData, barcode: '' })} className="hover:text-blue-900 dark:hover:text-blue-100">
                            <span className="material-symbols-rounded text-[14px]">close</span>
                          </button>
                        </span>
                      )}
                      {formData.additionalBarcodes?.map((code, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium border border-gray-300 dark:border-gray-600">
                          {code}
                          <button type="button" onClick={() => {
                              const newCodes = [...(formData.additionalBarcodes || [])];
                              newCodes.splice(idx, 1);
                              setFormData({ ...formData, additionalBarcodes: newCodes });
                            }} className="hover:text-gray-900 dark:hover:text-gray-100">
                            <span className="material-symbols-rounded text-[14px]">close</span>
                          </button>
                        </span>
                      ))}
                      <input className="flex-1 bg-transparent border-none outline-none text-sm min-w-[120px]"
                        placeholder={!formData.barcode ? "Scan primary barcode" : "Add more..."}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const val = e.currentTarget.value.trim();
                            if (val) {
                              if (!formData.barcode) setFormData({ ...formData, barcode: val });
                              else setFormData({ ...formData, additionalBarcodes: [...(formData.additionalBarcodes || []), val] });
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.internalCode}</label>
                    <div className="relative">
                      <input className="w-full pl-3 pr-10 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-mono"
                        placeholder="Auto-generated"
                        value={formData.internalCode || ''} onChange={e => setFormData({ ...formData, internalCode: e.target.value })} />
                      <button type="button" onClick={generateInternalCode} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-500 transition-colors" title="Auto-Generate">
                        <span className="material-symbols-rounded text-[20px]">autorenew</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.desc}</label>
                    <textarea className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none" rows={2}
                      value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                  </div>
                </div>

                {/* RIGHT COLUMN: Details */}
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                      <span className="material-symbols-rounded text-base">inventory</span> Inventory
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.stock}</label>
                        <input type="number" step="0.01" required className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                          value={formData.stock} onChange={e => setFormData({...formData, stock: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.unitsPerPack}</label>
                        <input type="number" min="1" className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                          value={formData.unitsPerPack || 1} onChange={e => setFormData({...formData, unitsPerPack: parseInt(e.target.value) || 1})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.expiry}</label>
                      <SmartDateInput required className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                        value={formData.expiryDate} onChange={val => setFormData({ ...formData, expiryDate: val })} />
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 space-y-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                      <span className="material-symbols-rounded text-base">payments</span> Pricing
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.price}</label>
                        <input type="number" step="0.01" required className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold text-green-600" 
                          value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.cost}</label>
                        <input type="number" step="0.01" className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm" 
                          value={formData.costPrice || 0} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Discount (%)</label>
                      <input type="number" min="0" max="100" className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm text-red-500" 
                        value={formData.maxDiscount || ''} onChange={e => setFormData({...formData, maxDiscount: parseFloat(e.target.value)})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6 flex gap-3 border-t border-gray-100 dark:border-gray-800 mt-6">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors">
                  {t.modal.cancel}
                </button>
                <button type="submit" className={`flex-1 py-3 rounded-xl font-medium text-white bg-${color}-600 hover:bg-${color}-700 shadow-md transition-all active:scale-95`}>
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
          size="sm"
          title={t.actionsMenu.printBarcode}
          icon="print"
        >
          <div className="space-y-4">
            
            <div className="text-center">
              <div className="font-medium text-gray-900 dark:text-gray-100">{printModalDrug.name}</div>
              <div className="text-sm text-gray-500">{printModalDrug.genericName?.length > 35 ? printModalDrug.genericName.substring(0, 35) + '...' : printModalDrug.genericName}</div>
            </div>
            
            <div className="flex items-center justify-center gap-4">
              <button 
                type="button"
                onClick={() => setPrintQuantity(Math.max(1, printQuantity - 1))}
                className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-rounded text-xl">remove</span>
              </button>
              
              <input
                type="number"
                min="1"
                max="100"
                value={printQuantity}
                onChange={(e) => setPrintQuantity(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                className="w-20 h-12 text-center text-2xl font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
              />
              
              <button 
                type="button"
                onClick={() => setPrintQuantity(Math.min(100, printQuantity + 1))}
                className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-rounded text-xl">add</span>
              </button>
            </div>
            
            <p className="text-xs text-center text-gray-400">{t.actionsMenu.printQtyPrompt}</p>
            
            <div className="flex gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setPrintModalDrug(null)}
                className="flex-1 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
              >
                {t.modal.cancel}
              </button>
              <button 
                type="button"
                onClick={handleConfirmPrint}
                className={`flex-1 py-3 rounded-xl font-medium text-white bg-${color}-600 hover:bg-${color}-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2`}
              >
                <span className="material-symbols-rounded text-lg">print</span>
                {t.actionsMenu.printBarcode}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
