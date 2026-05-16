import { type React, useEffect, useState, useMemo } from 'react';
import { useSettings } from '../../../../context';
import { TRANSLATIONS } from '../../../../i18n/translations';
import { FilterDropdown } from '../../../common/FilterDropdown';
import { formatCurrencyParts } from '../../../../utils/currency';

const COMMON_CURRENCIES = ['USD', 'EGP', 'SAR', 'AED', 'EUR', 'GBP', 'KWD', 'QAR'];

let cachedRates: Record<string, number> | null = null;

export const CurrencyConverter: React.FC = () => {
  const { language } = useSettings();
  
  // Currency Converter State
  const [rates, setRates] = useState<Record<string, number>>(cachedRates || {});
  const [loadingRates, setLoadingRates] = useState(!cachedRates);
  const [ratesError, setRatesError] = useState(false);
  const [amount, setAmount] = useState<number>(1);
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EGP');

  const t = TRANSLATIONS[language].settings;
  const cT = t.currencyConverter;

  useEffect(() => {
    if (cachedRates) return;
    setLoadingRates(true);
    fetch('https://api.exchangerate-api.com/v4/latest/USD')
      .then(res => res.json())
      .then(data => {
        cachedRates = data.rates;
        setRates(data.rates);
        setLoadingRates(false);
      })
      .catch(() => {
        setRatesError(true);
        setLoadingRates(false);
      });
  }, []);

  const convertedAmount = useMemo(() => {
    if (!rates[fromCurrency] || !rates[toCurrency]) return 0;
    return (amount / rates[fromCurrency]) * rates[toCurrency];
  }, [amount, fromCurrency, toCurrency, rates]);

  if (loadingRates) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-(--text-tertiary)">
        <span className="material-symbols-rounded animate-spin mb-2">sync</span>
        <span className="text-xs">{cT?.loading}</span>
      </div>
    );
  }

  if (ratesError) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-red-500">
        <span className="material-symbols-rounded mb-2">error</span>
        <span className="text-xs">{cT?.error}</span>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        <label htmlFor="currency-amount" className="text-[10px] font-bold uppercase text-(--text-tertiary)">{cT?.amount}</label>
        <input 
          id="currency-amount"
          type="number" 
          value={amount} 
          onChange={(e) => setAmount(Number(e.target.value))}
          className="w-full h-8 bg-black/5 dark:bg-white/5 border-none rounded-lg px-2 text-xs font-bold focus:ring-1 focus:ring-primary-500/50 outline-hidden font-mono"
        />
      </div>
      
      <div className="flex gap-2 items-end">
        <div className="flex-1 space-y-1">
          <span className="block text-[10px] font-bold uppercase text-(--text-tertiary)">{cT?.from}</span>
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
            type="button"
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
          <span className="block text-[10px] font-bold uppercase text-(--text-tertiary)">{cT?.to}</span>
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
          const match = formattedAmount.match(/^(.*?)([.,٫]\d+)$/);
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
  );
};

export default CurrencyConverter;
