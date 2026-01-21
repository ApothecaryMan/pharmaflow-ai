import React from 'react';

type BadgeColor = 'emerald' | 'blue' | 'amber' | 'red' | 'gray' | 'purple';

interface StatusBadgeProps {
  status: string; // The raw status string (e.g., 'OUT_OF_STOCK')
  label?: string; // Optional custom label (if not provided, will format status)
  color?: BadgeColor; // Optional explicit color override
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  color,
  size = 'md'
}) => {
  // Default mappings for common statuses in our Intelligence module
  const getStatusConfig = (statusKey: string): { color: BadgeColor; label: string } => {
    switch (statusKey) {
      // Stock Status
      case 'NORMAL': return { color: 'emerald', label: 'طبيعي' };
      case 'LOW': return { color: 'amber', label: 'منخفض' };
      case 'CRITICAL': return { color: 'red', label: 'حرج' };
      case 'OUT_OF_STOCK': return { color: 'red', label: 'نافذ' };
      case 'OVERSTOCK': return { color: 'purple', label: 'فائض' };
      
      // Seasonal Trajectory
      case 'RISING': return { color: 'emerald', label: 'صعود ↗' };
      case 'STABLE': return { color: 'blue', label: 'مستقر ─' };
      case 'DECLINING': return { color: 'amber', label: 'هبوط ↘' };
      
      // Risk Category
      case 'HIGH': return { color: 'red', label: 'مخاطرة عالية' };
      case 'MEDIUM': return { color: 'amber', label: 'مخاطرة متوسطة' };
      case 'CRITICAL_RISK': return { color: 'red', label: 'مخاطرة حرجة' };
      case 'LOW_RISK': return { color: 'emerald', label: 'مخاطرة قليلة' };

      // Data Quality
      case 'GOOD': return { color: 'emerald', label: 'جيدة' };
      case 'SPARSE': return { color: 'amber', label: 'قليلة' };
      case 'NEW_PRODUCT': return { color: 'blue', label: 'جديد' };
      
      default: return { color: 'gray', label: statusKey };
    }
  };

  const config = getStatusConfig(status);
  const finalColor = color || config.color;
  const finalLabel = label || config.label;

  const colorClasses = {
    emerald: 'bg-emerald-100/50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    blue: 'bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    amber: 'bg-amber-100/50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    red: 'bg-red-100/50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    gray: 'bg-gray-100/50 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    purple: 'bg-purple-100/50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  };

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center justify-center rounded-md border font-medium whitespace-nowrap ${colorClasses[finalColor]} ${sizeClass}`}>
      {finalLabel}
    </span>
  );
};
