/**
 * Customer entity representing registered customers.
 * - `serialId`: System-generated primary key (internal use only, 1, 2, 3...)
 * - `code`: Customer-facing unique code printed on loyalty cards (e.g., "CUS-001")
 */
export interface Customer {
  id: string;
  /** Branch this customer belongs to — required for RLS isolation */
  branchId: string;
  /** Organization this customer belongs to */
  orgId?: string;
  /** System-generated primary key (internal, e.g. "B1-0001") */
  serialId: string;
  /** Customer-facing code printed on loyalty cards - given to customer */
  code: string;
  name: string;
  phone: string;
  email?: string;
  // Address Details
  governorate?: string;
  city?: string;
  area?: string;
  streetAddress?: string; // Specific address details
  insuranceProvider?: string;
  policyNumber?: string;
  preferredLocation?: string;
  preferredContact?: 'phone' | 'email' | 'sms';
  chronicConditions?: string[];
  totalPurchases: number; // Total value of purchases
  points: number; // Loyalty points
  lastVisit: string;
  notes?: string;
  status: 'active' | 'inactive';
  createdAt?: string; // ISO Date of creation
  vip?: boolean;
  /** Employee ID who registered this customer */
  registeredByEmployeeId?: string;
}
