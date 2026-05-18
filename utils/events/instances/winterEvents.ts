import type { DynamicEvent } from '../types';

export const winterPosSnowEvent: DynamicEvent = {
  id: 'winter-pos-snow',
  enabled: false,
  type: 'ANIMATION',
  payload: { particles: 'snowflake' },
  startDate: '2026-04-01T00:00:00Z',
  endDate: '2026-05-01T00:00:00Z',
  targetPages: ['pos'],
  priority: 5,
};

export const winterStatusPileEvent: DynamicEvent = {
  id: 'winter-status-pile',
  enabled: false,
  type: 'ANIMATION',
  payload: { particles: 'pile' },
  startDate: '2026-04-01T00:00:00Z',
  endDate: '2026-05-01T00:00:00Z',
  targetPages: ['pos'],
  targetSelector: '#status-bar',
  priority: 6,
};
