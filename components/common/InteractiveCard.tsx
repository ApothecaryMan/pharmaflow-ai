import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CARD_BASE } from '../../utils/themeStyles';

export type InteractiveCardColor = 'primary' | 'green' | 'cyan' | 'indigo' | 'violet' | 'amber' | 'emerald' | 'red' | 'gray';

export interface InteractiveCardPage {
  // Option A: Raw content
  content?: React.ReactNode;
  theme?: string;

  // Option B: Data-driven design
  title?: string;
  value?: React.ReactNode;
  color?: InteractiveCardColor;
  valueClassName?: string;
}

export interface InteractiveCardProps {
  pages: InteractiveCardPage[];
  initialPage?: number;
  className?: string;
  onPageChange?: (index: number) => void;
  isLoading?: boolean;
}

const renderPageContent = (p: InteractiveCardPage) => {
  if (p.content) return p.content;

  const colorClasses: Record<InteractiveCardColor, { textTitle: string; textValue: string }> = {
    primary: { textTitle: 'text-primary-600 dark:text-primary-400', textValue: 'text-primary-900 dark:text-primary-100' },
    green: { textTitle: 'text-green-600 dark:text-green-400', textValue: 'text-green-900 dark:text-green-100' },
    cyan: { textTitle: 'text-cyan-600 dark:text-cyan-400', textValue: 'text-cyan-900 dark:text-cyan-100' },
    indigo: { textTitle: 'text-indigo-600 dark:text-indigo-400', textValue: 'text-indigo-900 dark:text-indigo-100' },
    violet: { textTitle: 'text-violet-600 dark:text-violet-400', textValue: 'text-violet-900 dark:text-violet-100' },
    amber: { textTitle: 'text-amber-600 dark:text-amber-400', textValue: 'text-amber-900 dark:text-amber-100' },
    emerald: { textTitle: 'text-emerald-600 dark:text-emerald-400', textValue: 'text-emerald-900 dark:text-emerald-100' },
    red: { textTitle: 'text-red-600 dark:text-red-400', textValue: 'text-red-900 dark:text-red-100' },
    gray: { textTitle: 'text-gray-500 dark:text-gray-400', textValue: 'text-gray-700 dark:text-gray-200' },
  };

  const colors = colorClasses[p.color || 'primary'];

  return (
    <div className='flex flex-col w-full items-start text-start'>
      <span className={`text-[10px] font-bold uppercase mb-1 ${colors.textTitle}`}>
        {p.title}
      </span>
      <span className={`text-2xl font-bold ${colors.textValue} ${p.valueClassName || ''}`}>
        {p.value}
      </span>
    </div>
  );
};

const getThemeClass = (p: InteractiveCardPage) => {
  if (p.theme) return p.theme;
  
  const themeClasses: Record<InteractiveCardColor, string> = {
    primary: 'bg-primary-50 dark:bg-primary-900/20',
    green: 'bg-green-50 dark:bg-green-900/20',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/20',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20',
    violet: 'bg-violet-50 dark:bg-violet-900/20',
    amber: 'bg-amber-50 dark:bg-amber-900/20',
    emerald: 'bg-emerald-50 dark:bg-emerald-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
    gray: 'bg-[var(--bg-skeleton)]/30',
  };
  
  return themeClasses[p.color || 'primary'];
};

