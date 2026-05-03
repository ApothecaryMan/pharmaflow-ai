import { OrgRole, SubscriptionPlan, SubscriptionStatus } from './auth';

/**
 * Organization entity — the top-level tenant.
 * Each organization owns one or more branches (pharmacies).
 */
export interface Organization {
  /** Unique identifier (UUID) */
  id: string;
  /** Organization display name (e.g., "صيدلية النور") */
  name: string;
  /** URL-safe unique slug (e.g., "al-nour-pharmacy") */
  slug: string;
  /** Auth user ID of the organization owner */
  ownerId: string;
  /** Organization logo URL */
  logoUrl?: string;
  /** Organization status */
  status: 'active' | 'suspended' | 'deleted';
  /** ISO date of creation */
  createdAt?: string;
  /** ISO date of last update */
  updatedAt?: string;
}

/**
 * OrgMember — links a user to an organization with a role.
 * Controls who can access which organization's data.
 */
export interface OrgMember {
  /** Unique identifier (UUID) */
  id: string;
  /** Organization ID */
  orgId?: string;
  /** Auth user ID */
  userId: string;
  /** Role within the organization */
  role: OrgRole;
  /** ISO date when user joined */
  joinedAt?: string;
}

/**
 * Subscription — billing and feature limits per organization.
 * Controls max branches, employees, and drugs allowed.
 */
export interface Subscription {
  /** Unique identifier (UUID) */
  id: string;
  /** Organization ID */
  orgId?: string;
  /** Current plan tier */
  plan: SubscriptionPlan;
  /** Billing status */
  status: SubscriptionStatus;
  /** Maximum number of branches allowed */
  maxBranches: number;
  /** Maximum number of employees allowed */
  maxEmployees: number;
  /** Maximum number of drugs allowed */
  maxDrugs: number;
  /** ISO date when trial ends */
  trialEndsAt?: string;
  /** ISO date of current billing period start */
  currentPeriodStart?: string;
  /** ISO date of current billing period end */
  currentPeriodEnd?: string;
  /** ISO date of creation */
  createdAt?: string;
  /** ISO date of last update */
  updatedAt?: string;
}

/**
 * Branch entity - represents a pharmacy location.
 * Belongs to an Organization (tenant).
 */
export interface Branch {
  /** Unique identifier (UUID) */
  id: string;
  /** Organization this branch belongs to — required for tenant isolation */
  orgId?: string;
  /** Branch name (e.g., 'Main Branch', 'Downtown Store') */
  name: string;
  /** Short code for reference (e.g., 'MN01') */
  code: string;
  /** Physical address */
  address?: string;
  /** Location details for Egyptian hierarchy */
  governorate?: string;
  city?: string;
  area?: string;
  /** Contact phone number */
  phone?: string;
  /** Active status */
  status: 'active' | 'inactive';
  /** ISO date of creation */
  createdAt?: string;
  /** ISO date of last update */
  updatedAt?: string;
}
