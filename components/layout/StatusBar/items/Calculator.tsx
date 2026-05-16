import { type React, useState, useEffect, useRef } from 'react';

// Unified buttons definition for simpler grid rendering
const KEYS = [
  { val: 'C', display: 'C', type: 'clear' },
  { val: 'DEL', display: '⌫', type: 'secondary' },
  { val: '(', display: '(', type: 'secondary' },
  { val: ')', display: ')', type: 'secondary' },
  { val: '7', display: '7' },
  { val: '8', display: '8' },
  { val: '9', display: '9' },
  { val: '÷', display: '÷', type: 'operator' },
  { val: '4', display: '4' },
  { val: '5', display: '5' },
  { val: '6', display: '6' },
  { val: '×', display: '×', type: 'operator' },
  { val: '1', display: '1' },
  { val: '2', display: '2' },
  { val: '3', display: '3' },
  { val: '-', display: '-', type: 'operator' },
  { val: '0', display: '0' },
  { val: '.', display: '.' },
  { val: '=', display: '=', type: 'equals' },
  { val: '+', display: '+', type: 'operator' }
];

export const Calculator: React.FC = () => {
  const [calcExpr, setCalcExpr] = useState('');
  const [calcResult, setCalcResult] = useState('');
  const [showCopiedCheck, setShowCopiedCheck] = useState(false);

  const handleCopy = (text: string) => {
    if (!text || text === 'Error') return;
    const cleanText = text.replace(/,/g, '');
    
    const triggerSuccess = () => {
      setShowCopiedCheck(true);
      setTimeout(() => setShowCopiedCheck(false), 1000);
    };

    // Modern API with secure context check
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(cleanText)
        .then(triggerSuccess)
        .catch(() => fallbackCopy(cleanText, triggerSuccess));
    } else {
      fallbackCopy(cleanText, triggerSuccess);
    }
  };

  const fallbackCopy = (text: string, callback: () => void) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.top = '0';
      textArea.style.left = '0';
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) {
        callback();
      }
    } catch (err) {
      console.error('Resilient copy fallback failed:', err);
    }
  };

  const handleCalcClick = (val: string) => {
    if (val === 'C') {
      setCalcExpr('');
      setCalcResult('');
    } else if (val === 'DEL') {
      if (calcResult) {
        setCalcResult('');
      } else {
        setCalcExpr(prev => prev.slice(0, -1));
      }
    } else if (val === '=') {
      if (!calcExpr) return;
      try {
        const sanitized = calcExpr.replace(/×/g, '*').replace(/÷/g, '/');
        if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
          setCalcResult('Error');
          return;
        }
        const evaluated = new Function(`return ${sanitized}`)();
        if (evaluated === Infinity || evaluated === -Infinity || Number.isNaN(evaluated)) {
          setCalcResult('Error');
        } else {
          setCalcResult(Number(evaluated).toLocaleString(undefined, { maximumFractionDigits: 4 }));
        }
      } catch {
        setCalcResult('Error');
      }
    } else {
      if (calcResult === 'Error') {
        setCalcResult('');
        setCalcExpr(val);
      } else if (calcResult) {
        setCalcResult('');
        if (/[+×÷-]/.test(val)) {
          setCalcExpr(calcResult.replace(/,/g, '') + val);
        } else {
          setCalcExpr(val);
        }
      } else {
        setCalcExpr(prev => {
          if (/[+×÷-]/.test(val) && prev && /[+×÷-]/.test(prev.slice(-1))) {
            return prev.slice(0, -1) + val;
          }
          return prev + val;
        });
      }
    }
  };

  const clickHandlerRef = useRef(handleCalcClick);
  useEffect(() => {
    clickHandlerRef.current = handleCalcClick;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      // Universal layout-agnostic bracket handler (using physical keys keyCode 57 and 48)
      if (e.shiftKey && (e.keyCode === 57 || e.code === 'Digit9')) {
        clickHandlerRef.current('(');
        return;
      }
      if (e.shiftKey && (e.keyCode === 48 || e.code === 'Digit0')) {
        clickHandlerRef.current(')');
        return;
      }

      const key = e.key;
      const keyMap: Record<string, string> = {
        '+': '+', '-': '-', '*': '×', 'x': '×', 'X': '×', '/': '÷',
        '(': '(', ')': ')', '.': '.', 'Enter': '=', '=': '=',
        'Backspace': 'DEL', 'Escape': 'C', 'c': 'C', 'C': 'C'
      };

      if (/[0-9]/.test(key)) {
        clickHandlerRef.current(key);
      } else if (keyMap[key] !== undefined) {
        if (['Enter', '=', 'Backspace', 'Escape'].includes(key)) {
          e.preventDefault();
        }
        clickHandlerRef.current(keyMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getLivePreview = (expr: string) => {
    if (!expr) return '';
    let sanitized = expr.replace(/×/g, '*').replace(/÷/g, '/').trim();
    while (sanitized && /[+\-*/(]$/.test(sanitized)) {
      sanitized = sanitized.slice(0, -1).trim();
    }
    const openBrackets = (sanitized.match(/\(/g) || []).length;
    let closeBrackets = (sanitized.match(/\)/g) || []).length;
    while (openBrackets > closeBrackets) {
      sanitized += ')';
      closeBrackets++;
    }
    if (!sanitized) return '';
    try {
      if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) return '';
      const evaluated = new Function(`return ${sanitized}`)();
      if (evaluated === Infinity || evaluated === -Infinity || Number.isNaN(evaluated)) return '';
      return Number(evaluated).toLocaleString(undefined, { maximumFractionDigits: 4 });
    } catch {
      return '';
    }
  };

  const renderFormattedExpression = (expr: string, size: 'sm' | 'lg' = 'lg') => {
    if (!expr) return <span className="text-(--text-tertiary) opacity-40">0</span>;
    const isSm = size === 'sm';
    return expr.split(/([+×÷\-()])/).map((token, index) => {
      if (!token) return null;
      const uniqueKey = `token-${index}-${token}`;

      if (/[+×÷-]/.test(token)) {
        return (
          <span 
            key={uniqueKey} 
            className={`text-primary-500 font-black inline-block select-none ${isSm ? 'mx-0.5 text-[11px] font-extrabold' : 'mx-1 text-[22px]'}`}
          >
            {token}
          </span>
        );
      }
      if (/[()]/.test(token)) {
        return (
          <span 
            key={uniqueKey} 
            className={`text-indigo-500 dark:text-indigo-400 font-black select-none ${isSm ? 'text-[10px]' : 'text-[20px]'}`}
          >
            {token}
          </span>
        );
      }
      return (
        <span 
          key={uniqueKey} 
          className={`font-semibold tracking-wider ${isSm ? 'text-(--text-secondary) text-[10px]' : 'text-(--text-primary) font-bold text-[19px]'}`}
        >
          {token}
        </span>
      );
    });
  };

  const livePreview = getLivePreview(calcExpr);

  return (
    <div className="space-y-2">
      {/* Calculator Screen */}
      <div 
        className="w-full bg-black/5 dark:bg-white/5 rounded-lg p-2.5 text-start min-h-[68px] flex flex-col justify-between overflow-hidden font-mono"
        style={{ direction: 'ltr' }}
      >
        {calcResult ? (
          <>
            <div className="text-[10px] text-(--text-tertiary) truncate h-4 tracking-wider" dir="ltr" style={{ direction: 'ltr' }}>
              {renderFormattedExpression(calcExpr, 'sm')}
            </div>
            <div className="text-[22px] font-black text-primary-500 truncate h-7 tracking-wider flex items-center gap-1.5" dir="ltr" style={{ direction: 'ltr' }}>
              <button 
                type="button"
                onClick={() => handleCopy(calcResult)}
                className="inline-block cursor-pointer transition-colors duration-200 hover:text-primary-600 dark:hover:text-primary-400 focus:outline-none"
              >
                {calcResult}
              </button>
              {showCopiedCheck && (
                <span className="inline-flex items-center gap-1 text-green-500 select-none animate-pulse text-[10px] font-bold">
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} role="img" aria-label="Copied successfully">
                    <title>Copied successfully</title>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-sans">تم النسخ</span>
                </span>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="text-[19px] font-bold text-(--text-primary) truncate h-7 tracking-wider flex items-center" dir="ltr" style={{ direction: 'ltr' }}>
              {renderFormattedExpression(calcExpr, 'lg')}
            </div>
            <div className="text-[11px] text-(--text-tertiary) opacity-60 truncate h-4 tracking-wider flex justify-start items-center gap-1.5" dir="ltr" style={{ direction: 'ltr' }}>
              {livePreview && (
                <>
                  <span className="text-[10px] select-none opacity-80">≈</span>
                  <button 
                    type="button"
                    onClick={() => handleCopy(livePreview)}
                    className="inline-block cursor-pointer transition-colors duration-200 hover:text-primary-500 dark:hover:text-primary-400 focus:outline-none"
                  >
                    {livePreview}
                  </button>
                </>
              )}
              {showCopiedCheck && (
                <span className="inline-flex items-center gap-0.5 text-green-500 select-none animate-pulse text-[9px] font-bold">
                  <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} role="img" aria-label="Copied successfully">
                    <title>Copied successfully</title>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="font-sans">تم النسخ</span>
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Calculator Keys Grid */}
      <div className="grid grid-cols-4 gap-1.5 font-mono" dir="ltr" style={{ direction: 'ltr' }}>
        {KEYS.map(({ val, display, type }) => {
          let btnClass = "h-8 rounded-lg text-xs font-bold transition-all active:scale-95 ";
          if (type === 'clear') {
            btnClass += "bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-black";
          } else if (type === 'secondary') {
            btnClass += "bg-black/5 dark:bg-white/5 text-(--text-secondary) hover:bg-black/10 dark:hover:bg-white/10 text-sm font-black";
          } else if (type === 'operator') {
            btnClass += "bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 text-base font-black";
          } else if (type === 'equals') {
            btnClass += "bg-primary-500 text-white hover:bg-primary-600 text-base font-black";
          } else {
            btnClass += "bg-black/5 dark:bg-white/5 text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10";
          }

          return (
            <button
              key={val}
              type="button"
              onClick={() => handleCalcClick(val)}
              className={btnClass}
            >
              {display}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Calculator;
