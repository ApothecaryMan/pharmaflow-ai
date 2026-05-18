import type { DynamicEvent } from '../types';

export const moneyBonusCursorEvent: DynamicEvent = {
  id: 'money-bonus-cursor',
  enabled: false,
  type: 'CURSOR',
  payload: '/fuzzy/Money--cursor--SweezyCursors.png',
  startDate: '2026-04-01T00:00:00Z',
  endDate: '2026-05-01T00:00:00Z',
  targetPages: ['services'],
  targetRoles: 'all',
  priority: 10,
};
