import { useMemo, useState } from 'react';
import type { ShortcutCategory } from '@/hooks/keyboard';
import { SHORTCUT_CATEGORIES, useKeyboardContext } from '@/hooks/keyboard';
import { INPUT_BASE } from '@/utils/themeStyles';
import { Modal } from './Modal';

interface ShortcutsOverlayProps {
  language: 'AR' | 'EN';
}

export function ShortcutsOverlay({ language }: ShortcutsOverlayProps) {
  const { shortcutsOverlayOpen, setShortcutsOverlayOpen } = useKeyboardContext();
  const [filter, setFilter] = useState('');

  const filteredCategories = useMemo(() => {
    if (!filter) return SHORTCUT_CATEGORIES;
    const q = filter.toLowerCase();
    return SHORTCUT_CATEGORIES.reduce<ShortcutCategory[]>((acc, cat) => {
      const filteredShortcuts = cat.shortcuts.filter(
        (s) =>
          s.label.toLowerCase().includes(q) ||
          s.labelAr.includes(filter) ||
          s.keys.toLowerCase().includes(q)
      );
      if (filteredShortcuts.length > 0) {
        acc.push({ ...cat, shortcuts: filteredShortcuts });
      }
      return acc;
    }, []);
  }, [filter]);

  const close = () => {
    setShortcutsOverlayOpen(false);
    setFilter('');
  };

  return (
    <Modal
      isOpen={shortcutsOverlayOpen}
      onClose={close}
      size='4xl'
      icon='keyboard'
      title={language === 'AR' ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
      bodyClassName='p-0 flex flex-col'
      height='80vh'
    >
      <div className='shrink-0 px-6 pt-5 pb-3 border-b border-(--border-divider)'>
        <input
          type='text'
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder={language === 'AR' ? 'ابحث عن اختصار...' : 'Search shortcuts...'}
          className={INPUT_BASE}
        />
      </div>
      <div className='flex-1 overflow-y-auto p-6 pt-4'>
        <div className='grid gap-6 md:grid-cols-2'>
          {filteredCategories.map((category) => (
            <div key={category.name}>
              <h3
                className='mb-3 text-xs font-bold uppercase tracking-wider text-(--text-tertiary) !font-["GraphicSansFont"]'
                style={{
                  fontFeatureSettings:
                    '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1',
                }}
              >
                {language === 'AR' ? category.nameAr : category.name}
              </h3>
              <div className='space-y-2'>
                {category.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className='flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-(--bg-hover) transition-colors'
                  >
                    <span className='text-sm text-(--text-primary)'>
                      {language === 'AR' ? shortcut.labelAr : shortcut.label}
                    </span>
                    <div dir='ltr' className='flex items-center gap-1.5'>
                      {(() => {
                        const k = shortcut.keys.trim();
                        let parts: string[];
                        if (k === '+') parts = ['+'];
                        else if (k.endsWith('++')) parts = [...k.slice(0, -2).split('+'), '+'];
                        else if (k.endsWith('+')) parts = [...k.slice(0, -1).split('+'), '+'];
                        else parts = k.split('+');
                        const validParts = parts.filter((p) => p.trim() !== '');
                        return validParts.map((part, index) => (
                          <div key={part} className='flex items-center gap-1.5'>
                            {index > 0 && (
                              <span className='text-sm font-medium text-(--text-tertiary)'>+</span>
                            )}
                            <kbd className='flex items-center justify-center min-w-[24px] rounded-lg border border-(--border-divider) bg-gradient-to-b from-white to-gray-100 px-2.5 py-1 font-mono text-xs font-bold text-(--text-secondary) shadow-sm dark:from-gray-700 dark:to-gray-800 dark:border-gray-600 dark:text-gray-200'>
                              {part}
                            </kbd>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <p className='py-8 text-center text-sm text-(--text-tertiary)'>
            {language === 'AR' ? 'لا توجد اختصارات مطابقة' : 'No matching shortcuts'}
          </p>
        )}
      </div>
    </Modal>
  );
}
