import { Command } from 'cmdk';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback } from 'react';
import { PAGE_REGISTRY } from '@/config/pageRegistry';
import { useKeyboardContext } from '@/hooks/keyboard';

interface CommandPaletteProps {
  language: 'AR' | 'EN';
  handleNavigate: (viewId: string) => void;
}

export function CommandPalette({ language, handleNavigate }: CommandPaletteProps) {
  const { commandPaletteOpen, setCommandPaletteOpen } = useKeyboardContext();

  const close = useCallback(() => setCommandPaletteOpen(false), [setCommandPaletteOpen]);

  return (
    <AnimatePresence>
      {commandPaletteOpen && (
        <motion.div
          className='fixed inset-0 z-50 flex items-start justify-center pt-[15vh]'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <button
            type='button'
            className='absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm'
            tabIndex={-1}
            onClick={close}
          />
          <motion.div
            className='relative w-full max-w-xl'
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            dir={language === 'AR' ? 'rtl' : 'ltr'}
          >
            <Command
              className='overflow-hidden rounded-2xl border border-(--border-divider) bg-(--bg-card) shadow-2xl'
              label='Command Palette'
            >
              <div className='flex items-center border-b border-(--border-divider) px-4'>
                <span className='material-symbols-rounded text-(--text-tertiary) text-xl'>
                  search
                </span>
                <Command.Input
                  placeholder={language === 'AR' ? 'ابحث عن أمر...' : 'Search commands...'}
                  className='w-full bg-transparent px-3 py-4 text-sm text-(--text-primary) outline-hidden placeholder-(--text-tertiary)'
                />
              </div>
              <Command.List className='max-h-72 overflow-y-auto p-2'>
                <Command.Empty className='py-6 text-center text-sm text-(--text-tertiary)'>
                  {language === 'AR' ? 'لا توجد نتائج' : 'No results found'}
                </Command.Empty>
                <Command.Group
                  heading={
                    <span className='px-2 text-xs font-semibold uppercase tracking-wider text-(--text-tertiary)'>
                      {language === 'AR' ? 'التنقل' : 'Navigation'}
                    </span>
                  }
                >
                  {Object.values(PAGE_REGISTRY).map((page) => (
                    <Command.Item
                      key={page.id}
                      value={`${page.menuLabel} ${page.menuLabelAr} ${page.id}`}
                      onSelect={() => {
                        handleNavigate(page.id);
                        close();
                      }}
                      className='flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-(--text-primary) data-[selected=true]:bg-(--bg-hover) data-[selected=true]:text-(--text-primary) transition-colors'
                    >
                      {page.icon && (
                        <span className='material-symbols-rounded text-(--text-tertiary) text-lg'>
                          {page.icon}
                        </span>
                      )}
                      <span>{language === 'AR' ? page.menuLabelAr : page.menuLabel}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>
            </Command>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
