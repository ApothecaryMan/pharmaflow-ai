import type React from 'react';
import { TabBar } from '../../../layout/TabBar';
import type { SaleTab } from '../../../../types';

interface POSPageHeaderProps {
  t: any;
  color: string;
  tabs: SaleTab[];
  activeTabId: string;
  switchTab: (id: string) => void;
  removeTab: (id: string) => void;
  addTab: () => void;
  renameTab: (id: string, newName: string) => void;
  togglePin: (id: string) => void;
  reorderTabs: (newOrder: SaleTab[]) => void;
  maxTabs: number;
  setShowDeliveryModal: (show: boolean) => void;
}

export const POSPageHeader: React.FC<POSPageHeaderProps> = ({
  t,
  color,
  tabs,
  activeTabId,
  switchTab,
  removeTab,
  addTab,
  renameTab,
  togglePin,
  reorderTabs,
  maxTabs,
  setShowDeliveryModal,
}) => {
  return (
    <div className='flex items-center gap-4 px-2 min-h-12 shrink-0 py-1'>
      {/* Header - Compact */}
      <h1 className='text-2xl font-bold tracking-tight shrink-0'>{t.posTitle}</h1>

      <button
        onClick={() => setShowDeliveryModal(true)}
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-primary-200 dark:border-primary-900/50 text-primary-700 dark:text-primary-400 text-xs font-bold uppercase tracking-wider bg-transparent hover:bg-primary-600 dark:hover:bg-primary-500 hover:text-white dark:hover:text-white hover:border-primary-600 dark:hover:border-primary-500 transition-all duration-200 cursor-pointer shadow-sm`}
      >
        <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
          local_shipping
        </span>
        {t.deliveryOrders || 'Delivery Orders'}
      </button>

      {/* Tab Bar - Takes remaining space */}
      <div className='flex-1 min-w-0'>
        <TabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabClick={switchTab}
          onTabClose={removeTab}
          onTabAdd={addTab}
          onTabRename={renameTab}
          onTogglePin={togglePin}
          onTabReorder={reorderTabs}
          maxTabs={maxTabs}
          color={color}
          t={t}
        />
      </div>
    </div>
  );
};
