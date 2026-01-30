import React, { useState, useMemo } from 'react';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import { useContextMenu } from '../common/ContextMenu';
import { Supplier } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { useSmartDirection, isValidEmail, isValidPhone, SmartPhoneInput, SmartEmailInput } from '../common/SmartInputs';
import { Modal } from '../common/Modal';
import { TanStackTable } from '../common/TanStackTable';
import { ColumnDef } from '@tanstack/react-table';

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

  // Table columns definition
  const columns = useMemo<ColumnDef<Supplier>[]>(() => [
    {
      accessorKey: 'id',
      header: t.headers?.id || 'ID',
      size: 100,
      meta: { align: 'start' }
    },
    {
      accessorKey: 'name',
      header: t.headers?.name || 'Name',
      size: 200,
      meta: { align: 'start' },
      cell: ({ getValue }) => <span className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{getValue() as string}</span>
    },
    {
      accessorKey: 'contactPerson',
      header: t.headers?.contactPerson || 'Contact Person',
      size: 180,
      meta: { align: 'start' },
      cell: ({ getValue }) => <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{getValue() as string}</span>
    },
    {
      accessorKey: 'phone',
      header: t.headers?.phone || 'Phone',
      size: 140,
      meta: { align: 'start', dir: 'ltr' },
      cell: ({ getValue }) => <span className="text-sm font-mono text-gray-600 dark:text-gray-400 truncate" dir="ltr">{getValue() as string}</span>
    },
    {
      accessorKey: 'email',
      header: t.headers?.email || 'Email',
      size: 200,
      meta: { align: 'start' },
      cell: ({ getValue }) => <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{getValue() as string}</span>
    },
    {
      accessorKey: 'address',
      header: t.headers?.address || 'Address',
      size: 250,
      meta: { align: 'start' },
      cell: ({ getValue }) => <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{getValue() as string}</span>
    },
    {
      id: 'actions',
      header: t.headers?.action || 'Action',
      size: 80,
      meta: { align: 'center' },
      cell: ({ row }) => (
        <button 
          onClick={(e) => {
            e.stopPropagation();
            showMenu(e.clientX, e.clientY, getRowActions(row.original));
          }}
          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors outline-none"
          title={t.headers?.actions || 'Actions'}
        >
          <span className="material-symbols-rounded text-[20px]">more_vert</span>
        </button>
      )
    }
  ], [t, getRowActions]); // getRowActions is stable component reference but we just in case include it


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
          <div className="flex-shrink-0">
             <SearchInput
               value={search}
               onSearchChange={setSearch}
               placeholder={t.searchPlaceholder || 'Search supplier name, contact...'}
               wrapperClassName="w-96"
               className="p-3 rounded-xl border-gray-200 dark:border-gray-700"
               style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
             />
          </div>
          <div className={`flex-1 overflow-hidden ${CARD_BASE} rounded-xl p-0 flex flex-col`}>

             <TanStackTable
                data={suppliers}
                columns={columns}
                tableId="suppliers_list"
                globalFilter={search}
                onSearchChange={setSearch}
                enableTopToolbar={false}
                searchPlaceholder={t.searchPlaceholder || 'Search supplier name, contact...'}
                onRowClick={(row) => handleViewDetails(row)}
                onRowContextMenu={(e, row) => showMenu(e.clientX, e.clientY, getRowActions(row))}
                color={color}
             />
        </div>
        </>
      ) : (
        /* ADD SUPPLIER FORM VIEW - INLINE */
        <div className="flex-1 overflow-y-auto">

          <form onSubmit={handleSaveNew} className="max-w-full mx-auto pb-20 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                {/* Company Information Card */}
                <div className={`${CARD_BASE} rounded-xl p-6`}>
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
                <div className={`${CARD_BASE} rounded-xl p-6`}>
                <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                    <span className="material-symbols-rounded text-[18px]">person</span>
                    {t.form?.contactInfo || 'Contact Information'}
                </h3>
                <div className="space-y-4">
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
                    <div>
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
            title={t.modal?.edit || 'Edit Supplier'}
            icon="edit"
            subtitle={t.modal?.editSubtitle || 'Update supplier information'}
        >

            {/* Form */}
            <div className="space-y-6">
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
            title={t.modal?.delete || 'Delete Supplier'}
            icon="warning"
            subtitle={t.modal?.deleteSubtitle || 'This action cannot be undone'}
        >
            <div className="space-y-4">
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
            title={t.modal?.details || 'Supplier Details'}
            icon="visibility"
        >
            {/* Content */}
            <div className="space-y-6">
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
