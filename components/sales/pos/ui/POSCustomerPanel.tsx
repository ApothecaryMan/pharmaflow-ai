import type React from 'react';
import { SearchInput } from '../../../common/SearchInput';
import { SegmentedControl } from '../../../common/SegmentedControl';
import { CARD_MD } from '../../../../utils/themeStyles';
import { getLocationName } from '../../../../data/locations';
import type { Customer, Language } from '../../../../types';

export interface POSCustomerPanelProps {
  t: any;
  color: string;
  language: Language | string;
  selectedCustomer: Customer | null;
  customerName: string;
  setCustomerName: (name: string) => void;
  showCustomerDropdown: boolean;
  setShowCustomerDropdown: (show: boolean) => void;
  filteredCustomers: Customer[];
  highlightedCustomerIndex: number;
  setHighlightedCustomerIndex: (index: number) => void;
  handleCustomerSelect: (customer: Customer) => void;
  clearCustomerSelection: () => void;
  customerDropdownHook: {
    handleKeyDown: (e: React.KeyboardEvent) => void;
    handleBlur: (e: React.FocusEvent) => void;
  };
  paymentMethod: 'cash' | 'visa';
  setPaymentMethod: (method: 'cash' | 'visa') => void;
  onShowHistory?: () => void;
}

export const POSCustomerPanel: React.FC<POSCustomerPanelProps> = ({
  t,
  color,
  language,
  selectedCustomer,
  customerName,
  setCustomerName,
  showCustomerDropdown,
  setShowCustomerDropdown,
  filteredCustomers,
  highlightedCustomerIndex,
  setHighlightedCustomerIndex,
  handleCustomerSelect,
  clearCustomerSelection,
  customerDropdownHook,
  paymentMethod,
  setPaymentMethod,
  onShowHistory,
}) => {
  const paymentOptions = [
    {
      label: t.cash || 'Cash',
      value: 'cash' as const,
      icon: 'payments',
      activeColor: 'green',
    },
    {
      label: t.visa || 'Visa',
      value: 'visa' as const,
      icon: 'credit_card',
      activeColor: 'blue',
    },
  ];

  return (
    <div className={`${CARD_MD} p-3 border border-gray-200/50 dark:border-(--border-divider)`}>
      {selectedCustomer ? (
        // Locked Customer Card
        <div className='flex flex-col sm:flex-row gap-4 items-center justify-between animate-fade-in'>
          <div className='flex items-center gap-3'>
            <div
              onClick={onShowHistory}
              title={t.viewHistory}
              className={`w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-600 dark:text-primary-400 cursor-pointer hover:bg-primary-200 dark:hover:bg-primary-800/50 transition-colors active:scale-95`}
            >
              <span className='material-symbols-rounded' style={{ fontSize: '24px' }}>
                person
              </span>
            </div>
            <div className='flex flex-col gap-0'>
              <h3 className='font-bold text-gray-800 dark:text-gray-100 text-lg leading-none mb-0.5'>
                {selectedCustomer.name}
              </h3>
              <div className='leading-none'>
                <span className='text-xs font-bold font-mono text-gray-500 dark:text-gray-400'>
                  {selectedCustomer.code || `#${selectedCustomer.serialId}`}
                </span>
              </div>
              <p className='text-sm text-gray-500 leading-tight mt-0.5'>
                <span dir='ltr'>{selectedCustomer.phone}</span>
              </p>
            </div>
          </div>

          <div className='flex-1 border-s-2 border-gray-100 dark:border-gray-700 ps-6 ms-2 hidden sm:block'>
            <p className='text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1'>
              <span className='material-symbols-rounded' style={{ fontSize: '14px' }}>
                location_on
              </span>
              {t.address}
            </p>
            <div className='flex flex-col leading-snug'>
              {selectedCustomer.streetAddress && (
                <span className='text-sm font-bold text-gray-800 dark:text-gray-200 mb-0.5'>
                  {selectedCustomer.streetAddress}
                </span>
              )}
              <span className='text-xs text-gray-500 dark:text-gray-400'>
                {selectedCustomer.area
                  ? getLocationName(selectedCustomer.area, 'area', language as Language)
                  : ''}
                {selectedCustomer.area && selectedCustomer.city ? ' - ' : ''}
                {selectedCustomer.city
                  ? getLocationName(selectedCustomer.city, 'city', language as Language)
                  : ''}
              </span>
            </div>
          </div>

          <div className='flex flex-col gap-2 min-w-[140px]'>
            <div className='flex items-center justify-between gap-2'>
              <label className='block text-xs font-bold text-gray-400 uppercase'>
                {t.paymentMethod}
              </label>
              <button
                onClick={clearCustomerSelection}
                className='text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors flex items-center justify-center bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 w-5 h-5 rounded-md'
                title={t.changeCustomer}
              >
                <span className='material-symbols-rounded' style={{ fontSize: '16px' }}>
                  close
                </span>
              </button>
            </div>
            <SegmentedControl
              value={paymentMethod}
              onChange={(val) => setPaymentMethod(val as 'cash' | 'visa')}
              color={color}
              variant='onPage'
              iconSize='--icon-lg'
              size='xs'
              options={paymentOptions}
            />
          </div>
        </div>
      ) : (
        // Search Inputs
        <div className='flex flex-col sm:flex-row gap-3'>
          <div className='flex-1 relative' onBlur={customerDropdownHook.handleBlur}>
            <label className='block text-xs font-bold text-gray-400 uppercase mb-1'>
              {t.customerInfo}
            </label>
            <SearchInput
              value={customerName}
              onSearchChange={(val) => {
                setCustomerName(val);
                setShowCustomerDropdown(true);
                setHighlightedCustomerIndex(0);
              }}
              onFocus={() => setShowCustomerDropdown(true)}
              onKeyDown={customerDropdownHook.handleKeyDown}
              placeholder={t.customerSearchPlaceholder}
              icon='person'
              color={color}
              className=''
            />
            {/* Customer Dropdown */}
            {showCustomerDropdown && filteredCustomers.length > 0 && (
              <div className='absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 max-h-48 overflow-y-auto'>
                {filteredCustomers.map((customer, index) => (
                  <div
                    key={customer.id}
                    className={`px-3 py-2 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0 flex flex-col ${
                      index === highlightedCustomerIndex
                        ? 'bg-gray-50 dark:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur which would close dropdown
                      handleCustomerSelect(customer);
                    }}
                    onMouseEnter={() => setHighlightedCustomerIndex(index)}
                  >
                    <span
                      className={`text-sm font-bold ${
                        index === highlightedCustomerIndex
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-800 dark:text-gray-200'
                      }`}
                    >
                      {customer.name}
                    </span>
                    <div className='flex gap-2 text-xs text-gray-500' dir='ltr'>
                      <span>{customer.phone}</span>
                      {customer.code && <span>• {customer.code}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className='flex flex-col gap-2 min-w-[140px]'>
            <div className='flex items-center justify-between h-5'>
              <label className='block text-xs font-bold text-gray-400 uppercase'>
                {t.paymentMethod}
              </label>
            </div>
            <SegmentedControl
              value={paymentMethod}
              onChange={(val) => setPaymentMethod(val as 'cash' | 'visa')}
              color={color}
              variant='onPage'
              iconSize='--icon-lg'
              size='xs'
              options={paymentOptions}
            />
          </div>
        </div>
      )}
    </div>
  );
};
