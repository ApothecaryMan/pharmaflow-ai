import { CssBaseline } from '@mui/material';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import type {} from '@mui/x-data-grid/themeAugmentation';
import type React from 'react';
import { useMemo } from 'react';
import { prefix } from 'stylis';
import { COLOR_HEX_MAP } from '../../config/themeColors';

// Use centralized color map from config/themeColors.ts

interface MuiThemeProviderProps {
  children: React.ReactNode;
  darkMode?: boolean;
  themeColor?: string;
  language?: 'EN' | 'AR';
}

export const MuiThemeProvider: React.FC<MuiThemeProviderProps> = ({
  children,
  darkMode = false,
  themeColor = 'blue',
  language = 'EN',
}) => {
  const theme = useMemo(() => {
    const primaryColor = COLOR_HEX_MAP[themeColor] || COLOR_HEX_MAP.blue;

    return createTheme({
      direction: language === 'AR' ? 'rtl' : 'ltr',
      palette: {
        mode: darkMode ? 'dark' : 'light',
        primary: {
          main: primaryColor,
        },
        background: {
          default: darkMode ? '#111827' : '#ffffff', // gray-900 vs white
          paper: darkMode ? '#1f2937' : '#ffffff', // gray-800 vs white
        },
        text: {
          primary: darkMode ? '#f9fafb' : '#111827', // gray-50 vs gray-900
          secondary: darkMode ? '#9ca3af' : '#4b5563', // gray-400 vs gray-600
        },
      },
      components: {
        MuiDataGrid: {
          styleOverrides: {
            root: {
              border: 'none',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: darkMode ? '#111827' : '#ffffff',
              color: darkMode ? '#f3f4f6' : '#374151',
              '& .MuiDataGrid-cell': {
                borderBottom: darkMode ? '1px solid #374151' : '1px solid #f3f4f6', // gray-700 vs gray-100
                '&:focus': {
                  outline: 'none !important',
                },
                '&:focus-within': {
                  outline: 'none !important',
                },
                overflow: 'visible !important',
              },
              '& .MuiDataGrid-row': {
                overflow: 'visible !important',
              },
              '& .MuiDataGrid-columnHeaders': {
                borderBottom: darkMode ? '1px solid #4b5563' : '1px solid #e5e7eb', // gray-600 vs gray-200
                backgroundColor: darkMode ? 'rgb(17,24,39,1)' : '#f9fafb', // gray-900 vs gray-50
                color: darkMode ? '#e5e7eb' : '#111827',
              },
              '& .MuiDataGrid-columnHeaderTitle': {
                fontWeight: 600,
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: darkMode ? '1px solid #374151' : '1px solid #f3f4f6',
                backgroundColor: darkMode ? '#1f2937' : '#ffffff',
              },
              '& .MuiCheckbox-root': {
                color: darkMode ? '#9ca3af' : '#6b7280',
              },
              '& .MuiTablePagination-root': {
                color: darkMode ? '#d1d5db' : '#374151',
              },
              '& .MuiIconButton-root': {
                color: darkMode ? '#d1d5db' : '#4b5563',
              },
              // RTL: Flip separator to appear after cell (left side in RTL)
              '& .MuiDataGrid-columnSeparator': {
                right: language === 'AR' ? 'unset' : undefined,
                left: language === 'AR' ? '-12px' : undefined,
              },
            },
          },
        },
      },
    });
  }, [darkMode, themeColor, language]);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
};
