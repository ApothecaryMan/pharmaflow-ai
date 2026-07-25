import { useEffect } from 'react';

// Color palette mappings for each theme
const COLOR_PALETTES: Record<string, Record<string, string>> = {
  blue: {
    '50': '#eff6ff',
    '100': '#dbeafe',
    '200': '#bfdbfe',
    '300': '#93c5fd',
    '400': '#60a5fa',
    '500': '#3b82f6',
    '600': '#2563eb',
    '700': '#1d4ed8',
    '800': '#1e40af',
    '900': '#1e3a8a',
    '950': '#172554',
  },
  purple: {
    '50': '#faf5ff',
    '100': '#f3e8ff',
    '200': '#e9d5ff',
    '300': '#d8b4fe',
    '400': '#c084fc',
    '500': '#a855f7',
    '600': '#9333ea',
    '700': '#7e22ce',
    '800': '#6b21a8',
    '900': '#581c87',
    '950': '#3b0764',
  },
  pink: {
    '50': '#fdf2f8',
    '100': '#fce7f3',
    '200': '#fbcfe8',
    '300': '#f9a8d4',
    '400': '#f472b6',
    '500': '#ec4899',
    '600': '#db2777',
    '700': '#be185d',
    '800': '#9d174d',
    '900': '#831843',
    '950': '#500724',
  },
  green: {
    '50': '#f0fdf4',
    '100': '#dcfce7',
    '200': '#bbf7d0',
    '300': '#86efac',
    '400': '#4ade80',
    '500': '#22c55e',
    '600': '#16a34a',
    '700': '#15803d',
    '800': '#166534',
    '900': '#14532d',
    '950': '#052e16',
  },
  orange: {
    '50': '#fff7ed',
    '100': '#ffedd5',
    '200': '#fed7aa',
    '300': '#fdba74',
    '400': '#fb923c',
    '500': '#f97316',
    '600': '#ea580c',
    '700': '#c2410c',
    '800': '#9a3412',
    '900': '#7c2d12',
    '950': '#431407',
  },
  red: {
    '50': '#fef2f2',
    '100': '#fee2e2',
    '200': '#fecaca',
    '300': '#fca5a5',
    '400': '#f87171',
    '500': '#ef4444',
    '600': '#dc2626',
    '700': '#b91c1c',
    '800': '#991b1b',
    '900': '#7f1d1d',
    '950': '#450a0a',
  },
  teal: {
    '50': '#f0fdfa',
    '100': '#ccfbf1',
    '200': '#99f6e4',
    '300': '#5eead4',
    '400': '#2dd4bf',
    '500': '#14b8a6',
    '600': '#0d9488',
    '700': '#0f766e',
    '800': '#115e59',
    '900': '#134e4a',
    '950': '#042f2e',
  },
  indigo: {
    '50': '#eef2ff',
    '100': '#e0e7ff',
    '200': '#c7d2fe',
    '300': '#a5b4fc',
    '400': '#818cf8',
    '500': '#6366f1',
    '600': '#4f46e5',
    '700': '#4338ca',
    '800': '#3730a3',
    '900': '#312e81',
    '950': '#1e1b4b',
  },
};

