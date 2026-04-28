import React from 'react';

interface AnimatedCounterProps {
  value: number;
  fractionDigits?: number;
  className?: string;
}

/**
 * A simplified, highly stable animated counter for financial data.
 * Optimized for grid layouts and RTL/LTR compatibility.
 */
export const AnimatedCounter = ({
  value,
  fractionDigits = 0,
  className = '',
}: AnimatedCounterProps) => {
  const formatted = value.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

  const characters = formatted.split('');

  return (
    <div 
      className={`flex items-baseline overflow-hidden tabular-nums ${className}`} 
      dir="ltr"
      style={{ fontFeatureSettings: '"tnum"' }}
    >
      {characters.map((char, index) => {
        if (!/[0-9]/.test(char)) {
          return (
            <span key={index} className="opacity-50 px-[0.05em]">
              {char}
            </span>
          );
        }

        const digit = parseInt(char, 10);
        return (
          <div
            key={index}
            className="relative h-[1.1em] w-[0.65em] overflow-hidden inline-block"
            style={{ verticalAlign: 'text-bottom' }}
          >
            <div
              className="absolute top-0 left-0 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
              style={{ transform: `translateY(-${digit * 10}%)` }}
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <span key={num} className="h-full flex items-center justify-center">
                  {num}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
