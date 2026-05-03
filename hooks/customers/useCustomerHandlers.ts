import { useCallback, useMemo } from 'react';
import { useAlert } from '../../context';
import { permissionsService } from '../../services/auth/permissionsService';
import { auditService } from '../../services/auditService';
import { customerService } from '../../services/customers/customerService';
import type { Customer, Employee, Sale } from '../../types';

export interface UseCustomerHandlersParams {
  currentEmployeeId: string | null;
  employees: Employee[];
  activeBranchId: string;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  sales: Sale[];
  getVerifiedDate: () => Date;
}

export function useCustomerHandlers({
  currentEmployeeId,
  employees,
  activeBranchId,
  customers,
  setCustomers,
  sales,
  getVerifiedDate,
}: UseCustomerHandlersParams) {
  const { success, error } = useAlert();

  const handleAddCustomer = useCallback(
    async (customer: Customer) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to add customers');
        return;
      }
      if (!permissionsService.can('customer.add')) {
        error('Permission denied: Cannot add customers');
        return;
      }

      try {
        const result = await customerService.create({
          ...customer,
          createdAt: customer.createdAt || getVerifiedDate().toISOString(),
          registeredByEmployeeId: customer.registeredByEmployeeId || currentEmployeeId || undefined,
        }, activeBranchId);

        setCustomers((prev) => [...prev, result]);
        success('Customer added successfully');
        auditService.log('customer.add', {
          userId: currentEmployeeId || 'System',
          details: `Added customer: ${result.name}`,
          entityId: result.id,
          branchId: activeBranchId,
        });
      } catch (err) {
        error(`Failed to add customer: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    },
    [setCustomers, success, currentEmployeeId, error, getVerifiedDate, activeBranchId]
  );

  const handleUpdateCustomer = useCallback(
    async (customer: Customer) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to update customers');
        return;
      }
      if (!permissionsService.can('customer.update')) {
        error('Permission denied: Cannot update customers');
        return;
      }

      try {
        const result = await customerService.update(customer.id, customer);
        setCustomers((prev) => prev.map((c) => (c.id === customer.id ? result : c)));
        success('Customer updated successfully');
        auditService.log('customer.update', {
          userId: currentEmployeeId,
          details: `Updated customer: ${customer.name}`,
          entityId: customer.id,
          branchId: activeBranchId,
        });
      } catch (err) {
        error(`Failed to update customer: ${err instanceof Error ? err.message : String(err)}`);
        throw err;
      }
    },
    [setCustomers, success, currentEmployeeId, error, activeBranchId]
  );

  const handleDeleteCustomer = useCallback(
    async (id: string) => {
      if (!currentEmployeeId) {
        error('Authentication required: Please log in to delete customers');
        return;
      }
      if (!permissionsService.can('customer.delete')) {
        error('Permission denied: Cannot delete customers');
        return;
      }

      const hasSales = sales.some((s) => s.customerCode === id);
      if (hasSales) {
        error('Cannot delete customer with existing sales records');
        return;
      }

      try {
        await customerService.delete(id);
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        success('Customer removed successfully');
        auditService.log('customer.delete', {
          userId: currentEmployeeId || 'System',
          details: `Deleted customer ID: ${id}`,
          entityId: id,
          branchId: activeBranchId,
        });
      } catch (err) {
        error(`Failed to delete customer: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [setCustomers, sales, success, currentEmployeeId, error, activeBranchId]
  );

  const enrichedCustomers = useMemo(() => {
    const salesByCustomer = new Map<string, Sale[]>();

    sales.forEach((sale) => {
      if (sale.customerCode) {
        const key = `code:${sale.customerCode}`;
        const existing = salesByCustomer.get(key) || [];
        existing.push(sale);
        salesByCustomer.set(key, existing);
      } else if (sale.customerName) {
        const key = `name:${sale.customerName}`;
        const existing = salesByCustomer.get(key) || [];
        existing.push(sale);
        salesByCustomer.set(key, existing);
      }
    });

    return customers.map((customer) => {
      const salesByCode = customer.code ? salesByCustomer.get(`code:${customer.code}`) || [] : [];
      const salesBySerial = customer.serialId
        ? salesByCustomer.get(`code:${customer.serialId}`) || []
        : [];
      const salesByName = salesByCustomer.get(`name:${customer.name}`) || [];

      const allCustomerSales = Array.from(
        new Set([...salesByCode, ...salesBySerial, ...salesByName])
      );

      const totalPurchases = allCustomerSales.reduce(
        (sum, sale) => sum + (sale.netTotal ?? sale.total),
        0
      );

      let lastVisit = customer.lastVisit;
      if (allCustomerSales.length > 0) {
        allCustomerSales.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        lastVisit = allCustomerSales[0].date;
      }

      return {
        ...customer,
        totalPurchases,
        lastVisit,
      };
    });
  }, [customers, sales]);

  return {
    handleAddCustomer,
    handleUpdateCustomer,
    handleDeleteCustomer,
    enrichedCustomers,
  };
}
