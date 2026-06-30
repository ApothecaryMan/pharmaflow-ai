import { type React, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../../../context';
import { TRANSLATIONS } from '../../../../i18n/translations';
import { StatusBarItem } from '../StatusBarItem';
import { Calculator } from './Calculator';
import { CurrencyConverter } from './CurrencyConverter';
import { HolidaysTracker } from './HolidaysTracker';


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
  const { language } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [activeTool, setActiveTool] = useState<'converter' | 'calculator' | 'holidays'>(
    'converter'
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[language].settings;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && !isPinned)
        setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPinned]);

  const menuContainerClasses = useMemo(
    () => `
    absolute ${dropDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} 
    ${align === 'start' ? 'inset-s-0 origin-top-start' : 'inset-e-0 origin-top-end'}
    w-64 rounded-xl shadow-2xl border border-(--border-divider) z-110 animate-fade-in bg-(--bg-menu)
  `,
    [dropDirection, align]
  );

  const cT = t.currencyConverter;

  return (
    <div
      className={`relative ${showTrigger && triggerVariant === 'statusBar' ? 'h-full flex items-center' : ''}`}
      ref={dropdownRef}
    >
      {showTrigger &&
        (triggerVariant === 'statusBar' ? (
          <StatusBarItem
            icon='build'
            tooltip={t.tools}
            variant={isOpen ? 'info' : 'default'}
            onClick={() => setIsOpen(!isOpen)}
          />
        ) : (
          <button
            type='button'
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center justify-center w-10 h-10 ${isOpen ? 'text-primary-500' : 'text-(--text-secondary)'}`}
          >
            <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-settings)' }}>
              build
            </span>
          </button>
        ))}

      {isOpen && (
        <div className={menuContainerClasses}>
          {/* Segmented Control Header */}
          <div className='px-2 py-1.5 border-b border-(--border-divider) flex items-center justify-between'>
            <div className='flex bg-black/5 dark:bg-white/5 p-0.5 rounded-lg border border-(--border-divider) w-[80%]'>
              {(['converter', 'calculator', 'holidays'] as const).map((tool) => (
                <button
                  key={tool}
                  type='button'
                  onClick={() => setActiveTool(tool)}
                  className={`flex-1 py-1 flex items-center justify-center rounded-md transition-all duration-200 focus:outline-none ${activeTool === tool
                      ? 'bg-white dark:bg-white/10 text-primary-500 shadow-xs'
                      : 'text-(--text-secondary) hover:text-(--text-primary)'
                    }`}
                  title={
                    tool === 'converter'
                      ? cT?.title || 'Converter'
                      : tool === 'calculator'
                        ? t.calculator?.title || 'Calculator'
                        : t.holidays?.title || 'Holidays'
                  }
                >
                  <span className='material-symbols-rounded text-base leading-none'>
                    {tool === 'converter'
                      ? 'payments'
                      : tool === 'calculator'
                        ? 'calculate'
                        : 'calendar_month'}
                  </span>
                </button>
              ))}
            </div>

            <button
              type='button'
              onClick={() => setIsPinned(!isPinned)}
              className={`flex items-center justify-center w-10 h-10 rounded-full shadow-sm focus:outline-none bg-black/5 dark:bg-white/5 ${isPinned ? 'text-primary-500' : 'text-(--text-tertiary) hover:text-(--text-primary)'
                }`}
              title={isPinned ? 'Unpin' : 'Pin to stay open'}
            >
              <span className='material-symbols-rounded text-[16px] leading-none'>keep</span>
            </button>
          </div>

          <div className='p-3 space-y-3' style={{ direction: language === 'AR' ? 'rtl' : 'ltr' }}>
            {activeTool === 'calculator' && <Calculator />}
            {activeTool === 'converter' && <CurrencyConverter />}
            {activeTool === 'holidays' && <HolidaysTracker />}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsMenu;
