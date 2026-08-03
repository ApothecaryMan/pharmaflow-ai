import { useState, useCallback, useRef, useEffect } from 'react';

export interface CellSelectionState<T> {
  field: T;
  indices: number[]; // Store multiple independent indices
}

export function useBulkSelection<T>() {
  const [activeField, setActiveField] = useState<T | null>(null);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  
  const [isDraggingCells, setIsDraggingCells] = useState(false);
  const [bulkInputValue, setBulkInputValue] = useState('');
  
  const dragOriginRef = useRef<{ field: T; startIdx: number; baseIndices: Set<number>; isDeselecting?: boolean } | null>(null);
  const [currentDragEnd, setCurrentDragEnd] = useState<number | null>(null);

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const getCombinedIndices = useCallback(() => {
    if (!activeField) return [];
    const combined = new Set(selectedIndices);
    
    if (isDraggingCells && dragOriginRef.current && currentDragEnd !== null) {
      const { startIdx, isDeselecting } = dragOriginRef.current;
      const end = currentDragEnd;
      const min = Math.min(startIdx, end);
      const max = Math.max(startIdx, end);
      for (let i = min; i <= max; i++) {
        if (isDeselecting) {
          combined.delete(i);
        } else {
          combined.add(i);
        }
      }
    }
    return Array.from(combined);
  }, [activeField, selectedIndices, isDraggingCells, currentDragEnd]);

  const handleCellMouseDown = useCallback((index: number, field: T) => {
    setIsDraggingCells(true);
    let baseIndices = new Set(selectedIndices);
    let isDeselecting = false;

    if (activeField !== field) {
      baseIndices = new Set();
      setActiveField(field);
      baseIndices.add(index);
    } else {
      // Only accumulate if multi-select is already active
      if (baseIndices.size <= 1) {
        baseIndices = new Set();
        baseIndices.add(index);
      } else {
        if (baseIndices.has(index)) {
          baseIndices.delete(index);
          isDeselecting = true;
        } else {
          baseIndices.add(index);
        }
      }
    }

    dragOriginRef.current = { field, startIdx: index, baseIndices, isDeselecting };
    setCurrentDragEnd(index);
    setSelectedIndices(new Set(baseIndices));
    setBulkInputValue('');
  }, [activeField, selectedIndices]);

  const handleCellMouseEnter = useCallback(
    (index: number, field: T) => {
      if (!isDraggingCells || !dragOriginRef.current) return;
      if (dragOriginRef.current.field !== field) return;
      
      setCurrentDragEnd(index);
    },
    [isDraggingCells]
  );

  const clearSelection = useCallback(() => {
    setActiveField(null);
    setSelectedIndices(new Set());
    setBulkInputValue('');
    setIsDraggingCells(false);
    setCurrentDragEnd(null);
    dragOriginRef.current = null;
  }, []);

  useEffect(() => {
    const handleMouseUp = () => {
      if (isDraggingCells) {
        setIsDraggingCells(false);
        const combined = getCombinedIndices();
        setSelectedIndices(new Set(combined));
        dragOriginRef.current = null;
        setCurrentDragEnd(null);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (
        activeField &&
        tableContainerRef.current &&
        !tableContainerRef.current.contains(e.target as Node) &&
        !(e.target as Element).closest('#bulk-edit-bar') &&
        !(e.target as Element).closest('[data-modal-open="true"]')
      ) {
        clearSelection();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && activeField) {
        clearSelection();
      }
    };

    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDraggingCells, activeField, getCombinedIndices, clearSelection]);

  const combinedIndices = getCombinedIndices();
  const cellSelection: CellSelectionState<T> | null = activeField && combinedIndices.length > 0 
    ? { field: activeField, indices: combinedIndices } 
    : null;

  return {
    cellSelection,
    isDraggingCells,
    bulkInputValue,
    setBulkInputValue,
    handleCellMouseDown,
    handleCellMouseEnter,
    clearSelection,
    tableContainerRef
  };
}
