import type React from 'react';
import { type RowData, type ColumnDef, type SortingState } from '@tanstack/react-table';
import type { FilterConfig } from '../FilterPill';

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends RowData, TValue> {
    align?: 'start' | 'center' | 'end';
    headerAlign?: 'start' | 'center' | 'end';
    width?: number;
    minWidth?: number;
    flex?: boolean;
    isId?: boolean;
    dir?: 'ltr' | 'rtl' | 'auto';
    disableAlignment?: boolean;
    smartDate?: boolean;
    hideFromSettings?: boolean;
  }
}

export interface TanStackTableProps<TData extends { id: string | number }, TValue> {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  tableId?: string; // Unique ID for localStorage persistence
  searchPlaceholder?: string;
  onRowClick?: (row: TData) => void;
  onRowLongPress?: (e: React.TouchEvent, row: TData) => void;
  onRowContextMenu?: (e: React.MouseEvent, row: TData) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  color?: string; // e.g., 'blue', 'emerald'
  defaultHiddenColumns?: string[]; // Column IDs to hide by default
  activeIndex?: number; // For keyboard navigation highlight
  defaultColumnAlignment?: Record<string, 'start' | 'center' | 'end'>;
  globalFilter?: string; // External global filter value
  onSearchChange?: (value: string) => void;
  manualFiltering?: boolean; // If true, disables client-side filtering (useful when passing pre-filtered data)
  enableSearch?: boolean; // Whether to show the internal search input
  customEmptyState?: React.ReactNode;
  initialSorting?: SortingState;
  lite?: boolean;
  dense?: boolean; // New: for compact rows
  enablePagination?: boolean;
  pageSize?: number | 'auto';
  enableVirtualization?: boolean;

  // New Filter Props
  filterableColumns?: FilterConfig[]; // Definitions for the pills
  initialFilters?: Record<string, any[]>;
  onFilterChange?: (filters: Record<string, any[]>) => void;
  enableGlobalSearchFocus?: boolean; // New: capture global keydown for search
  leftCustomControls?: React.ReactNode;
  rightCustomControls?: React.ReactNode;
  enableTopToolbar?: boolean;
  enableShowAll?: boolean;
  pendingRowIds?: Set<string | number>;
  enableNewRowAnimation?: boolean;
  onVisibleRowsChange?: (visibleRows: TData[]) => void;
}

