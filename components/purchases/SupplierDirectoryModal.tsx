import type React from 'react';
import { useMemo, useState } from 'react';
import type { Supplier } from '../../types';
import { Modal } from '../common';
import { usePosSounds } from '../common/hooks/usePosSounds';

// ==========================================
// Localized Translation Dictionaries (EN/AR)
// ==========================================
const getTranslations = (language: 'EN' | 'AR', t: any) => ({
  title: t.suppliers?.title || (language === 'AR' ? 'دليل الموردين' : 'Suppliers Directory'),
  searchPlaceholder:
    t.purchases?.placeholders?.searchSupplier ||
    (language === 'AR' ? 'ابحث عن مورد...' : 'Search supplier...'),
  noResults: t.purchases?.noResults || (language === 'AR' ? 'لا يوجد نتائج' : 'No results found'),
  select: language === 'AR' ? 'تحديد' : 'Select',
});

interface SupplierDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  suppliers: Supplier[];
  selectedSupplierId: string;
  onSelectSupplier: (supplier: Supplier) => void;
  language: 'EN' | 'AR';
  t: Translations;
  color?: string;
}

export const SupplierDirectoryModal: React.FC<SupplierDirectoryModalProps> = ({
  isOpen,
  onClose,
  suppliers,
  selectedSupplierId,
  onSelectSupplier,
  language,
  t,
  color = 'primary',
}) => {
  const [search, setSearch] = useState('');
  const { playBeep } = usePosSounds();

  // Gather translation codes dynamically at the top of the component logic
  const trans = useMemo(() => getTranslations(language, t), [language, t]);

  const filteredSuppliers = useMemo(() => {
    if (!search.trim()) return suppliers;
    const q = search.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.supplierCode?.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.phone?.includes(q) ||
        s.contactPerson?.toLowerCase().includes(q)
    );
  }, [suppliers, search]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        setSearch('');
      }}
      title={trans.title}
      size='2xl'
      icon='store'
      bodyClassName='p-0'
      searchable
      searchValue={search}
      onSearchChange={setSearch}
      searchPlaceholder={trans.searchPlaceholder}
    >
      <div className='flex flex-col'>
        <div className='overflow-y-auto min-h-[400px]'>
          {filteredSuppliers.length === 0 ? (
            <div className='p-6 text-center text-sm text-gray-400'>{trans.noResults}</div>
          ) : (
            filteredSuppliers.map((supplier) => (
              <button
                key={supplier.id}
                onClick={() => {
                  onSelectSupplier(supplier);
                  try {
                    playBeep();
                  } catch (_e) {}
                  onClose();
                  setSearch('');
                }}
                className='w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors text-start border-b border-gray-100 dark:border-gray-800 last:border-0'
              >
                <div className='h-9 min-w-9 px-1.5 rounded-lg bg-primary-100 dark:bg-primary-700 flex items-center justify-center text-primary-600 dark:text-primary-100 shrink-0'>
                  <span className='text-xl font-mono font-bold'>
                    {supplier.supplierCode || supplier.id.slice(0, 8)}
                  </span>
                </div>
                <div className='flex-1 min-w-0'>
                  <span className='font-bold text-base text-gray-900 dark:text-gray-100 truncate block'>
                    {supplier.name}
                  </span>
                </div>
                <span className='material-symbols-rounded text-gray-300 text-lg'>
                  {language === 'AR' ? 'chevron_left' : 'chevron_right'}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
};
