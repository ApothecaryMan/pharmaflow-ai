import React, { useState, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Modal } from '../../../common/Modal';
import { MaterialTabs } from '../../../common/MaterialTabs';
import { SaleTab } from '../../../../types';
import { TRANSLATIONS } from '../../../../i18n/translations';
import { formatTime } from '../utils/POSUtils';
import { Tooltip } from '../../../common/Tooltip';

interface ClosedTabsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  closedTabs: SaleTab[];
  onRestoreTab: (tabId: string) => void;
  t: typeof TRANSLATIONS.EN.pos;
  isRTL?: boolean;
}

interface ClosedTabRowProps {
  tab: SaleTab;
  index: number;
  total: number;
  onRestore: (id: string) => void;
  t: any;
  isRTL: boolean;
}

const ClosedTabRow: React.FC<ClosedTabRowProps> = ({ tab, index, total, onRestore, t, isRTL }) => {
  const cartTitle = t.cartTitle || (isRTL ? 'محتويات السلة' : 'Cart Items');

  return (
    <MaterialTabs
      index={index}
      total={total}
      role="listitem"
      className="!h-[68px] !px-4 !bg-gray-50/40 dark:!bg-white/[0.03] !hover:bg-gray-50/40 dark:!hover:bg-white/[0.03] !cursor-default border border-gray-200/50 dark:border-white/[0.05]"
    >
      <div className="flex items-center justify-between w-full">
        {/* Restore Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRestore(tab.id);
          }}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-500/10 hover:bg-primary-500/20 dark:bg-primary-400/10 dark:hover:bg-primary-400/20 rounded-lg transition-all active:scale-95"
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>restore</span>
          <span dir="auto">{t.restoreTab || 'Restore'}</span>
        </button>

        {/* Tab Info + Count Indicator Group */}
        <div className="flex items-center gap-4 text-start">
          <div className="flex flex-col items-start">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base leading-tight" dir="auto">
              {tab.name}
              {tab.customerName && (
                <span className="mx-2 text-gray-400 dark:text-gray-600 font-normal">|</span>
              )}
              <span className="text-primary-600 dark:text-primary-400">{tab.customerName}</span>
            </h3>
            {tab.closedAt && (
              <div className="flex items-center gap-1 mt-0.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>schedule</span>
                {formatTime(tab.closedAt)}
              </div>
            )}
          </div>

          {/* Circular Count Indicator with Tooltip */}
          <Tooltip
            delay={100}
            content={
              <div className="min-w-[200px]">
                <div className="text-[10px] font-black uppercase tracking-wider mb-2 border-b border-gray-200/50 dark:border-gray-800/50 pb-1 text-gray-500 flex items-center justify-between">
                  <span>{cartTitle}</span>
                  <span className="text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 px-1.5 rounded">{tab.cart.length}</span>
                </div>
                <ul className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto no-scrollbar" role="list">
                  {tab.cart.map((item, itemIdx) => (
                    <li key={`${item.id}-${itemIdx}`} className="text-[11px] flex items-center justify-between gap-3 font-semibold" role="listitem">
                      <span className="truncate flex-1" dir="auto">{item.name} {item.dosageForm}</span>
                      <span className="tabular-nums text-primary-600 dark:text-primary-400 font-black">
                        {item.quantity}{item.isUnit ? ' U' : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            }
          >
            <div className="w-12 h-12 rounded-full border border-gray-200 dark:border-white/[0.1] flex flex-col items-center justify-center text-gray-700 dark:text-gray-300 bg-white dark:bg-transparent shadow-xs cursor-help transition-colors hover:border-primary-500/30 dark:hover:border-primary-400/30">
              <span className="text-lg font-black tabular-nums leading-none">{tab.cart.length}</span>
              <span className="text-[8px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 mt-0.5">
                {isRTL ? 'عنصر' : (t.items || 'Items')}
              </span>
            </div>
          </Tooltip>
        </div>
      </div>
    </MaterialTabs>
  );
};

export const ClosedTabsHistoryModal: React.FC<ClosedTabsHistoryModalProps> = ({
  isOpen,
  onClose,
  closedTabs,
  onRestoreTab,
  t,
  isRTL = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.closedTabsTitle || 'Recently Closed Tabs'}
      icon="history"
      size="lg"
    >
      {closedTabs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          <span className="material-symbols-rounded text-6xl mb-4 opacity-50">tab_close</span>
          <p>{t.closedTabsEmpty || 'No recently closed tabs.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5" role="list">
          {closedTabs.map((tab, index) => (
            <ClosedTabRow
              key={`${tab.id}-${index}`}
              tab={tab}
              index={index}
              total={closedTabs.length}
              onRestore={(id) => {
                onRestoreTab(id);
                if (closedTabs.length === 1) {
                  onClose();
                }
              }}
              t={t}
              isRTL={isRTL}
            />
          ))}
        </div>
      )}
    </Modal>
  );
};
