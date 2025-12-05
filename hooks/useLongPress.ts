import React, { useRef, useCallback } from 'react';

interface UseLongPressOptions {
  threshold?: number;
  onLongPress: (e: React.TouchEvent) => void;
}

export const useLongPress = ({ threshold = 500, onLongPress }: UseLongPressOptions) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress(e);
    }, threshold);
  }, [onLongPress, threshold]);

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleTouchMove = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    isLongPress
  };
};
