import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useSettings } from '../../../../context';
import { TRANSLATIONS } from '../../../../i18n/translations';
import { StatusBarItem } from '../StatusBarItem';
import { FilterDropdown } from '../../../common/FilterDropdown';
import { formatCurrencyParts } from '../../../../utils/currency';
import { Calculator } from './Calculator';

const getMenuSurfaceClasses = (isBlur: boolean, isMobile: boolean = false) => {
  if (!isBlur) return isMobile ? 'bg-(--bg-page-surface)' : 'bg-(--bg-menu)';
  return 'glass-surface';
};

export interface ToolsMenuProps {
  dropDirection?: 'up' | 'down';
  showTrigger?: boolean;
  align?: 'start' | 'end';
  triggerVariant?: 'statusBar' | 'navbar';
  triggerSize?: number;
}

const COMMON_CURRENCIES = ['USD', 'EGP', 'SAR', 'AED', 'EUR', 'GBP', 'KWD', 'QAR'];

export const ToolsMenu: React.FC<ToolsMenuProps> = ({
  dropDirection = 'up',
  showTrigger = true,
  align = 'start',
  triggerVariant = 'statusBar',
}) => {
  const { language, settingsBlur } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [activeTool, setActiveTool] = useState<'converter' | 'calculator'>('converter');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Currency Converter State
  const [rates, setRates] = useState<Record<string, number>>({});
  const [loadingRates, setLoadingRates] = useState(false);
  const [ratesError, setRatesError] = useState(false);
  const [amount, setAmount] = useState<number>(1);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EGP');

  const t = TRANSLATIONS[language].settings;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) && !isPinned) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPinned]);

  useEffect(() => {
    if (isOpen && Object.keys(rates).length === 0 && activeTool === 'converter') {
      setLoadingRates(true);
      fetch('https://api.exchangerate-api.com/v4/latest/USD')
        .then(res => res.json())
        .then(data => {
          setRates(data.rates);
          setLoadingRates(false);
        })
        .catch(() => {
          setRatesError(true);
          setLoadingRates(false);
        });
    }
  }, [isOpen, rates, activeTool]);

  const convertedAmount = useMemo(() => {
    if (!rates[fromCurrency] || !rates[toCurrency]) return 0;
    return (amount / rates[fromCurrency]) * rates[toCurrency];
  }, [amount, fromCurrency, toCurrency, rates]);

  const menuContainerClasses = useMemo(() => `
    absolute ${dropDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} 
    ${align === 'start' ? 'inset-s-0 origin-top-start' : 'inset-e-0 origin-top-end'}
    w-64 rounded-xl shadow-2xl border border-(--border-divider) z-110 animate-fade-in
    ${getMenuSurfaceClasses(settingsBlur)}
  `, [dropDirection, align, settingsBlur]);

  const cT = t.currencyConverter;

  return (
    <div className={`relative ${showTrigger && triggerVariant === 'statusBar' ? 'h-full flex items-center' : ''}`} ref={dropdownRef}>
      {showTrigger && (
        triggerVariant === 'statusBar' ? (
          <StatusBarItem icon="build" tooltip={t.tools} variant={isOpen ? 'info' : 'default'} onClick={() => setIsOpen(!isOpen)} />
        ) : (
          <button onClick={() => setIsOpen(!isOpen)} className={`flex items-center justify-center w-10 h-10 ${isOpen ? 'text-primary-500' : 'text-(--text-secondary)'}`}>
            <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-settings)' }}>build</span>
          </button>
        )
      )}

      {isOpen && (
        <div className={menuContainerClasses}>
          <div className="px-3 py-2 border-b border-(--border-divider) relative flex items-center justify-center">
            <button 
              onClick={() => setActiveTool(activeTool === 'converter' ? 'calculator' : 'converter')}
              className="flex items-center gap-1 text-xs font-bold text-(--text-primary) hover:text-primary-500 transition-colors select-none"
              title="Click to switch tool"
            >
              <span>{activeTool === 'converter' ? (cT?.title || 'Currency Converter') : (t.calculator?.title || 'Calculator')}</span>
              <span className="material-symbols-rounded text-sm opacity-60">{language === 'AR' ? 'chevron_left' : 'chevron_right'}</span>
            </button>
            <button 
              onClick={() => setIsPinned(!isPinned)}
              className={`absolute end-2 flex items-center justify-center w-6 h-6 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${
                isPinned ? 'text-primary-500' : 'text-(--text-tertiary)'
              }`}
              title={isPinned ? 'Unpin' : 'Pin to stay open'}
            >
              <span className="material-symbols-rounded text-[16px]">keep</span>
            </button>
          </div>
          
          <div className="p-3 space-y-3" style={{ direction: language === 'AR' ? 'rtl' : 'ltr' }}>
            {activeTool === 'calculator' ? (
              <Calculator />
            ) : loadingRates ? (
              <div className="flex flex-col items-center justify-center p-4 text-(--text-tertiary)">
                <span className="material-symbols-rounded animate-spin mb-2">sync</span>
                <span className="text-xs">{cT?.loading}</span>
              </div>
            ) : ratesError ? (
              <div className="flex flex-col items-center justify-center p-4 text-red-500">
                <span className="material-symbols-rounded mb-2">error</span>
                <span className="text-xs">{cT?.error}</span>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-(--text-tertiary)">{cT?.amount}</label>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full h-8 bg-black/5 dark:bg-white/5 border-none rounded-lg px-2 text-xs font-bold focus:ring-1 focus:ring-primary-500/50 outline-hidden font-mono"
                  />
                </div>
                
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-(--text-tertiary)">{cT?.from}</label>
                    <FilterDropdown<string>
                      items={COMMON_CURRENCIES}
                      selectedItem={fromCurrency}
                      onSelect={(item) => setFromCurrency(item)}
                      keyExtractor={(item) => item}
                      renderItem={(item) => <span className="text-xs font-medium">{item}</span>}
                      renderSelected={(item) => <span className="text-xs font-bold">{item}</span>}
                      variant="input"
                      floating={false}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="flex items-center justify-center pb-1">
                    <button 
                      onClick={() => {
                        const temp = fromCurrency;
                        setFromCurrency(toCurrency);
                        setToCurrency(temp);
                      }}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-(--text-secondary)"
                    >
                      <span className="material-symbols-rounded text-sm">swap_horiz</span>
                    </button>
                  </div>

                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] font-bold uppercase text-(--text-tertiary)">{cT?.to}</label>
                    <FilterDropdown<string>
                      items={COMMON_CURRENCIES}
                      selectedItem={toCurrency}
                      onSelect={(item) => setToCurrency(item)}
                      keyExtractor={(item) => item}
                      renderItem={(item) => <span className="text-xs font-medium">{item}</span>}
                      renderSelected={(item) => <span className="text-xs font-bold">{item}</span>}
                      variant="input"
                      floating={false}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-(--border-divider) flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-(--text-tertiary)">{cT?.result}</span>
                  {(() => {
                    const { amount: formattedAmount, symbol } = formatCurrencyParts(convertedAmount, toCurrency, language, 2);
                    const match = formattedAmount.match(/^(.*?)([\.,٫]\d+)$/);
                    const integerPart = match ? match[1] : formattedAmount;
                    const fractionPart = match ? match[2] : '';
                    
                    return (
                      <span className="text-sm font-bold text-primary-500 flex items-baseline gap-1 font-mono" dir="auto">
                        <span>
                          {integerPart}
                          {fractionPart && <span className="text-[10px] ml-[1px]">{fractionPart}</span>}
                        </span>
                        <span className="text-[10px] text-(--text-tertiary) font-sans">{symbol}</span>
                      </span>
                    );
                  })()}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ToolsMenu;
