import React, { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { formatCurrency } from '../../utils/currency';
import { isTauri } from '../../utils/platform';

interface WidgetData {
  revenue: number;
  transactions: number;
  isDark?: boolean;
}

export const LiveWidget = () => {
  const [data, setData] = useState<WidgetData>({ revenue: 0, transactions: 0 });
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
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
      const unlisten = await listen<WidgetData>('live-widget-update', (event) => {
        setData(event.payload);
        setIsLoaded(true);
        if (event.payload.isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        
        setTimeout(() => {
          getCurrentWebviewWindow().show();
        }, 50);
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

  const handleContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!isTauri()) return;
    try {
      const { Menu, MenuItem } = await import('@tauri-apps/api/menu');
      
      const privacyItem = await MenuItem.new({
        id: 'privacy',
        text: isPrivacyMode ? 'إظهار الأرقام' : 'وضع الخصوصية (إخفاء)',
        action: () => setIsPrivacyMode(!isPrivacyMode)
      });
      
      const closeItem = await MenuItem.new({
        id: 'close',
        text: 'إغلاق الكبسولة',
        action: () => getCurrentWebviewWindow().close()
      });
      
      const menu = await Menu.new({
        items: [privacyItem, closeItem]
      });
      
      await menu.popup();
    } catch (err) {
      console.warn('Failed to open context menu', err);
    }
  };

  return (
    <div 
      className={`w-screen h-screen bg-transparent select-none overflow-hidden flex items-center justify-center p-2 ${isLoaded ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
      dir="rtl"
      data-tauri-drag-region
      onContextMenu={handleContextMenu}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        getCurrentWebviewWindow().startDragging();
      }}
    >
      <div 
        data-tauri-drag-region
        className='w-full max-w-[340px] h-full flex items-center justify-between pr-5 pl-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-full cursor-grab active:cursor-grabbing'
      >
        <div className='flex items-center gap-6'>
          {/* Revenue Section */}
          <div className='flex items-center gap-3 pointer-events-none'>
            <div className='flex items-center justify-center w-9 h-9 rounded-full bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'>
              <span className='material-symbols-rounded text-[20px]'>payments</span>
            </div>
            <div className='flex flex-col items-start leading-tight'>
              <span className='text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>الإيرادات</span>
              <span className='text-[17px] font-black font-mono tracking-tighter text-gray-900 dark:text-white' dir="ltr">
                {isPrivacyMode ? '••••••' : formatCurrency(data.revenue)}
              </span>
            </div>
          </div>
          
          {/* Divider */}
          <div className='w-[1px] h-10 bg-gray-200 dark:bg-gray-700 pointer-events-none'></div>
          
          {/* Transactions Section */}
          <div className='flex items-center gap-3 pointer-events-none'>
            <div className='flex items-center justify-center w-9 h-9 rounded-full bg-primary-50 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'>
              <span className='material-symbols-rounded text-[20px]'>receipt_long</span>
            </div>
            <div className='flex flex-col items-start leading-tight'>
              <span className='text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>الطلبات</span>
              <span className='text-[17px] font-black font-mono tracking-tighter text-gray-900 dark:text-white'>
                {isPrivacyMode ? '••' : data.transactions}
              </span>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <button 
           onClick={() => getCurrentWebviewWindow().close()}
           className="flex items-center justify-center p-1.5 ml-1 text-gray-400 hover:text-red-500 transition-colors duration-200"
           title="إغلاق"
        >
          <span className="material-symbols-rounded text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
};
