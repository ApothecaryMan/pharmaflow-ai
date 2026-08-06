import { type React, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

      <AnimatePresence>
        {isOpen && (
          <motion.div
            layout
            initial={{ opacity: 0, y: dropDirection === 'up' ? 10 : -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: dropDirection === 'up' ? 10 : -10, scale: 0.95 }}
            transition={{ 
              duration: 0.2, 
              layout: { type: "spring", bounce: 0, duration: 0.3 } 
            }}
            className={menuContainerClasses}
          >
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
                    className='flex items-center justify-center w-8 h-8 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-(--text-secondary) hover:text-(--text-primary) focus:outline-none'
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
                  className={`flex items-center justify-center w-8 h-8 rounded-full focus:outline-none hover:bg-black/5 dark:hover:bg-white/5 ${isPinned ? 'text-primary-500' : 'text-(--text-tertiary) hover:text-(--text-primary)'
                    }`}
                  title={isPinned ? 'Unpin' : 'Pin to stay open'}
                >
                  <span className='material-symbols-rounded text-[18px] leading-none'>keep</span>
                </button>
              </>
            )}
          </div>

          <div className='relative overflow-hidden' style={{ direction: language === 'AR' ? 'rtl' : 'ltr' }}>
            <AnimatePresence mode="popLayout" initial={false}>
              {activeTool === null ? (
                <motion.div
                  key="tools-grid"
                  initial={{ opacity: 0, x: language === 'AR' ? 30 : -30 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } }}
                  exit={{ opacity: 0, x: language === 'AR' ? 30 : -30, transition: { opacity: { duration: 0.1 }, x: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } } }}
                  className='grid grid-cols-2 gap-3 w-full p-3'
                >
                  {(['directory', 'converter', 'calculator', 'holidays'] as const).map((tool) => {
                    const title = tool === 'directory'
                      ? (language === 'AR' ? 'دليل الفروع' : 'Branches Directory')
                      : tool === 'converter'
                        ? cT?.title || 'Converter'
                        : tool === 'calculator'
                          ? t.calculator?.title || 'Calculator'
                          : t.holidays?.title || 'Holidays';
                    const imageSrc = tool === 'directory'
                      ? '/icons/3d/tool_directory_1785943812253.webp'
                      : tool === 'converter'
                        ? '/icons/3d/tool_currency_1785943801685.webp'
                        : tool === 'calculator'
                          ? '/icons/3d/tool_calculator_1785943791502.webp'
                          : '/icons/3d/tool_holidays_1785943824282.webp';
                    return (
                      <button
                        key={tool}
                        type='button'
                        onClick={() => setActiveTool(tool)}
                        className='group flex flex-col items-center justify-between p-3 rounded-2xl hover:bg-black/5 dark:hover:bg-white/5 focus:outline-none w-full aspect-square'
                        title={title}
                      >
                        <div className='flex-1 flex items-center justify-center w-full select-none'>
                          <img src={imageSrc} alt={title} draggable="false" className='w-14 h-14 scale-[1] object-contain pointer-events-none' />
                        </div>
                        <span className='text-xs font-semibold text-(--text-secondary) group-hover:text-(--text-primary) text-center leading-tight line-clamp-2 mt-1'>{title}</span>
                      </button>
                    );
                  })}
                </motion.div>
              ) : (
                <motion.div
                  key="active-tool"
                  initial={{ opacity: 0, x: language === 'AR' ? -30 : 30 }}
                  animate={{ opacity: 1, x: 0, transition: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } }}
                  exit={{ opacity: 0, x: language === 'AR' ? -30 : 30, transition: { opacity: { duration: 0.1 }, x: { duration: 0.25, ease: [0.32, 0.72, 0, 1] } } }}
                  className='space-y-3 w-full p-3'
                >
                  {activeTool === 'directory' && <BranchDirectory />}
                  {activeTool === 'calculator' && <Calculator />}
                  {activeTool === 'converter' && <CurrencyConverter />}
                  {activeTool === 'holidays' && <HolidaysTracker />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
};

export default ToolsMenu;
