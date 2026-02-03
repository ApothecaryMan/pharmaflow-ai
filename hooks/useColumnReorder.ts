import type React from 'react';
import { useEffect, useState } from 'react';
import { storage } from '../utils/storage';

interface UseColumnReorderProps {
  defaultColumns: string[];
  storageKey: string;
  defaultHidden?: string[];
}

export const useColumnReorder = ({
  defaultColumns,
  storageKey,
  defaultHidden = [],
}: UseColumnReorderProps) => {
  // Column Order State with lazy initialization from storage
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    return storage.get<string[]>(`${storageKey}_order`, defaultColumns);
  });

  const [draggedColumn, setDraggedColumn] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Column Visibility State with lazy initialization from storage
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(() => {
    const saved = storage.get<string[]>(`${storageKey}_hidden`, defaultHidden);
    return new Set(saved);
  });

  // Save column order to storage whenever it changes
  useEffect(() => {
    storage.set(`${storageKey}_order`, columnOrder);
  }, [columnOrder, storageKey]);

  // Save hidden columns to storage whenever it changes
  useEffect(() => {
    storage.set(`${storageKey}_hidden`, Array.from(hiddenColumns));
  }, [hiddenColumns, storageKey]);

  const toggleColumnVisibility = (columnId: string) => {
    setHiddenColumns((prev) => {
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
