import React, { useEffect, useRef } from 'react';
import { UserCircle, Clock, LogOut, Menu, Sun, Moon, Globe } from 'lucide-react';
import { useSettings } from '../../context';
import { Switch } from '../common/Switch';

interface EmployeeSideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: 'profile' | 'requests';
  onViewChange: (view: 'profile' | 'requests') => void;
  onSignOut: () => void;
  sessionName?: string;
  sessionUsername?: string;
  language?: string;
  profileImage?: string | null;
  t: Translations;
}

export const EmployeeSideDrawer: React.FC<EmployeeSideDrawerProps> = ({
  isOpen,
  onClose,
  activeView,
  onViewChange,
  onSignOut,
  sessionName,
  sessionUsername,
  language,
  profileImage,
  t,
}) => {
  const { theme, setTheme, setLanguage } = useSettings();
  const isRTL = language === 'AR';
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setMounted(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
      const timer = setTimeout(() => setMounted(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (visible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [visible]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);



  const menuItems = [
    {
      id: 'requests' as const,
      icon: Clock,
      label: t.employeeProfile.pendingRequests,
    },
    {
      id: 'profile' as const,
      icon: UserCircle,
      label: t.employeeProfile.profile,
    },
  ];

  if (!mounted) return null;

  return (
    <>
      <div
        ref={overlayRef}
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      <div
        className={`fixed top-0 bottom-0 z-50 w-72 bg-(--bg-page-surface) border-s border-(--border-divider) shadow-xl transition-transform duration-300 ease-out ${isRTL ? 'left-0' : 'right-0'
          } ${visible ? 'translate-x-0' : isRTL ? '-translate-x-full' : 'translate-x-full'}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-(--border-divider)">
            <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 bg-(--bg-secondary) flex items-center justify-center ring-2 ring-(--border-divider)">
              {profileImage ? (
                <img src={profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <UserCircle className="w-6 h-6 text-(--text-tertiary)" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-(--text-primary) truncate">{sessionName}</p>
              <p className="text-xs text-primary-500">@{sessionUsername}</p>
            </div>
            <button
              onClick={onClose}
              className="flex items-center justify-center w-10 h-10 text-(--text-tertiary) hover:text-(--text-primary) transition-colors shrink-0"
            >
              <Menu size="var(--icon-navbar-mobile)" />
            </button>
          </div>

          {/* Menu Items */}
          <nav className="p-3 pb-1 order-2">
            <div className="bg-(--bg-secondary) rounded-2xl p-1 space-y-0.5">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    onClose();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all ${activeView === item.id
                      ? 'bg-(--bg-card) text-(--text-primary) shadow-xs'
                      : 'text-(--text-tertiary) hover:text-(--text-secondary)'
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Dark Mode & Language Toggles */}
          <div className="px-3 pb-2 order-3">
            <div className="bg-(--bg-secondary) rounded-2xl p-1 space-y-0.5">
              <SettingsToggle icon={Sun} iconOff={Moon} label={t.employeeProfile.darkMode} />
              <LanguageToggle isRTL={isRTL} t={t} />
            </div>
          </div>

          {/* Logout — after nav on mobile, at bottom on desktop */}
          <div className="px-3 pb-3 order-4 md:order-last">
            <button
              onClick={onSignOut}
              className="w-full p-2 text-sm font-medium text-red-500 dark:text-red-400 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t.employeeProfile.signOut}
            </button>
          </div>

          <div className="flex-1 order-5 md:order-4" />
        </div>
      </div>
    </>
  );
};

// ---------------------------------------------------------------------------
// SettingsToggle sub-component
// ---------------------------------------------------------------------------

const SettingsToggle: React.FC<{
  icon: React.FC<{ className?: string }>;
  iconOff: React.FC<{ className?: string }>;
  label: string;
}> = ({ icon: IconOn, iconOff: IconOff, label }) => {
  const { darkMode, setDarkMode } = useSettings();

  return (
    <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold text-(--text-tertiary)">
      <span className="flex items-center gap-3">
        {darkMode ? <IconOn className="w-5 h-5" /> : <IconOff className="w-5 h-5" />}
        {label}
      </span>
      <Switch checked={darkMode} onChange={setDarkMode} />
    </div>
  );
};

// ---------------------------------------------------------------------------
// LanguageToggle sub-component
// ---------------------------------------------------------------------------

const LanguageToggle: React.FC<{ isRTL: boolean; t: Translations }> = ({ isRTL, t }) => {
  const { language: currentLang, setLanguage } = useSettings();

  return (
    <button
      onClick={() => setLanguage(currentLang === 'AR' ? 'EN' : 'AR')}
      className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold text-(--text-tertiary) hover:text-(--text-secondary) transition-all"
    >
      <span className="flex items-center gap-3">
        <Globe className="w-5 h-5" />
        {t.employeeProfile.language}
      </span>
      <span className="text-xs font-bold uppercase tracking-wider text-(--text-secondary)">
        {currentLang}
      </span>
    </button>
  );
};
