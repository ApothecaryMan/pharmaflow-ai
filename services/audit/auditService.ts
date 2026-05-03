import { StorageKeys } from '../../config/storageKeys';
import { storage } from '../../utils/storage';
import { idGenerator } from '../../utils/idGenerator';
import { auditRepository } from './repositories/auditRepository';
import type { AuditEntry } from './types';

const STORAGE_KEY_AUDIT = 'audit_logs';

export const auditService = {
  log: async (
    action: string,
    data: { userId?: string; userName?: string; details?: string | any; entityId?: string; entityType?: string; branchId?: string; orgId?: string }
  ) => {
    try {
      // Fallback for crypto.randomUUID for non-secure contexts/older browsers
      const generateId = () => {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
          return idGenerator.uuid();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      };

      const { settingsService } = await import('../settings/settingsService');
      const settings = await settingsService.getAll();

      const entry: AuditEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action,
        orgId: data.orgId || settings.orgId,
        ...data,
      };

      // Push to Supabase asynchronously without blocking
      auditRepository.insert(entry).catch(({ error }) => {
        if (error && import.meta.env.DEV) console.warn('Supabase audit log insert failed', error);
      });

      const existingLogs = storage.get<AuditEntry[]>(STORAGE_KEY_AUDIT, []);
      // Keep only last 1000 logs locally
      const updatedLogs = [entry, ...existingLogs].slice(0, 1000);

      storage.set(STORAGE_KEY_AUDIT, updatedLogs);
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  },

  getLogs: async (branchId?: string, limit = 100): Promise<AuditEntry[]> => {
    try {
      return await auditRepository.getLogs(branchId, limit);
    } catch {
      // Fallback to local storage
      let logs = storage.get<AuditEntry[]>(STORAGE_KEY_AUDIT, []);
      if (branchId) {
        logs = logs.filter(log => !log.branchId || log.branchId === branchId);
      }
      return logs.slice(0, limit);
    }
  },

  getOrgLogs: async (orgId: string, limit = 50): Promise<AuditEntry[]> => {
    try {
      return await auditRepository.getOrgLogs(orgId, limit);
    } catch (err) {
      console.error('getOrgLogs failed:', err);
      // Local fallback: return all logs (most likely for the same org in dev)
      return storage.get<AuditEntry[]>(STORAGE_KEY_AUDIT, []).slice(0, limit);
    }
  },
};
export type { AuditEntry };
