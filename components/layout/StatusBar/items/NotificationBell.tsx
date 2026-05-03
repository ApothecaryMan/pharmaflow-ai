import type React from 'react';
import { useEffect, useRef, useState, useMemo } from 'react';
import { type Notification, useStatusBar } from '../StatusBarContext';
import { StatusBarItem } from '../StatusBarItem';
import { formatCurrency } from '../../../../utils/currency';

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
const getVariantIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success': return 'check_circle';
    case 'warning': return 'warning';
    case 'error': return 'error';
    case 'out_of_stock': return 'inventory_2';
    default: return 'info';
  }
};

const getVariantColor = (type: Notification['type']) => {
  switch (type) {
    case 'success': return 'text-emerald-500';
    case 'warning': return 'text-amber-500';
    case 'error': return 'text-red-500';
    default: return 'text-primary-500';
  }
};

const getNotificationMessage = (notification: Notification, messages?: NotificationBellProps['t']['messages']): string => {
  if (notification.messageKey && messages) {
    const template = messages[notification.messageKey];
    if (template) {
      let result = template;
      if (notification.messageParams) {
        Object.entries(notification.messageParams).forEach(([key, value]) => {
          let displayValue = value || '';
          
          // Smart formatting for monetary values
          if ((key === 'total' || key === 'amount' || key === 'refund' || key === 'price') && !isNaN(Number(value))) {
            displayValue = formatCurrency(Number(value));
          }
          
          result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), displayValue);
        });
      }
      return result.trim();
    }
  }
  return notification.message || '';
};

// Extracted Notification Item for Flattening and Readability
const NotificationItem: React.FC<{
  notification: Notification;
  messages?: NotificationBellProps['t']['messages'];
  onRemove: (id: string) => void;
  dismissText: string;
}> = ({ notification, messages, onRemove, dismissText }) => (
  <div className="px-3 py-2 transition-colors flex items-start gap-2 hover:bg-black/5 dark:hover:bg-white/5" role="listitem">
    <span
      className={`material-symbols-rounded mt-0.5 ${getVariantColor(notification.type)}`}
      style={{ fontSize: 'var(--status-icon-size, 16px)' }}
    >
      {getVariantIcon(notification.type)}
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-xs leading-relaxed text-(--text-primary)">
        {getNotificationMessage(notification, messages)}
      </p>
      <p className="text-[10px] mt-0.5 text-(--text-tertiary)">
        {new Date(notification.timestamp).toLocaleTimeString('en-US')}
      </p>
    </div>
    <button
      onClick={() => onRemove(notification.id)}
      className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
      title={dismissText}
    >
      <span 
        className="material-symbols-rounded"
        style={{ fontSize: 'calc(var(--status-icon-size, 16px) - 2px)' }}
      >
        close
      </span>
    </button>
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
  const { state, removeNotification, clearNotifications, markAsRead } = useStatusBar();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Smart Memoization: Avoid redundant calculations on every render
  const unreadCount = useMemo(() => state.notifications.filter((n) => !n.read).length, [state.notifications]);
  const displayedNotifications = useMemo(() => state.notifications.slice(0, 10), [state.notifications]);
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
    setIsOpen(!isOpen);
    // Batch marking as read when opening
    if (!isOpen) {
      state.notifications.forEach((n) => {
        if (!n.read) markAsRead(n.id);
      });
    }
  };

  return (
    <div className="relative flex items-center h-full" ref={dropdownRef}>
      <StatusBarItem
        icon="notifications"
        badge={unreadCount > 0 ? unreadCount : undefined}
        tooltip={t.notifications}
        variant={isOpen || unreadCount > 0 ? 'info' : 'default'}
        onClick={handleToggle}
      />

      {/* Dropdown Container */}
      {isOpen && (
        <div
          className="absolute bottom-full end-0 mb-1 w-72 rounded-lg shadow-xl border border-(--border-divider) bg-(--bg-menu) z-50 animate-scale-in origin-bottom-end"
          dir={isRTL ? 'rtl' : 'ltr'}
          role="log"
          aria-live="polite"
        >
          {/* Arrow Indicator */}
          <div className="absolute bottom-[-5px] end-3 w-2.5 h-2.5 rotate-45 border-b border-r border-(--border-divider) bg-(--bg-menu) z-50" />

          {/* Dropdown Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-(--border-divider)">
            <span className="text-sm font-semibold text-(--text-primary)">
              {t.notifications}
            </span>
            {state.notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-xs text-primary-500 hover:text-primary-600 transition-colors font-medium"
              >
                {t.clearAll}
              </button>
            )}
          </div>

          {/* Notifications Scroll Area */}
          <div className="divide-y divide-(--border-divider) max-h-80 overflow-y-auto rounded-b-lg custom-scrollbar" role="list">
            {displayedNotifications.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-(--text-tertiary)">
                {t.noNotifications}
              </div>
            ) : (
              displayedNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  messages={t.messages}
                  onRemove={removeNotification}
                  dismissText={t.dismiss}
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
