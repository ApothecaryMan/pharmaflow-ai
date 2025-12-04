import React, { useState, useEffect } from 'react';

interface UseColumnReorderProps {
  defaultColumns: string[];
  storageKey: string;
}

export const useColumnReorder = ({ defaultColumns, storageKey }: UseColumnReorderProps) => {
  // Column Order State with lazy initialization from localStorage
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem(`${storageKey}_order`);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to load column order', e);
      }
    }
    return defaultColumns;
  });

  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Column Visibility State with lazy initialization from localStorage
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(`${storageKey}_hidden`);
    if (saved) {
      try {
        return new Set(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load hidden columns', e);
      }
    }
    return new Set();
  });

  // Save column order to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`${storageKey}_order`, JSON.stringify(columnOrder));
  }, [columnOrder, storageKey]);

  // Save hidden columns to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`${storageKey}_hidden`, JSON.stringify(Array.from(hiddenColumns)));
  }, [hiddenColumns, storageKey]);

  const toggleColumnVisibility = (columnId: string) => {
    setHiddenColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnId)) {
        newSet.delete(columnId);
      } else {
        // Don't allow hiding all columns
        if (newSet.size < columnOrder.length - 1) {
          newSet.add(columnId);
        }
      }
      return newSet;
    });
  };

  // Drag Handlers
  const handleColumnDragStart = (e: React.DragEvent | React.TouchEvent, columnId: string) => {
    setDraggedColumn(columnId);
    if ('dataTransfer' in e) {
      e.dataTransfer.effectAllowed = 'move';
    }
  };

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (draggedColumn && draggedColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleColumnTouchMove = (e: React.TouchEvent) => {
    if (!draggedColumn) return;
    
    const touch = e.touches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element && element.tagName === 'TH') {
      const columnId = element.getAttribute('data-column-id');
      if (columnId && columnId !== draggedColumn) {
        setDragOverColumn(columnId);
      }
    }
  };

  const handleColumnDrop = (e: React.DragEvent | React.TouchEvent, targetColumnId: string) => {
    e.preventDefault();
    if (!draggedColumn || draggedColumn === targetColumnId) return;

    const newOrder = [...columnOrder];
    const draggedIndex = newOrder.indexOf(draggedColumn);
    const targetIndex = newOrder.indexOf(targetColumnId);

    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedColumn);

    setColumnOrder(newOrder);
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleColumnTouchEnd = (e: React.TouchEvent) => {
    if (!draggedColumn) return;
    
    const touch = e.changedTouches[0];
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    if (element && element.tagName === 'TH') {
      const targetColumnId = element.getAttribute('data-column-id');
      if (targetColumnId && targetColumnId !== draggedColumn) {
        const newOrder = [...columnOrder];
        const draggedIndex = newOrder.indexOf(draggedColumn);
        const targetIndex = newOrder.indexOf(targetColumnId);

        newOrder.splice(draggedIndex, 1);
        newOrder.splice(targetIndex, 0, draggedColumn);

        setColumnOrder(newOrder);
      }
    }
    
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  const handleColumnDragEnd = () => {
    setDraggedColumn(null);
    setDragOverColumn(null);
  };

  return {
    columnOrder,
    hiddenColumns,
    draggedColumn,
    dragOverColumn,
    toggleColumnVisibility,
    handleColumnDragStart,
    handleColumnDragOver,
    handleColumnTouchMove,
    handleColumnDrop,
    handleColumnTouchEnd,
    handleColumnDragEnd,
  };
};
