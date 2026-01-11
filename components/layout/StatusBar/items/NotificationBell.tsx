import React, { useState, useRef, useEffect } from 'react';
import { StatusBarItem } from '../StatusBarItem';
import { useStatusBar, Notification } from '../StatusBarContext';

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

export const NotificationBell: React.FC<NotificationBellProps> = ({
  language = 'EN',
  t = {
    notifications: 'Notifications',
    noNotifications: 'No notifications',
    clearAll: 'Clear all',
    dismiss: 'Dismiss',
    messages: {
      outOfStock: 'Out of Stock: {{name}} {{form}}',
      saleComplete: 'Sale completed: {{total}} L.E',
    },
  },
}) => {
  const { state, removeNotification, clearNotifications, markAsRead } = useStatusBar();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = state.notifications.filter(n => !n.read).length;
  const isRTL = language === 'AR';

  // Helper to resolve notification message
  const getNotificationMessage = (notification: Notification): string => {
    // If using new dynamic system with messageKey
    if (notification.messageKey && t.messages) {
      const template = t.messages[notification.messageKey];
      if (template) {
        // Interpolate params: replace {{param}} with value
        let result = template;
        if (notification.messageParams) {
          Object.entries(notification.messageParams).forEach(([key, value]) => {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || '');
          });
        }
        return result.trim();
      }
    }
    // Fallback to legacy message
    return notification.message || '';
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
    // Mark all as read when opening
    if (!isOpen) {
      state.notifications.forEach(n => {
        if (!n.read) markAsRead(n.id);
      });
    }
  };

  const getVariantIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'check_circle';
      case 'warning': return 'warning';
      case 'error': return 'error';
      case 'out_of_stock': return 'inventory_2'; // Distinct icon for out of stock
      default: return 'info';
    }
  };

  const getVariantColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'text-emerald-500';
      case 'warning': return 'text-amber-500';
      case 'error': return 'text-red-500';
      default: return 'text-blue-500';
    }
  };

  const getNotificationStyle = (type: Notification['type']) => {
    return 'hover:bg-white/5';
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

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute bottom-full right-0 mb-1 w-72 rounded-lg shadow-xl border z-50"
          dir={isRTL ? 'rtl' : 'ltr'}
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderColor: 'var(--border-primary)',
          }}
        >
          {/* Arrow Indicator - Always right-aligned since StatusBar is LTR */}
          <div 
            className="absolute bottom-[-5px] right-3 w-2.5 h-2.5 rotate-45 border-b border-r z-50"
            style={{
              backgroundColor: 'var(--bg-primary)',
              borderColor: 'var(--border-primary)',
            }}
          />

          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border-primary)' }}>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {t.notifications}
            </span>
            {state.notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
              >
                {t.clearAll}
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="divide-y divide-gray-200/50 dark:divide-gray-700/50 max-h-80 overflow-y-auto rounded-b-lg">
            {state.notifications.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
                {t.noNotifications}
              </div>
            ) : (
              state.notifications.slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`px-3 py-2 transition-colors flex items-start gap-2 ${getNotificationStyle(notification.type)}`}
                >
                  <span className={`material-symbols-rounded text-[16px] mt-0.5 ${getVariantColor(notification.type)}`}>
                    {getVariantIcon(notification.type)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                      {getNotificationMessage(notification)}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(notification.timestamp).toLocaleTimeString('en-US')}
                    </p>
                  </div>
                  <button
                    onClick={() => removeNotification(notification.id)}
                    className="text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                    title={t.dismiss}
                  >
                    <span className="material-symbols-rounded text-[14px]">close</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
