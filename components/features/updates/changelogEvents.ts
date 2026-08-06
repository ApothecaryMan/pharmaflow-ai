import { CURRENT_APP_VERSION } from '../../../config/storageKeys';
import { useAuthStore } from '../../../stores/authStore';
import type { Employee } from '../../../types';

/**
 * Changelog event wiring.
 *
 * The "last seen version" is stored per employee on the `employees` table
 * (see employeeRepository), so it survives cache clears and follows the
 * employee across devices. The modal opens only at a real session boundary
 * (explicit login / employee switch), never on a mid-shift refresh.
 */
export const CHANGELOG_ACTIVATE_EVENT = 'pharma:changelog-activate';

export interface ChangelogActivateDetail {
  employeeId: string;
  /** Fresh value from the just-selected employee (avoids stale store reads). */
  lastSeenChangelogVersion?: string;
  /** Manual open (e.g. clicking the status-bar version): always shows. */
  force?: boolean;
}

export const compareVersions = (a: string, b: string): 'older' | 'newer' | 'equal' => {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 'newer';
    if (na < nb) return 'older';
  }
  return 'equal';
};

/** True when the current employee has a changelog they haven't seen yet. */
export const hasUnseenChangelog = (emp: Employee | null): boolean => {
  if (!emp?.lastSeenChangelogVersion) return false;
  return compareVersions(CURRENT_APP_VERSION, emp.lastSeenChangelogVersion) === 'newer';
};

/** Fired at a real session boundary (explicit login / employee switch). */
export const dispatchEmployeeActivated = (detail: ChangelogActivateDetail): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent<ChangelogActivateDetail>(CHANGELOG_ACTIVATE_EVENT, { detail })
  );
};

/** Force-open the changelog for the currently active employee. */
export const openChangelog = (): void => {
  if (typeof window === 'undefined') return;
  const emp = useAuthStore.getState().currentEmployee;
  if (!emp) return;
  window.dispatchEvent(
    new CustomEvent<ChangelogActivateDetail>(CHANGELOG_ACTIVATE_EVENT, {
      detail: {
        employeeId: emp.id,
        lastSeenChangelogVersion: emp.lastSeenChangelogVersion,
        force: true,
      },
    })
  );
};

/** Marks the employee's last-seen version in the DB and mirrors it in the store. */
export const markChangelogSeen = async (employeeId: string, version: string): Promise<void> => {
  const { employeeRepository } = await import(
    '../../../services/hr/repositories/employeeRepository'
  );
  try {
    await employeeRepository.setLastSeenChangelogVersion(employeeId, version);
  } catch (err) {
    console.warn('[Changelog] Failed to stamp last-seen version', err);
  }
  const emp = useAuthStore.getState().currentEmployee;
  if (emp && emp.id === employeeId) {
    useAuthStore.getState().setCurrentEmployee({ ...emp, lastSeenChangelogVersion: version });
  }
};
