import { supabase } from '../../lib/supabase';
import { idGenerator } from '../../utils/idGenerator';
import type { OrgMember, OrgRole } from '../../types';

export interface OrgInvite {
  id: string;
  orgId: string;
  email: string;
  role: OrgRole;
  token: string;
  expiresAt: string;
  status: 'pending' | 'accepted' | 'expired';
}

export const orgMembersService = {
  /**
   * Create an invitation for a new member
   */
  invite: async (orgId: string, email: string, role: OrgRole = 'member'): Promise<OrgInvite> => {
    const token = idGenerator.uuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invite: OrgInvite = {
      id: idGenerator.uuid(),
      orgId,
      email,
      role,
      token,
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
    };

    // Store in Supabase if available
    try {
      const { error } = await supabase.from('org_invites').insert({
        id: invite.id,
        org_id: orgId,
        email,
        role,
        token,
        expires_at: invite.expiresAt,
        status: 'pending',
      });
      if (error) throw error;
    } catch (err) {
      console.warn('Failed to store invite in Supabase, continuing locally', err);
    }

    return invite;
  },

  /**
   * Get invite by token
   */
  getInviteByToken: async (token: string): Promise<OrgInvite | null> => {
    try {
      const { data, error } = await supabase
        .from('org_invites')
        .select('*')
        .eq('token', token)
        .eq('status', 'pending')
        .single();
      
      if (error || !data) return null;
      
      return {
        id: data.id,
        orgId: data.org_id,
        email: data.email,
        role: data.role,
        token: data.token,
        expiresAt: data.expires_at,
        status: data.status,
      };
    } catch {
      return null;
    }
  },

  /**
   * Accept an invitation
   */
  acceptInvite: async (token: string, userId: string): Promise<boolean> => {
    try {
      const invite = await orgMembersService.getInviteByToken(token);
      if (!invite) return false;

      // 1. Add to org_members
      const { error: memberError } = await supabase.from('org_members').insert({
        org_id: invite.orgId,
        user_id: userId,
        role: invite.role,
      });

      if (memberError) throw memberError;

      // 2. Mark invite as accepted
      await supabase
        .from('org_invites')
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      return true;
    } catch (err) {
      console.error('Accept invite failed:', err);
      return false;
    }
  },

  /**
   * Remove a member from an organization
   */
  removeMember: async (orgId: string, memberId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('org_members')
        .delete()
        .eq('org_id', orgId)
        .eq('id', memberId);
      
      return !error;
    } catch {
      return false;
    }
  }
};
