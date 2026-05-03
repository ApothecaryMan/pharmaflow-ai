import { supabase } from '../../../lib/supabase';
import type { Organization, OrgMember, Subscription } from '../../../types';

export const orgRepository = {
  mapOrg(row: any): Organization {
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
  },

  mapMember(row: any): OrgMember {
    return {
      id: row.id,
      orgId: row.org_id,
      userId: row.user_id,
      role: row.role,
      joinedAt: row.joined_at,
    };
  },

  mapSubscription(row: any): Subscription {
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
  },

  async getById(orgId: string): Promise<Organization | null> {
    const { data, error } = await supabase.from('organizations').select('*').eq('id', orgId).maybeSingle();
    if (error || !data) return null;
    return this.mapOrg(data);
  },

  async getUserOrgs(userId: string): Promise<Organization[]> {
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
    return (orgs || []).map(row => this.mapOrg(row));
  },

  async update(orgId: string, updates: any): Promise<Organization> {
    const { data, error } = await supabase
      .from('organizations')
      .update(updates)
      .eq('id', orgId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to update organization');
    return this.mapOrg(data);
  },

  async getMembers(orgId: string): Promise<OrgMember[]> {
    const { data, error } = await supabase.from('org_members').select('*').eq('org_id', orgId);
    if (error) return [];
    return (data || []).map(row => this.mapMember(row));
  },

  async getMemberRole(orgId: string, userId: string): Promise<any> {
    const { data, error } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return null;
    return data?.role || null;
  },

  async insertMember(orgId: string, userId: string, role: string): Promise<OrgMember> {
    const { data, error } = await supabase
      .from('org_members')
      .insert({ org_id: orgId, user_id: userId, role })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message || 'Failed to add member');
    return this.mapMember(data);
  },

  async updateMemberRole(orgId: string, userId: string, role: string): Promise<void> {
    const { error } = await supabase
      .from('org_members')
      .update({ role })
      .eq('org_id', orgId)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
  },

  async deleteMember(orgId: string, userId: string): Promise<void> {
    await supabase.from('org_members').delete().eq('org_id', orgId).eq('user_id', userId);
  },

  async getSubscription(orgId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('org_id', orgId)
      .maybeSingle();
    if (error || !data) return null;
    return this.mapSubscription(data);
  },

  async setupInitialOrg(name: string, slug: string, ownerId: string, plan: string): Promise<any> {
    const { data, error } = await supabase.rpc('setup_initial_organization', {
      p_name: name,
      p_slug: slug,
      p_owner_id: ownerId,
      p_plan: plan
    });
    if (error) throw error;
    return data;
  }
};