export const InteractiveCard: React.FC<InteractiveCardProps> = ({
  pages,
  initialPage = 0,
  className = '',
  onPageChange,
  isLoading = false,
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

  const navigate = useCallback(
    (delta: number, axis: 'x' | 'y' = 'x') => {
      if (isChanging.current || delta === 0 || pages.length <= 1) return;

      const nextIdx = (activePage + delta + pages.length) % pages.length;
      if (nextIdx === activePage) return;

      const xMulti = document.documentElement.dir === 'rtl' || containerRef.current?.closest('[dir="rtl"]') ? -1 : 1;

      setAnim({
        x: axis === 'x' ? delta * 30 * xMulti : 0,
        y: axis === 'y' ? delta * 20 : 0,
      });

      isChanging.current = true;
      setActivePage(nextIdx);
      onPageChange?.(nextIdx);

      // Safety timeout to reset isChanging
      // biome-ignore lint/suspicious/noAssignInExpressions: intentional ref assignment
      const timeout = setTimeout(() => (isChanging.current = false), 450);
      return () => clearTimeout(timeout);
    },
    [activePage, pages.length, onPageChange]
  );

  const onDragEnd = (_: any, { offset, velocity }: PanInfo) => {
    const isHoriz = Math.abs(offset.x) > Math.abs(offset.y);
    const val = isHoriz ? offset.x : offset.y;
    const vel = isHoriz ? velocity.x : velocity.y;

    if (Math.abs(val) > 20 || Math.abs(vel) > 300) {
      let delta = val > 0 || vel > 300 ? -1 : 1;
      
      const isRTL =
        document.documentElement.dir === 'rtl' || containerRef.current?.closest('[dir="rtl"]');
      if (isRTL && isHoriz) {
        delta = -delta;
      }
      
      navigate(delta, isHoriz ? 'x' : 'y');
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (wheelLock.current) return;
    const isHoriz = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const delta = isHoriz ? e.deltaX : e.deltaY;

    if (Math.abs(delta) > 15) {
      let navDelta = delta > 0 ? 1 : -1;
      
      const isRTL =
        document.documentElement.dir === 'rtl' || containerRef.current?.closest('[dir="rtl"]');
      if (isRTL && isHoriz) {
        navDelta = -navDelta;
      }

      navigate(navDelta, isHoriz ? 'x' : 'y');
      // biome-ignore lint/suspicious/noAssignInExpressions: intentional ref reset
      wheelLock.current = setTimeout(() => (wheelLock.current = null), 600);
    }
  };

  const current = pages[activePage] || pages[0];
  if (!pages.length) return null;

  return (
    <motion.div
      ref={containerRef}
      drag={!isLoading && pages.length > 1}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.08}
      onDragEnd={onDragEnd}
      onWheel={!isLoading ? onWheel : undefined}
      role='region'
      aria-roledescription='pages'
      className={`relative group overflow-hidden ${CARD_BASE} dark:backdrop-blur-xl ${getThemeClass(current)} ${className}`}
      style={{ touchAction: 'none' }}
    >
      <div className='grid grid-cols-1 grid-rows-1 w-full h-full'>
        {pages.map((p, i) => (
          <div
            key={`page-placeholder-${i}`}
            className='invisible pointer-events-none row-start-1 col-start-1 h-full w-full'
            aria-hidden='true'
          >
            {renderPageContent(p)}
          </div>
        ))}
        <div className='row-start-1 col-start-1 h-full w-full'>
          {isLoading ? (
            <div className='relative h-full w-full'>
              <div className='invisible' aria-hidden='true'>
                {renderPageContent(current)}
              </div>
              <div className='absolute inset-0 flex flex-col justify-center space-y-2.5 items-start text-start animate-pulse'>
                <div className='h-3 w-16 bg-zinc-400/20 dark:bg-zinc-100/10 rounded' />
                <div className='h-8 w-24 bg-zinc-400/20 dark:bg-zinc-100/10 rounded-lg' />
              </div>
            </div>
          ) : (
            <AnimatePresence mode='wait' initial={false}>
              <motion.div
                key={activePage}
                initial={{ opacity: 0, x: anim.x, y: anim.y }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                exit={{ opacity: 0, x: -anim.x, y: -anim.y }}
                transition={{ type: 'spring', stiffness: 260, damping: 26, mass: 1 }}
                className='h-full w-full'
              >
                {renderPageContent(current)}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {pages.length > 1 && (
        <div className='absolute top-2.5 ltr:right-2.5 rtl:left-2.5 z-20 flex items-center justify-center'>
          <motion.div
            layout
            initial='collapsed'
            whileHover='expanded'
            animate='collapsed'
            className='flex items-center rounded-full bg-white/60 dark:bg-white/20 backdrop-blur-md border border-white/30 dark:border-white/10 shadow-xs overflow-hidden'
            variants={{
              collapsed: { padding: '3px 4px', gap: '2.5px' },
              expanded: { padding: '6px 8px', gap: '5px' },
            }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            role='tablist'
          >
            {// biome-ignore lint/suspicious/noArrayIndexKey: pages have no stable id
            pages.map((_, i) => (
              <motion.button
                layout
                key={`page-dot-${i}`}
                role='tab'
                aria-selected={activePage === i}
                aria-label={`Page ${i + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(i - activePage);
                }}
                className={`rounded-full transition-colors duration-300 cursor-pointer ${
                  activePage === i
                    ? 'bg-primary-500'
                    : 'bg-zinc-400/50 dark:bg-zinc-400/60 hover:bg-zinc-500/80 dark:hover:bg-zinc-300/80'
                }`}
                variants={{
                  collapsed: {
                    width: activePage === i ? 10 : 3.5,
                    height: 3.5,
                  },
                  expanded: {
                    width: activePage === i ? 16 : 7,
                    height: 7,
                  },
                }}
              />
            ))}
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};
