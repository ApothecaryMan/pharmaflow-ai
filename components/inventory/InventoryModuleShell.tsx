import React, { useState } from 'react';
import { useSettings, CatalogProvider } from '../../context';
import { storage } from '../../utils/storage';
import { PageHeader } from '../common/PageHeader';
import { SegmentedControl } from '../common/SegmentedControl';
import { InventoryHeaderContext } from './InventoryHeaderContext';

interface InventoryModuleShellProps {
  activeView: string;
  onViewChange: (view: any) => void;
  t: Translations;
  children: React.ReactNode;
}

export const InventoryModuleShell: React.FC<InventoryModuleShellProps> = ({
  activeView,
  onViewChange,
  t,
  children,
}) => {
  const { language } = useSettings();
  const isRTL = language === 'AR';

  // Dynamic slot states
  const [leftContent, setLeftContent] = useState<React.ReactNode>(null);
  const [rightContent, setRightContent] = useState<React.ReactNode>(null);
  const [bottomContent, setBottomContent] = useState<React.ReactNode>(null);
  const [showStatsToggle, setShowStatsToggle] = useState(false);

  // Read initial stats visibility from local storage (default to true)
  const [showStats, setShowStats] = useState<boolean>(() => {
    return storage.get('inventory_stats_visible', true);
  });

  // Handle manual statistics visibility toggling
  const handleToggleStats = () => {
    const nextVal = !showStats;
    setShowStats(nextVal);
    storage.set('inventory_stats_visible', nextVal);
  };

  const contextValue = React.useMemo(
    () => ({
      setLeftContent,
      setRightContent,
      setBottomContent,
      setShowStatsToggle,
      setShowStats,
      showStats,
    }),
    [showStats]
  );

  return (
    <CatalogProvider>
    <InventoryHeaderContext.Provider value={contextValue}>
      <div className='h-full flex flex-col' dir={isRTL ? 'rtl' : 'ltr'}>
        <PageHeader
          mb='mb-0'
          leftContent={leftContent}
          centerContent={
            <SegmentedControl
              options={[
                {
                  label: t.inventory?.tabs?.inventory || (isRTL ? 'المخزون' : 'Inventory'),
                  value: 'inventory',
                  icon: 'inventory_2',
                },
                {
                  label: t.inventory?.tabs?.addProduct || (isRTL ? 'إضافة منتج' : 'Add Product'),
                  value: 'add-product',
                  icon: 'add_circle',
                },
                {
                  label:
                    t.inventory?.tabs?.stockMovement || (isRTL ? 'حركة المخزون' : 'Stock Movement'),
                  value: 'stock-movement',
                  icon: 'sync_alt',
                },
                {
                  label: t.inventory?.tabs?.shortages || (isRTL ? 'النواقص' : 'Shortages'),
                  value: 'shortages',
                  icon: 'warning',
                },
              ]}
              value={activeView}
              onChange={(val) => onViewChange(val)}
              size='sm'
              shape='pill'
              useGraphicFont={true}
            />
          }
          rightContent={rightContent}
          bottomContent={bottomContent}
          showStatsToggle={showStatsToggle}
          showBottom={showStats}
          onToggleBottom={handleToggleStats}
        />
        <div className='flex-1 overflow-hidden'>{children}</div>
      </div>
    </InventoryHeaderContext.Provider>
    </CatalogProvider>
  );
};
