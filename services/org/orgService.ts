/**
 * Organization Service — Manages multi-tenant organizations.
 * Business logic layer that orchestrates data access via OrgRepository.
 */

import type { Organization, OrgMember, OrgRole, Subscription } from '../../types';
import { storage } from '../../utils/storage';
import { orgRepository } from './repositories/orgRepository';

const ACTIVE_ORG_KEY = 'pharma_active_org_id';

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

export const orgService = {
  async create(
    name: string,
    ownerId: string,
    plan: string = 'starter'
  ): Promise<{ org: Organization; membership: OrgMember; subscription: Subscription }> {
    const slug = generateSlug(name) + '-' + Date.now().toString(36);

    try {
      const data = await orgRepository.setupInitialOrg(name, slug, ownerId, plan);
      return {
        org: orgRepository.mapOrg(data.org),
        membership: orgRepository.mapMember(data.membership),
        subscription: orgRepository.mapSubscription(data.subscription),
      };
    } catch (error: any) {
      console.error('Failed to setup organization via RPC:', error);
      throw new Error(error.message);
    }
  },

  async getUserOrgs(userId: string): Promise<Organization[]> {
    if (!userId || !userId.includes('-')) return [];
    return orgRepository.getUserOrgs(userId);
  },

  async getById(orgId: string): Promise<Organization | null> {
    return orgRepository.getById(orgId);
  },

  async update(orgId: string, updates: Partial<Pick<Organization, 'name' | 'logoUrl'>>): Promise<Organization> {
    const dbUpdates: any = {};
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.logoUrl !== undefined) dbUpdates.logo_url = updates.logoUrl;

    return orgRepository.update(orgId, dbUpdates);
  },

  async getMembers(orgId: string): Promise<OrgMember[]> {
    return orgRepository.getMembers(orgId);
  },

  async getUserRole(orgId: string, userId: string): Promise<OrgRole | null> {
    return orgRepository.getMemberRole(orgId, userId);
  },

  async addMember(orgId: string, userId: string, role: OrgRole = 'member'): Promise<OrgMember> {
    return orgRepository.insertMember(orgId, userId, role);
  },

  async updateMemberRole(orgId: string, userId: string, role: OrgRole): Promise<void> {
    return orgRepository.updateMemberRole(orgId, userId, role);
  },

  async removeMember(orgId: string, userId: string): Promise<void> {
    await orgRepository.deleteMember(orgId, userId);
  },

  async getSubscription(orgId: string): Promise<Subscription | null> {
    return orgRepository.getSubscription(orgId);
  },

  getActiveOrgId(): string | null {
    return storage.get(ACTIVE_ORG_KEY, null);
  },

  setActiveOrgId(orgId: string): void {
    storage.set(ACTIVE_ORG_KEY, orgId);
  },

  clearActiveOrg(): void {
    storage.remove(ACTIVE_ORG_KEY);
  },

  async claimOrganization(orgId: string, userId: string): Promise<void> {
    // Note: Manual repository calls here or specialized repo methods
    const { supabase } = await import('../../lib/supabase');
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
