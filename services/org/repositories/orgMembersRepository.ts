import { supabase } from '../../../lib/supabase';

export interface OrgInviteRow {
  id: string;
  org_id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  status: string;
}

export const orgMembersRepository = {
  async insertInvite(invite: {
    id: string;
    org_id: string;
    email: string;
    role: string;
    token: string;
    expires_at: string;
    status: string;
  }): Promise<void> {
    const { error } = await supabase.from('org_invites').insert(invite);
    if (error) throw error;
  },

  async getInviteByToken(token: string): Promise<OrgInviteRow | null> {
    const { data, error } = await supabase
      .from('org_invites')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single();

    if (error || !data) return null;
    return data as OrgInviteRow;
  },

  async acceptInvite(inviteId: string): Promise<void> {
    const { error } = await supabase
      .from('org_invites')
      .update({ status: 'accepted' })
      .eq('id', inviteId);
    if (error) throw error;
  },

  async insertMember(member: { org_id: string; user_id: string; role: string }): Promise<void> {
    const { error } = await supabase.from('org_members').insert(member);
    if (error) throw error;
  },

  async removeMember(orgId: string, memberId: string): Promise<void> {
    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('org_id', orgId)
      .eq('id', memberId);
    if (error) throw error;
  },
};
