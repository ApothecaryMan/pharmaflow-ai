import { DYNAMIC_EVENTS, type DynamicEvent } from './dynamicEvents';

export interface EventContext {
  currentPath: string;
  view?: string;
  userRole?: string;
  employeeId?: string;
  branchId?: string;
  orgId?: string;
  extra?: any;
}

/**
 * EventManager - Advanced logic to resolve active events with granular targeting
 */
export const EventManager = {
  getActiveEvents(ctx: EventContext): DynamicEvent[] {
    const now = new Date();

    return DYNAMIC_EVENTS.filter((event) => {
      // 0. Check if explicitly disabled
      if (event.enabled === false) return false;

      // 1. Time Check
      const start = new Date(event.startDate);
      const end = new Date(event.endDate);
      if (now < start || now > end) return false;

      // 2. Page Check (Supports both URL path and internal View ID)
      if (event.targetPages !== 'all' && event.targetPages) {
        const isPathMatch = event.targetPages.some((p) => ctx.currentPath.includes(p));
        const isViewMatch = ctx.view && event.targetPages.includes(ctx.view);
        if (!isPathMatch && !isViewMatch) return false;
      }

      // 3. Role Check
      if (event.targetRoles !== 'all' && event.targetRoles) {
        if (!ctx.userRole || !event.targetRoles.includes(ctx.userRole)) return false;
      }

      // 4. Employee ID Check
      if (event.targetEmployees !== 'all' && event.targetEmployees) {
        if (!ctx.employeeId || !event.targetEmployees.includes(ctx.employeeId)) return false;
      }

      // 5. Branch ID Check
      if (event.targetBranches !== 'all' && event.targetBranches) {
        if (!ctx.branchId || !event.targetBranches.includes(ctx.branchId)) return false;
      }

      // 6. Org ID Check
      if (event.targetOrgs !== 'all' && event.targetOrgs) {
        if (!ctx.orgId || !event.targetOrgs.includes(ctx.orgId)) return false;
      }

      // 7. Custom Condition Check
      if (event.condition && !event.condition(ctx)) return false;

      return true;
    }).sort((a, b) => b.priority - a.priority);
  },

  /**
   * Returns a list of active cursors and their target selectors
   */
  getActiveCursors(ctx: EventContext): { payload: string; selector?: string }[] {
    const events = this.getActiveEvents(ctx);
    return events
      .filter((e) => e.type === 'CURSOR')
      .map((e) => ({ payload: e.payload, selector: e.targetSelector }));
  }
};
