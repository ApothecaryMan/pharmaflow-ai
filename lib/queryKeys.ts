export const queryKeys = {
  achievements: {
    month: (branchId: string, year: number, month: number) =>
      ['achievements', branchId, year, month] as const,
  },
  inventory: {
    all: (branchId: string) => ['inventory', branchId] as const,
    lowStock: (branchId: string, threshold: number) =>
      ['inventory', 'low-stock', branchId, threshold] as const,
    detail: (drugId: string) => ['drug', drugId] as const,
  },
  batches: {
    all: (branchId: string) => ['batches', branchId] as const,
    detail: (batchId: string) => ['batch', batchId] as const,
  },
  sales: {
    recent: (branchId: string, limit = 100) => ['sales', 'recent', branchId, limit] as const,
    today: (branchId: string) => ['sales', 'today', branchId] as const,
    detail: (saleId: string) => ['sale', saleId] as const,
  },
  purchases: {
    all: (branchId: string, limit = 100) => ['purchases', branchId, limit] as const,
    detail: (purchaseId: string) => ['purchase', purchaseId] as const,
  },
  returns: {
    sales: (branchId: string, limit = 100) => ['returns', 'sales', branchId, limit] as const,
    purchases: (branchId: string, limit = 100) =>
      ['returns', 'purchases', branchId, limit] as const,
  },
  employees: {
    all: (branchId: string) => ['employees', branchId] as const,
    allByOrg: (orgId: string) => ['employees', 'org', orgId] as const,
  },
  customers: {
    all: (branchId: string) => ['customers', branchId] as const,
  },
  suppliers: {
    all: (branchId: string) => ['suppliers', branchId] as const,
  },
  org: {
    detail: (orgId: string) => ['org', orgId] as const,
    members: (orgId: string) => ['org', 'members', orgId] as const,
    subscription: (orgId: string) => ['org', 'subscription', orgId] as const,
    logs: (orgId: string, limit: number) => ['org', 'logs', orgId, limit] as const,
  },
  branches: {
    all: (orgId: string) => ['branches', orgId] as const,
  },
  sessions: {
    active: (userId?: string) => ['sessions', 'active', userId] as const,
  },
  prefixes: {
    achievements: ['achievements'] as const,
    sessions: ['sessions'] as const,
    inventory: ['inventory'] as const,
    batches: ['batches'] as const,
    sales: ['sales'] as const,
    purchases: ['purchases'] as const,
    returns: ['returns'] as const,
    employees: ['employees'] as const,
    customers: ['customers'] as const,
    suppliers: ['suppliers'] as const,
    branches: ['branches'] as const,
    org: ['org'] as const,
  },
} as const;
