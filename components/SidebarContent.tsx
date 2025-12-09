import React from 'react';
import { PHARMACY_MENU } from '../menuData';
import { SidebarMenu } from './SidebarMenu';

interface SidebarContentProps {
  menuItems?: any[]; // Allow optional passed items, default to import if needed, but App.tsx passes it now.
  activeModule: string;
  view: string;
  dashboardSubView: string;
  onNavigate: (viewId: string) => void;
  onViewChange: (viewId: string) => void;
  isMobile?: boolean;
  theme: any;
  t: any;
  language: 'EN' | 'AR';
  tip: string;
  hideInactiveModules?: boolean;
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  menuItems = PHARMACY_MENU,
  activeModule,
  view,
  dashboardSubView,
  onNavigate,
  onViewChange,
  isMobile = false,
  theme,
  t,
  language,
  tip,
  hideInactiveModules = false
}) => {
  return (
    <>
      <SidebarMenu 
        menuItems={menuItems}
        activeModule={activeModule}
        currentView={activeModule === 'dashboard' && view === 'dashboard' ? dashboardSubView : view}
        onNavigate={onNavigate}
        onViewChange={onViewChange}
        isMobile={isMobile}
        theme={theme.primary}
        translations={t}
        language={language}
        hideInactiveModules={hideInactiveModules}
      />
      <div className="mt-auto space-y-4 pt-4">
        <div className="px-4 pb-2 text-center text-[10px] text-gray-400">
          <p>{tip}</p>
        </div>
      </div>
    </>
  );
};
