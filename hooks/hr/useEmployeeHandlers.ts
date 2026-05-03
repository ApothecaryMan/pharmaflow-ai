import { useCallback } from 'react';
import { useAlert } from '../../context';
import { permissionsService } from '../../services/auth/permissionsService';
import { auditService } from '../../services/auditService';
import { employeeService } from '../../services/hr/employeeService';
import type { Customer, Employee, Purchase, Sale } from '../../types';

export interface UseEmployeeHandlersParams {
  currentEmployeeId: string | null;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  activeBranchId: string;
  activeOrgId: string;
  sales: Sale[];
  purchases: Purchase[];
  customers: Customer[];
}

export function useEmployeeHandlers({
  currentEmployeeId,
  employees,
  setEmployees,
  activeBranchId,
  activeOrgId,
  sales,
  purchases,
  customers,
}: UseEmployeeHandlersParams) {
  const { success, error } = useAlert();

  const handleAddEmployee = useCallback(
    async (employee: Employee) => {
      if (!currentEmployeeId) {
        error('Login required: Cannot add employees');
        return;
      }

      if (!permissionsService.can('users.manage')) {
        error('Permission denied: Cannot add employees');
        return;
      }

      const newEmployee = await employeeService.create(
        employee,
        employee.branchId || activeBranchId,
        activeOrgId
      );

      setEmployees((prev) => [...prev, newEmployee]);
      success('Employee added successfully');

      auditService.log('user.create', {
        userId: currentEmployeeId,
        details: `Added Employee: ${newEmployee.name} (${newEmployee.employeeCode})`,
        entityId: newEmployee.id,
        branchId: activeBranchId,
      });
    },
    [setEmployees, success, currentEmployeeId, error, activeBranchId, activeOrgId]
  );

  const handleUpdateEmployee = useCallback(
    async (id: string, updates: Partial<Employee>) => {
      const isSelf = id === currentEmployeeId;

      if (!isSelf && !permissionsService.can('users.manage')) {
        error('Permission denied: Cannot update employees');
        return;
      }

      if (isSelf && !permissionsService.can('users.manage')) {
        const sensitiveFields: (keyof Employee)[] = ['role', 'salary', 'employeeCode', 'status', 'department'];
        const hasSensitiveUpdates = sensitiveFields.some(field => field in updates);
        
        if (hasSensitiveUpdates) {
          error('Permission denied: You cannot update your own role, salary, or status. Contact an administrator.');
          return;
        }
      }

      await employeeService.update(id, updates);
      setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
      success('Employee updated successfully');
      auditService.log('user.update', {
        userId: currentEmployeeId || 'System',
        details: `Updated Employee ID: ${id}`,
        entityId: id,
        branchId: activeBranchId,
      });
    },
    [setEmployees, success, currentEmployeeId, error, activeBranchId]
  );

  const handleDeleteEmployee = useCallback(
    async (id: string) => {
      if (!currentEmployeeId) {
        error('Login required: Cannot delete employees');
        return;
      }

      if (!permissionsService.can('users.manage')) {
        error('Permission denied: Cannot delete employees');
        return;
      }

      if (id === currentEmployeeId) {
        error('Cannot delete your own account');
        return;
      }

      const hasSales = sales.some((s) => s.soldByEmployeeId === id);
      const hasPurchases = purchases.some((p) => p.approvedBy === id);
      const hasCustomers = customers.some((c) => c.registeredByEmployeeId === id);

      if (hasSales || hasPurchases || hasCustomers) {
        error(
          'Cannot delete employee with existing transaction records. Please set their status to "Inactive" in edit mode instead.'
        );
        return;
      }

      await employeeService.delete(id);
      setEmployees((prev) => prev.filter((e) => e.id !== id));
      success('Employee deleted successfully');

      auditService.log('user.delete', {
        userId: currentEmployeeId,
        details: `Deleted Employee ID: ${id}`,
        entityId: id,
        branchId: activeBranchId,
      });
    },
    [setEmployees, sales, purchases, customers, success, currentEmployeeId, error, activeBranchId]
  );

  return {
    handleAddEmployee,
    handleUpdateEmployee,
    handleDeleteEmployee,
  };
}
