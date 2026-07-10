import { emit, listen } from '@tauri-apps/api/event';
import { useEffect, useMemo, useRef } from 'react';
import { useSettings } from '../../context';
import { useRecentSales } from '../../hooks/queries/useSalesQuery';
import { useAuthStore } from '../../stores/authStore';
import { isTauri } from '../../utils/platform';

export const WidgetUpdateEmitter = () => {
  const activeBranch = useAuthStore((s) => s.branches.find((b) => b.id === s.activeBranchId));
  const { data: sales = [] } = useRecentSales(activeBranch?.id ?? '');
  const { darkMode } = useSettings();
  const payloadRef = useRef<{
    revenue: number;
    transactions: number;
    dailyTarget: number;
    isDark: boolean;
  } | null>(null);

  const widgetPayload = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today.getTime() + 86400000);

    const todaysSales = sales.filter((s) => {
      const d = new Date(s.date);
      return d >= today && d < endOfDay;
    });

    const revenue = todaysSales.reduce((sum, s) => {
      let total = s.total;
      if (s.hasReturns && s.itemReturnedQuantities) {
        const returnedTotal = s.items.reduce((rSum, item) => {
          const lineKey = item.isUnit ? `${item.id}_unit` : `${item.id}_pack`;
          const qty =
            s.itemReturnedQuantities?.[lineKey] || s.itemReturnedQuantities?.[item.id] || 0;
          return rSum + qty * (item.publicPrice || 0);
        }, 0);
        total -= returnedTotal;
      }
      return sum + total;
    }, 0);

    const dailyTarget = activeBranch?.monthlySalesTarget
      ? Math.round(
          activeBranch.monthlySalesTarget /
            new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
        )
      : 0;

    return { revenue, transactions: todaysSales.length, dailyTarget, isDark: darkMode };
  }, [sales, activeBranch, darkMode]);

  useEffect(() => {
    payloadRef.current = widgetPayload;
  }, [widgetPayload]);

  useEffect(() => {
    if (!isTauri()) return;
    emit('live-widget-update', widgetPayload).catch(console.warn);
  }, [widgetPayload]);

  useEffect(() => {
    if (!isTauri()) return;
    let unlisten: () => void;
    import('@tauri-apps/api/event').then(({ listen }) => {
      listen('live-widget-ready', () => {
        if (payloadRef.current) {
          emit('live-widget-update', payloadRef.current).catch(console.warn);
        }
      }).then((u) => {
        unlisten = u;
      });
    });
    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  return null;
};
