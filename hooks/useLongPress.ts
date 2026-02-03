import type React from 'react';
import { useCallback, useRef } from 'react';

interface UseLongPressOptions {
  threshold?: number;
  onLongPress: (e: React.TouchEvent) => void;
}

export const useLongPress = ({ threshold = 500, onLongPress }: UseLongPressOptions) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const startPos = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.persist();
      isLongPress.current = false;
      startPos.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
      };

      timerRef.current = setTimeout(() => {
        isLongPress.current = true;
        onLongPress(e);
      }, threshold);
    },
    [onLongPress, threshold]
  );

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPos.current = null;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (timerRef.current && startPos.current) {
      const touch = e.touches[0];
      const moveX = Math.abs(touch.clientX - startPos.current.x);
      const moveY = Math.abs(touch.clientY - startPos.current.y);

      if (moveX > 20 || moveY > 20) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd,
    onTouchMove: handleTouchMove,
    isLongPress,
  };
};
