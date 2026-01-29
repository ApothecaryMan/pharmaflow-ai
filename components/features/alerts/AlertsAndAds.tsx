import React, { useEffect, useState, useMemo } from 'react';
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

export const AlertsAndAds: React.FC<AlertsAndAdsProps> = ({
  rotationSpeed = 8000,
}) => {
  const { currentAlert } = useAlert();
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

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
        info: { color: 'text-blue-500', icon: 'info' },
      };
      
      const variant = variants[currentAlert.type];
      
      return {
        key: 'alert-' + currentAlert.id,
        text: currentAlert.message,
        icon: variant.icon,
        iconColor: variant.color,
        textColor: 'text-gray-900 dark:text-gray-100',
        isAlert: true
      };
    }

    const ad = ADS_LIST[currentAdIndex];
    return {
      key: 'ad-' + ad.id,
      text: ad.text,
      icon: ad.icon,
      iconColor: 'text-amber-500', // Standard ad color
      textColor: 'text-gray-500 dark:text-gray-400',
      isAlert: false
    };
  }, [currentAlert, currentAdIndex]);

  return (
    <div 
      className="flex items-center h-full relative px-3 mx-1 hover:bg-black/5 dark:hover:bg-white/10 transition-colors duration-150 cursor-default rounded-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        key={content.key}
        className={`flex items-center gap-2 text-[12px] whitespace-nowrap animate-fade-in-up min-w-[200px]`}
      >
        <span className={`material-symbols-rounded text-[16px] ${content.iconColor}`}>
          {content.icon}
        </span>
        <span className={`${content.textColor} font-medium tracking-wide`}>
          {content.text}
        </span>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};

export default AlertsAndAds;
