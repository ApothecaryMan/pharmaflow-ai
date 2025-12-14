import React, { useMemo } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams, GridSortModel, GridRowParams } from '@mui/x-data-grid';
import { MuiThemeProvider } from '../providers/MuiThemeProvider';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  defaultWidth?: number;
  cellDir?: 'ltr' | 'rtl' | 'auto';
  headerDir?: 'ltr' | 'rtl';
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  onRowClick?: (item: T) => void;
  onRowContextMenu?: (e: React.MouseEvent, item: T) => void;
  onRowLongPress?: (e: React.TouchEvent, item: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  color?: string;
  t: any;
  storageKey: string;
  darkMode?: boolean;
  defaultHiddenColumns?: string[];
  language?: 'EN' | 'AR';
  hideFooter?: boolean;
}

export const DataTable = <T extends { id: string }>({
  data,
  columns,
  onSort,
  onRowClick,
  onRowContextMenu,
  onRowLongPress,
  isLoading,
  emptyMessage,
  t,
  defaultHiddenColumns,
  storageKey,
  language = 'EN',
  hideFooter = false,
  // New Props
  darkMode,
  color = 'blue'
}: DataTableProps<T> & { darkMode?: boolean; color?: string }) => {
  // Load saved state from localStorage
  const savedState = useMemo(() => {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem(storageKey);
        return saved ? JSON.parse(saved) : null;
    } catch (e) {
        console.error('Failed to load table state', e);
        return null;
    }
  }, [storageKey]);

  // Save state to localStorage
  const saveState = (newState: any) => {
    try {
        const current = localStorage.getItem(storageKey);
        const parsedCurrent = current ? JSON.parse(current) : {};
        const updated = { ...parsedCurrent, ...newState };
        localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
        console.error('Failed to save table state', e);
    }
  };

  // Map legacy columns to DataGrid columns
  const gridColumns = useMemo<GridColDef[]>(() => {
    return columns.map((col) => {
      // Auto-detect direction for known numeric/LTR fields if not explicitly set
      const isLtrField = ['phone', 'contact', 'email', 'barcode', 'code', 'sku'].some(key => col.key.toLowerCase().includes(key));
      const direction = col.cellDir || (isLtrField ? 'ltr' : undefined);

      const headerText = t.headers?.[col.key] || t.modal?.[col.key] || col.label;

      return {
        field: col.key,
        headerName: headerText,
        width: savedState?.width?.[col.key] || col.defaultWidth || 150,
        align: col.align || 'left',
        headerAlign: col.align || 'left',
        sortable: col.sortable ?? true,
        renderHeader: col.headerDir ? (params) => (
          <div style={{ direction: col.headerDir, textAlign: 'left', width: '100%', display: 'flex', alignItems: 'center' }}>{headerText}</div>
        ) : undefined,
        renderCell: (params: GridRenderCellParams) => {
            const content = col.render ? col.render(params.row) : params.value;
            if (direction) {
                return (
                    <div dir={direction} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
                        {content}
                    </div>
                );
            }
            return content;
        },
        flex: (savedState?.width?.[col.key]) ? 0 : (col.defaultWidth ? 0 : 1),
      };
    });
  }, [columns, t, savedState]);

  const handleRowClick = (params: GridRowParams) => {
    if (onRowClick) {
      onRowClick(params.row);
    }
  };

  return (
    <MuiThemeProvider darkMode={darkMode} themeColor={color} language={language}>
        <div style={{ height: '100%', width: '100%' }} className={darkMode ? 'dark' : ''} dir={language === 'AR' ? 'rtl' : 'ltr'}>
        <DataGrid
            rows={data}
            columns={gridColumns}
            loading={isLoading}
            onRowClick={handleRowClick}
            disableRowSelectionOnClick
            
            getRowHeight={() => 'auto'}
            
            // Layout & Styling
            sx={{
                border: 'none',
                '& .MuiDataGrid-cell': {
                    display: 'flex',
                    alignItems: 'center',
                    py: 1, // Add padding for auto-height comfort
                },
                '& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus': {
                    outline: 'none',
                },
                fontFamily: 'inherit'
            }}
            
            // Filtering/Sorting
            disableColumnMenu={false}
            
            // Empty state
            slots={{
                noRowsOverlay: () => (
                    <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
                         <span className="material-symbols-rounded text-6xl mb-4 opacity-30">group_off</span>
                         <p className="text-lg font-medium">{emptyMessage || t.noResults}</p>
                    </div>
                )
            }}
            
            // Context Menu and Long Press
            slotProps={{
                row: {
                    onContextMenu: (e) => {
                        if (onRowContextMenu) {
                            const rowId = e.currentTarget.getAttribute('data-id');
                            const row = data.find(r => r.id === rowId);
                            if (row) {
                                onRowContextMenu(e, row);
                            }
                        }
                    },
                    onTouchStart: (e: React.TouchEvent) => {
                        if (onRowLongPress) {
                            const target = e.currentTarget;
                            const touchTimer = setTimeout(() => {
                                const rowId = target.getAttribute('data-id');
                                const row = data.find(r => r.id === rowId);
                                if (row) {
                                    onRowLongPress(e, row);
                                }
                            }, 500); // 500ms long press threshold
                            
                            // Store timer to cancel if touch ends early
                            (target as any)._longPressTimer = touchTimer;
                        }
                    },
                    onTouchEnd: (e: React.TouchEvent) => {
                        // Cancel long press if touch ends
                        const timer = (e.currentTarget as any)._longPressTimer;
                        if (timer) {
                            clearTimeout(timer);
                        }
                    },
                    onTouchMove: (e: React.TouchEvent) => {
                        // Cancel long press if user moves finger
                        const timer = (e.currentTarget as any)._longPressTimer;
                        if (timer) {
                            clearTimeout(timer);
                        }
                    }
                }
            }}
            


            // Persistence & Footer
            hideFooter={true}
            
            // State Persistence Handlers
            onColumnWidthChange={(params) => saveState({ width: { ...savedState?.width, [params.colDef.field]: params.colDef.width } })}
            onColumnVisibilityModelChange={(model) => saveState({ visibility: model })}
            onSortModelChange={(model) => saveState({ sort: model })}
            
            initialState={{
                pagination: {
                    paginationModel: { pageSize: 100, page: 0 },
                },
                columns: {
                    columnVisibilityModel: savedState?.visibility || (defaultHiddenColumns ? 
                        defaultHiddenColumns.reduce((acc, col) => ({ ...acc, [col]: false }), {}) 
                        : undefined),
                    orderedFields: savedState?.order,
                },
                sorting: {
                    sortModel: savedState?.sort || [],
                }
            }}
        />
        </div>
    </MuiThemeProvider>
  );
};
