/**
 * Services - Main barrel export
 * 
 * All services are exported from here for easy importing
 */

// API Client
export * from './api';

// Domain Services
export * from './settings';
export * from './inventory';
export * from './sales';
export * from './customers';
export * from './suppliers';
export * from './purchases';
export * from './returns';
export * from './cash';
export * from './hr';

// Data Context (Unified State Management)
export { DataProvider, useData } from './DataContext';
export type { DataContextType, DataState, DataActions } from './DataContext';

// Re-export service instances for convenience
export { apiClient } from './api/client';
export { settingsService } from './settings/settingsService';
export { inventoryService } from './inventory/inventoryService';
export { salesService } from './sales/salesService';
export { customerService } from './customers/customerService';
export { supplierService } from './suppliers/supplierService';
export { purchaseService } from './purchases/purchaseService';
export { returnService } from './returns/returnService';
export { cashService } from './cash/cashService';
export { employeeService } from './hr/employeeService';
