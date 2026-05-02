import React from 'react';
import './utils/global-polyfills';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

import { StatusBarProvider } from './components/layout/StatusBar';
import { AlertProvider, SettingsProvider, CatalogProvider } from './context';
import { ShiftProvider } from './hooks/useShift';
import { DataProvider } from './services/DataContext';

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <CatalogProvider>
        <StatusBarProvider>
          <AlertProvider>
            <DataProvider initialSuppliers={[]}>
              <ShiftProvider>
                <App />
              </ShiftProvider>
            </DataProvider>
          </AlertProvider>
        </StatusBarProvider>
      </CatalogProvider>
    </SettingsProvider>
  </React.StrictMode>
);
