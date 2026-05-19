import React from 'react';
import { flexRender } from '@tanstack/react-table';
import { getCellDirection, formatSmartDate, getColumnWidth } from './helpers';

interface MemoizedCellProps {
  cell: any;
  dense?: boolean;
  meta: any;
  isRtl: boolean;
  isAR: boolean;
  isPending: boolean;
  rowsCount: number;
  todayTs: number;
  yesterdayTs: number;
  columnSizing: any;
}

export const MemoizedCell = React.memo(({
  cell,
  dense,
  meta,
  isRtl,
  isAR,
  isPending,
  rowsCount,
  todayTs,
  yesterdayTs,
  columnSizing
}: MemoizedCellProps) => {
  const isTechnical = meta?.isTechnical;
  const cellValue = cell.getValue();

  const cellDir = getCellDirection(cell.column.id, meta, cellValue, isRtl);

  let content = null;

  // --- Smart Date Formatting ---
  if (meta?.smartDate && meta?.isDate && cellValue) {
    const formatted = formatSmartDate(cellValue, todayTs, yesterdayTs, isRtl);
    if (formatted) {
      const { isToday, dateLabel, formattedTime } = formatted;
      content = (
        <div className={`flex flex-col ${meta.itemsAlignClass || ''}`}>
          <span className='font-medium text-gray-900 dark:text-gray-100 text-sm leading-tight'>
            {isToday ? formattedTime : dateLabel}
          </span>
          {!isToday && (
            <span className='text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap -mt-0.5 tracking-tight'>
              {formattedTime}
            </span>
          )}
        </div>
      );
    }
  }

  if (!content) {
    content = flexRender(cell.column.columnDef.cell, cell.getContext());
  }

  if (isPending && rowsCount > 0) {
    const isActionColumn =
      cell.column.id === 'actions' ||
      cell.column.id === 'status' ||
      cell.column.id.includes('select');
    if (!isActionColumn) {
      content = (
        <div className='animate-pulse'>
          <div className='h-3 w-3/4 bg-zinc-200/60 dark:bg-zinc-800/40 rounded' />
          <div className='h-2 w-1/2 bg-zinc-100/80 dark:bg-zinc-800/20 rounded mt-1' />
        </div>
      );
    }
  }

  return (
    <td
      data-no-convert={isTechnical ? 'true' : undefined}
      className={`${dense ? 'py-1 text-xs' : 'py-3 text-sm'} px-4 font-medium text-(--text-primary) align-middle border-b border-(--border-divider) group-last/row:border-b-0
      ${meta?.isFlex ? 'min-w-0 overflow-hidden' : 'whitespace-nowrap'} ${meta?.isAction ? 'action-col' : ''}`}
      style={{
        width: getColumnWidth(cell.column, meta?.isFlex, columnSizing),
        minWidth: meta?.minWidth,
      }}
      dir={cellDir}
    >
      <div className={`flex items-center gap-1.5 w-full min-w-0 ${meta?.justifyClass}`}>
        {meta?.isId && (
          <span
            className='material-symbols-rounded text-gray-400 shrink-0'
            style={{ fontSize: 'var(--icon-md)' }}
          >
            tag
          </span>
        )}
        <span className={meta?.isFlex ? 'min-w-0 w-full block' : undefined} dir={meta?.isId ? 'ltr' : undefined}>{content}</span>
      </div>
    </td>
  );
});

MemoizedCell.displayName = 'MemoizedCell';
