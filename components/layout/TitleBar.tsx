import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useSettings } from '../../context';
import { isTauri } from '../../utils/platform';

const appWindow = isTauri() ? getCurrentWindow() : null;

export const TitleBar: React.FC = () => {
  const { darkMode } = useSettings();
  if (!isTauri()) return null;
  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div 
      data-tauri-drag-region 
      dir="ltr"
      className="h-10 backdrop-blur-md border-b flex items-center justify-between px-3 select-none fixed top-0 left-0 right-0 z-[9999]"
      style={{
        backgroundColor: 'var(--bg-navbar)',
        borderColor: 'var(--border-divider)',
        color: 'var(--text-primary)'
      }}
    >
      <div className="flex items-center gap-3 pointer-events-none">
        <img 
          src={darkMode ? "/logo_icon_white.svg" : "/logo_icon_black.svg"} 
          alt="ZINC" 
          className="w-5 h-5 object-contain" 
        />
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wide uppercase">
          ZINC <span className="mx-1 opacity-20">|</span> نظام إدارة الصيدليات
        </span>
      </div>

      <div className="flex items-center gap-0.5">
        <button
          onClick={handleMinimize}
          className="w-10 h-8 flex items-center justify-center hover:bg-gray-500/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors rounded-md group"
          title="تصغير"
        >
          <span className="material-symbols-rounded text-[20px]">remove</span>
        </button>
        <button
          onClick={handleMaximize}
          className="w-10 h-8 flex items-center justify-center hover:bg-gray-500/10 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors rounded-md"
          title="تكبير"
        >
          <span className="material-symbols-rounded text-[18px]">check_box_outline_blank</span>
        </button>
        <button
          onClick={handleClose}
          className="w-10 h-8 flex items-center justify-center hover:bg-red-500/20 text-gray-500 hover:text-red-500 transition-colors rounded-md"
          title="إغلاق"
        >
          <span className="material-symbols-rounded text-[20px]">close</span>
        </button>
      </div>
    </div>
  );
};
