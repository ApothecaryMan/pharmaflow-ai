import { supabase } from '../../../lib/supabase';

export const orgRepository = {
  tableName: 'organizations',
  membersTableName: 'org_members',

  async getMemberByUserId(userId: string): Promise<{ role: string; orgId: string } | null> {
    const { data, error } = await supabase.from(this.membersTableName)
      .select('role, org_id')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) throw error;
    return data ? { role: data.role, orgId: data.org_id } : null;
  }
};
