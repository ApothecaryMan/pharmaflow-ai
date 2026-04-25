/**
 * Organization Service — Manages multi-tenant organizations.
 * Online-Only implementation using Supabase.
 */

import type { Organization, OrgMember, OrgRole, Subscription } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { supabase } from '../../lib/supabase';

const ACTIVE_ORG_KEY = 'pharma_active_org_id';

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

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

export const orgService = {
  async create(
    name: string,
    ownerId: string,
    plan: string = 'starter'
  ): Promise<{ org: Organization; membership: OrgMember; subscription: Subscription }> {
    const slug = generateSlug(name) + '-' + Date.now().toString(36);

    const { data, error } = await supabase.rpc('setup_initial_organization', {
      p_name: name,
      p_slug: slug,
      p_owner_id: ownerId,
      p_plan: plan
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
  },

  async getUserOrgs(userId: string): Promise<Organization[]> {
    if (!userId || !userId.includes('-')) return [];

    const { data: memberships, error: memError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', userId);

    if (memError || !memberships || memberships.length === 0) return [];

    const orgIds = memberships.map((m: any) => m.org_id);
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .in('id', orgIds)
      .eq('status', 'active');

    if (orgError) return [];
    return (orgs || []).map(mapOrg);
  },

  async getById(orgId: string): Promise<Organization | null> {
    const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).maybeSingle();
    if (error || !data) return null;
    return mapOrg(data);
  },

  async update(orgId: string, updates: Partial<Pick<Organization, 'name' | 'logoUrl'>>): Promise<Organization> {
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
  },

  async getMembers(orgId: string): Promise<OrgMember[]> {
    const { data, error } = await supabase.from('org_members').select('*').eq('org_id', orgId);
    if (error) return [];
    return (data || []).map(mapMember);
  },

  async getUserRole(orgId: string, userId: string): Promise<OrgRole | null> {
    const { data, error } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return null;
    return data?.role || null;
  },

  async addMember(orgId: string, userId: string, role: OrgRole = 'member'): Promise<OrgMember> {
    const { data, error } = await supabase
      .from('org_members')
      .insert({ org_id: orgId, user_id: userId, role })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to add member');
    return mapMember(data);
  },

  async updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<void> {
    const { error } = await supabase
      .from('org_members')
      .update({ role })
      .eq('org_id', orgId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },

  async removeMember(orgId: string, userId: string): Promise<void> {
    await supabase.from('org_members').delete().eq('org_id', orgId).eq('user_id', userId);
  },

  async getSubscription(orgId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();
    if (error || !data) return null;
    return mapSubscription(data);
  },

  getActiveOrgId(): string | null {
    return localStorage.getItem(ACTIVE_ORG_KEY);
  },

  setActiveOrgId(orgId: string): void {
    localStorage.setItem(ACTIVE_ORG_KEY, orgId);
  },

  clearActiveOrg(): void {
    localStorage.removeItem(ACTIVE_ORG_KEY);
  },

  async claimOrganization(orgId: string, userId: string): Promise<void> {
    // Update Org owner
    await supabase.from('organizations').update({ owner_id: userId }).eq('id', orgId);
    
    // Update Membership
    await supabase
      .from('org_members')
      .update({ user_id: userId, role: 'owner' })
      .eq('org_id', orgId)
      .eq('role', 'owner');
  },
};
