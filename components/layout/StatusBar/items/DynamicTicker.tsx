import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBarItem } from '../StatusBarItem';

/**
 * DynamicTicker - A rotating status display component
 * 
 * Features:
 * - Auto-rotates through 4 information slides
 * - Supports priority interrupts for urgent notifications
 * - Compact design matching StatusBar aesthetic
 */

export interface TickerSlide {
  id: string;
  icon: string;
  label: string;
  value: string | number;
  secondaryValue?: string | number;
  secondaryLabel?: string;
  tertiaryValue?: string | number;
  tertiaryLabel?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
}

export interface DynamicTickerProps {
  /** Language for RTL support */
  language?: 'EN' | 'AR';
  /** Rotation interval in milliseconds (default: 5000) */
  interval?: number;
  /** Translations */
  t?: {
    todaySales: string;
    invoices: string;
    completed: string;
    pending: string;
    lowStock: string;
    shortages: string;
    newCustomers: string;
    topSeller: string;
  };
  /** Data hooks - these would come from your data layer */
  data?: {
    todaySales: number;
    completedInvoices: number;
    pendingInvoices: number;
    lowStockCount: number;
    shortagesCount: number;
    newCustomersToday: number;
    topSeller: { name: string; count: number } | null;
  };
  /** Visibility controls for individual slides */
  showSales?: boolean;
  showInventory?: boolean;
  showCustomers?: boolean;
  showTopSeller?: boolean;
}

const defaultTranslations = {
  todaySales: 'Today',
  invoices: 'Invoices',
  completed: 'Done',
  pending: 'Pending',
  lowStock: 'Low Stock',
  shortages: 'Shortages',
  newCustomers: 'New Customers',
  topSeller: 'Top Seller',
};

const defaultData = {
  todaySales: 12450.75,
  completedInvoices: 42,
  pendingInvoices: 3,
  lowStockCount: 7,
  shortagesCount: 2,
  newCustomersToday: 5,
  topSeller: { name: 'أحمد', count: 15 },
};

export const DynamicTicker: React.FC<DynamicTickerProps> = ({
  language = 'EN',
  interval = 5000,
  t = defaultTranslations,
  data = defaultData,
  showSales = true,
  showInventory = true,
  showCustomers = true,
  showTopSeller = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [priorityMessage, setPriorityMessage] = useState<TickerSlide | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Build slides from data
  const allSlides: TickerSlide[] = [
    {
      id: 'sales',
      icon: 'payments',
      label: t.todaySales,
      value: `${data.todaySales.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      secondaryLabel: t.completed,
      secondaryValue: data.completedInvoices,
      tertiaryLabel: t.pending,
      tertiaryValue: data.pendingInvoices,
      variant: 'success',
    },
    {
      id: 'inventory',
      icon: 'inventory_2',
      label: t.lowStock,
      value: data.lowStockCount,
      secondaryLabel: t.shortages,
      secondaryValue: data.shortagesCount,
      variant: data.lowStockCount > 5 ? 'warning' : 'default',
    },
    {
      id: 'customers',
      icon: 'group_add',
      label: t.newCustomers,
      value: data.newCustomersToday,
      variant: data.newCustomersToday > 0 ? 'info' : 'default',
    },
    {
      id: 'topSeller',
      icon: 'emoji_events',
      label: t.topSeller,
      value: data.topSeller ? data.topSeller.name : '—',
      secondaryLabel: data.topSeller ? t.invoices : undefined,
      secondaryValue: data.topSeller ? data.topSeller.count : undefined,
      variant: 'success',
    },
  ];

  // Filter slides based on visibility settings
  const slides = allSlides.filter(slide => {
    if (slide.id === 'sales') return showSales;
    if (slide.id === 'inventory') return showInventory;
    if (slide.id === 'customers') return showCustomers;
    if (slide.id === 'topSeller') return showTopSeller;
    return true;
  });

  // If no slides visible, don't render
  if (slides.length === 0) return null;

  const currentSlide = priorityMessage || slides[currentIndex % slides.length];

  // Rotation logic
  const rotateNext = useCallback(() => {
    if (isPaused || priorityMessage) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
      setIsAnimating(false);
    }, 150);
  }, [isPaused, priorityMessage, slides.length]);

  useEffect(() => {
    if (isPaused || priorityMessage) return;

    timeoutRef.current = setTimeout(rotateNext, interval);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, interval, isPaused, priorityMessage, rotateNext]);

  // Priority message handler - clears after showing
  useEffect(() => {
    if (priorityMessage) {
      const clearPriority = setTimeout(() => {
        setPriorityMessage(null);
      }, 3000); // Show priority for 3 seconds
      return () => clearTimeout(clearPriority);
    }
  }, [priorityMessage]);

  // Manual navigation
  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    // Reset timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  // Format value - always use English numbers
  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      return value.toLocaleString('en-US');
    }
    return value;
  };

  return (
    <div
      className="relative flex items-center h-full group"
      dir={language === 'AR' ? 'rtl' : 'ltr'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main Content */}
      <div
        className={`
          flex items-center h-full px-2.5 gap-1.5 cursor-default
          transition-all duration-150 ease-in-out
          hover:bg-black/5 dark:hover:bg-white/10
          ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}
        `}
        onClick={() => goToSlide((currentIndex + 1) % slides.length)}
        title={`${currentSlide.label}: ${currentSlide.value}${currentSlide.secondaryValue ? ` | ${currentSlide.secondaryLabel}: ${currentSlide.secondaryValue}` : ''}`}
      >
        {/* Icon */}
        <span
          className={`material-symbols-rounded text-[14px] leading-none ${
            currentSlide.variant === 'success' ? 'text-emerald-500' :
            currentSlide.variant === 'warning' ? 'text-amber-500' :
            currentSlide.variant === 'error' ? 'text-red-500' :
            currentSlide.variant === 'info' ? 'text-blue-500' :
            'text-[var(--text-secondary)]'
          }`}
        >
          {currentSlide.icon}
        </span>

        {/* Primary: Label + Value */}
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
          {currentSlide.label}
        </span>
        <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
          {formatValue(currentSlide.value)}
        </span>

        {/* Secondary (optional) */}
        {currentSlide.secondaryValue !== undefined && (
          <>
            <span className="text-[8px] opacity-40 mx-0.5">|</span>
            {currentSlide.secondaryLabel && (
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {currentSlide.secondaryLabel}
              </span>
            )}
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatValue(currentSlide.secondaryValue)}
            </span>
          </>
        )}

        {/* Tertiary (optional) */}
        {currentSlide.tertiaryValue !== undefined && (
          <>
            <span className="text-[8px] opacity-40 mx-0.5">|</span>
            {currentSlide.tertiaryLabel && (
              <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                {currentSlide.tertiaryLabel}
              </span>
            )}
            <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {formatValue(currentSlide.tertiaryValue)}
            </span>
          </>
        )}
      </div>

    </div>
  );
};

export default DynamicTicker;
