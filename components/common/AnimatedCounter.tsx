import React from 'react';

export const AnimatedCounter = ({ value, prefix = '', suffix = '', fractionDigits = 0, className = '' }: { value: number, prefix?: string, suffix?: string, fractionDigits?: number, className?: string }) => {
    // Format number with commas and specified decimals
    const formatted = value.toLocaleString('en-US', { 
        minimumFractionDigits: fractionDigits, 
        maximumFractionDigits: fractionDigits 
    });
    
    // Split into characters
    const characters = formatted.split('');

    return (
        <div className={`flex items-baseline overflow-hidden ${className}`} dir="ltr">
            {prefix && <span className="ltr:mr-0.5 rtl:ml-0.5 text-gray-400">{prefix}</span>}
            {characters.map((char, index) => {
                if (!/[0-9]/.test(char)) {
                    return <span key={index} className="mx-[1px]">{char}</span>;
                }

                const digit = parseInt(char, 10);
                return (
                    <div key={index} className="relative h-[1.1em] w-[0.65em] overflow-hidden inline-block" style={{ verticalAlign: 'text-bottom' }}>
                        <div 
                            className="absolute top-0 left-0 flex flex-col transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                            style={{ transform: `translateY(-${digit * 10}%)` }}
                        >
                            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <span key={num} className="h-[100%] flex items-center justify-center">
                                    {num}
                                </span>
                            ))}
                        </div>
                    </div>
                );
            })}
            {suffix && <span className="ltr:ml-0.5 rtl:mr-0.5">{suffix}</span>}
        </div>
    );
};
