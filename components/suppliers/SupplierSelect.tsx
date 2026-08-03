import type React from 'react';
import { useMemo } from 'react';
import type { Supplier } from '../../types';
import { FilterDropdown } from '../common/FilterDropdown';

interface SupplierSelectProps {
  value: string;
  onChange: (value: string) => void;
  suppliers: Supplier[];
  placeholder?: string;
  className?: string;
  color?: string;
  rounded?: 'lg' | 'xl' | 'full';
  dense?: boolean;
  portal?: boolean;
}

export const SupplierSelect: React.FC<SupplierSelectProps> = ({
  value,
  onChange,
  suppliers,
  placeholder = 'Select a supplier',
  className = '',
  color,
  rounded = 'lg',
  dense = true,
  portal = false,
}) => {
  const options = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.name })),
    [suppliers]
  );
  const selected = options.find((o) => o.value === value);

  return (
    <FilterDropdown
      items={options}
      selectedItem={selected}
      onSelect={(item) => onChange(item.value)}
      keyExtractor={(item) => item.value}
      renderSelected={(item) => (
        <span className='truncate'>{item?.label || placeholder}</span>
      )}
      renderItem={(item, isSelected) => (
        <span className={isSelected ? 'text-blue-600 font-medium' : ''}>{item.label}</span>
      )}
      variant='input'
      dense={dense}
      className={className || 'h-pageheader w-64 shrink-0'}
      color={color || 'blue'}
      floating={true}
      portal={portal}
      rounded={rounded as 'lg' | 'xl' | 'full'}
    />
  );
};
