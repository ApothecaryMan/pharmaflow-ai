import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SegmentedControl } from '../common/SegmentedControl';
import { useContextMenu, useContextMenuTrigger } from '../common/ContextMenu';
import { Supplier } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { useColumnReorder } from '../../hooks/useColumnReorder';
import { useLongPress } from '../../hooks/useLongPress';
import { SearchInput } from '../common/SearchInput';
import { useSmartDirection, isValidEmail, isValidPhone, SmartPhoneInput, SmartEmailInput } from '../common/SmartInputs';
import { Modal } from '../common/Modal';

interface SuppliersListProps {
  suppliers: Supplier[];
  setSuppliers: (suppliers: Supplier[]) => void;
  color: string;
  t: any;
  language: 'EN' | 'AR';
}

export const SuppliersList: React.FC<SuppliersListProps> = ({ suppliers, setSuppliers, color, t, language }) => {
  const { showMenu } = useContextMenu();
  const [search, setSearch] = useState('');
  // SearchInput handles its own direction, so removing manual hook for search input

  
  // Mode and state
  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState<Supplier>({
    id: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });

  const nameDir = useSmartDirection(editForm.name, t.form?.enterCompanyName || 'Enter company name');
  const addressDir = useSmartDirection(editForm.address, t.form?.enterAddress || 'Enter company address');
  const contactPersonDir = useSmartDirection(editForm.contactPerson, t.form?.enterContactPerson || 'Enter contact person name');

  // Column management
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
    defaultColumns: ['id', 'name', 'contactPerson', 'phone', 'email', 'address', 'action'],
    storageKey: 'suppliers_columns'
  });

  // Column widths with localStorage persistence
  const [columnWidths, setColumnWidths] = useState<Record<string, number | undefined>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('suppliers_column_widths');
      if (saved) {
        try { return JSON.parse(saved); } catch (e) { console.error('Failed to parse column widths', e); }
      }
    }
    return {
      id: 100,
      name: 200,
      contactPerson: 180,
      phone: 140,
      email: 200,
      address: 250,
      action: 80
    };
  });

  useEffect(() => {
    localStorage.setItem('suppliers_column_widths', JSON.stringify(columnWidths));
  }, [columnWidths]);

  const [isColumnResizing, setIsColumnResizing] = useState(false);
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const startColumnResize = (e: React.MouseEvent, columnId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setIsColumnResizing(true);
    resizingColumn.current = columnId;
    startX.current = e.pageX;
    startWidth.current = columnWidths[columnId] || 100;

    document.addEventListener('mousemove', handleColumnResizeMove);
    document.addEventListener('mouseup', endColumnResize);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleColumnResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;
    const diff = e.pageX - startX.current;
    const isRTL = document.dir === 'rtl' || document.documentElement.getAttribute('dir') === 'rtl';
    const finalDiff = isRTL ? -diff : diff;
    const newWidth = Math.max(50, startWidth.current + finalDiff);
    setColumnWidths(prev => ({ ...prev, [resizingColumn.current!]: newWidth }));
  }, []);

  const endColumnResize = useCallback(() => {
    setIsColumnResizing(false);
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleColumnResizeMove);
    document.removeEventListener('mouseup', endColumnResize);
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, [handleColumnResizeMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleColumnResizeMove);
      document.removeEventListener('mouseup', endColumnResize);
    };
  }, [endColumnResize, handleColumnResizeMove]);

  const handleAutoFit = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation();
    setColumnWidths(prev => {
      const next = { ...prev };
      delete next[columnId];
      return next;
    });
  };

  const columnsDef = {
    id: { label: t.headers?.id || 'ID', className: 'px-3 py-2 text-start' },
    name: { label: t.headers?.name || 'Name', className: 'px-3 py-2 text-start' },
    contactPerson: { label: t.headers?.contactPerson || 'Contact Person', className: 'px-3 py-2 text-start' },
    phone: { label: t.headers?.phone || 'Phone', className: 'px-3 py-2 text-start' },
    email: { label: t.headers?.email || 'Email', className: 'px-3 py-2 text-start' },
    address: { label: t.headers?.address || 'Address', className: 'px-3 py-2 text-start' },
    action: { label: t.headers?.action || 'Action', className: 'px-3 py-2 text-center' }
  };

  // Copy helper
  const copyToClipboard = async (text: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Fallback copy failed:', err);
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Edit/Delete handlers
  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setEditForm({ ...supplier });
  };

  const handleViewDetails = (supplier: Supplier) => {
    setViewingSupplier(supplier);
  };

  const handleSaveEdit = () => {
    if (!editForm.name || !editForm.contactPerson || !editForm.phone || !editForm.email) {
      alert(t.fillRequired || 'Please fill in all required fields');
      return;
    }

    if (!isValidPhone(editForm.phone)) {
      alert(t.errors?.invalidPhone || 'Invalid phone number');
      return;
    }

    if (!isValidEmail(editForm.email)) {
      alert(t.errors?.invalidEmail || 'Invalid email address');
      return;
    }
    setSuppliers(suppliers.map(s => s.id === editForm.id ? editForm : s));
    setEditingSupplier(null);
  };

  const handleDelete = (supplier: Supplier) => {
    setDeleteConfirm(supplier);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      setSuppliers(suppliers.filter(s => s.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    }
  };

  const handleAddNew = () => {
    setMode('add');
    // Generate sequential ID starting from 001
    const nextId = (suppliers.length + 1).toString().padStart(3, '0');
    setEditForm({
      id: nextId,
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: ''
    });
  };

  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.name || !editForm.contactPerson || !editForm.phone || !editForm.email) {
      alert(t.fillRequired || 'Please fill in all required fields');
      return;
    }

    if (!isValidPhone(editForm.phone)) {
      alert(t.errors?.invalidPhone || 'Invalid phone number');
      return;
    }

    if (!isValidEmail(editForm.email)) {
      alert(t.errors?.invalidEmail || 'Invalid email address');
      return;
    }
    setSuppliers([...suppliers, editForm]);
    setMode('list');
  };

  // Helper: Get row context menu actions
  const getRowActions = (supplier: Supplier) => [
    { label: t.contextMenu?.viewDetails || 'View Details', icon: 'visibility', action: () => handleViewDetails(supplier) },
    { label: t.contextMenu?.edit || 'Edit', icon: 'edit', action: () => handleEdit(supplier) },
    { label: t.contextMenu?.delete || 'Delete', icon: 'delete', action: () => handleDelete(supplier) },
    { separator: true },
    { label: t.contextMenu?.copyName || 'Copy Name', icon: 'content_copy', action: () => copyToClipboard(supplier.name) },
    { label: t.contextMenu?.copyPhone || 'Copy Phone', icon: 'phone', action: () => copyToClipboard(supplier.phone) },
    { label: t.contextMenu?.copyEmail || 'Copy Email', icon: 'email', action: () => copyToClipboard(supplier.email) }
  ];

  // Helper: Get header context menu actions
  const getHeaderActions = () => [
    { label: t.contextMenu?.showHideColumns || 'Show/Hide Columns', icon: 'visibility', action: () => {} },
    { separator: true },
    ...Object.keys(columnsDef).map(colId => ({
      label: columnsDef[colId as keyof typeof columnsDef].label,
      icon: hiddenColumns.has(colId) ? 'visibility_off' : 'visibility',
      action: () => toggleColumnVisibility(colId)
    }))
  ];

  // Header context menu trigger
  const { triggerProps: headerTriggerProps } = useContextMenuTrigger({
    actions: getHeaderActions
  });

  // Row touch/long-press support
  const currentTouchRow = useRef<Supplier | null>(null);

  const {
    onTouchStart: onRowTouchStart,
    onTouchEnd: onRowTouchEnd,
    onTouchMove: onRowTouchMove
  } = useLongPress({
    onLongPress: (e) => {
      if (currentTouchRow.current) {
        const touch = e.touches[0];
        showMenu(touch.clientX, touch.clientY, getRowActions(currentTouchRow.current));
      }
    }
  });

  const renderCell = (supplier: Supplier, columnId: string) => {
    switch(columnId) {
      case 'id':
        return <span className="text-xs font-mono text-gray-500 truncate">{supplier.id}</span>;
      case 'name':
        return <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{supplier.name}</span>;
      case 'contactPerson':
        return <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{supplier.contactPerson}</span>;
      case 'phone':
        return <span className="text-sm font-mono text-gray-600 dark:text-gray-400 truncate" dir="ltr">{supplier.phone}</span>;
      case 'email':
        return <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{supplier.email}</span>;
      case 'address':
        return <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{supplier.address}</span>;
      case 'action':
        return (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              showMenu(e.clientX, e.clientY, getRowActions(supplier));
            }}
            className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors outline-none"
            title={t.headers?.actions || 'Actions'}
          >
            <span className="material-symbols-rounded text-[20px]">more_vert</span>
          </button>
        );
      default:
        return null;
    }
  };

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(s => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(searchLower) ||
      s.contactPerson.toLowerCase().includes(searchLower) ||
      s.phone.toLowerCase().includes(searchLower) ||
      s.email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in p-4 overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight type-expressive">{mode === 'list' ? (t.suppliersList || 'Suppliers List') : (t.addNewSupplier || 'Add New Supplier')}</h2>
          <p className="text-sm text-gray-500">{mode === 'list' ? (t.manageSuppliers || 'Manage your suppliers') : (t.createNewRecord || 'Create a new supplier record')}</p>
        </div>
        <SegmentedControl
            value={mode}
            onChange={(val) => {
                if (val === 'list') setMode('list');
                else if (val === 'add') handleAddNew();
            }}
            color={color}
            shape="pill"
            size="sm"
            options={[
                { label: t.allSuppliers || 'All Suppliers', value: 'list' },
                { label: t.addNewSupplier || 'Add New Supplier', value: 'add' }
            ]}
        />
      </div>

      {mode === 'list' ? (
        <>
          {/* Search */}
          <div className="flex-shrink-0">
            <SearchInput
              value={search}
              onSearchChange={setSearch}
              placeholder={t.searchPlaceholder || 'Search supplier name, contact...'}
              className="w-full p-3 rounded-xl border-gray-200 dark:border-gray-700"
              style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
            />
          </div>

          {/* Table */}
          <div className={`flex-1 overflow-auto ${CARD_BASE} rounded-3xl`}>
        <table className="w-full min-w-full table-fixed border-collapse">
          <thead className={`bg-${color}-50 dark:bg-${color}-900 text-${color}-900 dark:text-${color}-100 uppercase text-xs font-bold tracking-wider sticky top-0 z-10 shadow-sm`}>
            <tr>
              {columnOrder.filter(col => !hiddenColumns.has(col)).map((columnId) => (
                <th
                  key={columnId}
                  data-column-id={columnId}
                  className={`${columnsDef[columnId as keyof typeof columnsDef].className} ${!isColumnResizing ? 'cursor-grab active:cursor-grabbing' : ''} select-none transition-colors relative group/header hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    draggedColumn === columnId ? 'opacity-50' : ''
                  } ${dragOverColumn === columnId ? `bg-${color}-100 dark:bg-${color}-900/50` : ''}`}
                  title={columnsDef[columnId as keyof typeof columnsDef].label}
                  draggable={!isColumnResizing}
                  onDragStart={(e) => {
                    if ((e.target as HTMLElement).closest('.resize-handle')) {
                      e.preventDefault();
                      return;
                    }
                    handleColumnDragStart(e, columnId);
                  }}
                  onDragOver={(e) => handleColumnDragOver(e, columnId)}
                  onDrop={(e) => handleColumnDrop(e, columnId)}
                  onDragEnd={handleColumnDragEnd}
                  onTouchStart={(e) => {
                    if ((e.target as HTMLElement).closest('.resize-handle')) return;
                    e.stopPropagation();
                    handleColumnDragStart(e, columnId);
                  }}
                  onTouchMove={(e) => handleColumnTouchMove(e)}
                  onTouchEnd={(e) => handleColumnTouchEnd(e)}
                  {...headerTriggerProps}
                  style={{ width: columnWidths[columnId] ? `${columnWidths[columnId]}px` : 'auto' }}
                >
                  <div className="flex items-center justify-between h-full w-full">
                    <span className="truncate flex-1">{columnsDef[columnId as keyof typeof columnsDef].label}</span>
                    
                    <div 
                      className="resize-handle absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 cursor-col-resize z-20 flex items-center justify-center opacity-0 group-hover/header:opacity-100 transition-opacity"
                      style={{ right: '-8px' }}
                      onMouseDown={(e) => startColumnResize(e, columnId)}
                      onClick={(e) => e.stopPropagation()}
                      onDoubleClick={(e) => handleAutoFit(e, columnId)}
                    >
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredSuppliers.map((supplier, index) => (
              <tr 
                key={supplier.id}
                onClick={() => handleViewDetails(supplier)}
                onTouchStart={(e) => {
                    currentTouchRow.current = supplier;
                    onRowTouchStart(e);
                }}
                onTouchEnd={onRowTouchEnd}
                onTouchMove={onRowTouchMove}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  showMenu(e.clientX, e.clientY, getRowActions(supplier));
                }}
                className={`border-b border-gray-100 dark:border-gray-800 hover:bg-${color}-50 dark:hover:bg-${color}-950/20 cursor-pointer transition-colors ${index % 2 === 0 ? 'bg-gray-50/30 dark:bg-gray-800/20' : ''}`}
              >
                {columnOrder.filter(col => !hiddenColumns.has(col)).map((columnId) => (
                  <td 
                    key={columnId} 
                    className={`${columnsDef[columnId as keyof typeof columnsDef].className} align-middle border-none`}
                    style={{ width: columnWidths[columnId] ? `${columnWidths[columnId]}px` : 'auto' }}
                  >
                    {renderCell(supplier, columnId)}
                  </td>
                ))}
              </tr>
            ))}
            {filteredSuppliers.length === 0 && (
              <tr>
                <td colSpan={10} className="p-12 text-center text-gray-400">
                  {search.trim() ? (t.noSuppliersFound || 'No suppliers found matching your search') : (t.noSuppliersAvailable || 'No suppliers available')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
        </>
      ) : (
        /* ADD SUPPLIER FORM VIEW - INLINE */
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSaveNew} className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Company Information Card */}
            <div className={`${CARD_BASE} rounded-3xl p-6`}>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                <span className="material-symbols-rounded text-[18px]">business</span>
                {t.form?.companyInfo || 'Company Information'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.form?.id || 'ID'}</label>
                  <div className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 font-mono text-sm">
                    {editForm.id}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.form?.companyName || 'Company Name'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all"
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    placeholder={t.form?.enterCompanyName || 'Enter company name'}
                    dir={nameDir}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.form?.address || 'Address'}</label>
                  <textarea
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    rows={3}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all resize-none"
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    placeholder={t.form?.enterAddress || 'Enter company address'}
                    dir={addressDir}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Card */}
            <div className={`${CARD_BASE} rounded-3xl p-6`}>
              <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                <span className="material-symbols-rounded text-[18px]">person</span>
                {t.form?.contactInfo || 'Contact Information'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.form?.contactPerson || 'Contact Person'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.contactPerson}
                    onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all"
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    placeholder={t.form?.enterContactPerson || 'Enter contact person name'}
                    dir={contactPersonDir}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.form?.phone || 'Phone'} <span className="text-red-500">*</span>
                  </label>
                  <SmartPhoneInput
                    required
                    value={editForm.phone}
                    onChange={(val) => setEditForm({ ...editForm, phone: val })}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all"
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    placeholder={t.form?.phonePlaceholder || '+1234567890'}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t.form?.email || 'Email'} <span className="text-red-500">*</span>
                  </label>
                  <SmartEmailInput
                    required
                    value={editForm.email}
                    onChange={(val) => setEditForm({ ...editForm, email: val })}
                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all"
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                    placeholder={t.form?.emailPlaceholder || 'email@example.com'}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setMode('list')}
                  className="px-6 py-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm font-medium"
                >
                  {t.modal?.cancel || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className={`px-6 py-3 bg-${color}-600 hover:bg-${color}-700 text-white rounded-xl shadow-lg transition-all font-bold`}
                >
                  {t.modal?.addSupplier || 'Add Supplier'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Edit Modal */}
      {editingSupplier && (
        <Modal
            isOpen={true}
            onClose={() => setEditingSupplier(null)}
            size="2xl"
            zIndex={50}
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600`}>
                  <span className="material-symbols-rounded">edit</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white type-expressive">{t.modal?.edit || 'Edit Supplier'}</h3>
                  <p className="text-xs text-gray-500">{t.modal?.editSubtitle || 'Update supplier information'}</p>
                </div>
              </div>
              <button 
                onClick={() => setEditingSupplier(null)}
                className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {/* Form */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* ID Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.form?.id || 'ID'}</label>
                <div className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 font-mono text-sm">
                  {editForm.id}
                </div>
              </div>

              {/* Basic Information Section */}
              <div className="mb-6">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">business</span>
                  {t.form?.companyInfo || 'Company Information'}
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.form?.companyName || 'Company Name'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all"
                      style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                      placeholder={t.form?.enterCompanyName || 'Enter company name'}
                      dir={nameDir}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.form?.address || 'Address'}</label>
                    <textarea
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      rows={3}
                      className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all resize-none"
                      style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                      placeholder={t.form?.enterAddress || 'Enter company address'}
                      dir={addressDir}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Section */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">person</span>
                  {t.form?.contactInfo || 'Contact Information'}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.form?.contactPerson || 'Contact Person'} <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editForm.contactPerson}
                      onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                      className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all"
                      style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                      placeholder={t.form?.enterContactPerson || 'Enter contact person name'}
                      dir={contactPersonDir}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.form?.phone || 'Phone'} <span className="text-red-500">*</span>
                    </label>
                    <SmartPhoneInput
                      value={editForm.phone}
                      onChange={(val) => setEditForm({ ...editForm, phone: val })}
                      className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all"
                      style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                      placeholder={t.form?.phonePlaceholder || '+1234567890'}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t.form?.email || 'Email'} <span className="text-red-500">*</span>
                    </label>
                    <SmartEmailInput
                      value={editForm.email}
                      onChange={(val) => setEditForm({ ...editForm, email: val })}
                      className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-none transition-all"
                      style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                      placeholder={t.form?.emailPlaceholder || 'email@example.com'}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setEditingSupplier(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {t.modal?.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleSaveEdit}
                className={`px-4 py-2 rounded-xl bg-${color}-600 text-white hover:bg-${color}-700 transition-colors`}
              >
                {t.modal?.saveChanges || 'Save Changes'}
              </button>
            </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Modal
            isOpen={true}
            onClose={() => setDeleteConfirm(null)}
            size="md"
            zIndex={50}
        >
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30 text-red-600">
                  <span className="material-symbols-rounded text-[32px]">warning</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white type-expressive">{t.modal?.delete || 'Delete Supplier'}</h3>
                  <p className="text-sm text-gray-500">{t.modal?.deleteSubtitle || 'This action cannot be undone'}</p>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-6">
                {t.modal?.confirmDelete || 'Are you sure you want to delete'} <strong>{deleteConfirm.name}</strong>?
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {t.modal?.cancel || 'Cancel'}
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  {t.modal?.deleteBtn || 'Delete'}
                </button>
              </div>
            </div>
        </Modal>
      )}

      {/* Details View Modal */}
      {viewingSupplier && (
        <Modal
            isOpen={true}
            onClose={() => setViewingSupplier(null)}
            size="2xl"
            zIndex={50}
        >
            {/* Header */}
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 flex items-center justify-center rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600`}>
                  <span className="material-symbols-rounded">visibility</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white type-expressive">{t.modal?.details || 'Supplier Details'}</h3>
                  <p className="text-xs text-gray-500">{t.modal?.detailsSubtitle || 'View supplier information'}</p>
                </div>
              </div>
              <button 
                onClick={() => setViewingSupplier(null)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Company Information */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">business</span>
                  {t.form?.companyInfo || 'Company Information'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.form?.id || 'ID'}</label>
                    <p className="text-sm text-gray-900 dark:text-white font-mono">{viewingSupplier.id}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.form?.companyName || 'Company Name'}</label>
                    <p className="text-sm text-gray-900 dark:text-white font-bold">{viewingSupplier.name}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.form?.address || 'Address'}</label>
                    <p className="text-sm text-gray-900 dark:text-white">{viewingSupplier.address || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                  <span className="material-symbols-rounded text-[18px]">person</span>
                  {t.form?.contactInfo || 'Contact Information'}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.form?.contactPerson || 'Contact Person'}</label>
                    <p className="text-sm text-gray-900 dark:text-white">{viewingSupplier.contactPerson}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.form?.phone || 'Phone'}</label>
                    <p className="text-sm text-gray-900 dark:text-white font-mono" dir="ltr">{viewingSupplier.phone}</p>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-500 mb-1">{t.form?.email || 'Email'}</label>
                    <p className="text-sm text-gray-900 dark:text-white">{viewingSupplier.email}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end">
              <button
                onClick={() => setViewingSupplier(null)}
                className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {t.modal?.close || 'Close'}
              </button>
              <button
                onClick={() => {
                  setViewingSupplier(null);
                  handleEdit(viewingSupplier);
                }}
                className={`px-4 py-2 rounded-xl bg-${color}-600 text-white hover:bg-${color}-700 transition-colors`}
              >
                {t.modal?.edit || 'Edit Supplier'}
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
};
