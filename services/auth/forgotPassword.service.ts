import { authService } from './authService';

export type ForgotPasswordValidationError = 'invalidEmail';

export interface ForgotPasswordValidationResult {
  isValid: boolean;
  error?: ForgotPasswordValidationError;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateResetPasswordEmail = (email: string): ForgotPasswordValidationResult => {
  if (!EMAIL_PATTERN.test(email.trim())) {
    return { isValid: false, error: 'invalidEmail' };
  }

  return { isValid: true };
};

export const requestPasswordReset = async (email: string) => {
  return authService.resetPassword(email.trim());
};
