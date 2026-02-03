/**
 * Services - Main barrel export
 *
 * All services are exported from here for easy importing
 */

// API Client
export * from './api';
// Re-export service instances for convenience
export { apiClient } from './api/client';
export * from './cash';
export { cashService } from './cash/cashService';
export * from './customers';
export { customerService } from './customers/customerService';
export type { DataActions, DataContextType, DataState } from './DataContext';
// Data Context (Unified State Management)
export { DataProvider, useData } from './DataContext';
export * from './hr';
export { employeeService } from './hr/employeeService';
export * from './inventory';
export { inventoryService } from './inventory/inventoryService';
export * from './purchases';
export { purchaseService } from './purchases/purchaseService';
export * from './returns';
export { returnService } from './returns/returnService';
export * from './sales';
export { salesService } from './sales/salesService';
// Domain Services
export * from './settings';
export { settingsService } from './settings/settingsService';
export * from './suppliers';
export { supplierService } from './suppliers/supplierService';
