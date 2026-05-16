import { type React, useEffect, useRef, useState, useMemo } from 'react';
import { useSettings } from '../../../../context';
import { TRANSLATIONS } from '../../../../i18n/translations';
import { StatusBarItem } from '../StatusBarItem';
import { Calculator } from './Calculator';
import { CurrencyConverter } from './CurrencyConverter';

const getMenuSurfaceClasses = (isBlur: boolean, isMobile: boolean = false) => {
  if (!isBlur) return isMobile ? 'bg-(--bg-page-surface)' : 'bg-(--bg-menu)';
  return 'glass-surface';
};

export interface ToolsMenuProps {
  dropDirection?: 'up' | 'down';
  showTrigger?: boolean;
  align?: 'start' | 'end';
  triggerVariant?: 'statusBar' | 'navbar';
  triggerSize?: number;
}

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
  dropDirection = 'up',
  showTrigger = true,
  align = 'start',
  triggerVariant = 'statusBar',
}) => {
  const { language, settingsBlur } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [activeTool, setActiveTool] = useState<'converter' | 'calculator'>('converter');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[language].settings;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && !isPinned) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPinned]);

  const menuContainerClasses = useMemo(() => `
    absolute ${dropDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} 
    ${align === 'start' ? 'inset-s-0 origin-top-start' : 'inset-e-0 origin-top-end'}
    w-64 rounded-xl shadow-2xl border border-(--border-divider) z-110 animate-fade-in
    ${getMenuSurfaceClasses(settingsBlur)}
  `, [dropDirection, align, settingsBlur]);

  const cT = t.currencyConverter;

  return (
    <div className={`relative ${showTrigger && triggerVariant === 'statusBar' ? 'h-full flex items-center' : ''}`} ref={dropdownRef}>
      {showTrigger && (
        triggerVariant === 'statusBar' ? (
          <StatusBarItem icon="build" tooltip={t.tools} variant={isOpen ? 'info' : 'default'} onClick={() => setIsOpen(!isOpen)} />
        ) : (
          <button type="button" onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-center w-10 h-10 ${isOpen ? 'text-primary-500' : 'text-(--text-secondary)'}`}>
            <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-settings)' }}>build</span>
          </button>
        )
      )}

      {isOpen && (
        <div className={menuContainerClasses}>
          <div className="px-3 py-2 border-b border-(--border-divider) relative flex items-center justify-center">
            <button 
              type="button"
              onClick={() => setActiveTool(activeTool === 'converter' ? 'calculator' : 'converter')}
              className="flex items-center gap-1 text-xs font-bold text-(--text-primary) hover:text-primary-500 transition-colors select-none"
              title="Click to switch tool"
            >
              <span>{activeTool === 'converter' ? (cT?.title || 'Currency Converter') : (t.calculator?.title || 'Calculator')}</span>
              <span className="material-symbols-rounded text-sm opacity-60">{language === 'AR' ? 'chevron_left' : 'chevron_right'}</span>
            </button>
            <button 
              type="button"
              onClick={() => setIsPinned(!isPinned)}
              className={`absolute end-2 flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                isPinned ? 'text-primary-500' : 'text-(--text-tertiary)'
              }`}
              title={isPinned ? 'Unpin' : 'Pin to stay open'}
            >
              <span className="material-symbols-rounded text-[16px]">keep</span>
            </button>
          </div>
          
          <div className="p-3 space-y-3" style={{ direction: language === 'AR' ? 'rtl' : 'ltr' }}>
            {activeTool === 'calculator' ? (
              <Calculator />
            ) : (
              <CurrencyConverter />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsMenu;
