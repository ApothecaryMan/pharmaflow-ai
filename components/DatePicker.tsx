import React, { useState, useEffect, useRef } from 'react';

interface DatePickerProps {
    value: string;
    onChange: (value: string) => void;
    label: string;
    color: string;
    placeholder?: string;
    icon?: string;
    locale?: string;
    translations?: {
        cancel: string;
        ok: string;
        hour: string;
        minute: string;
    };
}

export const DatePicker: React.FC<DatePickerProps> = ({ 
    value, 
    onChange, 
    label, 
    color, 
    placeholder, 
    icon = 'calendar_today',
    locale = 'en-US',
    translations = {
        cancel: 'Cancel',
        ok: 'OK',
        hour: 'Hour',
        minute: 'Minute'
    }
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(value ? new Date(value) : null);
    const [focusedDate, setFocusedDate] = useState<Date>(new Date());
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) {
            const date = new Date(value);
            setSelectedDate(date);
            setViewDate(date);
            setFocusedDate(date);
        } else {
            setSelectedDate(null);
            setFocusedDate(new Date());
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            // Focus the dialog or the current selected date when opened
            setTimeout(() => {
                const selectedButton = dialogRef.current?.querySelector('button[aria-selected="true"]') as HTMLElement;
                if (selectedButton) {
                    selectedButton.focus();
                } else {
                    dialogRef.current?.focus();
                }
            }, 50);
        } else {
            // Return focus to trigger when closed
            triggerRef.current?.focus();
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const daysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const firstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        if (selectedDate) {
            newDate.setHours(selectedDate.getHours());
            newDate.setMinutes(selectedDate.getMinutes());
        } else {
            newDate.setHours(0, 0, 0, 0);
        }
        setSelectedDate(newDate);
        setFocusedDate(newDate);
    };

    const handleTimeChange = (type: 'hours' | 'minutes', val: string) => {
        if (!selectedDate) return;
        const newDate = new Date(selectedDate);
        if (type === 'hours') newDate.setHours(parseInt(val));
        else newDate.setMinutes(parseInt(val));
        setSelectedDate(newDate);
    };

    const handleConfirm = () => {
        if (selectedDate) {
            const offset = selectedDate.getTimezoneOffset() * 60000;
            const localISOTime = (new Date(selectedDate.getTime() - offset)).toISOString().slice(0, 16);
            onChange(localISOTime);
        } else {
            onChange('');
        }
        setIsOpen(false);
    };

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setSelectedDate(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen) return;

        switch (e.key) {
            case 'Escape':
                setIsOpen(false);
                break;
            case 'ArrowLeft':
                e.preventDefault();
                setFocusedDate(new Date(focusedDate.getFullYear(), focusedDate.getMonth(), focusedDate.getDate() - 1));
                if (focusedDate.getDate() === 1) handlePrevMonth();
                break;
            case 'ArrowRight':
                e.preventDefault();
                setFocusedDate(new Date(focusedDate.getFullYear(), focusedDate.getMonth(), focusedDate.getDate() + 1));
                if (focusedDate.getDate() === daysInMonth(focusedDate)) handleNextMonth();
                break;
            case 'ArrowUp':
                e.preventDefault();
                setFocusedDate(new Date(focusedDate.getFullYear(), focusedDate.getMonth(), focusedDate.getDate() - 7));
                break;
            case 'ArrowDown':
                e.preventDefault();
                setFocusedDate(new Date(focusedDate.getFullYear(), focusedDate.getMonth(), focusedDate.getDate() + 7));
                break;
            case 'Enter':
                e.preventDefault();
                handleDateClick(focusedDate.getDate());
                break;
        }
    };

    // Sync viewDate with focusedDate for keyboard nav
    useEffect(() => {
        if (isOpen && (focusedDate.getMonth() !== viewDate.getMonth() || focusedDate.getFullYear() !== viewDate.getFullYear())) {
            setViewDate(new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1));
        }
    }, [focusedDate, isOpen]);

    const renderCalendar = () => {
        const days = [];
        const totalDays = daysInMonth(viewDate);
        const startDay = firstDayOfMonth(viewDate);

        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        }

        for (let i = 1; i <= totalDays; i++) {
            const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), i);
            const isSelected = selectedDate && 
                currentDate.getDate() === selectedDate.getDate() && 
                currentDate.getMonth() === selectedDate.getMonth() && 
                currentDate.getFullYear() === selectedDate.getFullYear();
            
            const isToday = new Date().toDateString() === currentDate.toDateString();
            const isFocused = focusedDate.getDate() === i && focusedDate.getMonth() === viewDate.getMonth();

            days.push(
                <button
                    key={i}
                    onClick={() => handleDateClick(i)}
                    tabIndex={isFocused ? 0 : -1}
                    aria-selected={isSelected}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors focus:outline-none focus:ring-2 ring-${color}-500
                        ${isSelected 
                            ? `bg-${color}-600 text-white font-bold` 
                            : isToday 
                                ? `text-${color}-600 font-bold border border-${color}-200 dark:border-${color}-800` 
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }
                    `}
                >
                    {i.toLocaleString(locale)}
                </button>
            );
        }

        return days;
    };

    // Generate weekdays based on locale
    const weekDays = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(2023, 0, i + 1); // Start from a Sunday
        return d.toLocaleDateString(locale, { weekday: 'narrow' });
    });

    return (
        <div className="relative" ref={containerRef} onKeyDown={handleKeyDown}>
            {/* Trigger */}
            <button 
                ref={triggerRef}
                type="button"
                aria-haspopup="dialog"
                aria-expanded={isOpen}
                aria-label={label}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all cursor-pointer select-none focus:outline-none focus:ring-2 ring-${color}-500
                    ${value 
                        ? `bg-${color}-50 dark:bg-${color}-900/20 border-${color}-200 dark:border-${color}-800 text-${color}-700 dark:text-${color}-300` 
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }
                `}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="material-symbols-rounded text-[18px]">{icon}</span>
                <span className="text-sm font-medium whitespace-nowrap">
                    {value ? new Date(value).toLocaleString(locale, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : (placeholder || label)}
                </span>
                {value && (
                    <div 
                        role="button"
                        tabIndex={0}
                        onClick={handleClear}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleClear(e as any);
                            }
                        }}
                        className={`w-5 h-5 rounded-full flex items-center justify-center hover:bg-${color}-200 dark:hover:bg-${color}-800 transition-colors ml-1`}
                        aria-label="Clear date"
                    >
                        <span className="material-symbols-rounded text-[14px]">close</span>
                    </div>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div 
                    ref={dialogRef}
                    role="dialog"
                    aria-modal="true"
                    aria-label={label}
                    tabIndex={-1}
                    className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-gray-900 rounded-[28px] shadow-xl border border-gray-200 dark:border-gray-800 p-4 w-[320px] animate-fade-in outline-none"
                    dir={locale === 'ar-EG' || locale.startsWith('ar') ? 'rtl' : 'ltr'}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button onClick={handlePrevMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rtl:rotate-180" aria-label="Previous month">
                            <span className="material-symbols-rounded">chevron_left</span>
                        </button>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200" aria-live="polite">
                            {viewDate.toLocaleString(locale, { month: 'long', year: 'numeric' })}
                        </span>
                        <button onClick={handleNextMonth} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 rtl:rotate-180" aria-label="Next month">
                            <span className="material-symbols-rounded">chevron_right</span>
                        </button>
                    </div>

                    {/* Weekdays */}
                    <div className="grid grid-cols-7 mb-2" aria-hidden="true">
                        {weekDays.map((day, i) => (
                            <div key={i} className="w-8 h-8 flex items-center justify-center text-xs font-medium text-gray-400">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-y-1 mb-4" role="grid">
                        {renderCalendar()}
                    </div>

                    {/* Time Selection */}
                    {selectedDate && (
                        <div className="flex items-center justify-center gap-2 mb-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                            <div className="flex flex-col items-center">
                                <label htmlFor="hour-input" className="text-[10px] text-gray-400 mb-1">{translations.hour}</label>
                                <input 
                                    id="hour-input"
                                    type="number" 
                                    min="0" 
                                    max="23" 
                                    className={`w-12 p-1 text-center rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 ring-${color}-500 outline-none`}
                                    value={selectedDate.getHours()}
                                    onChange={(e) => handleTimeChange('hours', e.target.value)}
                                />
                            </div>
                            <span className="text-gray-400 mt-4">:</span>
                            <div className="flex flex-col items-center">
                                <label htmlFor="minute-input" className="text-[10px] text-gray-400 mb-1">{translations.minute}</label>
                                <input 
                                    id="minute-input"
                                    type="number" 
                                    min="0" 
                                    max="59" 
                                    className={`w-12 p-1 text-center rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm focus:ring-2 ring-${color}-500 outline-none`}
                                    value={selectedDate.getMinutes()}
                                    onChange={(e) => handleTimeChange('minutes', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-2">
                        <button 
                            onClick={() => setIsOpen(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors focus:outline-none focus:ring-2 ring-gray-400"
                        >
                            {translations.cancel}
                        </button>
                        <button 
                            onClick={handleConfirm}
                            className={`px-4 py-2 text-sm font-medium text-white bg-${color}-600 hover:bg-${color}-700 rounded-full transition-colors focus:outline-none focus:ring-2 ring-${color}-500`}
                        >
                            {translations.ok}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
