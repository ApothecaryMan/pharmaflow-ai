import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getRelativeTime } from '../../../../utils/dateFormatter';
import { type AlertData, useAlert } from '../../../features/alerts/AlertContext';
import { StatusBarItem } from '../StatusBarItem';

interface NotificationBellProps {
  language?: 'EN' | 'AR';
  t?: {
    notifications: string;
    noNotifications: string;
    clearAll: string;
    dismiss: string;
    messages?: {
      outOfStock?: string;
      saleComplete?: string;
      [key: string]: string | undefined;
    };
  };
}

// Helpers moved outside for better performance and separation of concerns
const getVariantIcon = (type: AlertData['type']) => {
  switch (type) {
    case 'success':
      return 'check_circle';
    case 'warning':
      return 'warning';
    case 'error':
      return 'error';
    default:
      return 'info';
  }
};

const getVariantColor = (type: AlertData['type']) => {
  switch (type) {
    case 'success':
      return 'text-emerald-500';
    case 'warning':
      return 'text-amber-500';
    case 'error':
      return 'text-red-500';
    default:
      return 'text-primary-500';
  }
};

const getNotificationMessage = (notification: AlertData): string => {
  return notification.message || '';
};

const NotificationItem: React.FC<{
  notification: AlertData;
  isRTL?: boolean;
  language: string;
}> = ({ notification, isRTL, language }) => (
  <div
    className={`px-3 py-2 flex ${isRTL ? 'flex-row-reverse' : ''} items-start gap-2 hover:bg-black/5 dark:hover:bg-white/5`}
    dir='auto'
    role='listitem'
  >
    <span
      className={`material-symbols-rounded mt-0.5 ${getVariantColor(notification.type)}`}
      style={{ fontSize: 'var(--status-icon-size, 16px)' }}
    >
      {getVariantIcon(notification.type)}
    </span>
    <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : ''}`}>
      {notification.title && (
        <p
          className='text-[10px] font-bold text-(--text-primary) uppercase tracking-wider mb-0.5'
          dir='auto'
        >
          {notification.title}
        </p>
      )}
      <p className='text-xs leading-relaxed text-(--text-primary)' dir='auto'>
        {getNotificationMessage(notification)}
      </p>
      <p className={`text-[9px] text-(--text-tertiary) mt-0.5 ${isRTL ? 'text-right' : ''}`}>
        {getRelativeTime(notification.timestamp, language)}
      </p>
    </div>
  </div>
);

export const NotificationBell: React.FC<NotificationBellProps> = ({
  language = 'EN',
  t = {
    notifications: 'Notifications',
    noNotifications: 'No notifications',
    clearAll: 'Clear all',
    dismiss: 'Dismiss',
    messages: {
      outOfStock: 'Out of Stock: {{name}} {{form}}',
      saleComplete: language === 'AR' ? 'تمت عملية البيع: {{total}}' : 'Sale completed: {{total}}',
    },
  },
}) => {
  const { notificationHistory } = useAlert();
  const [isOpen, setIsOpen] = useState(false);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notificationHistory.length - lastSeenCount;
  const displayedNotifications = useMemo(
    () => notificationHistory.slice().reverse().slice(0, 50),
    [notificationHistory]
  );
  const isRTL = language === 'AR';

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) setLastSeenCount(notificationHistory.length);
    setIsOpen(!isOpen);
  };

  return (
    <div className='relative flex items-center h-full' ref={dropdownRef}>
      <StatusBarItem
        icon='notifications'
        badge={unreadCount > 0 ? unreadCount : undefined}
        tooltip={t.notifications}
        variant={isOpen || unreadCount > 0 ? 'info' : 'default'}
        onClick={handleToggle}
      />

      {/* Dropdown Container */}
      {isOpen && (
        <div
          className='absolute bottom-full right-0 mb-1 w-72 rounded-lg shadow-xl border border-(--border-divider) bg-(--bg-menu) z-50 animate-scale-in origin-bottom-right'
          role='log'
          aria-live='polite'
        >
          {/* Arrow Indicator */}
          <div className='absolute bottom-[-5px] right-3 w-2.5 h-2.5 rotate-45 border-b border-r border-(--border-divider) bg-(--bg-menu) z-50' />

          {/* Dropdown Header */}
          <div className='flex items-center justify-between px-3 py-2 border-b border-(--border-divider)'>
            <span
              className={`text-sm font-semibold text-(--text-primary) ${isRTL ? 'text-right w-full' : ''}`}
              dir='auto'
            >
              {t.notifications}
            </span>
          </div>

          {/* Notifications Scroll Area */}
          <div
            className='divide-y divide-(--border-divider) max-h-80 overflow-y-auto rounded-b-lg custom-scrollbar'
            role='list'
          >
            {displayedNotifications.length === 0 ? (
              <div className='px-3 py-4 text-center text-sm text-(--text-tertiary)' dir='auto'>
                {t.noNotifications}
              </div>
            ) : (
              displayedNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  isRTL={isRTL}
                  language={language}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
