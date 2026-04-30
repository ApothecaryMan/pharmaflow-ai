export type EventType = 'CURSOR' | 'ANIMATION' | 'BANNER' | 'OVERLAY';

export interface DynamicEvent {
  id: string;
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
    type: 'CURSOR',
    payload: '/fuzzy/Money--cursor--SweezyCursors.png',
    startDate: '2026-04-30T00:00:00Z',
    endDate: '2026-05-01T00:00:00Z',
    targetPages: 'all',
    targetRoles: 'all',
    priority: 10,
  },
  {
    id: 'vip-branch-promotion',
    type: 'CURSOR',
    payload: '/fuzzy/Money--cursor--SweezyCursors.png',
    startDate: '2026-04-30T00:00:00Z',
    endDate: '2026-12-31T23:59:59Z',
    targetBranches: ['branch-001'], // Only for this branch
    targetSelector: '.premium-card', // Only when hovering over premium cards
    priority: 20,
  }
];
