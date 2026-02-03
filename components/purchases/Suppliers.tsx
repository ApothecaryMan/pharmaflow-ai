import type React from 'react';
import { useState } from 'react';
import { useStatusBar } from '../../components/layout/StatusBar';
import type { Supplier } from '../../types';
import { Modal } from '../common/Modal';
import { SearchInput } from '../common/SearchInput';
import { SmartEmailInput, useSmartDirection } from '../common/SmartInputs';

interface SuppliersProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  color: string;
  t: any;
}

export const Suppliers: React.FC<SuppliersProps> = ({
  suppliers,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  color,
  t,
}) => {
  const { getVerifiedDate } = useStatusBar();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<Partial<Supplier>>({});

  const nameDir = useSmartDirection(formData.name);
  const contactDir = useSmartDirection(formData.contactPerson);
  const addressDir = useSmartDirection(formData.address);

  const handleOpenAdd = () => {
    setEditingSupplier(null);
    setFormData({ name: '', contactPerson: '', phone: '', email: '', address: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({ ...supplier });
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSupplier) {
      onUpdateSupplier({ ...editingSupplier, ...formData } as Supplier);
    } else {
      const newSupplier: Supplier = {
        id: getVerifiedDate().getTime().toString(),
        ...(formData as Omit<Supplier, 'id'>),
      };
      onAddSupplier(newSupplier);
    }
    setIsModalOpen(false);
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className='h-full flex flex-col space-y-4 animate-fade-in'>
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div>
          <h2 className='text-2xl font-medium tracking-tight'>{t.title}</h2>
          <p className='text-sm text-gray-500 dark:text-gray-400'>{t.subtitle}</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-${color}-600 hover:bg-${color}-700 text-white font-medium text-sm transition-all shadow-lg shadow-${color}-200 dark:shadow-none active:scale-95`}
        >
          <span className='material-symbols-rounded text-lg'>add</span>
          {t.addSupplier}
        </button>
      </div>

      <div className='relative'>
        <SearchInput
          value={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder={t.searchPlaceholder}
          className='w-full ps-12 pe-4 py-3 rounded-full border-gray-200 dark:border-gray-800'
          style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
        />
      </div>

      <div className='flex-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm flex flex-col'>
        <div className='overflow-x-auto flex-1'>
          <table className='w-full text-start border-collapse'>
            <thead
              className={`bg-${color}-50 dark:bg-${color}-950/30 text-${color}-900 dark:text-${color}-100 uppercase text-xs font-bold tracking-wider`}
            >
              <tr>
                <th className='p-4 text-start'>{t.headers.name}</th>
                <th className='p-4 text-start'>{t.headers.contact}</th>
                <th className='p-4 text-start'>{t.headers.details}</th>
                <th className='p-4 text-end'>{t.headers.actions}</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
              {filteredSuppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  className='hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                >
                  <td className='p-4'>
                    <div className='font-bold text-gray-900 dark:text-gray-100 text-sm'>
                      {supplier.name}
                    </div>
                    <div className='text-xs text-gray-500'>{supplier.address}</div>
                  </td>
                  <td className='p-4 text-sm font-medium text-gray-700 dark:text-gray-300'>
                    {supplier.contactPerson}
                  </td>
                  <td className='p-4'>
                    <div className='flex flex-col gap-1'>
                      <a
                        href={`tel:${supplier.phone}`}
                        className='flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-${color}-600'
                      >
                        <span className='material-symbols-rounded text-[14px]'>call</span>{' '}
                        {supplier.phone}
                      </a>
                      <a
                        href={`mailto:${supplier.email}`}
                        className='flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-${color}-600'
                      >
                        <span className='material-symbols-rounded text-[14px]'>mail</span>{' '}
                        {supplier.email}
                      </a>
                    </div>
                  </td>
                  <td className='p-4 text-end space-x-2 rtl:space-x-reverse'>
                    <button
                      onClick={() => handleOpenEdit(supplier)}
                      className={`p-2 rounded-full hover:bg-${color}-50 dark:hover:bg-${color}-900/30 text-gray-400 hover:text-${color}-600 transition-colors`}
                    >
                      <span className='material-symbols-rounded text-[18px]'>edit</span>
                    </button>
                    <button
                      onClick={() => onDeleteSupplier(supplier.id)}
                      className='p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors'
                    >
                      <span className='material-symbols-rounded text-[18px]'>delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <Modal isOpen={true} onClose={() => setIsModalOpen(false)} size='lg' zIndex={50}>
          <div
            className={`p-5 bg-${color}-50 dark:bg-${color}-950/30 border-b border-${color}-100 dark:border-${color}-900 flex justify-between items-center`}
          >
            <h3 className={`text-lg font-semibold text-${color}-900 dark:text-${color}-100`}>
              {editingSupplier ? t.modal.edit : t.modal.add}
            </h3>
            <button
              onClick={() => setIsModalOpen(false)}
              className='w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors'
            >
              <span className='material-symbols-rounded'>close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className='p-5 space-y-4'>
            <div className='space-y-1'>
              <label className='text-xs font-bold text-gray-500 uppercase'>{t.modal.name}</label>
              <input
                required
                className='w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all'
                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                dir={nameDir}
              />
            </div>

            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-1'>
                <label className='text-xs font-bold text-gray-500 uppercase'>
                  {t.modal.contact}
                </label>
                <input
                  required
                  className='w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all'
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                  dir={contactDir}
                />
              </div>
              <div className='space-y-1'>
                <label className='text-xs font-bold text-gray-500 uppercase'>{t.modal.phone}</label>
                <input
                  className='w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all'
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-gray-500 uppercase'>{t.modal.email}</label>
              <SmartEmailInput
                className='w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all'
                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                value={formData.email || ''}
                onChange={(val) => setFormData({ ...formData, email: val })}
              />
            </div>

            <div className='space-y-1'>
              <label className='text-xs font-bold text-gray-500 uppercase'>{t.modal.address}</label>
              <textarea
                className='w-full p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all'
                rows={2}
                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                dir={addressDir}
              ></textarea>
            </div>

            <div className='pt-4 flex gap-3'>
              <button
                type='button'
                onClick={() => setIsModalOpen(false)}
                className='flex-1 py-3 rounded-full font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors'
              >
                {t.modal.cancel}
              </button>
              <button
                type='submit'
                className={`flex-1 py-3 rounded-full font-medium text-white bg-${color}-600 hover:bg-${color}-700 shadow-md transition-all active:scale-95`}
              >
                {t.modal.save}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
