import React, { useCallback, useEffect, useState } from 'react';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { formatCurrency } from '../../utils/currency';
import { AnimatedCounter } from '../common/AnimatedCounter';
import { isTauri } from '../../utils/platform';

interface WidgetData {
  revenue: number;
  transactions: number;
  dailyTarget: number;
  isDark?: boolean;
}

export const LiveWidget = () => {
  const [data, setData] = useState<WidgetData>({ revenue: 0, transactions: 0, dailyTarget: 0 });
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Inject strict CSS to force transparent backgrounds for the OS window
    const style = document.createElement('style');
    style.innerHTML = `
      html, body, #root {
        background-color: transparent !important;
        background: transparent !important;
      }
    `;
    document.head.appendChild(style);

    // Listen for updates from the main window
    const setupListener = async () => {
      const { listen, emit } = await import('@tauri-apps/api/event');
      let isFirstEvent = true;
      const unlisten = await listen<WidgetData>('live-widget-update', (event) => {
        try {
          setData(event.payload);
          setIsLoaded(true);
          if (event.payload.isDark) {
            document.documentElement.classList.add('dark');
          } else {
            document.documentElement.classList.remove('dark');
          }

          if (isFirstEvent) {
            isFirstEvent = false;
            setTimeout(async () => {
              try {
                await getCurrentWebviewWindow().show();
                await getCurrentWindow().setAlwaysOnTop(true);
              } catch {
                /* window already shown */
              }
            }, 50);
          }
        } catch {
          console.warn('live-widget-update handler error');
        }
      });
      // Tell main window we are ready for the initial state
      emit('live-widget-ready');
      return unlisten;
    };

    let unlistenFn: (() => void) | undefined;
    setupListener().then((fn) => {
      unlistenFn = fn;
    });

    return () => {
      if (unlistenFn) unlistenFn();
      style.remove();
    };
  }, []);

  useEffect(() => {
    if (!isTauri()) return;
    getCurrentWindow().isAlwaysOnTop().then(setIsAlwaysOnTop);
  }, []);

  useEffect(() => {
    if (!isTauri() || !isAlwaysOnTop) return;
    const interval = setInterval(() => {
      const w = getCurrentWindow();
      w.setAlwaysOnTop(true);
      w.show();
      w.unminimize();
      w.setFocus();
    }, 1000);
    return () => clearInterval(interval);
  }, [isAlwaysOnTop]);

  const handleContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isTauri()) return;
    const x = e.clientX;
    const y = e.clientY;
    try {
      const { Menu, MenuItem } = await import('@tauri-apps/api/menu');
      const { LogicalPosition } = await import('@tauri-apps/api/dpi');

      const privacyItem = await MenuItem.new({
        id: 'privacy',
        text: isPrivacyMode ? 'إظهار الأرقام' : 'وضع الخصوصية (إخفاء)',
        action: () => setIsPrivacyMode(!isPrivacyMode)
      });

      const pinItem = await MenuItem.new({
        id: 'pin',
        text: isAlwaysOnTop ? 'إلغاء التثبيت في الأعلى' : 'تثبيت في الأعلى',
        action: () => {
          const next = !isAlwaysOnTop;
          setIsAlwaysOnTop(next);
          getCurrentWindow().setAlwaysOnTop(next);
        }
      });

      const closeItem = await MenuItem.new({
        id: 'close',
        text: 'إغلاق الكبسولة',
        action: () => getCurrentWebviewWindow().close()
      });

      const menu = await Menu.new({
        items: [privacyItem, pinItem, closeItem]
      });

      await menu.popup(new LogicalPosition(x, y));
    } catch (err) {
      console.warn('Failed to open context menu', err);
    }
  };

  return (
    <div
      className={`w-screen h-screen bg-transparent select-none overflow-hidden flex items-center justify-center p-2 ${isLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      dir="rtl"
      onContextMenu={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        if (e.button !== 0) return;
        if ((e.target as HTMLElement).closest('button')) return;
        getCurrentWebviewWindow().startDragging();
      }}
      onMouseUp={(e) => {
        if (e.button !== 2) return;
        handleContextMenu(e);
      }}
    >
      <div
        className='w-full max-w-[500px] h-full flex items-center justify-between px-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full cursor-grab active:cursor-grabbing'
      >
        <div className='flex items-center gap-2 min-w-0 flex-1 px-1'>
          {/* Revenue Section */}
          <div className='flex flex-col items-start leading-tight pointer-events-none shrink-0'>
            <span className='text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>الإيرادات</span>
            <span className='text-[15px] font-black font-mono tracking-tighter text-gray-900 dark:text-white' dir="ltr">
              {isPrivacyMode ? '••••••' : <AnimatedCounter value={data.revenue} fractionDigits={0} mode='countup' />}
            </span>
          </div>

          {/* Transactions Section */}
          <div className='flex flex-col items-start leading-tight pointer-events-none shrink-0'>
            <span className='text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>الطلبات</span>
            <span className='text-[15px] font-black font-mono tracking-tighter text-gray-900 dark:text-white'>
              {isPrivacyMode ? '••' : <AnimatedCounter value={data.transactions} fractionDigits={0} mode='countup' />}
            </span>
          </div>

          {/* Target Progress Section */}
          <div className='flex items-center gap-2 pointer-events-none min-w-0 flex-1'>
            <div className='flex items-center justify-center w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/40 text-red-600 dark:text-red-400 shrink-0'>
              <span className='material-symbols-rounded text-[18px]'>track_changes</span>
            </div>
            <div className='flex items-center gap-1.5 min-w-0 w-full'>
              <span className='text-[11px] font-bold font-mono tracking-tighter text-gray-900 dark:text-white shrink-0' dir="ltr">
                {isPrivacyMode ? '••/••' : `${Math.round((data.revenue / (data.dailyTarget || 1)) * 100)}%`}
              </span>
              <div className='flex-1 h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 min-w-[20px]'>
                <div
                  className='h-full rounded-full transition-all duration-300 ease-out'
                  style={{
                    width: `${Math.min(100, (data.revenue / (data.dailyTarget || 1)) * 100)}%`,
                    backgroundColor: data.revenue >= data.dailyTarget ? '#22c55e' : data.revenue >= data.dailyTarget * 0.5 ? '#f59e0b' : '#ef4444'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => getCurrentWebviewWindow().close()}
          className="flex items-center justify-center p-1.5 text-gray-400 hover:text-red-500 transition-colors duration-200 shrink-0"
          title="إغلاق"
        >
          <span className="material-symbols-rounded text-[18px]">close</span>
        </button>
      </div>
    </div>
  );
};
