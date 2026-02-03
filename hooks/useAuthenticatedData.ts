import { useMemo } from 'react';
import type { UserRole } from '../config/permissions';
import type { Customer, Employee } from '../types';

interface AuthenticatedDataProps {
  employees: Employee[];
  currentEmployeeId: string | null;
  customers: Customer[];
  sales: any[];
}

/**
 * ARCHITECTURE NOTE:
 * useAuthenticatedData handles business-logic related data transformations
 * that are required globally across the authenticated session.
 */
export const useAuthenticatedData = ({
  employees,
  currentEmployeeId,
  customers,
  sales,
}: AuthenticatedDataProps) => {
  // 1. Role Determination
  const currentEmployee = useMemo(
    () => employees.find((e) => e.id === currentEmployeeId),
    [employees, currentEmployeeId]
  );

  const userRole = (currentEmployee?.role || 'officeboy') as UserRole;

  // 2. Customer Enrichment (Loyalty/Sales stats)
  const enrichedCustomers = useMemo(() => {
    return customers.map((customer) => {
      const customerSales = sales.filter((s) => s.customerId === customer.id);
      const totalSpent = customerSales.reduce((sum, s) => sum + s.total, 0);
      const lastVisit =
        customerSales.length > 0
          ? Math.max(...customerSales.map((s) => new Date(s.date).getTime()))
          : null;

      return {
        ...customer,
        totalSpent,
        lastVisit: lastVisit ? new Date(lastVisit).toISOString() : null,
        visitCount: customerSales.length,
      };
    });
  }, [customers, sales]);

  return {
    userRole,
    currentEmployee,
    enrichedCustomers,
  };
};
