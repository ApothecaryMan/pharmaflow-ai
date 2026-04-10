import React, { useState, useCallback } from 'react';
import { Login } from './Login';
import { SignUp } from './SignUp';
import { ForgotPassword } from './ForgotPassword';

type AuthView = 'login' | 'signup' | 'forgot-password';

interface AuthPageProps {
  onLoginSuccess?: () => void;
  language?: 'EN' | 'AR';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onLoginSuccess, language = 'EN' }) => {
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
