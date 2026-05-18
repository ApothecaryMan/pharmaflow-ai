import type { DynamicEvent } from '../types';

export const dragonOnLogoEvent: DynamicEvent = {
  id: 'dragon-on-logo',
  enabled: false,
  type: 'ANIMATION',
  payload: { text: '🐲', size: '48px', offsetY: '-45px' },
  startDate: '2026-04-01T00:00:00Z',
  endDate: '2026-05-01T00:00:00Z',
  targetPages: 'all',
  targetSelector: '#nav-char-Z-0', // Targets the 'Z' in Zinc
  priority: 30,
};
