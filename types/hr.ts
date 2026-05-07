import { UserRole } from '../config/permissions';

export interface Employee {
  // --- Identification ---
  id: string; // Unique UUID
  /** Organization this employee belongs to — required for tenant isolation */
  orgId?: string;
  /** Branch this employee belongs to — required for RLS isolation */
  branchId: string;
  employeeCode: string; // Auto-generated: EMP-001, EMP-002, etc.

  // --- Personal Info ---
  name: string; // Full name (English)
  nameArabic?: string; // Full name (Arabic)
  phone: string; // Required, validated by SmartPhoneInput
  email?: string; // Optional, validated by SmartEmailInput

  // --- Employment Details ---
  position: string; // Job title (e.g., "Senior Pharmacist")
  department: 'sales' | 'pharmacy' | 'marketing' | 'hr' | 'it' | 'logistics'; // Department
  role: UserRole; // Unified Functional Role
  startDate: string; // ISO date (YYYY-MM-DD)
  status: 'active' | 'inactive' | 'holiday'; // Employment status

  // --- Financial (Optional) ---
  salary?: number; // Monthly salary

  // --- Additional ---
  notes?: string; // Free text notes

  // --- Auth ---
  username?: string; // Login Username
  userId?: string; // Auth User ID linked to this employee
  password?: string;
  orgRole?: 'owner' | 'admin' | 'member'; // Added for multi-tenant ownership
  biometricCredentialId?: string; // WebAuthn Credential ID
  biometricPublicKey?: string; // WebAuthn Public Key (Base64)
  attendancePin?: string; // Hashed 4-digit PIN (bcrypt) — fallback for non-biometric devices

  // --- Profile ---
  image?: string; // Base64 encoded profile image

  // --- Documents ---
  nationalIdCard?: string; // Base64 encoded National ID Card (البطاقة الشخصية)
  nationalIdCardBack?: string; // Base64 encoded National ID Card Back Side
  mainSyndicateCard?: string; // Base64 encoded Main Syndicate Card (كارنيه النقابة الرئيسية)
  subSyndicateCard?: string; // Base64 encoded Sub Syndicate Card (كارنيه النقابة الفرعية)
}

/**
 * Attendance Event Types
 * Event-based log: each clock in/out is a separate row.
 */
export type AttendanceEventType = 'IN' | 'OUT';

/**
 * Attendance Event
 * Represents a single clock in or clock out event.
 * Timestamps are ALWAYS server-generated (Supabase now()).
 */
export interface AttendanceEvent {
  id: string;
  employeeId: string;
  branchId: string;
  orgId?: string;
  eventType: AttendanceEventType;
  isBiometric: boolean;
  /** Server-generated timestamp — never set from client */
  timestamp: string;
  /** Employee name (joined from employees table, for display) */
  employeeName?: string;
}
