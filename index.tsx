import React from 'react';
import './utils/global-polyfills';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

import { MotionConfig } from 'framer-motion';
import { StatusBarProvider } from './components/layout/StatusBar';
import { AlertProvider, SettingsProvider } from './context';
import { QueryProvider } from './context/QueryProvider';
import { ShiftProvider } from './hooks/sales/useShift';
import { LiveWidget } from './components/dashboard/LiveWidget';
import { HelpProvider } from './context/HelpContext';
import { useSettings } from './context';

const AnimationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { reducedMotion } = useSettings();
  return (
    <MotionConfig reducedMotion={reducedMotion ? 'always' : 'never'}>
      {children}
    </MotionConfig>
  );
};

const root = ReactDOM.createRoot(rootElement);

if (window.location.pathname === '/live-sales-widget') {
  root.render(
    <React.StrictMode>
      <SettingsProvider>
        <LiveWidget />
      </SettingsProvider>
    </React.StrictMode>
  );
} else {
  root.render(
    <React.StrictMode>
      <SettingsProvider>
        <AnimationProvider>
          <HelpProvider>
            <StatusBarProvider>
              <AlertProvider>
                <QueryProvider>
                  <ShiftProvider>
                    <App />
                  </ShiftProvider>
                </QueryProvider>
              </AlertProvider>
            </StatusBarProvider>
          </HelpProvider>
        </AnimationProvider>
      </SettingsProvider>
    </React.StrictMode>
  );
}
