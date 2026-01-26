import { storage } from '../utils/storage';
import { StorageKeys } from '../config/storageKeys';

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  action: string;
  details?: string;
  entityId?: string;
  ipAddress?: string; // If applicable later
}

const STORAGE_KEY_AUDIT = 'audit_logs';

export const auditService = {
  log: (action: string, data: { userId?: string; userName?: string; details?: string; entityId?: string }) => {
    try {
      const entry: AuditEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        action,
        ...data
      };

      const existingLogs = storage.get<AuditEntry[]>(STORAGE_KEY_AUDIT, []);
      // Keep only last 1000 logs to prevent storage bloat
      const updatedLogs = [entry, ...existingLogs].slice(0, 1000);
      
      storage.set(STORAGE_KEY_AUDIT, updatedLogs);
      // Optional: console.log for dev
      console.log(`[AUDIT] ${action}`, data);
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  },

  getLogs: (limit = 100) => {
    const logs = storage.get<AuditEntry[]>(STORAGE_KEY_AUDIT, []);
    return logs.slice(0, limit);
  }
};
