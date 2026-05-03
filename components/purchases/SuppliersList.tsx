import type { ColumnDef } from '@tanstack/react-table';
import type React from 'react';
import { useMemo, useState } from 'react';
import type { Supplier } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { idGenerator } from '../../utils/idGenerator';
import { useData } from '../../context/DataContext';
import { permissionsService } from '../../services/auth/permissionsService';
import { useContextMenu } from '../common/ContextMenu';
import { Modal } from '../common/Modal';
import { SearchInput } from '../common/SearchInput';
import { SegmentedControl } from '../common/SegmentedControl';
import {
  isValidEmail,
  isValidPhone,
  SmartEmailInput,
  SmartPhoneInput,
  useSmartDirection,
} from '../common/SmartInputs';
import { LocationSelector } from '../common/LocationSelector';
import { TanStackTable } from '../common/TanStackTable';
import { GOVERNORATES, CITIES, AREAS } from '../../data/locations';
import { PageHeader } from '../common/PageHeader';
import { type FilterConfig } from '../common/FilterPill';

interface SuppliersListProps {
  suppliers: Supplier[];
  setSuppliers: (suppliers: Supplier[]) => void;
  onAddSupplier: (supplier: Supplier) => Promise<void>;
  onUpdateSupplier: (supplier: Supplier) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
  color: string;
  t: any;
  language: 'EN' | 'AR';
}

