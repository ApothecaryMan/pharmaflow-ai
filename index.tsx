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

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <CatalogProvider>
        <StatusBarProvider>
          <AlertProvider>
            <App />
          </AlertProvider>
        </StatusBarProvider>
      </CatalogProvider>
    </SettingsProvider>
  </React.StrictMode>
);
