import type React from 'react';
import { useMemo, useState } from 'react';
import type { Supplier } from '../../types';
import { usePosSounds } from '../common/hooks/usePosSounds';
import { Modal } from '../common/Modal';
import { SearchInput } from '../common/SearchInput';

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
  t: any;
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
    >
      <div className='flex flex-col gap-4 max-h-[70vh]'>
        {/* Search bar inside modal */}
        <div className='relative'>
          <SearchInput
            value={search}
            onSearchChange={setSearch}
            placeholder={trans.searchPlaceholder}
            color={color}
            rounded='full'
            className='h-10 text-sm'
          />
        </div>

        {/* Supplier List */}
        <div className='flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scrollbar min-h-[300px]'>
          {filteredSuppliers.length === 0 ? (
            <div className='flex flex-col items-center justify-center py-12 text-zinc-400'>
              <span className='material-symbols-rounded text-5xl mb-2'>storefront</span>
              <p className='text-sm'>{trans.noResults}</p>
            </div>
          ) : (
            <div className='flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-xl divide-y divide-zinc-200 dark:divide-zinc-800 overflow-hidden'>
              {filteredSuppliers.map((supplier) => {
                const isSelected = selectedSupplierId === supplier.id;
                return (
                  <div
                    key={supplier.id}
                    onClick={() => {
                      onSelectSupplier(supplier);
                      try {
                        playBeep();
                      } catch (_e) {}
                      onClose();
                      setSearch('');
                    }}
                    className={`p-3.5 flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-950 dark:text-white'
                        : 'bg-white dark:bg-neutral-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className='flex items-center gap-3 min-w-0 flex-1'>
                      {/* Circle badge with code */}
                      <div className='w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shrink-0'>
                        <span className='material-symbols-rounded text-lg text-zinc-500 dark:text-zinc-400'>
                          store
                        </span>
                      </div>
                      <div className='min-w-0 flex flex-1 items-center gap-x-4 gap-y-1 flex-wrap'>
                        <div className='flex items-center gap-2 shrink-0'>
                          <span className='font-bold text-sm truncate'>{supplier.name}</span>
                          <span className='badge-neutral'>
                            {supplier.supplierCode || supplier.id.slice(0, 8)}
                          </span>
                        </div>
                        {(supplier.contactPerson || supplier.phone) && (
                          <div className='flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400'>
                            {supplier.contactPerson && (
                              <span className='flex items-center gap-1'>
                                <span className='material-symbols-rounded text-[14px]'>person</span>
                                {supplier.contactPerson}
                              </span>
                            )}
                            {supplier.phone && (
                              <span className='flex items-center gap-1' dir='ltr'>
                                <span className='material-symbols-rounded text-[14px]'>call</span>
                                {supplier.phone}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className='flex items-center gap-2 shrink-0 pe-2'>
                      {isSelected ? (
                        <span className='material-symbols-rounded text-zinc-900 dark:text-white'>
                          check_circle
                        </span>
                      ) : (
                        <span className='text-xs font-bold text-zinc-500 dark:text-zinc-400'>
                          {trans.select}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
