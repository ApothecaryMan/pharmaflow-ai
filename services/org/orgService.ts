/**
 * Organization Service — Manages multi-tenant organizations.
 *
 * Provides CRUD operations for organizations, members, and subscriptions.
 * Uses Supabase when configured, falls back to localStorage for dev/offline.
 */

import type { Organization, OrgMember, OrgRole, Subscription } from '../../types';
import { storage } from '../../utils/storage';
import { idGenerator } from '../../utils/idGenerator';

const ORGS_KEY = 'pharma_organizations';
const ORG_MEMBERS_KEY = 'pharma_org_members';
const SUBSCRIPTIONS_KEY = 'pharma_subscriptions';
const ACTIVE_ORG_KEY = 'pharma_active_org_id';

/**
 * Check if Supabase is configured and available
 */
const isSupabaseConfigured = (): boolean => {
  return !!(
    import.meta.env.VITE_SUPABASE_URL &&
    import.meta.env.VITE_SUPABASE_URL !== 'your_supabase_project_url'
  );
};

/**
 * Generate a URL-safe slug from a name
 */
const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/\s+/g, '-') // Spaces → hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .trim();
};

export const orgService = {
  // ───────────────────────────────────────
  // Organization CRUD
  // ───────────────────────────────────────

  /**
   * Create a new organization + owner membership + default subscription.
   * This is the main "signup" operation for a new tenant.
   */
  async create(
    name: string,
    ownerId: string
  ): Promise<{ org: Organization; membership: OrgMember; subscription: Subscription }> {
    const slug = generateSlug(name) + '-' + Date.now().toString(36);

    if (isSupabaseConfigured()) {
      const { supabase } = await import('../../lib/supabase');

      // Use a single RPC call for atomic creation (Professional way)
      // This bypasses initial RLS hurdles for creation steps
      const { data, error } = await supabase.rpc('setup_initial_organization', {
        p_name: name,
        p_slug: slug,
        p_owner_id: ownerId
      });

      if (error) {
        console.error('Failed to setup organization via RPC:', error);
        throw new Error(error.message);
      }

      return {
        org: mapOrg(data.org),
        membership: mapMember(data.membership),
        subscription: mapSubscription(data.subscription),
      };
    }

    // Local fallback
    const now = new Date().toISOString();
    const orgId = idGenerator.uuid();

    const org: Organization = {
      id: orgId,
      name,
      slug,
      ownerId,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    const membership: OrgMember = {
      id: idGenerator.uuid(),
      orgId,
      userId: ownerId,
      role: 'owner',
      joinedAt: now,
    };

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 14);

    const subscription: Subscription = {
      id: idGenerator.uuid(),
      orgId,
      plan: 'free',
      status: 'trial',
      maxBranches: 1,
      maxEmployees: 5,
      maxDrugs: 500,
      trialEndsAt: trialEnd.toISOString(),
      createdAt: now,
      updatedAt: now,
    };

    // Persist locally
    const orgs = storage.get<Organization[]>(ORGS_KEY, []);
    orgs.push(org);
    storage.set(ORGS_KEY, orgs);

    const members = storage.get<OrgMember[]>(ORG_MEMBERS_KEY, []);
    members.push(membership);
    storage.set(ORG_MEMBERS_KEY, members);

    const subs = storage.get<Subscription[]>(SUBSCRIPTIONS_KEY, []);
    subs.push(subscription);
    storage.set(SUBSCRIPTIONS_KEY, subs);

    return { org, membership, subscription };
  },

  /**
   * Get all organizations for the current user
   */
  async getUserOrgs(userId: string): Promise<Organization[]> {
    if (isSupabaseConfigured()) {
      // Guard: Don't query Supabase for placeholder UUIDs
      const devOwnerId = import.meta.env.VITE_DEV_OWNER_ID as string;
      if (!userId || userId === devOwnerId || !userId.includes('-')) {
        return [];
      }

      const { supabase } = await import('../../lib/supabase');

      const { data: memberships } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', userId);

      if (!memberships || memberships.length === 0) return [];

      const orgIds = memberships.map((m: any) => m.org_id);
      const { data: orgs } = await supabase
        .from('organizations')
        .select('*')
        .in('id', orgIds)
        .eq('status', 'active');

      return (orgs || []).map(mapOrg);
    }

    // Local fallback
    const members = storage.get<OrgMember[]>(ORG_MEMBERS_KEY, []);
    const userOrgIds = members.filter((m) => m.userId === userId).map((m) => m.orgId);
    const orgs = storage.get<Organization[]>(ORGS_KEY, []);
    return orgs.filter((o) => userOrgIds.includes(o.id) && o.status === 'active');
  },

  /**
   * Get a single organization by ID
   */
  async getById(orgId: string): Promise<Organization | null> {
    if (isSupabaseConfigured()) {
      const { supabase } = await import('../../lib/supabase');
      const { data } = await supabase.from('organizations').select('*').eq('id', orgId).single();
      return data ? mapOrg(data) : null;
    }

    const orgs = storage.get<Organization[]>(ORGS_KEY, []);
    return orgs.find((o) => o.id === orgId) || null;
  },

  /**
   * Update an organization
   */
  async update(orgId: string, updates: Partial<Pick<Organization, 'name' | 'logoUrl'>>): Promise<Organization> {
    if (isSupabaseConfigured()) {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .from('organizations')
        .update({
          ...(updates.name && { name: updates.name }),
          ...(updates.logoUrl !== undefined && { logo_url: updates.logoUrl }),
        })
        .eq('id', orgId)
        .select()
        .single();

      if (error || !data) throw new Error(error?.message || 'Failed to update organization');
      return mapOrg(data);
    }

    const orgs = storage.get<Organization[]>(ORGS_KEY, []);
    const index = orgs.findIndex((o) => o.id === orgId);
    if (index === -1) throw new Error('Organization not found');

    orgs[index] = { ...orgs[index], ...updates, updatedAt: new Date().toISOString() };
    storage.set(ORGS_KEY, orgs);
    return orgs[index];
  },

  // ───────────────────────────────────────
  // Members Management
  // ───────────────────────────────────────

  /**
   * Get all members of an organization
   */
  async getMembers(orgId: string): Promise<OrgMember[]> {
    if (isSupabaseConfigured()) {
      const { supabase } = await import('../../lib/supabase');
      const { data } = await supabase.from('org_members').select('*').eq('org_id', orgId);
      return (data || []).map(mapMember);
    }

    const members = storage.get<OrgMember[]>(ORG_MEMBERS_KEY, []);
    return members.filter((m) => m.orgId === orgId);
  },

  /**
   * Get the current user's role in an organization
   */
  async getUserRole(orgId: string, userId: string): Promise<OrgRole | null> {
    if (isSupabaseConfigured()) {
      const { supabase } = await import('../../lib/supabase');
      const { data } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', userId)
        .single();

      return data?.role || null;
    }

    const members = storage.get<OrgMember[]>(ORG_MEMBERS_KEY, []);
    const member = members.find((m) => m.orgId === orgId && m.userId === userId);
    return (member?.role as OrgRole) || null;
  },

  /**
   * Add a member to an organization
   */
  async addMember(orgId: string, userId: string, role: OrgRole = 'member'): Promise<OrgMember> {
    if (isSupabaseConfigured()) {
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase
        .from('org_members')
        .insert({ org_id: orgId, user_id: userId, role })
        .select()
        .single();

      if (error || !data) throw new Error(error?.message || 'Failed to add member');
      return mapMember(data);
    }

    const member: OrgMember = {
      id: idGenerator.uuid(),
      orgId,
      userId,
      role,
      joinedAt: new Date().toISOString(),
    };

    const members = storage.get<OrgMember[]>(ORG_MEMBERS_KEY, []);
    members.push(member);
    storage.set(ORG_MEMBERS_KEY, members);
    return member;
  },

  /**
   * Remove a member from an organization
   */
  async removeMember(orgId: string, userId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { supabase } = await import('../../lib/supabase');
      await supabase.from('org_members').delete().eq('org_id', orgId).eq('user_id', userId);
      return;
    }

    const members = storage.get<OrgMember[]>(ORG_MEMBERS_KEY, []);
    storage.set(
      ORG_MEMBERS_KEY,
      members.filter((m) => !(m.orgId === orgId && m.userId === userId))
    );
  },

  // ───────────────────────────────────────
  // Subscription
  // ───────────────────────────────────────

  /**
   * Get the subscription for an organization
   */
  async getSubscription(orgId: string): Promise<Subscription | null> {
    if (isSupabaseConfigured()) {
      const { supabase } = await import('../../lib/supabase');
      const { data } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('org_id', orgId)
        .single();
      return data ? mapSubscription(data) : null;
    }

    const subs = storage.get<Subscription[]>(SUBSCRIPTIONS_KEY, []);
    return subs.find((s) => s.orgId === orgId) || null;
  },

  // ───────────────────────────────────────
  // Active Organization
  // ───────────────────────────────────────

  /**
   * Get the active organization ID from local storage
   */
  getActiveOrgId(): string | null {
    return localStorage.getItem(ACTIVE_ORG_KEY);
  },

  /**
   * Set the active organization ID
   */
  setActiveOrgId(orgId: string): void {
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
  },

  /**
   * Clear the active organization
   */
  clearActiveOrg(): void {
    localStorage.removeItem(ACTIVE_ORG_KEY);
  },

  /**
   * Claim an organization by updating its ownerId and membership.
   * Used during onboarding to link the new Admin to the created Org.
   */
  async claimOrganization(orgId: string, userId: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { supabase } = await import('../../lib/supabase');
      
      // Update Org owner
      await supabase.from('organizations').update({ owner_id: userId }).eq('id', orgId);
      
      // Update Membership (find the one created with DEV-OWNER and update it)
      await supabase
        .from('org_members')
        .update({ user_id: userId, role: 'owner' })
        .eq('org_id', orgId)
        .eq('role', 'owner');
      
      return;
    }

    // Local
    const orgs = storage.get<Organization[]>(ORGS_KEY, []);
    const orgIndex = orgs.findIndex(o => o.id === orgId);
    if (orgIndex !== -1) {
      orgs[orgIndex].ownerId = userId;
      storage.set(ORGS_KEY, orgs);
    }

    const members = storage.get<OrgMember[]>(ORG_MEMBERS_KEY, []);
    let memberIndex = -1;
    for (let i = members.length - 1; i >= 0; i--) {
      if (members[i].orgId === orgId && members[i].role === 'owner') {
        memberIndex = i;
        break;
      }
    }
    if (memberIndex !== -1) {
      members[memberIndex].userId = userId;
      storage.set(ORG_MEMBERS_KEY, members);
    }
  },
};

// ───────────────────────────────────────
// Supabase → TypeScript Mappers (snake_case → camelCase)
// ───────────────────────────────────────

function mapOrg(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerId: row.owner_id,
    logoUrl: row.logo_url,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMember(row: any): OrgMember {
  return {
    id: row.id,
    orgId: row.org_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
  };
}

function mapSubscription(row: any): Subscription {
  return {
    id: row.id,
    orgId: row.org_id,
    plan: row.plan,
    status: row.status,
    maxBranches: row.max_branches,
    maxEmployees: row.max_employees,
    maxDrugs: row.max_drugs,
    trialEndsAt: row.trial_ends_at,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
