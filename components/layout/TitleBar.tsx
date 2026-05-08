import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useSettings } from '../../context';
import { isTauri } from '../../utils/platform';
import { useData } from '../../context/DataContext';

const appWindow = isTauri() ? getCurrentWindow() : null;

export const TitleBar: React.FC = () => {
  const { darkMode } = useSettings();
  const { branches, activeBranchId, activeOrg } = useData();
  
  if (!isTauri()) return null;

  const activeBranch = branches.find(b => b.id === activeBranchId);
  const orgName = activeOrg?.name || ''; 
  const branchName = activeBranch?.name || '';
  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div 
      data-tauri-drag-region 
      dir="ltr"
      className="h-10 backdrop-blur-md flex items-center justify-between px-3 select-none z-[9999]"
      style={{
        backgroundColor: 'var(--bg-navbar)',
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
          ZINC <span className="mx-1 opacity-20">|</span> Pharmacy
        </span>
      </div>

      {/* Middle Content: Org - Branch */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none"
        dir="rtl"
        style={{ fontFamily: 'GraphicSansFont, sans-serif' }}
      >
        {orgName && (
          <span className="text-[14px] font-normal text-gray-500 dark:text-gray-400">
            {orgName}
          </span>
        )}
        {orgName && branchName && (
          <span className="text-gray-500 dark:text-gray-400 opacity-40">-</span>
        )}
        {branchName && (
          <span className="text-[16px] font-medium text-gray-500 dark:text-gray-400">
            {branchName}
          </span>
        )}
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
