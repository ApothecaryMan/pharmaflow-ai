import React, { type InputHTMLAttributes, useMemo, useRef, useState, useEffect } from 'react';
import { INPUT_BASE } from '../../utils/themeStyles';

/**
 * @module SmartInputs
 * Centralized "Smart" inputs with auto RTL/LTR detection, validation, and ghost autocomplete.
 */

export const getSmartDirection = (v?: string | null, p?: string | null): 'rtl' | 'ltr' => {
  const t = v || p || '';
  return /[\u0600-\u06FF]/.test(t) ? 'rtl' : 'ltr';
};

export const useSmartDirection = (v?: string | null, p?: string | null) => useMemo(() => getSmartDirection(v, p), [v, p]);

export const isValidEmail = (e: string) => /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/.test(e);
export const isValidPhone = (p: string) => /^[\d\s+\-()]{5,20}$/.test(p);
export const cleanPhone = (p: string) => p.replace(/[^\d+]/g, '');

export const SmartInput: React.FC<InputHTMLAttributes<HTMLInputElement>> = ({ value, className, placeholder, ...p }) => (
  <input {...p} value={value} placeholder={placeholder} dir={useSmartDirection(String(value || ''), placeholder)} className={`${INPUT_BASE} ${className || ''}`} />
);

export const SmartTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ value, className, placeholder, ...p }) => (
  <textarea {...p} value={value} placeholder={placeholder} dir={useSmartDirection(String(value || ''), placeholder)} className={`${INPUT_BASE} ${className || ''}`} />
);

export const SmartDateInput: React.FC<{ value: string; onChange: (v: string) => void; className?: string; required?: boolean; placeholder?: string }> = ({ value, onChange, className, required, placeholder }) => {
  const [foc, setFoc] = useState(false), [disp, setDisp] = useState('');
  const fmt = (s: string, edit: boolean) => {
    if (!s) return '';
    try { const [y, m] = s.split('-'); return edit ? `${m}${y.slice(2)}` : `${m}/${y.slice(2)}`; } catch(e) { return s; }
  };
  useEffect(() => setDisp(fmt(value, foc)), [value, foc]);
  return (
    <input type="text" inputMode="numeric" className={className || INPUT_BASE} required={required} placeholder={foc ? 'MMYY' : placeholder || 'MM/YY'} value={disp} maxLength={4}
      onChange={e => setDisp(e.target.value.replace(/\D/g, '').slice(0, 4))} onFocus={() => setFoc(true)}
      onBlur={() => {
        setFoc(false); const v = disp.replace(/\D/g, '');
        if (v.length === 4) { const m = v.slice(0, 2), y = 2000 + parseInt(v.slice(2)); if (parseInt(m) >= 1 && parseInt(m) <= 12) return onChange(`${y}-${m}`); }
        v ? setDisp(fmt(value, false)) : onChange('');
      }}
    />
  );
};

const SpecialtyInput = (type: string, regex: RegExp) => ({ value, onChange, className, ...p }: any) => (
  <input {...p} type={type} dir="ltr" value={value} className={`${INPUT_BASE} ${className || ''}`} onChange={e => onChange(e.target.value.replace(regex, ''))} />
);
export const SmartPhoneInput = SpecialtyInput('tel', /[^0-9\s+\-()]/g);
export const SmartEmailInput = SpecialtyInput('email', /[^a-zA-Z0-9@._\-+]/g);
export const SmartPasswordInput = SpecialtyInput('password', /[^a-zA-Z0-9@]/g);

export interface SmartAutocompleteProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string; onChange: (v: string) => void; suggestions: string[]; caseSensitive?: boolean;
  onSuggestionAccept?: (s: string) => void; inputRef?: React.RefObject<HTMLInputElement | null>;
}

export const SmartAutocomplete: React.FC<SmartAutocompleteProps> = ({
  value, onChange, suggestions, placeholder, disabled, className, caseSensitive = false, onSuggestionAccept, inputRef: extRef, ...p
}) => {
  const [caps, setCaps] = useState(false), intRef = useRef<HTMLInputElement>(null), ref = extRef || intRef;
  const dir = useSmartDirection(value, placeholder);
  
  const match = useMemo(() => {
    if (!value || disabled) return '';
    const sv = caseSensitive ? value : value.toLowerCase();
    return suggestions.find(s => (caseSensitive ? s : s.toLowerCase()).startsWith(sv) && s.length > value.length) || '';
  }, [value, suggestions, disabled, caseSensitive]);

  const ghost = useMemo(() => {
    if (!match || !value) return '';
    return match.slice(value.length).toLowerCase();
  }, [match, value]);

  return (
    <div className="relative inline-block w-full">
      <input {...p} ref={ref} type="text" autoComplete="off" value={value} dir={dir} disabled={disabled} placeholder={placeholder} className={`${INPUT_BASE} shadow-xs ${className || ''}`}
        onChange={e => onChange(e.target.value)} onKeyUp={e => setCaps(e.getModifierState('CapsLock'))}
        onKeyDown={e => {
          setCaps(e.getModifierState('CapsLock'));
          if (match && (e.key === 'ArrowRight' || e.key === 'Tab')) { e.preventDefault(); onChange(match); onSuggestionAccept?.(match); }
          else if (match && e.key === 'Escape') { e.preventDefault(); }
          p.onKeyDown?.(e);
        }}
      />
      {ghost && (
        <div className="absolute inset-0 pointer-events-none flex items-center" style={{ paddingInlineStart: ref.current?.style.paddingInlineStart || '0.75rem', direction: dir }}>
          <span className="invisible whitespace-pre">{value}</span>
          <span className={`inline-flex items-center px-1.5 py-1 ms-1 rounded-lg bg-gray-100 dark:bg-zinc-800 text-[11px] font-black text-gray-500 dark:text-gray-400 shadow-sm border border-transparent dark:border-zinc-700 animate-in fade-in duration-200 ${caps ? 'uppercase' : ''}`}>
            {caps ? ghost.toUpperCase() : ghost}
            <span className="material-symbols-rounded text-[14px] ms-1 opacity-70">keyboard_tab</span>
          </span>
        </div>
      )}
    </div>
  );
};

export const DrugSearchInput: React.FC<any> = ({ onEnter, ...p }) => (
  <SmartAutocomplete {...p} onKeyDown={e => { p.onKeyDown?.(e); if (e.key === 'Enter' && onEnter) { e.preventDefault(); onEnter(); } }} />
);
