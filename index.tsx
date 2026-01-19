import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

import { StatusBarProvider } from './components/layout/StatusBar';
import { SettingsProvider } from './context';


const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <StatusBarProvider>
        <App />
      </StatusBarProvider>
    </SettingsProvider>
  </React.StrictMode>
);
