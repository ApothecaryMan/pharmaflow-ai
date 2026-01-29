import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { SettingsProvider, AlertProvider } from './context';
import { StatusBarProvider } from './components/layout/StatusBar';


const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <StatusBarProvider>
        <AlertProvider>
          <App />
        </AlertProvider>
      </StatusBarProvider>
    </SettingsProvider>
  </React.StrictMode>
);
