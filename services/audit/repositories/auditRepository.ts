import { supabase } from '../../../lib/supabase';
import type { AuditEntry } from '../types';

const mapAuditToDb = (a: any): any => {
  const db: any = {};
  if (a.id) db.id = a.id;
  if (a.orgId) db.org_id = a.orgId;
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
  if (a.timestamp) db.timestamp = a.timestamp;
  return db;
};

const mapDbToAudit = (db: any): AuditEntry => ({
  id: db.id,
  timestamp: db.timestamp,
  orgId: db.org_id || undefined,
  userId: db.actor_id || undefined,
  userName: db.details?.userName || undefined,
  action: db.action,
  details: db.details ? JSON.stringify(db.details) : undefined,
  entityId: db.entity_id || undefined,
  entityType: db.entity_type || undefined,
  branchId: db.branch_id || undefined,
  ipAddress: db.ip_address || undefined,
});

export const auditRepository = {
  async insert(entry: AuditEntry): Promise<void> {
    const { error } = await supabase.from('audit_logs').insert(mapAuditToDb(entry));
    if (error) throw error;
  },

  async getLogs(branchId?: string, limit = 100): Promise<AuditEntry[]> {
    let query = supabase.from('audit_logs').select('*').order('timestamp', { ascending: false }).limit(limit);
    if (branchId) {
      query = query.eq('branch_id', branchId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data || []).map(mapDbToAudit);
  },

  async getOrgLogs(orgId: string, limit = 50): Promise<AuditEntry[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('org_id', orgId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return (data || []).map(mapDbToAudit);
  }
};
