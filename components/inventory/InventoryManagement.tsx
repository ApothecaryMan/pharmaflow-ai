import type { ColumnDef } from '@tanstack/react-table';
import type React from 'react';
import { useMemo } from 'react';
import type { Drug } from '../../types';
import { TanStackTable } from '../common/TanStackTable';

interface InventoryManagementProps {
  inventory: Drug[];
  color: string;
  t: any;
  language: string;
  darkMode?: boolean;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  inventory,
  color,
  t,
  language,
}) => {
  const columns = useMemo<ColumnDef<Drug>[]>(
    () => [
      {
        accessorKey: 'barcode',
        header: t.barcode || 'Barcode',
        meta: { width: 180, dir: 'ltr' },
        cell: (info) => (
          <span className='font-mono text-gray-600 dark:text-gray-400'>
            {info.getValue() as string}
          </span>
        ),
      },
      {
        accessorKey: 'name',
        header: t.productName || 'Product Name',
        meta: { width: 250 },
        cell: (info) => {
          const item = info.row.original;
          return (
            <div className='flex flex-col'>
              <span className='font-bold'>{item.name}</span>
              <span className='text-xs text-gray-500'>
                {Array.isArray(item.genericName) ? item.genericName.join(' + ') : item.genericName}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'category',
        header: t.category || 'Category',
        meta: { width: 150 },
      },
      {
        accessorKey: 'stock',
        header: t.stock || 'Stock',
        meta: { width: 100, align: 'center' },
        cell: (info) => {
          const stock = info.getValue() as number;
          return (
            <span className={`font-bold ${stock < 10 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
              {stock}
            </span>
          );
        },
      },
      {
        accessorKey: 'price',
        header: t.price || 'Price',
        meta: { width: 100, align: 'end' },
        cell: (info) => `${(info.getValue() as number).toFixed(2)}`,
      },
      {
        id: 'status',
        header: 'Status',
        meta: { width: 120, align: 'center' },
        cell: (info) => {
          const stock = info.row.original.stock;
          if (stock === 0)
            return (
              <span className='inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-400 text-xs font-bold uppercase tracking-wider bg-transparent'>
                <span className='material-symbols-rounded text-sm'>cancel</span>
                Out of Stock
              </span>
            );
          if (stock < 10)
            return (
              <span className='inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider bg-transparent'>
                <span className='material-symbols-rounded text-sm'>warning</span>
                Low Stock
              </span>
            );
          return (
            <span className='inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider bg-transparent'>
              <span className='material-symbols-rounded text-sm'>check_circle</span>
              In Stock
            </span>
          );
        },
      },
    ],
    [t]
  );

  return (
    <div className='flex flex-col h-full animate-fade-in gap-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 page-title'>
            {language === 'AR' ? 'المخزون المتطور' : 'Advanced Inventory'}
          </h1>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
            {language === 'AR' ? 'عرض متقدم باستخدام جداول متطورة' : 'Advanced view with enhanced data tables'}
          </p>
        </div>
      </div>

      <TanStackTable
        data={inventory}
        columns={columns}
        tableId='inventory_management_table'
        color={color}
        searchPlaceholder={language === 'AR' ? 'بحث في المخزون...' : 'Search inventory...'}
      />
    </div>
  );
};
