import { useEffect } from 'react';
import { useUI } from '../../context/UIContext';

export const ThemeStudio: React.FC = () => {
  const { customCardCss, enableCustomCardCss } = useUI();

  useEffect(() => {
    let styleEl = document.getElementById('pharma-custom-card-css') as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'pharma-custom-card-css';
      document.head.appendChild(styleEl);
    }

    if (customCardCss && enableCustomCardCss) {
      const processedCss = customCardCss
        .split(';')
        .map((part) => {
          const trimmed = part.trim();
          if (!trimmed || !trimmed.includes(':')) return trimmed;
          if (/!important/i.test(trimmed)) return trimmed;
          return `${trimmed} !important`;
        })
        .join('; ');

      const cssWithoutPadding = customCardCss
        .split(';')
        .filter(
          (part) =>
            !part.toLowerCase().includes('padding') && !part.toLowerCase().includes('margin')
        )
        .map((part) => {
          const trimmed = part.trim();
          if (!trimmed || !trimmed.includes(':')) return trimmed;
          if (/!important/i.test(trimmed)) return trimmed;
          return `${trimmed} !important`;
        })
        .join('; ');

      styleEl.textContent = `
        html:not(.dark) .card-shadow,
        html.dark .card-shadow,
        .card-shadow,
        html:not(.dark) .modal-card,
        html.dark .modal-card,
        .modal-card,
        html:not(.dark) .sidebar-modal-card,
        html.dark .sidebar-modal-card,
        .sidebar-modal-card,
        html:not(.dark) .custom-card-css-target:not(.no-padding),
        html.dark .custom-card-css-target:not(.no-padding),
        .custom-card-css-target:not(.no-padding) {
          ${processedCss}
        }
        
        html:not(.dark) .custom-card-css-target.no-padding,
        html.dark .custom-card-css-target.no-padding,
        .custom-card-css-target.no-padding {
          ${cssWithoutPadding}
        }
      `;
    } else {
      styleEl.textContent = '';
    }

    return () => {
      document.getElementById('pharma-custom-card-css')?.remove();
    };
  }, [customCardCss, enableCustomCardCss]);

  return null;
};
