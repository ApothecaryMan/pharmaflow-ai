import React, { useMemo } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Drug } from '../../types';
import { DataTable } from '../common/DataTable';

interface InventoryManagementProps {
  inventory: Drug[];
  color: string;
  t: any;
}

export const InventoryManagement: React.FC<InventoryManagementProps> = ({
  inventory,
  color,
  t
}) => {
  // Define columns
  const columns = useMemo<ColumnDef<Drug>[]>(
    () => [
      {
        accessorKey: 'barcode',
        header: t.barcode || 'Barcode', // Add translation fallback
        size: 250, // Much wider
        cell: info => <span className="font-mono text-gray-600 dark:text-gray-400">{info.getValue() as string}</span>
      },
      {
        accessorKey: 'name',
        header: t.productName || 'Product Name',
        cell: info => (
          <div className="flex flex-col">
            <span className="font-bold">{info.getValue() as string}</span>
            <span className="text-xs text-gray-500">{info.row.original.genericName}</span>
          </div>
        )
      },
      {
        accessorKey: 'category',
        header: t.category || 'Category',
      },
      {
        accessorKey: 'stock',
        header: t.stock || 'Stock',
        cell: info => {
          const val = info.getValue() as number;
          return (
            <span className={`font-bold ${val < 10 ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
              {val}
            </span>
          )
        }
      },
      {
        accessorKey: 'price',
        header: t.price || 'Price',
        cell: info => `$${(info.getValue() as number).toFixed(2)}`
      },
      {
        accessorKey: 'status',
        header: 'Status', // Add translation later
        cell: info => {
            const stock = info.row.original.stock;
            if (stock === 0) return <span className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-bold">Out of Stock</span>;
            if (stock < 10) return <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold">Low Stock</span>;
            return <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-bold">Instock</span>;
        }
      }
    ],
    [t]
  );

  return (
    <div className="flex flex-col h-full animate-fade-in p-6 gap-6">
      <div className="flex items-center justify-between">
         <div>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                Inventory Management (Beta)
            </h1>
            <p className="text-gray-500 text-sm">
                Advanced view using TanStack Table
            </p>
         </div>
      </div>
      
      <DataTable 
        storageKey="inventory_management_table"
        data={inventory} 
        columns={columns} 
        color={color} 
        t={t} 
      />
    </div>
  );
};
