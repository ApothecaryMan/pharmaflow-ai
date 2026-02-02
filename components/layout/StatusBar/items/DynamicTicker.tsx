import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StatusBarItem } from '../StatusBarItem';
import { Tooltip } from '../../../common/Tooltip';
import { UserRole, canPerformAction } from '../../../../config/permissions';

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
    topSeller: { 
      name: string; 
      count: number;
      revenue: number;
      avgTime: number;
    } | null;
  };
  /** Visibility controls for individual slides */
  showSales?: boolean;
  showInventory?: boolean;
  showCustomers?: boolean;
  showTopSeller?: boolean;
  userRole?: UserRole;
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
  topSeller: { name: 'أحمد', count: 15, revenue: 1450.5, avgTime: 3.5 },
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
  userRole,
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

  // Filter slides based on visibility settings AND Permissions
  const slides = allSlides.filter(slide => {
    // 1. Check User Settings (toggle)
    let visibleBySettings = true;
    if (slide.id === 'sales') visibleBySettings = showSales;
    if (slide.id === 'inventory') visibleBySettings = showInventory;
    if (slide.id === 'customers') visibleBySettings = showCustomers;
    if (slide.id === 'topSeller') visibleBySettings = showTopSeller;

    if (!visibleBySettings) return false;

    // 2. Check RBAC Permissions
    if (!userRole) return false; // Hide all if no role? Or maybe show public info? 
    // Usually if no employee selected, we show nothing (officeboy fallback has minimal perms anyway)

    if (slide.id === 'sales') return canPerformAction(userRole, 'sale.view_history');
    if (slide.id === 'inventory') return canPerformAction(userRole, 'reports.view_inventory');
    if (slide.id === 'customers') return canPerformAction(userRole, 'customer.view');
    if (slide.id === 'topSeller') return canPerformAction(userRole, 'reports.view_financial');

    return true;
  });

  // Rotation logic
  const rotateNext = useCallback(() => {
    if (isPaused || priorityMessage || slides.length === 0) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
      setIsAnimating(false);
    }, 150);
  }, [isPaused, priorityMessage, slides.length]);

  useEffect(() => {
    if (isPaused || priorityMessage || slides.length === 0) return;

    timeoutRef.current = setTimeout(rotateNext, interval);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, interval, isPaused, priorityMessage, rotateNext, slides.length]);

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
    if (slides.length === 0) return;
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

  // Generate descriptive tooltip based on slide type
  const getSlideTooltip = (slide: TickerSlide) => {
    switch (slide.id) {
      case 'sales':
        return language === 'AR'
          ? `إجمالي مبيعات اليوم: ${slide.value} (${data.completedInvoices} ${t.completed || 'مكتملة'}، ${data.pendingInvoices} ${t.pending || 'معلقة'})`
          : `Total Daily Sales: ${slide.value} (${data.completedInvoices} ${t.completed || 'Completed'}, ${data.pendingInvoices} ${t.pending || 'Pending'})`;
      
      case 'inventory':
        return language === 'AR'
          ? `حالة المخزون: ${data.lowStockCount} ${t.lowStock}, ${data.shortagesCount} ${t.shortages}`
          : `Inventory Status: ${data.lowStockCount} ${t.lowStock}, ${data.shortagesCount} ${t.shortages}`;
      
      case 'customers':
        return language === 'AR'
          ? `العملاء الجدد: تم تسجيل ${data.newCustomersToday} عملاء جدد اليوم`
          : `New Customers: ${data.newCustomersToday} new customers registered today`;
      
      case 'topSeller':
        if (!data.topSeller) return slide.label;
        const revenueStr = data.topSeller.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 });
        return language === 'AR'
          ? `الأكثر مبيعاً: ${data.topSeller.name} (${data.topSeller.count} فاتورة | ${revenueStr} دولار)`
          : `Top Seller: ${data.topSeller.name} (${data.topSeller.count} Invoices | $${revenueStr})`;
      
      default:
        return slide.label;
    }
  };

  // Safely get current slide - MUST NOT return null before hooks
  const currentSlide = priorityMessage || (slides.length > 0 ? slides[currentIndex % slides.length] : null);

  // If no slides visible, don't render - This return is now AFTER all hooks
  if (!currentSlide) return null;

  return (
    <div
      className="relative flex items-center h-full group"
      dir={language === 'AR' ? 'rtl' : 'ltr'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <Tooltip
        content={getSlideTooltip(currentSlide)}
        className="h-full"
        triggerClassName="h-full"
        tooltipClassName="font-bold uppercase tracking-wider z-[60]"
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
      </Tooltip>
    </div>
  );
};

export default DynamicTicker;
