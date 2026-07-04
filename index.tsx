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
import { AlertProvider, SettingsProvider } from './context';
import { DataProvider } from './context/DataContext';
import { ShiftProvider } from './hooks/sales/useShift';
import { LiveWidget } from './components/dashboard/LiveWidget';
import { HelpProvider } from './context/HelpContext';

const root = ReactDOM.createRoot(rootElement);

if (window.location.pathname === '/live-sales-widget') {
  root.render(
    <React.StrictMode>
      <LiveWidget />
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <SettingsProvider>
        <HelpProvider>
          <StatusBarProvider>
            <AlertProvider>
              <DataProvider initialSuppliers={[]}>
                <ShiftProvider>
                  <App />
                </ShiftProvider>
              </DataProvider>
            </AlertProvider>
          </StatusBarProvider>
        </HelpProvider>
      </SettingsProvider>
    </React.StrictMode>
  );
}
