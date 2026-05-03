import type { ViewState } from '../types';

export const ROUTES = {
  DASHBOARD: 'dashboard' as ViewState,
  LOGIN: 'login' as ViewState,
  SIGNUP: 'signup' as ViewState,
  FORGOT_PASSWORD: 'forgot-password' as ViewState,
  MODAL_TESTS: 'modal-tests' as ViewState,
  TEST_THEME: 'test-theme' as ViewState,
  INVENTORY: 'inventory' as ViewState,
  POS: 'pos' as ViewState,
  PURCHASES: 'purchases' as ViewState,
  CUSTOMERS: 'customers' as ViewState,
  CUSTOMER_OVERVIEW: 'customer-overview' as ViewState,
  CUSTOMER_HISTORY: 'customer-history' as ViewState,
  RETURN_HISTORY: 'return-history' as ViewState,
  INTELLIGENCE: 'intelligence' as ViewState,
  STOCK_MOVEMENT: 'stock-movement' as ViewState,
  EXPIRY_CALENDAR: 'expiry-calendar' as ViewState,
} as const;

export const TEST_ROUTES = [ROUTES.LOGIN, ROUTES.MODAL_TESTS, ROUTES.TEST_THEME];
