import React, { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { permissionsService } from '../../../../services/auth/permissionsService';
import { Tooltip } from '../../../common/Tooltip';
import { StatusBarItem } from '../StatusBarItem';

// --- Types ---

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
  language?: 'EN' | 'AR';
  interval?: number;
  t?: Record<string, string>;
  data?: any;
  showSales?: boolean;
  showInventory?: boolean;
  showCustomers?: boolean;
  showTopSeller?: boolean;
}

// --- Constants & Helpers ---

const variantColors: Record<string, string> = {
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  error: 'text-red-500',
  info: 'text-primary-500',
  default: 'text-(--text-secondary)',
};

const formatVal = (v: any) => typeof v === 'number' ? v.toLocaleString() : v;

// --- Sub-components ---

const TickerItem: React.FC<{ label?: string; value?: any }> = ({ label, value }) => (
  <>
    {label && <span className="text-[10px] font-bold uppercase tracking-wide text-(--text-secondary)">{label}</span>}
    <span className="text-[10px] font-bold text-(--text-primary)">{formatVal(value)}</span>
  </>
);

export const DynamicTicker: React.FC<DynamicTickerProps> = ({
  language = 'EN',
  interval = 5000,
  t = {},
  data = {},
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

  const slides = useMemo(() => {
    const raw: TickerSlide[] = [
      {
        id: 'sales', icon: 'payments', label: t.todaySales, value: data.todaySales,
        secondaryLabel: t.completed, secondaryValue: data.completedInvoices,
        tertiaryLabel: t.pending, tertiaryValue: data.pendingInvoices, variant: 'success',
      },
      {
        id: 'inventory', icon: 'inventory_2', label: t.lowStock, value: data.lowStockCount,
        secondaryLabel: t.shortages, secondaryValue: data.shortagesCount,
        variant: data.lowStockCount > 5 ? 'warning' : 'default',
      },
      {
        id: 'customers', icon: 'group_add', label: t.newCustomers, value: data.newCustomersToday,
        variant: data.newCustomersToday > 0 ? 'info' : 'default',
      },
      {
        id: 'topSeller', icon: 'emoji_events', label: t.topSeller, value: data.topSeller?.name || '—',
        secondaryLabel: data.topSeller ? t.invoices : undefined, secondaryValue: data.topSeller?.count,
        variant: 'success',
      },
    ];

    return raw.filter(s => {
      const show = s.id === 'sales' ? showSales : s.id === 'inventory' ? showInventory : s.id === 'customers' ? showCustomers : showTopSeller;
      if (!show || !permissionsService.getEffectiveRole()) return false;
      
      const perms: Record<string, string> = { sales: 'sale.view_history', inventory: 'reports.view_inventory', customers: 'customer.view', topSeller: 'reports.view_financial' };
      return permissionsService.can(perms[s.id] as any);
    });
  }, [data, t, showSales, showInventory, showCustomers, showTopSeller]);

  const rotate = useCallback(() => {
    if (isPaused || priorityMessage || !slides.length) return;
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentIndex(p => (p + 1) % slides.length);
      setIsAnimating(false);
    }, 150);
  }, [isPaused, priorityMessage, slides.length]);

  useEffect(() => {
    if (isPaused || priorityMessage || !slides.length) return;
    timeoutRef.current = setTimeout(rotate, interval);
    return () => timeoutRef.current && clearTimeout(timeoutRef.current);
  }, [currentIndex, interval, isPaused, priorityMessage, rotate, slides.length]);

  useEffect(() => {
    if (priorityMessage) {
      const timer = setTimeout(() => setPriorityMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [priorityMessage]);

  const current = priorityMessage || (slides.length ? slides[currentIndex % slides.length] : null);

  const tooltip = useMemo(() => {
    if (!current) return '';
    const isAR = language === 'AR';
    if (current.id === 'sales') return isAR ? `مبيعات اليوم: ${current.value}` : `Sales Today: ${current.value}`;
    if (current.id === 'inventory') return isAR ? `نواقص: ${data.shortagesCount}` : `Shortages: ${data.shortagesCount}`;
    return current.label;
  }, [current, language, data]);

  if (!current) return null;

  return (
    <StatusBarItem
      icon={current.icon}
      variant={current.variant}
      tooltip={tooltip}
      className={`transition-all duration-150 ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
      onClick={() => setCurrentIndex(p => (p + 1) % slides.length)}
    >
      <div 
        className="flex items-center gap-1.5 h-full"
        onMouseEnter={() => setIsPaused(true)} 
        onMouseLeave={() => setIsPaused(false)}
        dir={language === 'AR' ? 'rtl' : 'ltr'}
      >
        <TickerItem label={current.label} value={current.value} />

        {current.secondaryValue !== undefined && (
          <>
            <span className="text-[8px] opacity-40 mx-0.5">|</span>
            <TickerItem label={current.secondaryLabel} value={current.secondaryValue} />
          </>
        )}

        {current.tertiaryValue !== undefined && (
          <>
            <span className="text-[8px] opacity-40 mx-0.5">|</span>
            <TickerItem label={current.tertiaryLabel} value={current.tertiaryValue} />
          </>
        )}
      </div>
    </StatusBarItem>
  );
};

export default DynamicTicker;