export const useTheme = (
  color: string,
  darkMode: boolean,
  isLoginView: boolean = false,
  hex?: string,
  vividBg: 'muted' | 'subtle' | 'vivid' = 'subtle'
) => {
  useEffect(() => {
    const palette = COLOR_PALETTES[color] || COLOR_PALETTES.blue;
    const root = document.documentElement;

    // Update CSS variables for the selected color
    Object.entries(palette).forEach(([shade, value]) => {
      root.style.setProperty(`--primary-${shade}`, value);
    });

    // Tint page backgrounds and cards with the accent color
    if (hex && vividBg !== 'muted') {
      if (!darkMode) {
        // Light mode tinting
        // Increased percentages because we use deeper 600-level colors which mix lighter into white
        const surfacePct = vividBg === 'vivid' ? 12 : 4;
        const statusPct = vividBg === 'vivid' ? 16 : 6;
        const cardPct = vividBg === 'vivid' ? 5 : 2; // Cards need less tint to stay bright but visible
        const menuPct = vividBg === 'vivid' ? 8 : 3; // Menus need slightly more tint to pop out
        const navbarPct = vividBg === 'vivid' ? 6 : 2.5; // Navbar tint
        const borderPct = vividBg === 'vivid' ? 15 : 6; // Borders need a strong tint to be visible
        
        root.style.setProperty('--bg-page-surface', `color-mix(in srgb, ${hex} ${surfacePct}%, #f8fafc)`);
        root.style.setProperty('--bg-statusbar', `color-mix(in srgb, ${hex} ${statusPct}%, var(--color-gray-200))`); // Hardcode base to avoid double tint
        root.style.setProperty('--bg-secondary', `color-mix(in srgb, ${hex} ${surfacePct + 3}%, var(--color-gray-200))`);
        root.style.setProperty('--bg-card-base', `color-mix(in srgb, ${hex} ${cardPct}%, #ffffff)`);
        root.style.setProperty('--bg-internal-card', `color-mix(in srgb, ${hex} ${cardPct}%, #ffffff)`);
        root.style.setProperty('--bg-input', `#ffffff`); // Keep inputs pure white for maximum contrast against tinted cards
        root.style.setProperty('--bg-menu', `color-mix(in srgb, ${hex} ${menuPct}%, #ffffff)`);
        root.style.setProperty('--bg-menu-hover', `color-mix(in srgb, ${hex} ${menuPct + 5}%, var(--color-gray-100))`);
        root.style.setProperty('--bg-navbar', `color-mix(in srgb, ${hex} ${navbarPct}%, #ffffff)`);
        root.style.setProperty('--bg-navbar-hover', `color-mix(in srgb, ${hex} ${navbarPct + 5}%, var(--color-gray-100))`);
        
        // Tint Borders so they don't disappear into the tinted background
        root.style.setProperty('--border-divider', `color-mix(in srgb, ${hex} ${borderPct}%, var(--color-gray-200))`);
        root.style.setProperty('--border-primary', `color-mix(in srgb, ${hex} ${borderPct + 5}%, var(--color-gray-300))`);
      } else {
        // Dark mode tinting (subtle elegant mix with dark grays)
        const surfacePct = vividBg === 'vivid' ? 4 : 2;
        const cardPct = vividBg === 'vivid' ? 3 : 1.5;
        const menuPct = vividBg === 'vivid' ? 5 : 2;
        const navbarPct = vividBg === 'vivid' ? 4 : 1.5;
        const borderPct = vividBg === 'vivid' ? 10 : 5;
        
        root.style.setProperty('--bg-page-surface', `color-mix(in srgb, ${hex} ${surfacePct}%, #18181b)`); // zinc-900
        root.style.setProperty('--bg-statusbar', `color-mix(in srgb, ${hex} ${surfacePct}%, #1f1f1f)`);
        root.style.setProperty('--bg-secondary', `color-mix(in srgb, ${hex} ${surfacePct + 2}%, #1a1a1a)`);
        root.style.setProperty('--bg-card-base', `color-mix(in srgb, ${hex} ${cardPct}%, #27272a)`); // zinc-800
        root.style.setProperty('--bg-internal-card', `color-mix(in srgb, ${hex} ${cardPct}%, #27272a)`);
        root.style.setProperty('--bg-input', `color-mix(in srgb, ${hex} ${cardPct - 1}%, #18181b)`); // Slightly darker than card for contrast
        root.style.setProperty('--bg-menu', `color-mix(in srgb, ${hex} ${menuPct}%, #262626)`); // neutral menu gray
        root.style.setProperty('--bg-menu-hover', `color-mix(in srgb, ${hex} ${menuPct + 4}%, #323232)`);
        root.style.setProperty('--bg-navbar', `color-mix(in srgb, ${hex} ${navbarPct}%, #1f1f1f)`);
        root.style.setProperty('--bg-navbar-hover', `color-mix(in srgb, ${hex} ${navbarPct + 4}%, #323232)`);
        
        // Tint Borders
        root.style.setProperty('--border-divider', `color-mix(in srgb, ${hex} ${borderPct}%, #3f3f46)`); // gray-700
        root.style.setProperty('--border-primary', `color-mix(in srgb, ${hex} ${borderPct + 5}%, #52525b)`); // gray-600
      }
    } else {
      root.style.setProperty('--bg-page-surface', '');
      root.style.setProperty('--bg-statusbar', '');
      root.style.setProperty('--bg-secondary', '');
      root.style.setProperty('--bg-card-base', '');
      root.style.setProperty('--bg-internal-card', '');
      root.style.setProperty('--bg-input', '');
      root.style.setProperty('--bg-menu', '');
      root.style.setProperty('--bg-menu-hover', '');
      root.style.setProperty('--bg-navbar', '');
      root.style.setProperty('--bg-navbar-hover', '');
      root.style.setProperty('--border-divider', '');
      root.style.setProperty('--border-primary', '');
    }

    if (darkMode || isLoginView) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [color, darkMode, isLoginView, hex, vividBg]);

  // Favicon — separate effect so meta-tag cleanup doesn't affect it
  useEffect(() => {
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      favicon.setAttribute('href', '/app_icon.svg');
    }
  }, []);
};
