import { Clock, Menu, Search, User } from 'lucide-react';
import React from 'react';

interface EmployeeMobileDockProps {
  activeView: 'profile' | 'requests' | 'pricing';
  onViewChange: (view: 'profile' | 'requests' | 'pricing') => void;
  onOpenDrawer: () => void;
  language?: string;
  t: Translations;
  requestsCount?: number;
}

export const EmployeeMobileDock: React.FC<EmployeeMobileDockProps> = ({
  activeView,
  onViewChange,
  onOpenDrawer,
  language,
  t,
  requestsCount,
}) => {
  const _isRTL = language === 'AR';

  return (
    <nav
      className='md:hidden fixed bottom-6 left-0 right-0 z-60 w-full safe-area-bottom px-4 pb-1 flex justify-center items-center gap-2.5'
      aria-label='Employee navigation'
    >
      <div
        className={`
          relative flex items-stretch justify-around p-1 rounded-full w-[90%] max-w-[360px] mx-auto
          bg-black/[0.08] dark:bg-black/40 backdrop-blur-[40px]
          border border-black/10 dark:border-white/10
          shadow-xl shadow-black/5
          transition-all duration-500 ease-out
          overflow-hidden
        `}
      >
        <DockButton
          icon={Search}
          label={t.employeeProfile.prescriptionPricing}
          isActive={activeView === 'pricing'}
          onClick={() => onViewChange('pricing')}
        />
        <DockButton
          icon={User}
          label={t.employeeProfile.profile}
          isActive={activeView === 'profile'}
          onClick={() => onViewChange('profile')}
        />
        <DockButton
          icon={Clock}
          label={t.employeeProfile.pendingRequests}
          isActive={activeView === 'requests'}
          onClick={() => onViewChange('requests')}
          badgeCount={requestsCount}
        />
        <DockButton
          icon={Menu}
          label={t.employeeProfile.menu}
          isActive={false}
          onClick={onOpenDrawer}
        />
      </div>
    </nav>
  );
};

EmployeeMobileDock.displayName = 'EmployeeMobileDock';

// ---------------------------------------------------------------------------
// DockButton sub-component
// ---------------------------------------------------------------------------

interface DockButtonProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  badgeCount?: number;
}

const DockButton = React.memo<DockButtonProps>(
  ({ icon: Icon, label, isActive, onClick, badgeCount }) => (
    <button
      onClick={onClick}
      className={`
      relative flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-full transition-all duration-500
      ${
        isActive
          ? 'text-black dark:text-white z-10'
          : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
      }
    `}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      type='button'
    >
      {isActive && (
        <div className='absolute inset-0 bg-black/[0.1] dark:bg-white/10 rounded-full animate-scale-in pointer-events-none' />
      )}
      <div className='relative z-10 flex flex-col items-center justify-center min-h-[22px]'>
        <Icon
          className={`w-[22px] h-[22px] relative z-10 transition-all duration-500 ${isActive ? 'scale-110' : ''}`}
        />
        {!!badgeCount && badgeCount > 0 && (
          <span className='absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[9px] font-bold rounded-full px-1 shadow-sm z-20 animate-scale-in'>
            {badgeCount > 99 ? '99+' : badgeCount}
          </span>
        )}
      </div>
      <span
        className={`relative z-10 text-[9px] font-bold ${isActive ? 'opacity-100' : 'opacity-60'}`}
      >
        {label}
      </span>
    </button>
  )
);

DockButton.displayName = 'DockButton';
