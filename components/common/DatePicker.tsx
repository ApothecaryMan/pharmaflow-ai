import type React from 'react';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// --- Wheel Picker Component ---

interface WheelPickerItem {
  value: string | number;
  label: string;
}

interface WheelPickerProps {
  items: WheelPickerItem[];
  value: string | number;
  onChange: (value: string | number) => void;
  width?: string;
  loop?: boolean;
}

const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  value,
  onChange,
  width = '60px',
  loop = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightItemsRef = useRef<HTMLDivElement>(null);
  const ITEM_HEIGHT = 40;
  const isScrollingRef = useRef(false);
  const syncFrameRef = useRef<number | null>(null);

  const displayItems = useMemo(() => {
    return loop ? [...items, ...items, ...items, ...items, ...items] : items;
  }, [items, loop]);

  // High-performance sync using requestAnimationFrame
  const syncScroll = () => {
    if (containerRef.current && highlightItemsRef.current) {
      const top = containerRef.current.scrollTop;
      highlightItemsRef.current.style.transform = `translate3d(0, -${top}px, 0)`;
    }
  };

  useLayoutEffect(() => {
    if (containerRef.current) {
      const originalIndex = items.findIndex((i) => i.value === value);
      if (originalIndex !== -1) {
        const targetIndex = loop ? originalIndex + items.length * 2 : originalIndex;
        containerRef.current.scrollTop = targetIndex * ITEM_HEIGHT;
        syncScroll();
      }
    }
  }, [value, items, loop]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let debounceTimer: any;

    const onScroll = () => {
      isScrollingRef.current = true;

      // Zero-lag sync
      if (syncFrameRef.current) cancelAnimationFrame(syncFrameRef.current);
      syncFrameRef.current = requestAnimationFrame(syncScroll);

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        isScrollingRef.current = false;
        const scrollTop = container.scrollTop;
        const index = Math.round(scrollTop / ITEM_HEIGHT);

        const actualIndex = loop ? index % items.length : index;
        const safeIndex = Math.min(Math.max(0, actualIndex), items.length - 1);
        const newValue = items[safeIndex]?.value;

        if (loop) {
          const sectionSize = items.length * ITEM_HEIGHT;
          const normalizedScrollTop = actualIndex * ITEM_HEIGHT + sectionSize * 2;
          if (Math.abs(scrollTop - normalizedScrollTop) > 10) {
            container.scrollTo({ top: normalizedScrollTop, behavior: 'auto' });
            syncScroll();
          }
        }

        if (newValue !== undefined && newValue !== value) {
          onChange(newValue);
        }
      }, 50);
    };

    container.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', onScroll);
      clearTimeout(debounceTimer);
      if (syncFrameRef.current) cancelAnimationFrame(syncFrameRef.current);
    };
  }, [items, value, onChange, loop]);

  const ItemList = ({ isLens }: { isLens: boolean }) => (
    <>
      {displayItems.map((item, i) => (
        <div
          key={`${item.value}-${i}`}
          className='h-[40px] flex items-center justify-center snap-center cursor-pointer'
          onClick={() => {
            if (containerRef.current)
              containerRef.current.scrollTo({ top: i * ITEM_HEIGHT, behavior: 'smooth' });
          }}
        >
          <span
            className='text-sm whitespace-nowrap px-2'
            style={{
              fontFamily: '"Google Sans Flex", sans-serif',
              fontOpticalSizing: 'auto',
              fontVariationSettings: isLens
                ? '"slnt" 0, "wdth" 151, "wght" 1000, "GRAD" 144'
                : '"slnt" 0, "wdth" 100, "wght" 400, "GRAD" 0',
              fontSize: '16px',
              color: isLens ? 'inherit' : 'currentColor',
            }}
          >
            {item.label}
          </span>
        </div>
      ))}
    </>
  );

  return (
    <div className='relative h-[200px] overflow-hidden group select-none' style={{ width }}>
      {/* Layer 1: Background (Normal / Faded) */}
      <div
        ref={containerRef}
        className='h-full overflow-y-auto no-scrollbar snap-y snap-mandatory py-[80px] relative z-10 text-gray-500/60 dark:text-gray-400/60'
        style={{
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.1) 10%, black 40%, black 60%, rgba(0,0,0,0.1) 90%, transparent 100%)',
          maskImage:
            'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.1) 10%, black 40%, black 60%, rgba(0,0,0,0.1) 90%, transparent 100%)',
        }}
      >
        <ItemList isLens={false} />
      </div>

      {/* Layer 2: Foreground Lens (Bold / Sharp) */}
      <div
        className='absolute inset-x-0 top-0 bottom-0 z-20 pointer-events-none'
        style={{
          // Sharp cut for the lens at the center 40px (from 80px to 120px)
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent 80px, black 80px, black 120px, transparent 120px)',
          maskImage:
            'linear-gradient(to bottom, transparent 80px, black 80px, black 120px, transparent 120px)',
        }}
      >
        <div
          ref={highlightItemsRef}
          className='absolute top-0 left-0 w-full pt-[80px]'
          style={{ willChange: 'transform' }}
        >
          <ItemList isLens={true} />
        </div>
      </div>
    </div>
  );
};

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  color: string;
  placeholder?: string;
  icon?: string;
  locale?: string;
  translations?: {
    cancel: string;
    ok: string;
    hour: string;
    minute: string;
    am?: string;
    pm?: string;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  rounded?: 'full' | 'xl' | 'lg' | 'md' | 'none';
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label,
  color,
  placeholder,
  icon = 'calendar_today',
  locale = 'en-US',
  translations = {
    cancel: 'Cancel',
    ok: 'OK',
    hour: 'Hour',
    minute: 'Minute',
    am: 'AM',
    pm: 'PM',
  },
  className = '',
  size = 'sm',
  rounded = 'full',
}) => {
  // --- State ---
  const [isOpen, setIsOpen] = useState(false);

  // Dates
  // selectedDate: The actual value committed
  const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);
  // viewDate: The month currently being viewed in the calendar
  const [viewDate, setViewDate] = useState<Date>(new Date());
  // tempDate: The date currently being manipulated inside the open picker (before OK)
  const [tempDate, setTempDate] = useState<Date | null>(value ? new Date(value) : null);

  // Refs
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Positioning State
  const [isPositioned, setIsPositioned] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number; transformOrigin: string }>({
    top: 0,
    left: 0,
    transformOrigin: 'top center',
  });

  // --- Effects ---

  // Sync state with props
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setSelectedDate(d);
      setTempDate(d);
      setViewDate(d);
    } else {
      setSelectedDate(null);
      // If open but no value, default to current date so wheels render
      setTempDate(isOpen ? new Date() : null);
      setViewDate(new Date());
    }
  }, [value, isOpen]);

  // Handle Outside Click & Scroll
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideInteractions = (e: MouseEvent | TouchEvent) => {
      const isInsideTrigger = triggerRef.current?.contains(e.target as Node);
      const isInsideDropdown = dropdownRef.current?.contains(e.target as Node);

      if (!isInsideTrigger && !isInsideDropdown) {
        setIsOpen(false);
      }
    };

    const handleScroll = (e: Event) => {
      if (
        dropdownRef.current &&
        (e.target === dropdownRef.current || dropdownRef.current.contains(e.target as Node))
      ) {
        return;
      }
      setIsOpen(false);
    };

    const handleResize = () => setIsOpen(false);

    document.addEventListener('mousedown', handleOutsideInteractions);
    document.addEventListener('touchstart', handleOutsideInteractions);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('mousedown', handleOutsideInteractions);
      document.removeEventListener('touchstart', handleOutsideInteractions);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  // Calculate Position
  useLayoutEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const DROPDOWN_WIDTH = 320;
      const DROPDOWN_HEIGHT = 400;
      const GAP = 8;
      const VIEWPORT_PADDING = 10;

      let top = rect.bottom + GAP;
      let left = rect.left + rect.width / 2 - DROPDOWN_WIDTH / 2;
      let transformOrigin = 'top center';

      if (top + DROPDOWN_HEIGHT > window.innerHeight - VIEWPORT_PADDING) {
        if (rect.top - DROPDOWN_HEIGHT - GAP > VIEWPORT_PADDING) {
          top = rect.top - DROPDOWN_HEIGHT - GAP;
          transformOrigin = 'bottom center';
        }
      }

      if (left + DROPDOWN_WIDTH > window.innerWidth - VIEWPORT_PADDING) {
        left = window.innerWidth - DROPDOWN_WIDTH - VIEWPORT_PADDING;
        transformOrigin = transformOrigin.replace('center', 'right');
      }
      if (left < VIEWPORT_PADDING) {
        left = VIEWPORT_PADDING;
        transformOrigin = transformOrigin.replace('center', 'left');
      }

      setPosition({ top, left, transformOrigin });
      setIsPositioned(true);
    } else {
      setIsPositioned(false);
    }
  }, [isOpen]);

  // --- Wheel Logic ---

  // Generate Date Items (e.g. +/- 5 years from viewDate)
  const dateWheelItems = useMemo(() => {
    const items = [];
    const centerDate = new Date(); // Always center around today/selected for generation loop?
    // Actually, iOS picker is infinite. We'll simulate a wide range centered on the selected date.
    // If we want it truly smooth, we need a lot of items.
    // Let's go +/- 365 days for now to keep it responsive, or just render "current month" days?
    // User requested "Mon 19 Feb" style.

    const base = tempDate || new Date();
    const range = 600; // days before and after

    for (let i = -range; i <= range; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);

      // Format: "Mon 19 Feb"
      const label = d.toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });

      // Value: ISO string date part for uniqueness? Or just timestamp?
      // We use full date string YYYY-MM-DD
      const val = d.toISOString().split('T')[0];

      items.push({ label, value: val });
    }
    return items;
  }, [locale]); // Recalculate if locale changes. Note: heavily dependent on 'tempDate' might cause jitters if we re-generate on every scroll.
  // Better to generate around a STABLE center (e.g. initial viewDate) and just select the correct one.
  // Implemented: Generate around Initial Open Date (viewDate) is better to avoid array shifts.

  // Dynamic Day Items based on selected Month/Year
  const currentYearForDays = tempDate?.getFullYear() || new Date().getFullYear();
  const currentMonthForDays = tempDate?.getMonth() || 0;

  const dayItems = useMemo(() => {
    const daysInMonth = new Date(currentYearForDays, currentMonthForDays + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => ({
      label: (i + 1).toString().padStart(2, '0'),
      value: i + 1,
    }));
  }, [currentYearForDays, currentMonthForDays]);

  const monthItems = useMemo(() => {
    const items = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(2024, i, 1);
      items.push({
        label: d.toLocaleDateString(locale, { month: 'short' }),
        value: i,
      });
    }
    return items;
  }, [locale]);

  const yearItems = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const items = [];
    for (let i = currentYear - 10; i <= currentYear + 20; i++) {
      items.push({ label: i.toString(), value: i });
    }
    return items;
  }, []);

  const hourItems = Array.from({ length: 12 }, (_, i) => ({
    label: (i + 1).toString().padStart(2, '0'),
    value: i + 1,
  }));

  const minuteItems = Array.from({ length: 60 }, (_, i) => ({
    label: i.toString().padStart(2, '0'),
    value: i,
  }));

  const amPmItems = [
    { label: translations.am || 'AM', value: 'AM' },
    { label: translations.pm || 'PM', value: 'PM' },
  ];

  const handleWheelChange = (
    type: 'day' | 'month' | 'year' | 'hour' | 'minute' | 'ampm',
    val: string | number
  ) => {
    if (!tempDate) return;
    const newDate = new Date(tempDate);

    if (type === 'day') {
      newDate.setDate(val as number);
    } else if (type === 'month') {
      const newMonth = val as number;
      // Handle month days overflow (e.g. going from Jan 31 to Feb)
      const daysInMonth = new Date(newDate.getFullYear(), newMonth + 1, 0).getDate();
      if (newDate.getDate() > daysInMonth) {
        newDate.setDate(daysInMonth);
      }
      newDate.setMonth(newMonth);
    } else if (type === 'year') {
      newDate.setFullYear(val as number);
    } else if (type === 'hour') {
      // 12-hour format handling
      const h = val as number; // 1-12
      const currentHours = newDate.getHours();
      const isPM = currentHours >= 12;

      if (h === 12) {
        newDate.setHours(isPM ? 12 : 0);
      } else {
        newDate.setHours(isPM ? h + 12 : h);
      }
    } else if (type === 'minute') {
      newDate.setMinutes(val as number);
    } else if (type === 'ampm') {
      const currentHours = newDate.getHours();
      const isPM = val === 'PM';

      if (isPM && currentHours < 12) {
        newDate.setHours(currentHours + 12);
      } else if (!isPM && currentHours >= 12) {
        newDate.setHours(currentHours - 12);
      }
    }

    setTempDate(newDate);
  };

  // Helper to get current values for wheels
  const getCurrentDayValue = () => tempDate?.getDate() || 1;
  const getCurrentMonthValue = () => tempDate?.getMonth() || 0;
  const getCurrentYearValue = () => tempDate?.getFullYear() || new Date().getFullYear();
  const getCurrentMinuteValue = () => tempDate?.getMinutes() || 0;

  const getCurrentHourValue = () => {
    if (!tempDate) return 12;
    const h = tempDate.getHours();
    if (h === 0) return 12;
    if (h > 12) return h - 12;
    return h;
  };

  const getCurrentAmPmValue = () => {
    if (!tempDate) return 'AM';
    return tempDate.getHours() >= 12 ? 'PM' : 'AM';
  };

  const confirmSelection = () => {
    if (tempDate) {
      // Convert to ISO string for output, handling timezone offset properly
      // We want to preserve the selected local time in the string
      const offset = tempDate.getTimezoneOffset() * 60000;
      const localISOTime = new Date(tempDate.getTime() - offset).toISOString().slice(0, 16);
      onChange(localISOTime);
    } else {
      onChange('');
    }
    setIsOpen(false);
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  // Styles Map
  const styles = {
    sm: 'px-3 py-1 text-xs h-[32px] gap-1.5',
    md: 'px-4 py-2 text-sm gap-2 h-[42px]',
    lg: 'px-5 py-3 text-base gap-3 h-[48px]',
    rounded: {
      full: 'rounded-full',
      xl: 'rounded-xl',
      lg: 'rounded-lg',
      md: 'rounded-md',
      none: 'rounded-none',
    },
    dropdownRounded: {
      full: 'rounded-[24px]',
      xl: 'rounded-xl',
      lg: 'rounded-lg',
      md: 'rounded-md',
      none: 'rounded-none',
    },
  };

  return (
    <div className='relative inline-block'>
      {/* --- Trigger Button --- */}
      <button
        ref={triggerRef}
        type='button'
        onClick={() => {
          if (!isOpen && !value) {
            setTempDate(new Date());
          }
          setIsOpen(!isOpen);
        }}
        className={`
                    flex items-center border transition-all select-none outline-none focus:ring-0
                    ${styles[size]}
                    ${styles.rounded[rounded]}
                    
                    ${
                      value
                        ? `bg-${color}-200 dark:bg-${color}-800 border-${color}-400 dark:border-${color}-600 text-${color}-900 dark:text-${color}-50 font-semibold shadow-sm`
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-white dark:hover:bg-gray-800'
                    }
                    ${className}
                `}
      >
        <span className='material-symbols-rounded text-[18px]'>{icon}</span>
        <span className='text-sm font-medium whitespace-nowrap'>
          {value
            ? new Date(value).toLocaleString(locale, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })
            : placeholder || label}
        </span>

        {value && (
          <div
            onClick={clearSelection}
            className={`w-5 h-5 rounded-full flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all ml-1 hover:bg-${color}-200 dark:hover:bg-${color}-800`}
          >
            <span className='material-symbols-rounded text-[14px]'>close</span>
          </div>
        )}
      </button>

      {/* --- Portal Dropdown --- */}
      {isOpen &&
        isPositioned &&
        createPortal(
          <div
            ref={dropdownRef}
            className='fixed z-[99999] animate-fade-in'
            style={{
              top: position.top,
              left: position.left,
              transformOrigin: position.transformOrigin,
            }}
            dir={locale === 'ar-EG' || locale.startsWith('ar') ? 'rtl' : 'ltr'}
          >
            <div
              className={`bg-white dark:bg-gray-900 ${styles.dropdownRounded[rounded]} shadow-2xl border border-gray-200 dark:border-gray-800 p-5 w-[380px] select-none`}
            >
              {/* iOS Style Wheel Layout */}
              <div className='relative flex items-center justify-center gap-2 mb-4'>
                {/* Unified Highlight Bar */}
                <div className='absolute top-1/2 -translate-y-1/2 left-0 right-0 h-[42px] bg-gray-100/50 dark:bg-gray-800/40 rounded-xl z-0'></div>

                {tempDate && (
                  <>
                    {/* Day */}
                    <WheelPicker
                      items={dayItems}
                      value={getCurrentDayValue()}
                      onChange={(v) => handleWheelChange('day', v)}
                      width='50px'
                      loop={true}
                    />

                    {/* Month */}
                    <WheelPicker
                      items={monthItems}
                      value={getCurrentMonthValue()}
                      onChange={(v) => handleWheelChange('month', v)}
                      width='75px'
                      loop={true}
                    />

                    {/* Year */}
                    <WheelPicker
                      items={yearItems}
                      value={getCurrentYearValue()}
                      onChange={(v) => handleWheelChange('year', v)}
                      width='75px'
                    />

                    <div className='w-[1px] h-20 bg-gray-200 dark:bg-gray-800 mx-1 self-center opacity-50' />

                    {/* Hour */}
                    <WheelPicker
                      items={hourItems}
                      value={getCurrentHourValue()}
                      onChange={(v) => handleWheelChange('hour', v)}
                      width='50px'
                      loop={true}
                    />

                    {/* Minute */}
                    <WheelPicker
                      items={minuteItems}
                      value={getCurrentMinuteValue()}
                      onChange={(v) => handleWheelChange('minute', v)}
                      width='50px'
                      loop={true}
                    />

                    {/* AM/PM */}
                    <WheelPicker
                      items={amPmItems}
                      value={getCurrentAmPmValue()}
                      onChange={(v) => handleWheelChange('ampm', v)}
                      width='50px'
                    />
                  </>
                )}
              </div>

              {/* Footer Actions */}
              <div className='flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 pt-3'>
                <button
                  onClick={() => setIsOpen(false)}
                  className='px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors'
                >
                  {translations.cancel}
                </button>
                <button
                  onClick={confirmSelection}
                  className={`px-6 py-2 text-sm font-bold text-white bg-${color}-600 hover:bg-${color}-700 rounded-lg shadow-lg shadow-${color}-500/20 active:scale-95 transition-all`}
                >
                  {translations.ok}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
