/**
 * Services - Main barrel export
 *
 * All services are exported from here for easy importing
 */

export type { DataActions, DataContextType, DataState } from '../context/DataContext';
// Data Context (Unified State Management)
export { DataProvider, useData } from '../context/DataContext';
// API Client
export * from './api';
// Re-export service instances for convenience
export { apiClient } from './api/client';
export { auditService } from './audit/auditService';
export * from './cash';
export { cashService } from './cash/cashService';
export * from './customers';
export { customerService } from './customers/customerService';
export * from './hr';
export { employeeService } from './hr/employeeService';
export * from './inventory';
export { inventoryService } from './inventory/inventoryService';
export { branchService } from './org/branchService';
export * from './purchases';
export { purchaseService } from './purchases/purchaseService';
export * from './returns';
export { returnService } from './returns/returnService';
export * from './sales';
export { salesService } from './sales/salesService';
// Domain Services
export * from './settings';
export { holidaysService } from './settings/holidaysService';
export { settingsService } from './settings/settingsService';
export * from './suppliers';
export { supplierService } from './suppliers/supplierService';
