import React, { useState, useCallback } from 'react';
import { Login } from './Login';
import { SignUp } from './SignUp';
import { ForgotPassword } from './ForgotPassword';
import { SegmentedControl } from '../common/SegmentedControl';
import { useSettings } from '../../context';

type AuthView = 'login' | 'signup' | 'forgot-password';

interface AuthPageProps {
  onLoginSuccess?: () => void;
  language?: 'EN' | 'AR';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess }) => {
  const { language, setLanguage } = useSettings();
  const [currentView, setCurrentView] = useState<AuthView>('login');

  const handleViewChange = useCallback((view: AuthView) => {
    setCurrentView(view);
  }, []);

  const handleLoginSuccessOrDashboard = useCallback((view?: string) => {
    if (view === 'dashboard' && onLoginSuccess) {
      onLoginSuccess();
    } else if (onLoginSuccess) {
      onLoginSuccess();
    }
  }, [onLoginSuccess]);

  const renderContent = () => {
    if (currentView === 'signup') {
      return <SignUp onViewChange={handleViewChange} onLoginSuccess={handleLoginSuccessOrDashboard} language={language} />;
    }
    
    if (currentView === 'forgot-password') {
      return <ForgotPassword onViewChange={handleViewChange} language={language} />;
    }

    // Default to Login
    return (
      <Login 
        onViewChange={(v) => {
          if (v === 'dashboard') {
            handleLoginSuccessOrDashboard('dashboard');
          } else {
            handleViewChange(v as AuthView);
          }
        }} 
        onLoginSuccess={handleLoginSuccessOrDashboard} 
        language={language} 
      />
    );
  };

  return (
    <div className='relative min-h-screen bg-black select-none'>
      {/* Top Right Language Switcher - Always on the right side regardless of direction */}
      <div className='absolute top-4 right-4 z-50'>
        <SegmentedControl
          value={language}
          onChange={(val) => setLanguage(val as any)}
          options={[
            { label: 'EN', value: 'EN' },
            { label: 'AR', value: 'AR' },
          ]}
          size='xs'
          fullWidth={false}
          disableAnimation={true}
          variant='onPage'
          className='min-w-[80px] !bg-white !shadow-none ring-1 ring-white/10 [&>div]:!bg-black [&>div]:!shadow-none [&_button]:!text-black [&_button[data-active=true]]:!text-white [&_button:not([data-active=true])]:!cursor-pointer [&_button[data-active=true]]:!cursor-default'
          dir='ltr'
        />
      </div>

      {renderContent()}
    </div>
  );
};
