import type React from 'react';
import { useState } from 'react';
import {
  requestPasswordReset,
  validateResetPasswordEmail,
} from '../../services/auth/forgotPassword.service';

export interface ForgotPasswordMessages {
  invalidEmail: string;
  genericError: string;
}

export interface UseForgotPasswordResult {
  email: string;
  isLoading: boolean;
  error: string | null;
  success: boolean;
  validationError: string | undefined;
  handleEmailChange: (value: string) => void;
  handleSubmit: (event: React.FormEvent) => Promise<void>;
}

export const useForgotPassword = (messages: ForgotPasswordMessages): UseForgotPasswordResult => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | undefined>();

  const handleEmailChange = (value: string) => {
    setEmail(value);
    setValidationError(undefined);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const validation = validateResetPasswordEmail(email);
    if (!validation.isValid) {
      setValidationError(messages.invalidEmail);
      return;
    }

    setValidationError(undefined);
    setIsLoading(true);
    setError(null);

    const result = await requestPasswordReset(email);
    setIsLoading(false);

    if (result.success) {
      setSuccess(true);
      return;
    }

    setError(result.message || messages.genericError);
  };

  return {
    email,
    isLoading,
    error,
    success,
    validationError,
    handleEmailChange,
    handleSubmit,
  };
};