const ListWrapper: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex flex-col gap-0.5 ${className}`}>{children}</div>
);

const ListItem: React.FC<{
  index: number;
  total: number;
  children: React.ReactNode;
  className?: string;
}> = ({ index, total, children, className = '' }) => {
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const rounding = isFirst && isLast ? 'rounded-2xl' : isFirst ? 'rounded-t-2xl rounded-b-md' : isLast ? 'rounded-b-2xl rounded-t-md' : 'rounded-md';
  return (
    <div
      className={`flex items-center justify-between py-2 px-4 bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 transition-all ${rounding} ${className}`}
    >
      {children}
    </div>
  );
};

export const SuppliersList: React.FC<SuppliersListProps> = ({
  suppliers,
  setSuppliers,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  color,
  t,
  language,
}) => {
  const { showMenu } = useContextMenu();
  const { activeBranchId } = useData();
  const [search, setSearch] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});

  // Mode and state
  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [viewingSupplier, setViewingSupplier] = useState<Supplier | null>(null);
  const [detailsTab, setDetailsTab] = useState<'info' | 'contact'>('info');
  const [deleteConfirm, setDeleteConfirm] = useState<Supplier | null>(null);
  const [editForm, setEditForm] = useState<Supplier>({
    id: '',
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    status: 'active',
    branchId: activeBranchId || '',
  });

  const nameDir = useSmartDirection(
    editForm.name,
    t.form?.enterCompanyName || 'Enter company name'
  );
  const addressDir = useSmartDirection(
    editForm.address,
    t.form?.enterAddress || 'Enter company address'
  );
  const contactPersonDir = useSmartDirection(
    editForm.contactPerson,
    t.form?.enterContactPerson || 'Enter contact person name'
  );

  const governorateFilterConfig = useMemo<FilterConfig>(() => ({
    id: 'governorate',
    label: language === 'AR' ? 'المحافظة' : 'Governorate',
    icon: 'location_on',
    mode: 'multiple',
    options: GOVERNORATES.map(gov => ({
      label: language === 'AR' ? gov.name_ar : gov.name_en,
      value: gov.name_en,
    })),
  }), [language]);

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

  const handleSaveEdit = async () => {
    if (!editForm.name) {
      alert(t.errors?.nameRequired || 'Name is required');
      return;
    }
    
    setIsSaving(true);
    try {
      await onUpdateSupplier(editForm);
      setEditingSupplier(null);
    } catch (error) {
      console.error('Error updating supplier:', error);
      alert(language === 'AR' ? 'حدث خطأ أثناء تحديث المورد' : 'Error updating supplier');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (supplier: Supplier) => {
    setDeleteConfirm(supplier);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      onDeleteSupplier(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleAddNew = () => {
    if (!permissionsService.can('supplier.add')) return;
    
    setMode('add');
    setEditForm({
      id: '', // Service will handle ID generation
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      status: 'active',
      branchId: activeBranchId || '',
    });
  };

  const handleSaveNew = async () => {
    if (!editForm.name) {
      alert(t.errors?.nameRequired || 'Name is required');
      return;
    }
    if (editForm.email && !editForm.email.includes('@')) {
      alert(t.errors?.invalidEmail || 'Invalid email address');
      return;
    }
    
    setIsSaving(true);
    try {
      // Remove empty ID so service can generate a real one
      const { id, ...supplierData } = editForm;
      await onAddSupplier(supplierData as any);
      setMode('list');
    } catch (error) {
      console.error('Error saving supplier:', error);
      alert(language === 'AR' ? 'حدث خطأ أثناء حفظ المورد' : 'Error saving supplier');
    } finally {
      setIsSaving(false);
    }
  };

  // Helper: Get row context menu actions
  const getRowActions = (supplier: Supplier) => [
    {
      label: t.contextMenu?.viewDetails || 'View Details',
      icon: 'visibility',
      action: () => handleViewDetails(supplier),
    },
    ...(permissionsService.can('supplier.update') ? [{ label: t.contextMenu?.edit || 'Edit', icon: 'edit', action: () => handleEdit(supplier) }] : []),
    ...(permissionsService.can('supplier.delete') ? [{
      label: t.contextMenu?.delete || 'Delete',
      icon: 'delete',
      action: () => handleDelete(supplier),
    }] : []),
    { separator: true },
    {
      label: t.contextMenu?.copyName || 'Copy Name',
      icon: 'content_copy',
      action: () => copyToClipboard(supplier.name),
    },
    {
      label: t.contextMenu?.copyPhone || 'Copy Phone',
      icon: 'phone',
      action: () => copyToClipboard(supplier.phone),
    },
    {
      label: t.contextMenu?.copyEmail || 'Copy Email',
      icon: 'email',
      action: () => copyToClipboard(supplier.email),
    },
  ];

  // Table columns definition
  const columns = useMemo<ColumnDef<Supplier>[]>(
    () => [
      {
        accessorKey: 'supplierCode',
        header: t.headers?.id || 'ID',
        size: 100,
        meta: { align: 'start' },
        cell: ({ row }) => (
          <span className='text-xs font-mono text-gray-500 dark:text-gray-400'>
            {row.original.supplierCode || row.original.id.slice(0, 8)}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: t.headers?.name || 'Name',
        size: 200,
        meta: { align: 'start' },
        cell: ({ getValue }) => (
          <span className='text-sm font-bold text-gray-800 dark:text-gray-100 truncate'>
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'contactPerson',
        header: t.headers?.contactPerson || 'Contact Person',
        size: 180,
        meta: { align: 'start' },
        cell: ({ getValue }) => (
          <span className='text-sm text-gray-700 dark:text-gray-300 truncate'>
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'phone',
        header: t.headers?.phone || 'Phone',
        size: 140,
        meta: { align: 'start', dir: 'ltr' },
        cell: ({ getValue }) => (
          <span className='text-sm font-mono text-gray-600 dark:text-gray-400 truncate' dir='ltr'>
            {getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'email',
        header: t.headers?.email || 'Email',
        size: 200,
        meta: { align: 'start' },
        cell: ({ getValue }) => (
          <span className='text-sm text-gray-600 dark:text-gray-400 truncate'>
            {getValue() as string}
          </span>
        ),
      },
      {
        id: 'governorate_display',
        accessorKey: 'governorate',
        header: t.headers?.governorate || 'Governorate',
        size: 150,
        meta: { align: 'start', smartDate: false },
        cell: ({ row }) => {
          const id = row.original.governorate;
          const gov = GOVERNORATES.find(g => g.id === id);
          return (
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              {gov ? (language === 'AR' ? gov.name_ar : gov.name_en) : (id || '-')}
            </span>
          );
        },
      },
      {
        accessorKey: 'address',
        header: t.headers?.address || 'Address',
        size: 250,
        meta: { align: 'start' },
        cell: ({ row, column }) => {
          const s = row.original;
          const city = CITIES.find(c => c.id === s.city);
          const area = AREAS.find(a => a.id === s.area);
          
          const cityName = city ? (language === 'AR' ? city.name_ar : city.name_en) : '';
          const areaName = area ? (language === 'AR' ? area.name_ar : area.name_en) : '';

          const locationLine = [cityName, areaName].filter(Boolean).join(', ');
          const align = column.columnDef.meta?.align || 'start';
          
          return (
            <div className={`flex flex-col py-1 overflow-hidden items-${align}`}>
              <span className='text-sm font-medium text-gray-700 dark:text-gray-200 truncate'>
                {locationLine || '-'}
              </span>
              {s.address && (
                <span className='text-xs text-gray-500 dark:text-gray-400 truncate opacity-80' title={s.address}>
                  {s.address}
                </span>
              )}
            </div>
          );
        },
      },
    ],
    [t, getRowActions]
  ); // getRowActions is stable component reference but we just in case include it

  return (
    <div className='h-full flex flex-col space-y-4 animate-fade-in overflow-hidden'>
      <PageHeader
        leftContent={
          mode === 'list' ? (
            <div className="w-full max-w-md">
              <SearchInput
                value={search}
                onSearchChange={setSearch}
                placeholder={t.searchPlaceholder || 'Search supplier name, contact...'}
                color={color}
                filterConfigs={[governorateFilterConfig]}
                activeFilters={activeFilters}
                onUpdateFilter={(id, vals) => setActiveFilters(prev => ({ ...prev, [id]: vals }))}
              />
            </div>
          ) : null
        }
        centerContent={
          <SegmentedControl
            value={mode}
            onChange={(val) => {
              if (val === 'list') setMode('list');
              else if (val === 'add') handleAddNew();
            }}
            shape='pill'
            size='md'
            iconSize="--icon-lg"
            useGraphicFont={true}
            options={[
              { label: t.allSuppliers || 'All Suppliers', value: 'list', icon: 'group', permission: 'supplier.view' },
              { label: t.addNewSupplier || 'Add New Supplier', value: 'add', icon: 'person_add', permission: 'supplier.add' },
            ]}
            className="w-full sm:w-[480px]"
          />
        }
      />

      {mode === 'list' ? (
        <>
          <div className={`flex-1 overflow-hidden ${CARD_BASE} rounded-xl p-0 flex flex-col`}>
            <TanStackTable
              data={suppliers}
              columns={columns}
              tableId='suppliers_list'
              globalFilter={search}
              onSearchChange={setSearch}
              enableTopToolbar={false}
              searchPlaceholder={t.searchPlaceholder || 'Search supplier name, contact...'}
              onRowClick={(row) => handleViewDetails(row as Supplier)}
              onRowContextMenu={(e, row) => showMenu(e.clientX, e.clientY, getRowActions(row as Supplier))}
              color={color}
              enablePagination={true}
              enableVirtualization={false}
              pageSize='auto'
              enableShowAll={true}
              filterableColumns={[governorateFilterConfig]}
              initialFilters={activeFilters}
              onFilterChange={setActiveFilters}
            />
          </div>
        </>
      ) : (
        /* ADD SUPPLIER FORM VIEW - INLINE */
        <div className='flex-1 overflow-y-auto'>
          <div className='max-w-full mx-auto pb-20 space-y-6'>
            <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 items-start'>
              {/* Company Information Card */}
              <div className={`${CARD_BASE} rounded-xl p-6`}>
                <h3 className='text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4'>
                  <span className='material-symbols-rounded text-[18px]'>business</span>
                  {t.form?.companyInfo || 'Company Information'}
                </h3>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      {t.form?.id || 'ID'}
                    </label>
                    <div className='w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 font-mono text-sm'>
                      {editForm.supplierCode || (language === 'AR' ? 'توليد تلقائي...' : 'Auto-generated...')}
                    </div>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      {t.form?.companyName || 'Company Name'}{' '}
                      <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='text'
                      required
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className='w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-hidden transition-all'
                      style={{ '--tw-ring-color': 'var(--color-primary-500)' } as any}
                      placeholder={t.form?.enterCompanyName || 'Enter company name'}
                      dir={nameDir}
                    />
                  </div>
                  <div className='col-span-2'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t.form?.location || 'Location'}
                  </label>
                  <LocationSelector
                    language={language}
                    selectedGovernorate={editForm.governorate}
                    selectedCity={editForm.city}
                    selectedArea={editForm.area}
                    onGovernorateChange={(val) => setEditForm(prev => ({ ...prev, governorate: val }))}
                    onCityChange={(val) => setEditForm(prev => ({ ...prev, city: val }))}
                    onAreaChange={(val) => setEditForm(prev => ({ ...prev, area: val }))}
                    t={t}
                    color={color}
                    showLabels={false}
                  />
                </div>
                  <div className="col-span-2">
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      {t.form?.address || 'Street Address'}
                    </label>
                    <textarea
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      rows={2}
                      className='w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-hidden transition-all resize-none'
                      style={{ '--tw-ring-color': 'var(--color-primary-500)' } as any}
                      placeholder={t.form?.enterAddress || 'Enter street address'}
                      dir={addressDir}
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information Card */}
              <div className={`${CARD_BASE} rounded-xl p-6`}>
                <h3 className='text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4'>
                  <span className='material-symbols-rounded text-[18px]'>person</span>
                  {t.form?.contactInfo || 'Contact Information'}
                </h3>
                <div className='space-y-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      {t.form?.contactPerson || 'Contact Person'}{' '}
                      <span className='text-red-500'>*</span>
                    </label>
                    <input
                      type='text'
                      required
                      value={editForm.contactPerson}
                      onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                      className='w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-hidden transition-all'
                      style={{ '--tw-ring-color': 'var(--color-primary-500)' } as any}
                      placeholder={t.form?.enterContactPerson || 'Enter contact person name'}
                      dir={contactPersonDir}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      {t.form?.phone || 'Phone'} <span className='text-red-500'>*</span>
                    </label>
                    <SmartPhoneInput
                      required
                      value={editForm.phone}
                      onChange={(val) => setEditForm({ ...editForm, phone: val })}
                      className='w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-hidden transition-all'
                      style={{ '--tw-ring-color': 'var(--color-primary-500)' } as any}
                      placeholder={t.form?.phonePlaceholder || '+1234567890'}
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                      {t.form?.email || 'Email'} <span className='text-red-500'>*</span>
                    </label>
                    <SmartEmailInput
                      required
                      value={editForm.email}
                      onChange={(val) => setEditForm({ ...editForm, email: val })}
                      className='w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-hidden transition-all'
                      style={{ '--tw-ring-color': 'var(--color-primary-500)' } as any}
                      placeholder={t.form?.emailPlaceholder || 'email@example.com'}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className='mt-6 flex gap-3 justify-end'>
              <button
                type='button'
                onClick={() => setMode('list')}
                className='px-6 py-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm font-medium'
              >
                {t.modal?.cancel || 'Cancel'}
              </button>
              <button
                onClick={handleSaveNew}
                disabled={isSaving}
                className='py-3 px-6 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all shadow-lg shadow-primary-600/20 flex items-center justify-center space-x-2 rtl:space-x-reverse'
              >
                {isSaving ? (
                  <>
                    <span className='w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                    <span>{language === 'AR' ? 'جاري الحفظ...' : 'Saving...'}</span>
                  </>
                ) : (
                  <span>{t.modal?.addSupplier || 'Add Supplier'}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingSupplier && (
        <Modal
          isOpen={true}
          onClose={() => setEditingSupplier(null)}
          size='2xl'
          zIndex={50}
          title={t.modal?.edit || 'Edit Supplier'}
          icon='edit'
          subtitle={t.modal?.editSubtitle || 'Update supplier information'}
        >
          {/* Form */}
          <div className='space-y-6'>
            {/* ID Field */}
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                {t.form?.id || 'ID'}
              </label>
              <div className='w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500 font-mono text-sm'>
                {editForm.supplierCode || editForm.id}
              </div>
            </div>

            {/* Basic Information Section */}
            <div className='mb-6'>
              <h4 className='text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                <span className='material-symbols-rounded text-[18px]'>business</span>
                {t.form?.companyInfo || 'Company Information'}
              </h4>
              <div className='space-y-4'>
                <div className='col-span-2'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t.form?.location || 'Location'}
                  </label>
                  <LocationSelector
                    language={language}
                    selectedGovernorate={editForm?.governorate}
                    selectedCity={editForm?.city}
                    selectedArea={editForm?.area}
                    onGovernorateChange={(val) => setEditForm(prev => prev ? ({ ...prev, governorate: val }) : null)}
                    onCityChange={(val) => setEditForm(prev => prev ? ({ ...prev, city: val }) : null)}
                    onAreaChange={(val) => setEditForm(prev => prev ? ({ ...prev, area: val }) : null)}
                    t={t}
                    color={color}
                    showLabels={false}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t.form?.companyName || 'Company Name'} <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className='w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-hidden transition-all'
                    style={{ '--tw-ring-color': 'var(--color-primary-500)' } as any}
                    placeholder={t.form?.enterCompanyName || 'Enter company name'}
                    dir={nameDir}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t.form?.address || 'Street Address'}
                  </label>
                  <textarea
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    rows={2}
                    className='w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-hidden transition-all resize-none'
                    style={{ '--tw-ring-color': 'var(--color-primary-500)' } as any}
                    placeholder={t.form?.enterAddress || 'Enter street address'}
                    dir={addressDir}
                  />
                </div>
              </div>
            </div>

            {/* Contact Information Section */}
            <div>
              <h4 className='text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2'>
                <span className='material-symbols-rounded text-[18px]'>person</span>
                {t.form?.contactInfo || 'Contact Information'}
              </h4>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t.form?.contactPerson || 'Contact Person'}{' '}
                    <span className='text-red-500'>*</span>
                  </label>
                  <input
                    type='text'
                    value={editForm.contactPerson}
                    onChange={(e) => setEditForm({ ...editForm, contactPerson: e.target.value })}
                    className='w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-hidden transition-all'
                    style={{ '--tw-ring-color': 'var(--color-primary-500)' } as any}
                    placeholder={t.form?.enterContactPerson || 'Enter contact person name'}
                    dir={contactPersonDir}
                  />
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t.form?.phone || 'Phone'} <span className='text-red-500'>*</span>
                  </label>
                  <SmartPhoneInput
                    value={editForm.phone}
                    onChange={(val) => setEditForm({ ...editForm, phone: val })}
                    className='w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-hidden transition-all'
                    style={{ '--tw-ring-color': 'var(--color-primary-500)' } as any}
                    placeholder={t.form?.phonePlaceholder || '+1234567890'}
                  />
                </div>
                <div className='md:col-span-2'>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t.form?.email || 'Email'} <span className='text-red-500'>*</span>
                  </label>
                  <SmartEmailInput
                    value={editForm.email}
                    onChange={(val) => setEditForm({ ...editForm, email: val })}
                    className='w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 outline-hidden transition-all'
                    style={{ '--tw-ring-color': 'var(--color-primary-500)' } as any}
                    placeholder={t.form?.emailPlaceholder || 'email@example.com'}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className='p-4 border-t border-gray-100 dark:border-gray-800 flex gap-3 justify-end'>
            <button
              onClick={() => setEditingSupplier(null)}
              className='px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
            >
              {t.modal?.cancel || 'Cancel'}
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={isSaving}
              className={`px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center justify-center gap-2 min-w-[120px] disabled:opacity-50`}
            >
              {isSaving ? (
                <>
                  <span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  <span>{language === 'AR' ? 'جاري الحفظ...' : 'Saving...'}</span>
                </>
              ) : (
                <span>{t.modal?.saveChanges || 'Save Changes'}</span>
              )}
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirm(null)}
          size='md'
          zIndex={50}
          title={t.modal?.delete || 'Delete Supplier'}
          icon='warning'
          subtitle={t.modal?.deleteSubtitle || 'This action cannot be undone'}
        >
          <div className='space-y-4'>
            <p className='text-gray-700 dark:text-gray-300 mb-6'>
              {t.modal?.confirmDelete || 'Are you sure you want to delete'}{' '}
              <strong>{deleteConfirm.name}</strong>?
            </p>
            <div className='flex gap-3 justify-end'>
              <button
                onClick={() => setDeleteConfirm(null)}
                className='px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'
              >
                {t.modal?.cancel || 'Cancel'}
              </button>
              <button
                onClick={confirmDelete}
                className='px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors'
              >
                {t.modal?.deleteBtn || 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Details View Modal */}
      {(() => {
        if (!viewingSupplier) return null;

        // Rule 2: Smart Memoization - Pre-calculate display values outside JSX
        const locationNames = {
          governorate: (() => {
            const gov = GOVERNORATES.find(g => g.id === viewingSupplier.governorate);
            return gov ? (language === 'AR' ? gov.name_ar : gov.name_en) : (viewingSupplier.governorate || '-');
          })(),
          city: (() => {
            const city = CITIES.find(c => c.id === viewingSupplier.city);
            return city ? (language === 'AR' ? city.name_ar : city.name_en) : (viewingSupplier.city || '-');
          })(),
          area: (() => {
            const area = AREAS.find(a => a.id === viewingSupplier.area);
            return area ? (language === 'AR' ? area.name_ar : area.name_en) : (viewingSupplier.area || '-');
          })()
        };

        // Rule 7: Config-Driven UI - Define data structures as configs
        const infoItems = [
          { label: t.form?.id || 'ID', icon: 'tag', value: <span className='font-mono'>{viewingSupplier.supplierCode || viewingSupplier.id}</span> },
          { label: t.form?.companyName || 'Company Name', icon: 'business', value: <span className='font-bold'>{viewingSupplier.name}</span> },
          { label: t.headers?.governorate || 'Governorate', icon: 'map', value: locationNames.governorate },
          { label: t.headers?.city || 'City', icon: 'location_city', value: locationNames.city },
          { label: t.headers?.area || 'Area', icon: 'near_me', value: locationNames.area }
        ];

        const contactItems = [
          { label: t.form?.contactPerson || 'Contact Person', icon: 'person', value: viewingSupplier.contactPerson },
          { label: t.form?.phone || 'Phone', icon: 'call', value: <span dir='ltr' className='font-mono'>{viewingSupplier.phone}</span> },
          { label: t.form?.email || 'Email', icon: 'mail', value: viewingSupplier.email }
        ];

        const activeItems = detailsTab === 'info' ? infoItems : contactItems;

        return (
          <Modal
            isOpen={true}
            onClose={() => setViewingSupplier(null)}
            size='lg'
            title={t.modal?.details || 'Supplier Details'}
            icon='visibility'
            tabs={[
              { label: t.form?.companyInfo || 'Information', value: 'info', icon: 'business' },
              { label: t.form?.contactInfo || 'Contact', value: 'contact', icon: 'person' },
            ]}
            activeTab={detailsTab}
            onTabChange={setDetailsTab}
            footer={
              <div className='flex gap-3 w-full'>
                <button
                  onClick={() => setViewingSupplier(null)}
                  className='flex-1 py-3 rounded-full font-bold bg-transparent text-gray-500 dark:text-gray-400 border border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-all flex items-center justify-center gap-2 outline-hidden'
                >
                  <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-base)' }}>close</span>
                  {t.suppliers?.modal?.close || t.global?.actions?.close || (language === 'AR' ? 'إغلاق' : 'Close')}
                </button>
                <button
                  onClick={() => {
                    const s = viewingSupplier;
                    setViewingSupplier(null);
                    handleEdit(s);
                  }}
                  className='flex-1 py-3 rounded-full font-bold bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 outline-hidden'
                >
                  <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-base)' }}>edit</span>
                  {t.suppliers?.modal?.edit?.split(' ')[0] || t.global?.actions?.edit || (language === 'AR' ? 'تعديل' : 'Edit')}
                </button>
              </div>
            }
          >
            <div className='animate-fade-in space-y-6'>
              <div>
                <p className='text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 px-1 tracking-widest'>
                  {detailsTab === 'info' ? (t.form?.companyInfo || 'Company Information') : (t.form?.contactInfo || 'Contact Information')}
                </p>
                <ListWrapper>
                  {activeItems.map((item, i, arr) => (
                    <ListItem key={i} index={i} total={arr.length}>
                      <div className='flex items-center gap-2 shrink-0'>
                        {/* Rule 9: Precise Icon Styling */}
                        <span 
                          className='material-symbols-rounded opacity-40'
                          style={{ fontSize: 'var(--icon-base)', lineHeight: 1 }}
                        >
                          {item.icon}
                        </span>
                        <span className='text-[9px] font-bold uppercase tracking-wider opacity-50'>{item.label}</span>
                      </div>
                      <div className='text-[12px] font-bold text-right pl-2'>{item.value}</div>
                    </ListItem>
                  ))}
                </ListWrapper>
              </div>

              {detailsTab === 'info' && viewingSupplier.address && (
                <div>
                  <p className='text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase mb-2 px-1 tracking-widest'>{t.form?.address || 'Detailed Address'}</p>
                  <div className='p-4 bg-gray-50/50 dark:bg-white/[0.03] border border-gray-100 dark:border-white/5 rounded-2xl'>
                    <p className='text-sm text-gray-700 dark:text-gray-200 leading-relaxed'>
                      {viewingSupplier.address}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        );
      })()}
    </div>
  );
};
