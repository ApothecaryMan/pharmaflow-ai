import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { CARD_BASE } from '../../utils/themeStyles';

export interface InteractiveCardPage {
  content: React.ReactNode;
  theme?: string;
}

export interface InteractiveCardProps {
  pages: InteractiveCardPage[];
  initialPage?: number;
  className?: string;
  onPageChange?: (index: number) => void;
}

export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  pages,
  initialPage = 0,
  className = '',
  onPageChange,
}) => {
  const [activePage, setActivePage] = useState(initialPage);
  const [anim, setAnim] = useState({ x: 0, y: 0 });
  const isChanging = useRef(false);
  const wheelLock = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Synchronize state if pages prop changes and current page is out of bounds
  useEffect(() => {
    if (activePage >= pages.length && pages.length > 0) {
      setActivePage(pages.length - 1);
    }
  }, [pages.length, activePage]);

  const navigate = useCallback((delta: number, axis: 'x' | 'y' = 'x') => {
    if (isChanging.current || delta === 0 || pages.length <= 1) return;
    
    const nextIdx = (activePage + delta + pages.length) % pages.length;
    if (nextIdx === activePage) return;

    // Detect RTL mode
    const isRTL = document.documentElement.dir === 'rtl' || containerRef.current?.closest('[dir="rtl"]');
    const xMulti = isRTL ? -1 : 1;

    setAnim({ 
      x: axis === 'x' ? delta * 30 * xMulti : 0, 
      y: axis === 'y' ? delta * 20 : 0 
    });

    isChanging.current = true;
    setActivePage(nextIdx);
    onPageChange?.(nextIdx);
    
    // Safety timeout to reset isChanging
    const timeout = setTimeout(() => (isChanging.current = false), 450);
    return () => clearTimeout(timeout);
  }, [activePage, pages.length, onPageChange]);

  const onDragEnd = (_: any, { offset, velocity }: PanInfo) => {
    const isHoriz = Math.abs(offset.x) > Math.abs(offset.y);
    const val = isHoriz ? offset.x : offset.y;
    const vel = isHoriz ? velocity.x : velocity.y;
    
    if (Math.abs(val) > 20 || Math.abs(vel) > 300) {
      navigate(val > 0 || vel > 300 ? -1 : 1, isHoriz ? 'x' : 'y');
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (wheelLock.current) return;
    const isHoriz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const delta = isHoriz ? e.deltaX : e.deltaY;
    
    if (Math.abs(delta) > 15) {
      navigate(delta > 0 ? 1 : -1, isHoriz ? 'x' : 'y');
      wheelLock.current = setTimeout(() => (wheelLock.current = null), 600);
    }
  };

  const current = pages[activePage] || pages[0];
  if (!pages.length) return null;

  return (
    <motion.div
      ref={containerRef}
      drag={pages.length > 1}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.08}
      onDragEnd={onDragEnd}
      onWheel={onWheel}
      role="region"
      aria-roledescription="pages"
      className={`relative group overflow-hidden transition-colors duration-700 ${CARD_BASE} ${current.theme || ''} ${className}`}
      style={{ touchAction: 'none' }}
    >
      <div className="grid grid-cols-1 grid-rows-1 w-full h-full">
        {pages.map((p, i) => (
          <div key={i} className="invisible pointer-events-none row-start-1 col-start-1 opacity-0 h-full w-full" aria-hidden="true">
            {p.content}
          </div>
        ))}
        <div className="row-start-1 col-start-1 h-full w-full">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activePage}
              initial={{ opacity: 0, x: anim.x, y: anim.y }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: -anim.x, y: -anim.y }}
              transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 1 }}
              className="h-full w-full"
            >
              {current.content}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {pages.length > 1 && (
        <div className="absolute top-2 right-2 flex gap-1.5 z-10" role="tablist">
          {pages.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={activePage === i}
              aria-label={`Page ${i + 1}`}
              onClick={(e) => { e.stopPropagation(); navigate(i - activePage); }}
              className={`w-2 h-2 rounded-full transition-all duration-300 cursor-pointer ${activePage === i ? 'bg-primary-500 scale-110 shadow-sm' : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400'}`}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
};
