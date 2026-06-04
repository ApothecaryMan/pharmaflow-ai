import React, { useState, useEffect } from 'react';
import { PageHeader } from '../common/PageHeader';
import { SegmentedControl } from '../common/SegmentedControl';
import { InventoryHeaderContext } from './InventoryHeaderContext';
import { useSettings } from '../../context';
import { storage } from '../../utils/storage';

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


  return (
    <InventoryHeaderContext.Provider
      value={{
        setLeftContent,
        setRightContent,
        setBottomContent,
        setShowStatsToggle,
        setShowStats,
        showStats,
      }}
    >
      <div className="h-full flex flex-col bg-(--bg-page-surface)" dir={isRTL ? 'rtl' : 'ltr'}>
        <PageHeader
          mb="mb-0"
          leftContent={leftContent}
          centerContent={
            <SegmentedControl
              options={[
                { label: t.inventory?.tabs?.inventory || (isRTL ? 'المخزون' : 'Inventory'), value: 'inventory' },
                { label: t.inventory?.tabs?.addProduct || (isRTL ? 'إضافة منتج' : 'Add Product'), value: 'add-product' },
                { label: t.inventory?.tabs?.stockMovement || (isRTL ? 'حركة المخزون' : 'Stock Movement'), value: 'stock-movement' },
                { label: t.inventory?.tabs?.shortages || (isRTL ? 'النواقص' : 'Shortages'), value: 'shortages' },
              ]}
              value={activeView}
              onChange={(val) => onViewChange(val)}
              size="md"
              shape="pill"
            />
          }
          rightContent={rightContent}
          bottomContent={bottomContent}
          showStatsToggle={showStatsToggle}
          showBottom={showStats}
          onToggleBottom={handleToggleStats}
        />
        <div className="flex-1 overflow-hidden">
          {children}
        </div>
      </div>
    </InventoryHeaderContext.Provider>
  );
};
