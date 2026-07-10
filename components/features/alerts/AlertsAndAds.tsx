import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useAlert } from './AlertContext';

interface AlertsAndAdsProps {
  /** Speed in ms for ads rotation */
  rotationSpeed?: number;
}

const ADS_LIST = [
  { id: '1', text: '50% off on all Vitamins this week!', icon: 'local_offer' },
  { id: '2', text: 'New shipment of painkillers arriving tomorrow.', icon: 'inventory_2' },
  { id: '3', text: 'Remember to check expiration dates monthly.', icon: 'event_note' },
  { id: '4', text: 'Customer loyalty program launching soon!', icon: 'loyalty' },
];

export const AlertsAndAds: React.FC<AlertsAndAdsProps> = ({ rotationSpeed = 8000 }) => {
  const { currentAlert } = useAlert();
  const [currentAdIndex, setCurrentAdIndex] = useState(0);

  // Rotation logic for ads
  useEffect(() => {
    if (currentAlert) return; // Don't rotate if showing alert

    const interval = setInterval(() => {
      setCurrentAdIndex((prev) => (prev + 1) % ADS_LIST.length);
    }, rotationSpeed);

    return () => clearInterval(interval);
  }, [currentAlert, rotationSpeed]);

  // Determine what to display
  const content = useMemo(() => {
    if (currentAlert) {
      // Map alert types to colors/icons
      const variants = {
        success: { color: 'text-green-600', icon: 'check_circle' },
        error: { color: 'text-red-500', icon: 'error' },
        warning: { color: 'text-amber-500', icon: 'warning' },
        info: { color: 'text-primary-500', icon: 'info' },
      };

      const variant = variants[currentAlert.type];

      return {
        key: 'alert-' + currentAlert.id,
        text: currentAlert.message,
        icon: variant.icon,
        iconColor: variant.color,
        textColor: 'text-gray-900 dark:text-gray-100',
        isAlert: true,
      };
    }

    const ad = ADS_LIST[currentAdIndex];
    return {
      key: 'ad-' + ad.id,
      text: ad.text,
      icon: ad.icon,
      iconColor: 'text-amber-500', // Standard ad color
      textColor: 'text-gray-500 dark:text-gray-400',
      isAlert: false,
    };
  }, [currentAlert, currentAdIndex]);

  return (
    <div className='relative flex items-center h-full px-2.5 opacity-85 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-150 cursor-default'>
      <div
        key={content.key}
        className='flex items-center gap-1.5 text-[10px] font-bold tracking-wide uppercase whitespace-nowrap'
      >
        <span
          className={`material-symbols-rounded leading-none ${content.iconColor}`}
          style={{ fontSize: 'var(--status-icon-size, 16px)' }}
        >
          {content.icon}
        </span>
        <span className={`${content.textColor}`}>{content.text}</span>
      </div>
    </div>
  );
};

export default AlertsAndAds;
