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
  orgId?: string;
  ipAddress?: string;
}
