import type React from 'react';
import { useMemo } from 'react';
import type { Drug } from '../../types';
import { Column, DataTable } from '../common/DataTable';

interface InventoryManagementProps {
  inventory: Drug[];
  color: string;
  t: any;
  darkMode?: boolean;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  inventory,
  color,
  t,
  darkMode,
}) => {
  // Define columns
  const columns = useMemo<any[]>(
    () => [
      {
        key: 'barcode',
        label: t.barcode || 'Barcode',
        defaultWidth: 250,
        render: (item: Drug) => (
          <span className='font-mono text-gray-600 dark:text-gray-400'>{item.barcode}</span>
        ),
      },
      {
        key: 'name',
        label: t.productName || 'Product Name',
        render: (item: Drug) => (
          <div className='flex flex-col'>
            <span className='font-bold'>{item.name}</span>
            <span className='text-xs text-gray-500'>{item.genericName}</span>
          </div>
        ),
      },
      {
        key: 'category',
        label: t.category || 'Category',
      },
      {
        key: 'stock',
        label: t.stock || 'Stock',
        render: (item: Drug) => (
          <span
            className={`font-bold ${item.stock < 10 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}
          >
            {item.stock}
          </span>
        ),
      },
      {
        key: 'price',
        label: t.price || 'Price',
        render: (item: Drug) => `$${item.price.toFixed(2)}`,
      },
      {
        key: 'status',
        label: 'Status',
        render: (item: Drug) => {
          const stock = item.stock;
          if (stock === 0)
            return (
              <span className='px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold'>
                Out of Stock
              </span>
            );
          if (stock < 10)
            return (
              <span className='px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold'>
                Low Stock
              </span>
            );
          return (
            <span className='px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold'>
              Instock
            </span>
          );
        },
      },
    ],
    [t]
  );

  return (
    <div className='flex flex-col h-full animate-fade-in p-6 gap-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-800 dark:text-gray-100'>
            Inventory Management (Beta)
          </h1>
          <p className='text-gray-500 text-sm'>Advanced view using TanStack Table</p>
        </div>
      </div>

      <DataTable
        storageKey='inventory_management_table'
        data={inventory}
        columns={columns}
        color={color}
        t={t}
        darkMode={darkMode}
      />
    </div>
  );
};
