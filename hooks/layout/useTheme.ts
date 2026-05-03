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

export const useTheme = (color: string, darkMode: boolean, isLoginView: boolean = false) => {
  useEffect(() => {
    const palette = COLOR_PALETTES[color] || COLOR_PALETTES.blue;
    const root = document.documentElement;

    // Update CSS variables for the selected color
    Object.entries(palette).forEach(([shade, value]) => {
      root.style.setProperty(`--primary-${shade}`, value);
    });

    if (darkMode || isLoginView) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Get the computed background color of the navbar from CSS variables
    // This makes it fully dynamic and responsive to CSS changes
    const computedNavbarColor = getComputedStyle(root).getPropertyValue('--bg-navbar').trim();
    const titleBarColor = isLoginView ? '#000000' : (computedNavbarColor || (darkMode ? '#1f1f1f' : '#ffffff'));

    // Update all theme-color meta tags to match the current mode
    const metaTags = document.querySelectorAll('meta[name="theme-color"]');
    if (metaTags.length > 0) {
      metaTags.forEach((tag) => tag.setAttribute('content', titleBarColor));
    } else {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = titleBarColor;
      document.head.appendChild(meta);
    }

    // Update browser favicon dynamically
    const favicon = document.querySelector('link[rel="icon"]');
    if (favicon) {
      // Force white icon for login as well
      favicon.setAttribute(
        'href',
        darkMode || isLoginView ? '/logo_icon_white.svg' : '/app_icon.svg'
      );
    }
  }, [color, darkMode, isLoginView]);
};
