import { type React, useEffect, useMemo, useRef, useState } from 'react';
import { useSettings } from '../../../../context';
import { TRANSLATIONS } from '../../../../i18n/translations';
import { StatusBarItem } from '../StatusBarItem';
import { Calculator } from './Calculator';
import { CurrencyConverter } from './CurrencyConverter';
import { HolidaysTracker } from './HolidaysTracker';
import { BranchDirectory } from './BranchDirectory';

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
  const [activeTool, setActiveTool] = useState<'converter' | 'calculator' | 'holidays' | 'directory' | null>(
    null
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
 w-64 rounded-xl shadow-2xl border border-(--border-divider) z-110 bg-(--bg-menu)
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
          {/* Header */}
          <div className='px-2 py-1.5 border-b border-(--border-divider) flex items-center justify-between'>
            {activeTool === null ? (
              <span className="text-sm font-medium text-(--text-primary) w-full text-center">{t.tools || 'Tools'}</span>
            ) : (
              <>
                <div className="flex items-center gap-1">
                  <button
                    type='button'
                    onClick={() => setActiveTool(null)}
                    className='flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-(--text-secondary) hover:text-(--text-primary) focus:outline-none transition-colors'
                    title={language === 'AR' ? 'رجوع' : 'Back'}
                  >
                    <span className='material-symbols-rounded text-[20px] rtl:-scale-x-100'>
                      arrow_back
                    </span>
                  </button>
                  <span className="text-sm font-medium text-(--text-primary)">
                    {activeTool === 'directory'
                      ? (language === 'AR' ? 'دليل الفروع' : 'Branches Directory')
                      : activeTool === 'converter'
                        ? cT?.title || 'Converter'
                        : activeTool === 'calculator'
                          ? t.calculator?.title || 'Calculator'
                          : t.holidays?.title || 'Holidays'}
                  </span>
                </div>

                <button
                  type='button'
                  onClick={() => setIsPinned(!isPinned)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full focus:outline-none hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${
                    isPinned ? 'text-primary-500' : 'text-(--text-tertiary) hover:text-(--text-primary)'
                  }`}
                  title={isPinned ? 'Unpin' : 'Pin to stay open'}
                >
                  <span className='material-symbols-rounded text-[18px] leading-none'>keep</span>
                </button>
              </>
            )}
          </div>

          <div className='p-3' style={{ direction: language === 'AR' ? 'rtl' : 'ltr' }}>
            {activeTool === null ? (
              <div className='flex flex-col space-y-1'>
                {(['directory', 'converter', 'calculator', 'holidays'] as const).map((tool) => {
                  const title = tool === 'directory'
                    ? (language === 'AR' ? 'دليل الفروع' : 'Branches Directory')
                    : tool === 'converter'
                      ? cT?.title || 'Converter'
                      : tool === 'calculator'
                        ? t.calculator?.title || 'Calculator'
                        : t.holidays?.title || 'Holidays';
                  const icon = tool === 'directory'
                    ? 'contact_phone'
                    : tool === 'converter'
                      ? 'payments'
                      : tool === 'calculator'
                        ? 'calculate'
                        : 'calendar_month';
                  return (
                    <button
                      key={tool}
                      type='button'
                      onClick={() => setActiveTool(tool)}
                      className='flex items-center gap-3 p-2.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-(--text-secondary) hover:text-(--text-primary) transition-colors focus:outline-none w-full text-start'
                      title={title}
                    >
                      <span className='material-symbols-rounded text-[20px]'>{icon}</span>
                      <span className='text-sm font-medium'>{title}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className='space-y-3'>
                {activeTool === 'directory' && <BranchDirectory />}
                {activeTool === 'calculator' && <Calculator />}
                {activeTool === 'converter' && <CurrencyConverter />}
                {activeTool === 'holidays' && <HolidaysTracker />}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsMenu;
