import React from 'react';
import { PHARMACY_MENU } from '../menuData';
import { SidebarMenu } from './SidebarMenu';

interface SidebarContentProps {
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
}

export const SidebarContent: React.FC<SidebarContentProps> = ({
  activeModule,
  view,
  dashboardSubView,
  onNavigate,
  onViewChange,
  isMobile = false,
  theme,
  t,
  language,
  tip
}) => {
  return (
    <>
      <SidebarMenu 
        menuItems={PHARMACY_MENU}
        activeModule={activeModule}
        currentView={activeModule === 'dashboard' && view === 'dashboard' ? dashboardSubView : view}
        onNavigate={onNavigate}
        onViewChange={onViewChange}
        isMobile={isMobile}
        theme={theme.primary}
        translations={t}
        language={language}
      />
      <div className="mt-auto space-y-4 pt-4">
        <div className="px-4 pb-2 text-center text-[10px] text-slate-400">
          <p>{tip}</p>
        </div>
      </div>
    </>
  );
};
