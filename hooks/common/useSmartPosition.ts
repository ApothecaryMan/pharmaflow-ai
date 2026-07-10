import { useCallback, useMemo, useRef, useState } from 'react';

export interface PositionState {
  side: 'left' | 'right';
  align: 'top' | 'bottom';
}

interface UseSmartPositionOptions {
  defaultSide?: 'left' | 'right';
  defaultAlign?: 'top' | 'bottom';
  requiredWidth?: number;
}

export const useSmartPosition = (options: UseSmartPositionOptions = {}) => {
  const { defaultSide = 'right', defaultAlign = 'bottom', requiredWidth = 220 } = options;

  const [position, setPosition] = useState<PositionState>({
    side: defaultSide,
    align: defaultAlign,
  });

  const rafId = useRef(0);
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);

  const calculatePosition = useCallback(() => {
    const el = nodeRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;

    const side = spaceRight < requiredWidth && rect.left > requiredWidth ? 'left' : 'right';
    const align = rect.top < window.innerHeight / 2 ? 'top' : 'bottom';

    setPosition({ side, align });
  }, [requiredWidth]);

  const checkPosition = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(calculatePosition);
  }, [calculatePosition]);

  const resetPosition = useCallback(() => {
    cancelAnimationFrame(rafId.current);
    setPosition({ side: defaultSide, align: defaultAlign });
  }, [defaultSide, defaultAlign]);

  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }

      nodeRef.current = node;

      if (node) {
        observerRef.current = new ResizeObserver(() => {
          cancelAnimationFrame(rafId.current);
          rafId.current = requestAnimationFrame(calculatePosition);
        });
        observerRef.current.observe(node);
      }
    },
    [calculatePosition]
  );

  return useMemo(
    () => ({ ref, position, checkPosition, resetPosition }),
    [position, checkPosition, resetPosition, ref]
  );
};
