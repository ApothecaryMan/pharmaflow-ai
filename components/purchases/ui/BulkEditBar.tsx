import React from 'react';
import { Eraser, Trash2, ArrowRightLeft } from 'lucide-react';
import { useTheme } from '../../../context/ThemeContext';
import { HoverDropdown } from '../../common/HoverDropdown';
import { CellSelectionState } from '../hooks/useBulkSelection';
import { PurchaseItem } from '../../../types';

export type BulkEditField = keyof PurchaseItem | 'rowSelection';

interface BulkEditBarProps {
  cellSelection: CellSelectionState<BulkEditField>;
  bulkInputValue: string;
  setBulkInputValue: (val: string) => void;
  onApply: () => void;
  onClearValues: () => void;
  onClose: () => void;
  onDeleteRows?: () => void;
  onMoveToTab?: (tabId: string) => void;
  availableTabs?: { id: string; name: string; itemCount: number }[];
  language?: 'AR' | 'EN';
}

export const BulkEditBar: React.FC<BulkEditBarProps> = ({
  cellSelection,
  bulkInputValue,
  setBulkInputValue,
  onApply,
  onClearValues,
  onClose,
  onDeleteRows,
  onMoveToTab,
  availableTabs = [],
  language = 'AR',
}) => {
  let isMuted = false;
  try {
    const themeContext = useTheme();
    isMuted = themeContext.vividBg === 'muted';
  } catch (_e) {
    // Fallback
  }

  const count = cellSelection.indices.length;
  const isTextField = cellSelection.field === 'expiryDate' || cellSelection.field === 'batchNumber';
  const bgClass = isMuted ? 'bg-black/90 dark:bg-white/10' : 'bg-primary-950/90 dark:bg-white/10';

  return (
    <div id='bulk-edit-bar' className={`absolute top-3 inset-x-0 mx-auto w-fit z-40 ${bgClass} backdrop-blur-md border border-transparent dark:border-white/10 shadow-xl rounded-full px-4 py-2 flex items-center gap-3 animate-in fade-in slide-in-from-top-3 duration-200`}>
      <div className='flex items-center'>
        <span className='text-[1.4rem] font-black tabular-nums leading-none text-white/90'>
          {count}
        </span>
      </div>

      {cellSelection.field === 'rowSelection' ? (
        <div className='flex items-center gap-2'>
          <button
            type='button'
            onClick={onDeleteRows}
            className='h-7 px-3 text-xs font-bold bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all shadow-sm flex items-center gap-1'
          >
            <Trash2 size={16} />
            <span>{language === 'AR' ? 'حذف الصفوف' : 'Delete Rows'}</span>
          </button>

          {availableTabs.length > 0 && onMoveToTab && (
            <HoverDropdown
              trigger={
                <button
                  type='button'
                  className='h-7 px-3 text-xs font-bold bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all shadow-sm flex items-center gap-1 cursor-default'
                >
                  <ArrowRightLeft size={16} />
                  <span>{language === 'AR' ? 'نقل لفاتورة' : 'Move to Invoice'}</span>
                </button>
              }
              panelWidth='min-w-[150px]'
              panelClassName='bg-[#1a1b1e] border-gray-700 p-1'
            >
              {availableTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onMoveToTab(tab.id)}
                  title={tab.itemCount > 0 ? (language === 'AR' ? 'يوجد عناصر في هذه الفاتورة' : 'There are items in this invoice') : undefined}
                  className='w-full text-start px-3 py-2 text-sm text-gray-200 hover:bg-gray-800 rounded-md transition-colors flex items-center justify-between gap-3'
                >
                  <span className='truncate font-medium'>{tab.name}</span>
                  {tab.itemCount > 0 && (
                    <span className='text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded-full whitespace-nowrap'>
                      {tab.itemCount} {language === 'AR' ? 'عنصر' : 'item'}
                    </span>
                  )}
                </button>
              ))}
            </HoverDropdown>
          )}
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onApply();
          }}
          className='flex items-center gap-2'
        >
        <input
          type={isTextField ? 'text' : 'number'}
          autoFocus
          placeholder={language === 'AR' ? 'أدخل القيمة المشتركة...' : 'Enter common value...'}
          value={bulkInputValue}
          onChange={(e) => setBulkInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              onClose();
            }
          }}
          className='h-7 w-36 px-2.5 text-xs font-bold bg-white/10 border border-white/20 rounded-lg text-white placeholder:text-white/50 outline-none focus:border-white/50 focus:ring-1 focus:ring-white/50 transition-all'
        />
        <button
          type='submit'
          className='h-7 px-3 text-xs font-bold bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all shadow-sm flex items-center gap-1'
        >
          <span>{language === 'AR' ? 'تطبيق' : 'Apply'}</span>
        </button>
        <button
          type='button'
          onClick={onClearValues}
          className='h-7 px-3 text-xs font-bold bg-transparent hover:bg-white/10 text-white/80 hover:text-white rounded-lg transition-all shadow-sm flex items-center justify-center'
          title={language === 'AR' ? 'مسح' : 'Clear'}
        >
          <Eraser size={16} />
        </button>
        </form>
      )}
        <button
          type='button'
          onClick={onClose}
          className='h-7 px-2 text-xs font-semibold text-white/50 hover:text-white hover:bg-white/10 rounded-lg transition-all'
        >
          ✕
        </button>
    </div>
  );
};
