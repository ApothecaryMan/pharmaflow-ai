import React from 'react';
import { canPerformAction } from '../../config/permissions';
import { MobileDrawer } from './MobileDrawer';
import { UserRole } from '../../config/permissions';

interface MobileNavigationProps {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  filteredMenuItems: any[];
  activeModule: string;
  handleModuleChange: (id: string) => void;
  view: string;
  dashboardSubView: string;
  handleNavigate: (path: string) => void;
  handleViewChange: (view: string) => void;
  theme: any;
  t: any;
  language: 'EN' | 'AR';
  hideInactiveModules: boolean;
  userRole: UserRole;
  isStandalone: boolean;
  profileImage: string | null;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  mobileMenuOpen,
  setMobileMenuOpen,
  filteredMenuItems,
  activeModule,
  handleModuleChange,
  view,
  dashboardSubView,
  handleNavigate,
  handleViewChange,
  theme,
  t,
  language,
  hideInactiveModules,
  userRole,
  isStandalone,
  profileImage
}) => {
  if (isStandalone) return null;

  return (
    <>
      {/* New Immersive Mobile Drawer */}
      <MobileDrawer 
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        filteredMenuItems={filteredMenuItems}
        activeModule={activeModule}
        handleModuleChange={handleModuleChange}
        view={view}
        dashboardSubView={dashboardSubView}
        handleNavigate={handleNavigate}
        handleViewChange={handleViewChange}
        t={t}
        profileImage={profileImage}
      />

      {/* Mobile Floating Dock Navigation */}
      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] w-[92%] max-w-[400px] safe-area-bottom">
        <div className={`
          flex items-center justify-between p-1.5 rounded-[2rem]
          bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl
          border border-gray-200/50 dark:border-gray-800/50
          shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]
        `}>
          {canPerformAction(userRole, 'reports.view_inventory') && (
            <button 
              onClick={() => handleViewChange('dashboard')} 
              className={`
                h-12 flex items-center justify-center rounded-[1.5rem] transition-fluid
                ${view === 'dashboard' 
                  ? `flex-grow bg-${theme.primary}-100 dark:bg-${theme.primary}-500/20 text-${theme.primary}-700 dark:text-${theme.primary}-300 px-5 gap-2 shadow-sm` 
                  : 'w-12 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              <span className={`material-symbols-rounded text-[24px] ${view === 'dashboard' ? 'font-fill' : ''}`}>dashboard_customize</span>
              <div className={`animate-grid-expand ${view === 'dashboard' ? 'active' : ''}`}>
                <div className="overflow-hidden whitespace-nowrap font-bold text-sm">
                  {t.nav?.dashboard || 'Dashboard'}
                </div>
              </div>
            </button>
          )}
          
          {canPerformAction(userRole, 'sale.create') && (
            <button 
              onClick={() => handleViewChange('pos')} 
              className={`
                h-12 flex items-center justify-center rounded-[1.5rem] transition-fluid
                ${view === 'pos' 
                  ? `flex-grow bg-${theme.primary}-100 dark:bg-${theme.primary}-500/20 text-${theme.primary}-700 dark:text-${theme.primary}-300 px-5 gap-2 shadow-sm` 
                  : 'w-12 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              <span className={`material-symbols-rounded text-[24px] ${view === 'pos' ? 'font-fill' : ''}`}>point_of_sale</span>
              <div className={`animate-grid-expand ${view === 'pos' ? 'active' : ''}`}>
                <div className="overflow-hidden whitespace-nowrap font-bold text-sm">
                  {t.nav?.sales || 'Sales'}
                </div>
              </div>
            </button>
          )}

          {canPerformAction(userRole, 'inventory.view') && (
            <button 
              onClick={() => handleViewChange('inventory')} 
              className={`
                h-12 flex items-center justify-center rounded-[1.5rem] transition-fluid
                ${view === 'inventory' 
                  ? `flex-grow bg-${theme.primary}-100 dark:bg-${theme.primary}-500/20 text-${theme.primary}-700 dark:text-${theme.primary}-300 px-5 gap-2 shadow-sm` 
                  : 'w-12 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              <span className={`material-symbols-rounded text-[24px] ${view === 'inventory' ? 'font-fill' : ''}`}>package_2</span>
              <div className={`animate-grid-expand ${view === 'inventory' ? 'active' : ''}`}>
                <div className="overflow-hidden whitespace-nowrap font-bold text-sm">
                  {t.nav?.inventory || 'Inventory'}
                </div>
              </div>
            </button>
          )}

          {canPerformAction(userRole, 'purchase.view') && (
            <button 
              onClick={() => handleViewChange('purchases')} 
              className={`
                h-12 flex items-center justify-center rounded-[1.5rem] transition-fluid
                ${view === 'purchases' 
                  ? `flex-grow bg-${theme.primary}-100 dark:bg-${theme.primary}-500/20 text-${theme.primary}-700 dark:text-${theme.primary}-300 px-5 gap-2 shadow-sm` 
                  : 'w-12 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }
              `}
            >
              <span className={`material-symbols-rounded text-[24px] ${view === 'purchases' ? 'font-fill' : ''}`}>shopping_cart_checkout</span>
              <div className={`animate-grid-expand ${view === 'purchases' ? 'active' : ''}`}>
                <div className="overflow-hidden whitespace-nowrap font-bold text-sm">
                  {t.nav?.purchase || 'Purchase'}
                </div>
              </div>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
