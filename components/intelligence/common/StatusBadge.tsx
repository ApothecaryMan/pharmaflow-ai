import React from 'react';

export type StatusBadgeType = 
  | 'NORMAL' | 'LOW' | 'CRITICAL' | 'OUT_OF_STOCK' | 'OVERSTOCK'
  | 'RISING' | 'STABLE' | 'DECLINING'
  | 'HIGH' | 'MEDIUM' | 'CRITICAL_RISK' | 'LOW_RISK'
  | 'GOOD' | 'SPARSE' | 'NEW_PRODUCT';

interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
  language?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  language = 'EN',
  className = ''
}) => {
  const isAr = language === 'AR';
  
  const getStatusConfig = (statusKey: string): { color: string; icon: string; label: string } => {
    switch (statusKey) {
      // Stock Status
      case 'NORMAL': return { color: 'emerald', icon: 'check_circle', label: isAr ? 'طبيعي' : 'Normal' };
      case 'LOW': return { color: 'amber', icon: 'warning', label: isAr ? 'منخفض' : 'Low' };
      case 'CRITICAL': return { color: 'red', icon: 'error', label: isAr ? 'حرج' : 'Critical' };
      case 'OUT_OF_STOCK': return { color: 'red', icon: 'cancel', label: isAr ? 'نافذ' : 'Out of Stock' };
      case 'OVERSTOCK': return { color: 'purple', icon: 'inventory_2', label: isAr ? 'فائض' : 'Overstock' };
      
      // Seasonal Trajectory
      case 'RISING': return { color: 'emerald', icon: 'trending_up', label: isAr ? 'صعود' : 'Rising' };
      case 'STABLE': return { color: 'blue', icon: 'trending_flat', label: isAr ? 'مستقر' : 'Stable' };
      case 'DECLINING': return { color: 'amber', icon: 'trending_down', label: isAr ? 'هبوط' : 'Declining' };
      
      // Risk Category
      case 'HIGH': return { color: 'red', icon: 'priority_high', label: isAr ? 'مخاطرة عالية' : 'High Risk' };
      case 'MEDIUM': return { color: 'amber', icon: 'running_with_errors', label: isAr ? 'مخاطرة متوسطة' : 'Medium Risk' };
      case 'CRITICAL_RISK': return { color: 'red', icon: 'dangerous', label: isAr ? 'مخاطرة حرجة' : 'Critical Risk' };
      case 'LOW_RISK': return { color: 'emerald', icon: 'verified_user', label: isAr ? 'مخاطرة قليلة' : 'Low Risk' };

      // Data Quality
      case 'GOOD': return { color: 'emerald', icon: 'verified', label: isAr ? 'جيدة' : 'Good' };
      case 'SPARSE': return { color: 'amber', icon: 'analytics', label: isAr ? 'قليلة' : 'Sparse' };
      case 'NEW_PRODUCT': return { color: 'blue', icon: 'new_releases', label: isAr ? 'جديد' : 'New' };
      
      default: return { color: 'gray', icon: 'info', label: statusKey };
    }
  };

  const config = getStatusConfig(status);
  const finalLabel = label || config.label;
  const color = config.color;

  const sizeStyles = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  const iconSize = size === 'sm' ? 'text-xs' : 'text-sm';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border border-${color}-200 dark:border-${color}-900/50 text-${color}-700 dark:text-${color}-400 font-bold uppercase tracking-wider bg-transparent ${sizeStyles} ${className}`}>
      <span className={`material-symbols-rounded ${iconSize}`}>{config.icon}</span>
      {finalLabel}
    </span>
  );
};
