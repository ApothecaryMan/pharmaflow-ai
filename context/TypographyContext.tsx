import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AVAILABLE_FONTS_AR, AVAILABLE_FONTS_EN } from '../config/fonts';
import type { Language } from '../types';
import { storage } from '../utils/storage';

interface TypographyState {
  language: Language;
  fontFamilyEN: string;
  fontFamilyAR: string;
  textTransform: 'normal' | 'uppercase';
  numeralSystem: 'AR' | 'EN';
  graphicStyle: boolean;
  graphicFontVariant: 'serif' | 'sans';
}

interface TypographyContextType extends TypographyState {
  setLanguage: (lang: Language) => void;
  setFontFamilyEN: (font: string) => void;
  setFontFamilyAR: (font: string) => void;
  setTextTransform: (transform: 'normal' | 'uppercase') => void;
  setNumeralSystem: (system: 'AR' | 'EN') => void;
  setGraphicStyle: (graphic: boolean) => void;
  setGraphicFontVariant: (variant: 'serif' | 'sans') => void;
  numeralLocale: string;
  textLocale: string;
}

const PREFIX = 'pharma_';

const defaultState: TypographyState = {
  language: 'AR',
  fontFamilyEN: 'En-Firewall',
  fontFamilyAR: 'Ar-Firewall',
  textTransform: 'uppercase',
  numeralSystem: 'EN',
  graphicStyle: false,
  graphicFontVariant: 'sans',
};

const loadTypography = (): TypographyState => {
  if (typeof window === 'undefined') return defaultState;
  try {
    const language = storage.get<Language | null>(`${PREFIX}language`, null);
    const fontFamilyEN = storage.get<string | null>(`${PREFIX}fontFamilyEN`, null);
    const fontFamilyAR = storage.get<string | null>(`${PREFIX}fontFamilyAR`, null);
    const textTransform = storage.get<'normal' | 'uppercase' | null>(
      `${PREFIX}textTransform`,
      null
    );
    const numeralSystem = storage.get<'AR' | 'EN' | null>(`${PREFIX}numeralSystem`, null);
    const graphicStyle = storage.get<boolean | null>(`${PREFIX}graphicStyle`, null);
    const graphicFontVariant = storage.get<'serif' | 'sans' | null>(
      `${PREFIX}graphicFontVariant`,
      null
    );

    return {
      language: language ?? defaultState.language,
      fontFamilyEN: fontFamilyEN ?? defaultState.fontFamilyEN,
      fontFamilyAR: fontFamilyAR ?? defaultState.fontFamilyAR,
      textTransform: textTransform ?? defaultState.textTransform,
      numeralSystem: numeralSystem ?? defaultState.numeralSystem,
      graphicStyle: graphicStyle ?? defaultState.graphicStyle,
      graphicFontVariant: graphicFontVariant ?? defaultState.graphicFontVariant,
    };
  } catch (e) {
    console.warn('Failed to load typography settings:', e);
  }
  return defaultState;
};

const TypographyContext = createContext<TypographyContextType | undefined>(undefined);

