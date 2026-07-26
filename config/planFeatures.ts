import type { SubscriptionPlan } from '../types/auth';

export type PlanFeature =
  | 'advanced_reports'
  | 'multi_branch'
  | 'biometric_auth'
  | 'bulk_sms'
  | 'api_access'
  | 'custom_theme'
  | 'audit_log';

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeature[]> = {
  free: ['biometric_auth'],
  starter: ['biometric_auth', 'advanced_reports'],
  pro: ['biometric_auth', 'advanced_reports', 'multi_branch', 'custom_theme'],
  enterprise: [
    'biometric_auth',
    'advanced_reports',
    'multi_branch',
    'custom_theme',
    'bulk_sms',
    'api_access',
    'audit_log',
  ],
};
