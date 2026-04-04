import { StorageKeys } from '../config/storageKeys';
import { storage } from '../utils/storage';
import { idGenerator } from '../utils/idGenerator';
import { supabase } from '../lib/supabase';

export interface AuditEntry {
  id: string;
  timestamp: string;
  userId?: string;
  userName?: string;
  action: string;
  details?: string | any;
  entityId?: string;
  entityType?: string;
  branchId?: string;
  ipAddress?: string; // If applicable later
}

const STORAGE_KEY_AUDIT = 'audit_logs';

const mapAuditToDb = (a: any): any => {
  const db: any = {};
  if (a.id) db.id = a.id;
  if (a.branchId) db.branch_id = a.branchId;
  if (a.userId) db.actor_id = a.userId;
  if (a.action) db.action = a.action;
  if (a.entityType) db.entity_type = a.entityType;
  // Make sure it's a valid uuid before insertion if applicable
  if (a.entityId && a.entityId.length === 36) db.entity_id = a.entityId; 
  
  let detailsObj: any = {};
  if (typeof a.details === 'string') {
    detailsObj.message = a.details;
  } else if (a.details) {
    detailsObj = { ...a.details };
  }
  if (a.userName) detailsObj.userName = a.userName;
  db.details = Object.keys(detailsObj).length > 0 ? detailsObj : null;
  
  if (a.ipAddress) db.ip_address = a.ipAddress;
  if (a.timestamp) db.created_at = a.timestamp;
  return db;
};

const mapDbToAudit = (db: any): AuditEntry => ({
  id: db.id,
  timestamp: db.created_at,
  userId: db.actor_id || undefined,
  userName: db.details?.userName || undefined,
  action: db.action,
  details: db.details ? JSON.stringify(db.details) : undefined,
  entityId: db.entity_id || undefined,
  entityType: db.entity_type || undefined,
  branchId: db.branch_id || undefined,
  ipAddress: db.ip_address || undefined,
});


export const auditService = {
  log: async (
    action: string,
    data: { userId?: string; userName?: string; details?: string | any; entityId?: string; entityType?: string; branchId?: string }
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

      const entry: AuditEntry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        action,
        ...data,
      };

      // Push to Supabase asynchronously without blocking
      supabase.from('audit_logs').insert(mapAuditToDb(entry)).then(({ error }) => {
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
      let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(limit);
      if (branchId) {
        query = query.eq('branch_id', branchId);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map(mapDbToAudit);
      }
    } catch {}

    let logs = storage.get<AuditEntry[]>(STORAGE_KEY_AUDIT, []);
    if (branchId) {
      logs = logs.filter(log => !log.branchId || log.branchId === branchId);
    }
    return logs.slice(0, limit);
  },

  getOrgLogs: async (orgId: string, limit = 50): Promise<AuditEntry[]> => {
    try {
      // 1. Get all branch IDs for this org
      const { data: branches, error: bError } = await supabase
        .from('branches')
        .select('id')
        .eq('org_id', orgId);
      
      if (!bError && branches) {
        const branchIds = branches.map(b => b.id);
        
        // 2. Fetch logs for these branches
        const { data, error } = await supabase
          .from('audit_logs')
          .select('*')
          .in('branch_id', branchIds)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (!error && data) {
          return data.map(mapDbToAudit);
        }
      }
    } catch (err) {
      console.error('getOrgLogs failed:', err);
    }

    // Local fallback: return all logs (most likely for the same org in dev)
    return storage.get<AuditEntry[]>(STORAGE_KEY_AUDIT, []).slice(0, limit);
  },
};
