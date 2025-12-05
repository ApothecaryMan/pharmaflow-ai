import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useContextMenu } from '../components/ContextMenu';
import { useColumnReorder } from '../hooks/useColumnReorder';
import { useLongPress } from '../hooks/useLongPress';
import { Drug } from '../types';

interface InventoryProps {
  inventory: Drug[];
  onAddDrug: (drug: Drug) => void;
  onUpdateDrug: (drug: Drug) => void;
  onDeleteDrug: (id: string) => void;
  color: string;
  t: any;
}

export const Inventory: React.FC<InventoryProps> = ({ inventory, onAddDrug, onUpdateDrug, onDeleteDrug, color, t }) => {
  const { showMenu } = useContextMenu();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDrug, setEditingDrug] = useState<Drug | null>(null);
  const [viewingDrug, setViewingDrug] = useState<Drug | null>(null); // New state for Details View
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Drug>>({});

  // Use column reorder hook
  const {
    columnOrder,
    hiddenColumns,
    draggedColumn,
    dragOverColumn,
    toggleColumnVisibility,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnTouchMove,
    handleColumnDrop,
    handleColumnTouchEnd,
    handleColumnDragEnd,
  } = useColumnReorder({
    defaultColumns: ['name', 'codes', 'category', 'stock', 'price', 'cost', 'expiry', 'actions'],
    storageKey: 'inventory_columns'
  });

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
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;

    // Use barcode or internal code or ID, defaulting to fallback
    const barcodeValue = drug.barcode || drug.internalCode || drug.id;
    // Note: Code 39 fonts usually require * wrapping the content
    const barcodeText = `*${barcodeValue.replace(/\s/g, '').toUpperCase()}*`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Barcode: ${drug.name}</title>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
        <style>
          body { 
            font-family: 'Roboto', sans-serif; 
            text-align: center; 
            padding: 20px; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center;
          }
          .label { 
            border: 2px solid #000; 
            padding: 15px; 
            display: inline-block; 
            border-radius: 8px; 
            width: 300px;
            page-break-inside: avoid;
          }
          .store-name { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; color: #555; }
          .name { font-weight: 700; font-size: 16px; margin-bottom: 2px; line-height: 1.2; }
          .meta { font-size: 11px; color: #444; margin-bottom: 10px; }
          .barcode { 
            font-family: 'Libre Barcode 39 Text', cursive; 
            font-size: 52px; 
            line-height: 1; 
            margin: 5px 0 10px 0; 
            white-space: nowrap; 
            overflow: hidden;
          }
          .price-tag { 
            font-size: 24px; 
            font-weight: 800; 
            margin-top: 5px; 
            border-top: 1px dashed #999;
            padding-top: 5px;
          }
        </style>
      </head>
      <body>
        <div class="label">
          <div class="store-name">PharmaFlow Property</div>
          <div class="name">${drug.name}</div>
          <div class="meta">${drug.genericName} | Exp: ${drug.expiryDate}</div>
          <div class="barcode">${barcodeText}</div>
          <div class="price-tag">$${drug.price.toFixed(2)}</div>
        </div>
        <script>
           window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleOpenAdd = () => {
    setEditingDrug(null);
    setFormData({
      name: '', genericName: '', category: 'General', price: 0, costPrice: 0, stock: 0, expiryDate: '', description: '', barcode: '', internalCode: '', unitsPerPack: 1, maxDiscount: 10
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (drug: Drug) => {
    setEditingDrug(drug);
    setFormData({ ...drug, maxDiscount: drug.maxDiscount ?? 10 });
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
      const newStock = prompt(`Adjust stock for ${drug.name}:`, drug.stock.toString());
      if (newStock !== null) {
          const val = parseFloat(newStock);
          if (!isNaN(val)) {
              onUpdateDrug({ ...drug, stock: val });
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
    if (editingDrug) {
      onUpdateDrug({ ...editingDrug, ...formData } as Drug);
    } else {
      const newDrug: Drug = {
        id: Date.now().toString(),
        ...formData as Omit<Drug, 'id'>
      };
      onAddDrug(newDrug);
    }
    setIsModalOpen(false);
  };

  const filteredInventory = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return inventory.filter(d => 
      d.name.toLowerCase().includes(term) || 
      d.genericName.toLowerCase().includes(term) ||
      d.description.toLowerCase().includes(term) ||
      d.category.toLowerCase().includes(term) ||
      (d.barcode && d.barcode.toLowerCase().includes(term)) ||
      (d.internalCode && d.internalCode.toLowerCase().includes(term))
    );
  }, [inventory, searchTerm]);

  // Column definitions
  const columns = {
    name: { label: t.headers.name, className: 'p-4 text-start' },
    codes: { label: t.headers.codes, className: 'p-4 text-start' },
    category: { label: t.headers.category, className: 'p-4 text-start' },
    stock: { label: t.headers.stock, className: 'p-4 text-start' },
    price: { label: t.headers.price, className: 'p-4 text-start' },
    cost: { label: t.headers.cost, className: 'p-4 text-start hidden lg:table-cell' },
    expiry: { label: t.headers.expiry, className: 'p-4 text-start' },
    actions: { label: t.headers.actions, className: 'p-4 text-end' }
  };

  const renderCellContent = (drug: Drug, columnId: string) => {
    switch (columnId) {
      case 'name':
        return (
          <>
            <div className="font-medium text-slate-900 dark:text-slate-100 text-sm">{drug.name}</div>
            <div className="text-xs text-slate-500">{drug.genericName}</div>
          </>
        );
      case 'codes':
        return (
          <>
            {drug.barcode && <div className="text-slate-600 dark:text-slate-400 text-xs"><span className="opacity-50">BC:</span> {drug.barcode}</div>}
            {drug.internalCode && <div className="text-slate-600 dark:text-slate-400 text-xs"><span className="opacity-50">INT:</span> {drug.internalCode}</div>}
            {!drug.barcode && !drug.internalCode && <span className="text-slate-300">-</span>}
          </>
        );
      case 'category':
        return (
          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {drug.category}
          </span>
        );
      case 'stock':
        return (
          <div className={`font-medium text-sm ${drug.stock < 20 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
            {parseFloat(drug.stock.toFixed(2))}
          </div>
        );
      case 'price':
        return <span className="text-slate-700 dark:text-slate-300 text-sm font-bold">${drug.price.toFixed(2)}</span>;
      case 'cost':
        return <span className="text-slate-500 text-xs hidden lg:table-cell">${drug.costPrice ? drug.costPrice.toFixed(2) : '-'}</span>;
      case 'expiry':
        return <span className="text-slate-500 text-sm">{drug.expiryDate}</span>;
      case 'actions':
        return (
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setActiveMenuId(activeMenuId === drug.id ? null : drug.id);
              }}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <span className="material-symbols-rounded text-[20px]">more_vert</span>
            </button>
            {activeMenuId === drug.id && (
              <div 
                ref={menuRef}
                className="absolute right-8 top-10 z-20 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-1 rtl:right-auto rtl:left-8 text-start animate-fade-in"
              >
                <button onClick={() => handleOpenEdit(drug)} className="w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                  <span className="material-symbols-rounded text-lg text-slate-400">edit</span>
                  {t.actionsMenu.edit}
                </button>
                <button onClick={() => handleViewDetails(drug.id)} className="w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                  <span className="material-symbols-rounded text-lg text-slate-400">visibility</span>
                  {t.actionsMenu.view}
                </button>
                <button onClick={() => handlePrintBarcode(drug)} className="w-full px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-3 transition-colors">
                  <span className="material-symbols-rounded text-lg text-slate-400">qr_code_2</span>
                  {t.actionsMenu.printBarcode}
                </button>
                <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                <button onClick={() => handleDelete(drug.id)} className="w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 transition-colors">
                  <span className="material-symbols-rounded text-lg">delete</span>
                  {t.actionsMenu.delete}
                </button>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  // Long Press Logic
  const currentTouchItem = useRef<Drug | string | null>(null);
  
  const { 
    onTouchStart: onRowTouchStart, 
    onTouchEnd: onRowTouchEnd, 
    onTouchMove: onRowTouchMove, 
    isLongPress: isRowLongPress 
  } = useLongPress({
    onLongPress: (e) => {
        if (currentTouchItem.current && typeof currentTouchItem.current !== 'string') {
            const drug = currentTouchItem.current as Drug;
            const touch = e.touches[0];
            showMenu(touch.clientX, touch.clientY, [
                { label: t.actionsMenu.edit, icon: 'edit', action: () => handleOpenEdit(drug) },
                { label: t.actionsMenu.viewDetails, icon: 'visibility', action: () => handleViewDetails(drug.id) },
                { separator: true },
                { label: t.actionsMenu.printBarcode, icon: 'print', action: () => handlePrintBarcode(drug) },
                { label: t.actionsMenu.duplicate, icon: 'content_copy', action: () => handleDuplicate(drug) },
                { separator: true },
                { label: t.actionsMenu.adjustStock, icon: 'inventory', action: () => handleQuickStockAdjust(drug) },
                { separator: true },
                { label: t.actionsMenu.delete, icon: 'delete', action: () => handleDelete(drug.id), danger: true }
            ]);
        }
    }
  });

  const {
    onTouchStart: onHeaderTouchStart,
    onTouchEnd: onHeaderTouchEnd,
    onTouchMove: onHeaderTouchMove,
    isLongPress: isHeaderLongPress
  } = useLongPress({
      onLongPress: (e) => {
        const touch = e.touches[0];
        showMenu(touch.clientX, touch.clientY, [
            { 
              label: 'Show/Hide Columns', 
              icon: 'visibility', 
              action: () => {} 
            },
            { separator: true },
            ...Object.keys(columns).map(colId => ({
              label: columns[colId as keyof typeof columns].label || 'Icon',
              icon: hiddenColumns.has(colId) ? 'visibility_off' : 'visibility',
              action: () => toggleColumnVisibility(colId)
            }))
        ]);
      }
  });



  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">{t.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-${color}-600 hover:bg-${color}-700 text-white font-medium text-sm transition-all shadow-lg shadow-${color}-200 dark:shadow-none active:scale-95`}
        >
          <span className="material-symbols-rounded text-lg">add</span>
          {t.addDrug}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <span className="material-symbols-rounded absolute start-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rtl:left-auto rtl:right-4 ltr:left-4">search</span>
        <input 
          type="text" 
          placeholder={t.searchPlaceholder}
          className="w-full ps-12 pe-4 py-3 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-950 transition-all text-sm"
          style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Table Card */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
        <div className="overflow-x-auto flex-1 pb-20 lg:pb-0"> {/* Extra padding for dropdown visibility */}
          <table className="w-full text-start border-collapse">
            <thead className={`bg-${color}-50 dark:bg-${color}-950/30 text-${color}-900 dark:text-${color}-100 uppercase text-xs font-bold tracking-wider`}>
              <tr>
                {columnOrder.filter(col => !hiddenColumns.has(col)).map((columnId) => (
                  <th
                    key={columnId}
                    data-column-id={columnId}
                    className={`${columns[columnId as keyof typeof columns].className} cursor-move select-none transition-all ${
                      draggedColumn === columnId ? 'opacity-50' : ''
                    } ${dragOverColumn === columnId ? `bg-${color}-100 dark:bg-${color}-900/50` : ''}`}
                    draggable
                    onDragStart={(e) => handleColumnDragStart(e, columnId)}
                    onDragOver={(e) => handleColumnDragOver(e, columnId)}
                    onDrop={(e) => handleColumnDrop(e, columnId)}
                    onDragEnd={handleColumnDragEnd}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      currentTouchItem.current = columnId;
                      onHeaderTouchStart(e);
                      handleColumnDragStart(e, columnId);
                    }}
                    onTouchMove={(e) => {
                        onHeaderTouchMove(e);
                        handleColumnTouchMove(e);
                    }}
                    onTouchEnd={(e) => {
                        onHeaderTouchEnd(e);
                        handleColumnTouchEnd(e);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      showMenu(e.clientX, e.clientY, [
                        {
                          label: 'Show/Hide Columns',
                          icon: 'visibility',
                          action: () => {}
                        },
                        { separator: true },
                        ...Object.keys(columns).map(colId => ({
                          label: columns[colId as keyof typeof columns].label,
                          icon: hiddenColumns.has(colId) ? 'visibility_off' : 'visibility',
                          action: () => toggleColumnVisibility(colId)
                        }))
                      ]);
                    }}
                    title="Drag to reorder | Right-click for options"
                  >
                    {columns[columnId as keyof typeof columns].label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredInventory.slice(0, 100).map(drug => (
                <tr
                    key={drug.id}
                    className={`border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${
                        drug.stock <= (drug.minStock || 0) ? 'bg-red-50/50 dark:bg-red-900/10' : ''
                    }`}
                    onClick={(e) => {
                        if (isRowLongPress.current) {
                            isRowLongPress.current = false;
                            return;
                        }
                        // Normal click action if any
                    }}
                    onTouchStart={(e) => {
                        currentTouchItem.current = drug;
                        onRowTouchStart(e);
                    }}
                    onTouchEnd={onRowTouchEnd}
                    onTouchMove={onRowTouchMove}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        showMenu(e.clientX, e.clientY, [
                            { label: t.actionsMenu.edit, icon: 'edit', action: () => handleOpenEdit(drug) },
                            { label: t.actionsMenu.view, icon: 'visibility', action: () => handleViewDetails(drug.id) },
                            { label: t.actionsMenu.printBarcode, icon: 'qr_code_2', action: () => handlePrintBarcode(drug) },
                            { separator: true },
                            { label: t.actionsMenu.duplicate, icon: 'content_copy', action: () => handleDuplicate(drug) },
                            { label: t.actionsMenu.adjustStock, icon: 'inventory_2', action: () => handleQuickStockAdjust(drug) },
                            { separator: true },
                            { label: t.actionsMenu.delete, icon: 'delete', action: () => handleDelete(drug.id), danger: true },
                        ]);
                    }}
                >
                  {columnOrder.filter(col => !hiddenColumns.has(col)).map((columnId) => (
                    <td key={columnId} className={columns[columnId as keyof typeof columns].className}>
                      {renderCellContent(drug, columnId)}
                    </td>
                  ))}
                </tr>
              ))}
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={columnOrder.length - hiddenColumns.size} className="p-12 text-center text-slate-400">
                    {t.noResults}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details View Modal */}
      {viewingDrug && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className={`p-5 bg-${color}-50 dark:bg-${color}-950/30 border-b border-${color}-100 dark:border-${color}-900 flex justify-between items-center`}>
              <h3 className={`text-lg font-semibold text-${color}-900 dark:text-${color}-100 flex items-center gap-2`}>
                <span className="material-symbols-rounded">visibility</span>
                {t.actionsMenu.view}
              </h3>
              <button onClick={() => setViewingDrug(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{viewingDrug.name}</h2>
                        <p className="text-slate-500 font-medium">{viewingDrug.genericName}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase bg-${color}-100 text-${color}-700 dark:bg-${color}-900/50 dark:text-${color}-300`}>
                        {viewingDrug.category}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Stock Level</label>
                        <p className={`text-xl font-bold ${viewingDrug.stock < 10 ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            {viewingDrug.stock} <span className="text-xs font-normal text-slate-500">packs</span>
                        </p>
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Expiry Date</label>
                        <p className="text-xl font-bold text-slate-700 dark:text-slate-300">
                            {new Date(viewingDrug.expiryDate).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-sm text-slate-500">Selling Price</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">${viewingDrug.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-sm text-slate-500">Cost Price</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">${viewingDrug.costPrice?.toFixed(2) || '0.00'}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-sm text-slate-500">Units Per Pack</span>
                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{viewingDrug.unitsPerPack || 1}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-sm text-slate-500">Barcode</span>
                        <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{viewingDrug.barcode || 'N/A'}</span>
                    </div>
                     <div className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-sm text-slate-500">Internal Code</span>
                        <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{viewingDrug.internalCode || 'N/A'}</span>
                    </div>
                </div>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Description</label>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                        {viewingDrug.description || 'No description provided.'}
                    </p>
                </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                <button 
                    onClick={() => handlePrintBarcode(viewingDrug)}
                    className={`flex-1 py-2.5 rounded-full font-medium text-white bg-${color}-600 hover:bg-${color}-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2`}
                >
                    <span className="material-symbols-rounded">qr_code_2</span>
                    {t.actionsMenu.printBarcode}
                </button>
                 <button 
                    onClick={() => {
                        setViewingDrug(null);
                        handleOpenEdit(viewingDrug);
                    }}
                    className="flex-1 py-2.5 rounded-full font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                >
                    {t.actionsMenu.edit}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className={`p-5 bg-${color}-50 dark:bg-${color}-950/30 border-b border-${color}-100 dark:border-${color}-900 flex justify-between items-center`}>
              <h3 className={`text-lg font-semibold text-${color}-900 dark:text-${color}-100`}>
                {editingDrug ? t.modal.edit : t.modal.add}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.modal.brand}</label>
                  <input required className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-inset transition-all" 
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.modal.generic}</label>
                  <input required className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-inset transition-all" 
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    value={formData.genericName} onChange={e => setFormData({...formData, genericName: e.target.value})} />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.modal.category}</label>
                  <select className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-inset transition-all"
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option>Antibiotics</option>
                    <option>Painkillers</option>
                    <option>Supplements</option>
                    <option>First Aid</option>
                    <option>Cardiovascular</option>
                    <option>Skin Care</option>
                    <option>Personal Care</option>
                    <option>Respiratory</option>
                    <option>Medical Equipment</option>
                    <option>Medical Supplies</option>
                    <option>Baby Care</option>
                    <option>General</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.modal.expiry}</label>
                  <input type="date" required className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-inset transition-all text-slate-500" 
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    value={formData.expiryDate} onChange={e => setFormData({...formData, expiryDate: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.modal.barcode}</label>
                  <input className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-inset transition-all" 
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    placeholder="Scan or type..."
                    value={formData.barcode || ''} onChange={e => setFormData({...formData, barcode: e.target.value})} />
                </div>
                 <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.modal.internalCode}</label>
                  <input className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-inset transition-all" 
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    value={formData.internalCode || ''} onChange={e => setFormData({...formData, internalCode: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.modal.stock}</label>
                  <input type="number" step="0.01" required className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-inset transition-all" 
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    value={formData.stock} onChange={e => setFormData({...formData, stock: parseFloat(e.target.value) || 0})} />
                </div>
                 <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.modal.unitsPerPack}</label>
                  <input type="number" min="1" className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-inset transition-all" 
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    value={formData.unitsPerPack || 1} onChange={e => setFormData({...formData, unitsPerPack: parseInt(e.target.value) || 1})} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.modal.price}</label>
                  <input type="number" step="0.01" required className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-inset transition-all font-bold text-green-600 dark:text-green-400" 
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">{t.modal.cost}</label>
                  <input type="number" step="0.01" className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-inset transition-all text-slate-500" 
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    value={formData.costPrice || 0} onChange={e => setFormData({...formData, costPrice: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Max Disc (%)</label>
                  <input type="number" min="0" max="100" className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-inset transition-all text-red-500" 
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    placeholder="No Limit"
                    value={formData.maxDiscount || ''} onChange={e => setFormData({...formData, maxDiscount: parseFloat(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase">{t.modal.desc}</label>
                <textarea className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-inset transition-all" rows={2}
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
              </div>

              <div className="pt-4 flex gap-3">
                 <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-full font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                  {t.modal.cancel}
                </button>
                <button type="submit" className={`flex-1 py-3 rounded-full font-medium text-white bg-${color}-600 hover:bg-${color}-700 shadow-md transition-all active:scale-95`}>
                  {t.modal.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};