export const TypographyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TypographyState>(loadTypography);

  useEffect(() => {
    storage.set(`${PREFIX}language`, state.language);
  }, [state.language]);

  useEffect(() => {
    storage.set(`${PREFIX}fontFamilyEN`, state.fontFamilyEN);
  }, [state.fontFamilyEN]);

  useEffect(() => {
    storage.set(`${PREFIX}fontFamilyAR`, state.fontFamilyAR);
  }, [state.fontFamilyAR]);

  useEffect(() => {
    storage.set(`${PREFIX}textTransform`, state.textTransform);
  }, [state.textTransform]);

  useEffect(() => {
    storage.set(`${PREFIX}numeralSystem`, state.numeralSystem);
  }, [state.numeralSystem]);

  useEffect(() => {
    storage.set(`${PREFIX}graphicStyle`, state.graphicStyle);
  }, [state.graphicStyle]);

  useEffect(() => {
    storage.set(`${PREFIX}graphicFontVariant`, state.graphicFontVariant);
  }, [state.graphicFontVariant]);

  useEffect(() => {
    if (state.graphicStyle) {
      document.body.classList.add('graphic-mode');
    } else {
      document.body.classList.remove('graphic-mode');
    }
  }, [state.graphicStyle]);

  useEffect(() => {
    if (state.graphicFontVariant === 'sans') {
      document.body.classList.add('graphic-mode-sans');
    } else {
      document.body.classList.remove('graphic-mode-sans');
    }
  }, [state.graphicFontVariant]);

  useEffect(() => {
    document.documentElement.style.setProperty('--font-en', state.fontFamilyEN);
    document.documentElement.style.setProperty('--font-ar', state.fontFamilyAR);

    const createdIds: string[] = [];

    const enFont = AVAILABLE_FONTS_EN.find((f) => f.value === state.fontFamilyEN);
    if (enFont?.url) {
      const linkId = `font-en-${state.fontFamilyEN.replace(/[^a-zA-Z0-9]/g, '')}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.href = enFont.url;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        createdIds.push(linkId);
      }
    }

    const arFont = AVAILABLE_FONTS_AR.find((f) => f.value === state.fontFamilyAR);
    if (arFont?.url) {
      const linkId = `font-ar-${state.fontFamilyAR.replace(/[^a-zA-Z0-9]/g, '')}`;
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.href = arFont.url;
        link.rel = 'stylesheet';
        document.head.appendChild(link);
        createdIds.push(linkId);
      }
    }

    return () => {
      createdIds.forEach((id) => document.getElementById(id)?.remove());
    };
  }, [state.fontFamilyEN, state.fontFamilyAR]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--text-transform',
      state.textTransform === 'uppercase' ? 'uppercase' : 'none'
    );
    if (state.textTransform === 'uppercase') {
      document.body.classList.add('uppercase-mode');
    } else {
      document.body.classList.remove('uppercase-mode');
    }
  }, [state.textTransform]);

  useEffect(() => {
    const lang = state.language.toLowerCase();
    document.documentElement.lang = lang;
    document.documentElement.dir = state.language === 'AR' ? 'rtl' : 'ltr';
    document.body.dir = document.documentElement.dir;
  }, [state.language]);

  const numeralLocale = useMemo(() => {
    const isAR = state.language === 'AR';
    if (isAR) {
      return state.numeralSystem === 'AR' ? 'ar-EG' : 'ar-u-nu-latn';
    }
    return 'en-US';
  }, [state.language, state.numeralSystem]);

  const textLocale = useMemo(() => {
    return state.language === 'AR' ? 'ar-EG' : 'en-US';
  }, [state.language]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.__NUMERAL_LOCALE__ = numeralLocale;
      window.__TEXT_LOCALE__ = textLocale;
      if ((window as any).__UPDATE_DIGITS__) {
        (window as any).__UPDATE_DIGITS__();
      }
    }
  }, [numeralLocale, textLocale]);

  const setLanguage = useCallback((language: Language) => {
    setState((prev) => ({ ...prev, language }));
  }, []);

  const setFontFamilyEN = useCallback((fontFamilyEN: string) => {
    setState((prev) => ({ ...prev, fontFamilyEN }));
  }, []);

  const setFontFamilyAR = useCallback((fontFamilyAR: string) => {
    setState((prev) => ({ ...prev, fontFamilyAR }));
  }, []);

  const setTextTransform = useCallback((textTransform: 'normal' | 'uppercase') => {
    setState((prev) => ({ ...prev, textTransform }));
  }, []);

  const setNumeralSystem = useCallback((numeralSystem: 'AR' | 'EN') => {
    setState((prev) => ({ ...prev, numeralSystem }));
  }, []);

  const setGraphicStyle = useCallback((graphicStyle: boolean) => {
    setState((prev) => ({ ...prev, graphicStyle }));
  }, []);

  const setGraphicFontVariant = useCallback((graphicFontVariant: 'serif' | 'sans') => {
    setState((prev) => ({ ...prev, graphicFontVariant }));
  }, []);

  const value = useMemo<TypographyContextType>(
    () => ({
      ...state,
      setLanguage,
      setFontFamilyEN,
      setFontFamilyAR,
      setTextTransform,
      setNumeralSystem,
      setGraphicStyle,
      setGraphicFontVariant,
      numeralLocale,
      textLocale,
    }),
    [
      state,
      setLanguage,
      setFontFamilyEN,
      setFontFamilyAR,
      setTextTransform,
      setNumeralSystem,
      setGraphicStyle,
      setGraphicFontVariant,
      numeralLocale,
      textLocale,
    ]
  );

  return <TypographyContext.Provider value={value}>{children}</TypographyContext.Provider>;
};

export const useTypography = (): TypographyContextType => {
  const context = useContext(TypographyContext);
  if (!context) {
    throw new Error('useTypography must be used within a TypographyProvider');
  }
  return context;
};

export default TypographyContext;
