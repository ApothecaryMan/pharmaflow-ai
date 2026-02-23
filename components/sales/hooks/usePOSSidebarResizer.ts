import { useState, useRef, useCallback, useEffect } from 'react';
import { storage } from '../../../utils/storage';
import { StorageKeys } from '../../../config/storageKeys';

export const usePOSSidebarResizer = () => {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = storage.get<number | null>(StorageKeys.POS_SIDEBAR_WIDTH, null);
      return saved ? Number(saved) : 350;
    }
    return 350;
  });

  useEffect(() => {
    storage.set(StorageKeys.POS_SIDEBAR_WIDTH, sidebarWidth);
  }, [sidebarWidth]);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const startResizing = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const resize = useCallback((e: MouseEvent | TouchEvent) => {
    if (isResizing.current && sidebarRef.current) {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const rect = sidebarRef.current.getBoundingClientRect();
      const isRTL =
        document.documentElement.dir === 'rtl' ||
        document.documentElement.getAttribute('dir') === 'rtl';

      let newWidth;
      if (isRTL) {
        // In RTL, Sidebar is on the Left. Width expands to the Right.
        newWidth = clientX - rect.left;
      } else {
        // In LTR, Sidebar is on the Right. Width expands to the Left.
        newWidth = rect.right - clientX;
      }

      if (newWidth > 350 && newWidth < 800) {
        setSidebarWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    window.addEventListener('touchmove', resize);
    window.addEventListener('touchend', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
      window.removeEventListener('touchmove', resize);
      window.removeEventListener('touchmove', resize);
      window.removeEventListener('touchend', stopResizing);
    };
  }, [resize, stopResizing]);

  return {
    sidebarWidth,
    sidebarRef,
    startResizing,
  };
};
