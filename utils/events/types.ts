export type EventType = 'CURSOR' | 'ANIMATION' | 'BANNER' | 'OVERLAY' | 'NAVBAR_ICONS' | 'WALKING_COW';

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
  targetBranches?: string[] | 'all'; // Target specific branch IDs
  targetOrgs?: string[] | 'all'; // Target specific organization IDs

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
