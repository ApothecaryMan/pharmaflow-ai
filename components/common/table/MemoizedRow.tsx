import React from 'react';
import { MemoizedCell } from './MemoizedCell';

interface MemoizedRowProps {
  row: any;
  dense?: boolean;
  onRowClick?: (row: any) => void;
  onRowTouchStart?: (e: React.TouchEvent) => void;
  onRowTouchEnd?: (e: React.TouchEvent) => void;
  onRowTouchMove?: (e: React.TouchEvent) => void;
  onRowContextMenu?: (e: React.MouseEvent, row: any) => void;
  pendingRowIds: Set<string | number>;
  newRowIds: Set<string | number>;
  updatedRowIds: Set<string | number>;
  localLoading: boolean;
  columnMetaMap: Map<string, any>;
  rowsCount: number;
  rowIndex: number;
  currentTouchRow?: React.MutableRefObject<any>;
  todayTs: number;
  yesterdayTs: number;
  isRtl: boolean;
  isAR: boolean;
  isLoading: boolean;
  columnSizing: any;
}

export const MemoizedRow = React.memo(
  React.forwardRef(
    (
      {
        row,
        dense,
        onRowClick,
        onRowTouchStart,
        onRowTouchEnd,
        onRowTouchMove,
        onRowContextMenu,
        pendingRowIds,
        newRowIds,
        updatedRowIds,
        localLoading,
        columnMetaMap,
        rowsCount,
        rowIndex,
        currentTouchRow,
        todayTs,
        yesterdayTs,
        isRtl,
        isAR,
        isLoading,
        columnSizing,
      }: MemoizedRowProps,
      ref: any
    ) => {
      const isPending = pendingRowIds.has(row.original.id);
      const isNew = newRowIds.has(row.original.id);
      const isUpdated = updatedRowIds.has(row.original.id);

      return (
        <tr
          ref={ref}
          data-index={rowIndex}
          id={`drug-row-${rowIndex}`}
          onClick={() => onRowClick?.(row.original)}
          onTouchStart={(e) => {
            if (currentTouchRow) currentTouchRow.current = row.original;
            onRowTouchStart?.(e);
          }}
          onTouchEnd={onRowTouchEnd}
          onTouchMove={onRowTouchMove}
          onContextMenu={(e) => {
            if (onRowContextMenu) {
              e.preventDefault();
              onRowContextMenu(e, row.original);
            }
          }}
          className={`group/row transition-all duration-200 outline-none
        ${onRowClick ? 'cursor-pointer hover:bg-gray-50/80 dark:hover:bg-white/[0.03]' : ''}
        ${isPending || localLoading || isLoading ? 'animate-pulse' : ''}
        ${isPending ? 'opacity-60 grayscale-[0.5]' : ''}
        ${isNew ? 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] animate-in fade-in zoom-in-95 duration-300 ease-out' : ''}
        ${isUpdated ? 'bg-amber-500/[0.08] dark:bg-amber-500/[0.12] transition-colors duration-300' : ''}
      `}
        >
          {row.getVisibleCells().map((cell: any) => {
            const meta = columnMetaMap.get(cell.column.id);
            return (
              <MemoizedCell
                key={cell.id}
                cell={cell}
                dense={dense}
                meta={meta}
                isRtl={isRtl}
                isAR={isAR}
                isPending={isPending}
                rowsCount={rowsCount}
                todayTs={todayTs}
                yesterdayTs={yesterdayTs}
                columnSizing={columnSizing}
              />
            );
          })}
        </tr>
      );
    }
  )
);

MemoizedRow.displayName = 'MemoizedRow';
