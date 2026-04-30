export type EventType = 'CURSOR' | 'ANIMATION' | 'BANNER' | 'OVERLAY';

export interface DynamicEvent {
  id: string;
  enabled?: boolean;
  type: EventType;
  payload: any;
  startDate: string;
  endDate: string;
  
  // --- Targeted Targeting ---
  targetPages?: string[] | 'all';
  targetRoles?: string[] | 'all';
  targetEmployees?: string[] | 'all'; // Target specific employee IDs
  targetBranches?: string[] | 'all';  // Target specific branch IDs
  targetOrgs?: string[] | 'all';      // Target specific organization IDs
  
  /**
   * For CURSOR: If provided, the cursor will only change when hovering 
   * over this specific CSS selector (e.g., '.navbar', '#sales-table').
   * If empty, it applies to the whole body.
   */
  targetSelector?: string;

  /**
   * Advanced Logic: A custom condition function that can be checked 
   * (e.g., check if a specific setting is enabled).
   */
  condition?: (context: any) => boolean;
  
  priority: number;
}

export const DYNAMIC_EVENTS: DynamicEvent[] = [
  {
    id: 'money-bonus-cursor',
    enabled: false,
    type: 'CURSOR',
    payload: '/fuzzy/Money--cursor--SweezyCursors.png',
    startDate: '2026-04-01T00:00:00Z',
    endDate: '2026-05-01T00:00:00Z',
    targetPages: ['services'],
    targetRoles: 'all',
    priority: 10,
  },
  {
    id: 'dragon-on-logo',
    enabled: false,
    type: 'ANIMATION',
    payload: { text: '🐲', size: '48px', offsetY: '-45px' },
    startDate: '2026-04-01T00:00:00Z',
    endDate: '2026-05-01T00:00:00Z',
    targetPages: 'all',
    targetSelector: '#nav-char-Z-0', // Targets the 'Z' in Zinc
    priority: 30,
  },
  {
    id: 'winter-pos-snow',
    enabled: false,
    type: 'ANIMATION',
    payload: { particles: 'snowflake' },
    startDate: '2026-04-01T00:00:00Z',
    endDate: '2026-05-01T00:00:00Z',
    targetPages: ['pos'],
    priority: 5,
  },
  {
    id: 'winter-status-pile',
    enabled: false,
    type: 'ANIMATION',
    payload: { particles: 'pile' },
    startDate: '2026-04-01T00:00:00Z',
    endDate: '2026-05-01T00:00:00Z',
    targetPages: ['pos'],
    targetSelector: '#status-bar',
    priority: 6,
  },
];
