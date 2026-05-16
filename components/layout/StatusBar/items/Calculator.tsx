import { type React, useState } from 'react';

export const Calculator: React.FC = () => {
  const [calcExpr, setCalcExpr] = useState('');
  const [calcResult, setCalcResult] = useState('');

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
        const sanitized = calcExpr
          .replace(/×/g, '*')
          .replace(/÷/g, '/');
        
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
        // If the new key is a mathematical operator, chain it to the previous result
        if (/[+×÷-]/.test(val)) {
          const cleanResult = calcResult.replace(/,/g, '');
          setCalcExpr(cleanResult + val);
        } else {
          // If it's a number, bracket, or decimal, start a fresh calculation
          setCalcExpr(val);
        }
      } else {
        setCalcExpr(prev => {
          // If a mathematical operator is clicked and the previous character is also an operator, overwrite it
          if (/[+×÷-]/.test(val) && prev && /[+×÷-]/.test(prev.slice(-1))) {
            return prev.slice(0, -1) + val;
          }
          return prev + val;
        });
      }
    }
  };

  // Safe live preview evaluator
  const getLivePreview = (expr: string) => {
    if (!expr) return '';
    let sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .trim();
    
    // Strip trailing operator or open bracket for safe live evaluation
    while (sanitized && /[+\-*/(]$/.test(sanitized)) {
      sanitized = sanitized.slice(0, -1).trim();
    }
    
    // Auto-balance parentheses if unbalanced
    const openBrackets = (sanitized.match(/\(/g) || []).length;
    let closeBrackets = (sanitized.match(/\)/g) || []).length;
    while (openBrackets > closeBrackets) {
      sanitized += ')';
      closeBrackets++;
    }

    if (!sanitized) return '';
    try {
      if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
        return '';
      }
      const evaluated = new Function(`return ${sanitized}`)();
      if (evaluated === Infinity || evaluated === -Infinity || Number.isNaN(evaluated)) {
        return '';
      }
      return Number(evaluated).toLocaleString(undefined, { maximumFractionDigits: 4 });
    } catch {
      return '';
    }
  };

  // LaTeX-like syntax highlighting for formula text
  const renderFormattedExpression = (expr: string, size: 'sm' | 'lg' = 'lg') => {
    if (!expr) return <span className="text-(--text-tertiary) opacity-40">0</span>;
    
    const tokens = expr.split(/([+×÷\-()])/);
    
    return tokens.map((token, index) => {
      if (!token) return null;
      
      const uniqueKey = `token-${index}-${token}`;

      if (size === 'sm') {
        // Smaller sizes for the locked/history line
        if (/[+×÷-]/.test(token)) {
          return (
            <span 
              key={uniqueKey} 
              className="mx-0.5 text-primary-500 font-extrabold text-[11px] inline-block select-none"
            >
              {token}
            </span>
          );
        }
        if (/[()]/.test(token)) {
          return (
            <span 
              key={uniqueKey} 
              className="text-indigo-500 dark:text-indigo-400 font-black text-[10px] select-none"
            >
              {token}
            </span>
          );
        }
        return (
          <span key={uniqueKey} className="text-(--text-secondary) font-semibold text-[10px] tracking-wider">
            {token}
          </span>
        );
      }

      // Larger sizes for the active equation line (size === 'lg')
      if (/[+×÷-]/.test(token)) {
        return (
          <span 
            key={uniqueKey} 
            className="mx-1 text-primary-500 font-black text-[22px] inline-block select-none"
          >
            {token}
          </span>
        );
      }
      if (/[()]/.test(token)) {
        return (
          <span 
            key={uniqueKey} 
            className="text-indigo-500 dark:text-indigo-400 font-black text-[20px] select-none"
          >
            {token}
          </span>
        );
      }
      return (
        <span key={uniqueKey} className="text-(--text-primary) font-bold text-[19px] tracking-wider">
          {token}
        </span>
      );
    });
  };

  const livePreview = getLivePreview(calcExpr);

  return (
    <div className="space-y-2">
      {/* Calculator Screen */}
      <div className="w-full bg-black/5 dark:bg-white/5 rounded-lg p-2.5 text-start min-h-[68px] flex flex-col justify-between overflow-hidden font-mono">
        {calcResult ? (
          <>
            {/* Show locked equation on top, final result on bottom */}
            <div className="text-[10px] text-(--text-tertiary) truncate h-4 tracking-wider" dir="ltr">
              {renderFormattedExpression(calcExpr, 'sm')}
            </div>
            <div className="text-[22px] font-black text-primary-500 truncate h-7 tracking-wider" dir="ltr">
              {calcResult}
            </div>
          </>
        ) : (
          <>
            {/* Show active equation highlighting on top, live preview on bottom */}
            <div className="text-[19px] font-bold text-(--text-primary) truncate h-7 tracking-wider flex items-center" dir="ltr">
              {renderFormattedExpression(calcExpr, 'lg')}
            </div>
            <div className="text-[11px] text-(--text-tertiary) opacity-60 truncate h-4 tracking-wider flex justify-start items-center gap-1" dir="ltr">
              {livePreview && (
                <>
                  <span className="text-[10px] select-none opacity-80">≈</span>
                  <span>{livePreview}</span>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Calculator Keys Grid */}
      <div className="grid grid-cols-4 gap-1.5 font-mono" dir="ltr">
        {/* Row 1 */}
        <button type="button" onClick={() => handleCalcClick('C')} className="h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 text-sm font-black transition-all active:scale-95">C</button>
        <button type="button" onClick={() => handleCalcClick('DEL')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-secondary) hover:bg-black/10 dark:hover:bg-white/10 text-sm font-black transition-all active:scale-95">⌫</button>
        <button type="button" onClick={() => handleCalcClick('(')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-secondary) hover:bg-black/10 dark:hover:bg-white/10 text-sm font-black transition-all active:scale-95">(</button>
        <button type="button" onClick={() => handleCalcClick(')')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-secondary) hover:bg-black/10 dark:hover:bg-white/10 text-sm font-black transition-all active:scale-95">)</button>

        {/* Row 2 */}
        <button type="button" onClick={() => handleCalcClick('7')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold transition-all active:scale-95">7</button>
        <button type="button" onClick={() => handleCalcClick('8')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold transition-all active:scale-95">8</button>
        <button type="button" onClick={() => handleCalcClick('9')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold transition-all active:scale-95">9</button>
        <button type="button" onClick={() => handleCalcClick('÷')} className="h-8 rounded-lg bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 text-base font-black transition-all active:scale-95">÷</button>

        {/* Row 3 */}
        <button type="button" onClick={() => handleCalcClick('4')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold transition-all active:scale-95">4</button>
        <button type="button" onClick={() => handleCalcClick('5')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold transition-all active:scale-95">5</button>
        <button type="button" onClick={() => handleCalcClick('6')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold transition-all active:scale-95">6</button>
        <button type="button" onClick={() => handleCalcClick('×')} className="h-8 rounded-lg bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 text-base font-black transition-all active:scale-95">×</button>

        {/* Row 4 */}
        <button type="button" onClick={() => handleCalcClick('1')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold transition-all active:scale-95">1</button>
        <button type="button" onClick={() => handleCalcClick('2')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold transition-all active:scale-95">2</button>
        <button type="button" onClick={() => handleCalcClick('3')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold transition-all active:scale-95">3</button>
        <button type="button" onClick={() => handleCalcClick('-')} className="h-8 rounded-lg bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 text-base font-black transition-all active:scale-95">-</button>

        {/* Row 5 */}
        <button type="button" onClick={() => handleCalcClick('0')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold transition-all active:scale-95">0</button>
        <button type="button" onClick={() => handleCalcClick('.')} className="h-8 rounded-lg bg-black/5 dark:bg-white/5 text-(--text-primary) hover:bg-black/10 dark:hover:bg-white/10 text-xs font-bold transition-all active:scale-95">.</button>
        <button type="button" onClick={() => handleCalcClick('=')} className="h-8 rounded-lg bg-primary-500 text-white hover:bg-primary-600 text-base font-black transition-all active:scale-95">=</button>
        <button type="button" onClick={() => handleCalcClick('+')} className="h-8 rounded-lg bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 text-base font-black transition-all active:scale-95">+</button>
      </div>
    </div>
  );
};

export default Calculator;
