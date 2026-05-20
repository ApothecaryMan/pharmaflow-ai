import React from 'react';
import type { Table } from '@tanstack/react-table';
import {
  ContextMenuCheckboxItem,
  ContextMenuSeparator,
} from '../ContextMenu';
import { AlignButton } from '../TableAlignment';

export interface TableContextMenuProps {
  table: Table<any>;
  columnId?: string;
  columnAlignment: Record<string, 'start' | 'center' | 'end'>;
  setColumnAlignment: React.Dispatch<
    React.SetStateAction<Record<string, 'start' | 'center' | 'end'>>
  >;
  language: string;
  translations: {
    columns: string;
    alignment: string;
  };
  onRefresh: (overrideAlign?: Record<string, 'start' | 'center' | 'end'>) => void;
}

export const TableContextMenu: React.FC<TableContextMenuProps> = ({
  table,
  columnId,
  columnAlignment,
  setColumnAlignment,
  language,
  translations,
  onRefresh,
}) => {
  const column = columnId ? table.getColumn(columnId) : null;
  const currentAlign = columnId ? columnAlignment[columnId] || 'start' : 'start';

  const handleAlign = (align: 'start' | 'center' | 'end') => {
    if (!columnId) return;
    const newAlign = { ...columnAlignment, [columnId]: align };
    setColumnAlignment(newAlign);
    onRefresh(newAlign);
  };

  return (
    <div className='font-sans'>
      {/* All Columns Visibility */}
      <div className='space-y-1'>
        <div className='text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase py-2 px-3 border-b border-gray-100 dark:border-(--border-divider) mb-1'>
          {translations.columns}
        </div>
        {table
          .getAllLeafColumns()
          .filter(
            (col) => col.id !== 'actions' && !(col.columnDef.meta as any)?.hideFromSettings
          )
          .map((col) => {
            const headerValue =
              typeof col.columnDef.header === 'function' ? col.id : col.columnDef.header;

            return (
              <ContextMenuCheckboxItem
                key={col.id}
                label={headerValue as React.ReactNode}
                checked={col.getIsVisible()}
                onCheckedChange={(val) => {
                  col.toggleVisibility(val);
                  // Force refresh menu state live
                  setTimeout(() => {
                    onRefresh();
                  }, 0);
                }}
              />
            );
          })}
      </div>

      {column && !column.columnDef.meta?.disableAlignment && column.id !== 'actions' && (
        <>
          <ContextMenuSeparator />

          {/* Alignment Controls Container */}
          <div className='px-3 py-3'>
            <div className='text-[10px] font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase mb-2.5 flex items-center gap-2'>
              <span
                className='material-symbols-rounded opacity-60'
                style={{ fontSize: 'var(--icon-sm)' }}
              >
                format_align_left
              </span>
              {translations.alignment}
            </div>
            {/* Unified Alignment */}
            <div className='bg-gray-50 dark:bg-gray-800/80 p-1.5 rounded-xl border border-gray-100 dark:border-(--border-divider) flex items-center justify-between gap-1'>
              <AlignButton
                align='start'
                isActive={currentAlign === 'start'}
                onClick={() => handleAlign('start')}
                isRtl={language === 'AR'}
              />
              <AlignButton
                align='center'
                isActive={currentAlign === 'center'}
                onClick={() => handleAlign('center')}
                isRtl={language === 'AR'}
              />
              <AlignButton
                align='end'
                isActive={currentAlign === 'end'}
                onClick={() => handleAlign('end')}
                isRtl={language === 'AR'}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
