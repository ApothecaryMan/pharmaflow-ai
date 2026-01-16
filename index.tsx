import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { StatusBarProvider } from './components/layout/StatusBar';
import { ShiftProvider } from './hooks/useShift';
import { DataProvider } from './services';
import { SettingsProvider } from './context';

import { CSV_INVENTORY } from './data/sample-inventory';
import { Supplier } from './types';

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: '1', name: 'B2B', contactPerson: 'B2B', phone: '', email: '', address: '' },
];

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <StatusBarProvider>
        <ShiftProvider>
          <DataProvider initialInventory={CSV_INVENTORY} initialSuppliers={INITIAL_SUPPLIERS}>
            <App />
          </DataProvider>
        </ShiftProvider>
      </StatusBarProvider>
    </SettingsProvider>
  </React.StrictMode>
);
