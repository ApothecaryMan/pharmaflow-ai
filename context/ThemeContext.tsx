import type React from 'react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { THEMES } from '../config/themeColors';
import type { ThemeColor } from '../types';
import { storage } from '../utils/storage';

export { THEMES } from '../config/themeColors';

type BackgroundPattern =
  | 'none'
  | 'dots'
  | 'grid'
  | 'mesh'
  | 'crosshatch'
  | 'stripes'
  | 'noise'
  | 'mandala'
  | 'diamond'
  | 'corners'
  | 'cross'
  | 'stars'
  | 'bricks'
  | 'polka'
  | 'abstract'
  | 'circuit'
  | 'ornate';

export interface ThemeState {
  theme: ThemeColor;
  darkMode: boolean;
  vividBg: 'muted' | 'subtle' | 'vivid';
  backgroundPattern: BackgroundPattern;
  backgroundPatternOpacity: number;
  backgroundPatternUseThemeColor: boolean;
}

export interface ThemeContextType extends ThemeState {
  setTheme: (theme: ThemeColor) => void;
  setDarkMode: (mode: boolean) => void;
  setVividBg: (vivid: 'muted' | 'subtle' | 'vivid') => void;
  setBackgroundPattern: (pattern: BackgroundPattern) => void;
  setBackgroundPatternOpacity: (opacity: number) => void;
  setBackgroundPatternUseThemeColor: (use: boolean) => void;
  availableThemes: ThemeColor[];
}

const defaultState: ThemeState = {
  theme: THEMES[0],
  darkMode: true,
  vividBg: 'subtle',
  backgroundPattern: 'none',
  backgroundPatternOpacity: 30,
  backgroundPatternUseThemeColor: true,
};

function loadState(): ThemeState {
  if (typeof window === 'undefined') return defaultState;

  try {
    const theme = storage.get<ThemeColor | null>('pharma_theme', null);
    const darkMode = storage.get<boolean | null>('pharma_darkMode', null);
    const vividBg = (() => {
      const v = storage.get<string | boolean | null>('pharma_vividBg', null);
      if (v === true) return 'vivid' as const;
      if (v === false) return 'subtle' as const;
      if (v === 'muted' || v === 'subtle' || v === 'vivid')
        return v as 'muted' | 'subtle' | 'vivid';
      return null;
    })();
    const backgroundPattern = storage.get<BackgroundPattern | null>(
      'pharma_backgroundPattern',
      null
    );
    const backgroundPatternOpacity = storage.get<number | null>(
      'pharma_backgroundPatternOpacity',
      null
    );
    const backgroundPatternUseThemeColor = storage.get<boolean | null>(
      'pharma_backgroundPatternUseThemeColor',
      null
    );

    return {
      theme: theme ?? defaultState.theme,
      darkMode: darkMode ?? defaultState.darkMode,
      vividBg: vividBg ?? defaultState.vividBg,
      backgroundPattern: backgroundPattern ?? defaultState.backgroundPattern,
      backgroundPatternOpacity: backgroundPatternOpacity ?? defaultState.backgroundPatternOpacity,
      backgroundPatternUseThemeColor:
        backgroundPatternUseThemeColor ?? defaultState.backgroundPatternUseThemeColor,
    };
  } catch {
    return defaultState;
  }
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ThemeState>(loadState);

  useEffect(() => {
    storage.set('pharma_theme', state.theme);
  }, [state.theme]);

  useEffect(() => {
    storage.set('pharma_darkMode', state.darkMode);
  }, [state.darkMode]);

  useEffect(() => {
    storage.set('pharma_vividBg', state.vividBg);
  }, [state.vividBg]);

  useEffect(() => {
    storage.set('pharma_backgroundPattern', state.backgroundPattern);
  }, [state.backgroundPattern]);

  useEffect(() => {
    storage.set('pharma_backgroundPatternOpacity', state.backgroundPatternOpacity);
  }, [state.backgroundPatternOpacity]);

  useEffect(() => {
    storage.set('pharma_backgroundPatternUseThemeColor', state.backgroundPatternUseThemeColor);
  }, [state.backgroundPatternUseThemeColor]);

  useEffect(() => {
    if (state.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [state.darkMode]);

  const setTheme = useCallback((theme: ThemeColor) => {
    setState((prev) => ({ ...prev, theme }));
  }, []);

  const setDarkMode = useCallback((darkMode: boolean) => {
    setState((prev) => ({ ...prev, darkMode }));
  }, []);

  const setVividBg = useCallback((vividBg: 'muted' | 'subtle' | 'vivid') => {
    setState((prev) => ({ ...prev, vividBg }));
  }, []);

  const setBackgroundPattern = useCallback((backgroundPattern: BackgroundPattern) => {
    setState((prev) => ({ ...prev, backgroundPattern }));
  }, []);

  const setBackgroundPatternOpacity = useCallback((backgroundPatternOpacity: number) => {
    setState((prev) => ({ ...prev, backgroundPatternOpacity }));
  }, []);

  const setBackgroundPatternUseThemeColor = useCallback(
    (backgroundPatternUseThemeColor: boolean) => {
      setState((prev) => ({ ...prev, backgroundPatternUseThemeColor }));
    },
    []
  );

  const value = useMemo<ThemeContextType>(
    () => ({
      ...state,
      setTheme,
      setDarkMode,
      setVividBg,
      setBackgroundPattern,
      setBackgroundPatternOpacity,
      setBackgroundPatternUseThemeColor,
      availableThemes: THEMES,
    }),
    [
      state,
      setTheme,
      setDarkMode,
      setVividBg,
      setBackgroundPattern,
      setBackgroundPatternOpacity,
      setBackgroundPatternUseThemeColor,
    ]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default ThemeContext;
