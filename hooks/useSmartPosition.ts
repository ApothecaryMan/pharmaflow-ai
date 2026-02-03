import { useCallback, useRef, useState } from 'react';

export interface PositionState {
  side: 'left' | 'right';
  align: 'top' | 'bottom';
}

interface UseSmartPositionOptions {
  defaultSide?: 'left' | 'right';
  defaultAlign?: 'top' | 'bottom';
  requiredWidth?: number; // Width needed for the element to fit
}

export const useSmartPosition = (options: UseSmartPositionOptions = {}) => {
  const { defaultSide = 'right', defaultAlign = 'bottom', requiredWidth = 220 } = options;

  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<PositionState>({
    side: defaultSide,
    align: defaultAlign,
  });

  const checkPosition = useCallback(() => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceRight = window.innerWidth - rect.right;

      // Horizontal: If tight on right, go left.
      // check if spaceRight is less than required. Also check if we HAVE space on left.
      // If we are 'right' aligned (opening to right), we need space on right. if not enough, try left.
      // Logic from before:
      const side = spaceRight < requiredWidth && rect.left > requiredWidth ? 'left' : 'right';

      // Vertical: If in top half, align top (grow down). If bottom half, align bottom (grow up).
      const align = rect.top < window.innerHeight / 2 ? 'top' : 'bottom';

      setPosition({ side, align });
    }
  }, [requiredWidth]);

  const resetPosition = useCallback(() => {
    setPosition({ side: defaultSide, align: defaultAlign });
  }, [defaultSide, defaultAlign]);

  return {
    ref,
    position,
    checkPosition,
    resetPosition,
  };
};
