import type { DynamicEvent } from '../types';

export const walkingCowEvent: DynamicEvent = {
  id: 'walking-cow',
  enabled: false,
  type: 'WALKING_COW',
  payload: {
    emoji: '🐄',
    speed: 100, // seconds for one round trip
  },
  startDate: '2026-05-18T00:00:00Z',
  endDate: '2026-05-25T00:00:00Z',
  targetPages: 'all',
  targetSelector: 'nav',
  priority: 110,
};
