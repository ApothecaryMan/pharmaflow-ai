import { supabase } from '../../../lib/supabase';
import type { UserProfile } from '../../../types';

export const employeeProfileRepository = {
  /**
   * Fetch a user profile by ID
   */
  async getById(id: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return null; // not found
        throw error;
      }
      return this.mapToModel(data);
    } catch (err) {
      console.error('Failed to get user profile by ID:', err);
      return null;
    }
  },

  /**
   * Fetch multiple user profiles by usernames
   */
  async getByUsernames(usernames: string[]): Promise<UserProfile[]> {
    if (usernames.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .in('username', usernames);

      if (error) throw error;
      return (data || []).map(this.mapToModel);
    } catch (err) {
      console.error('Failed to get user profiles by usernames:', err);
      return [];
    }
  },

  /**
   * Fetch a user profile by exact username
   */
  async getByUsername(username: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('username', username)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return this.mapToModel(data);
    } catch (err) {
      console.error('Failed to get user profile by username:', err);
      return null;
    }
  },

  /**
   * Update a user profile
   */
  async update(id: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    try {
      const payload: Record<string, any> = {};
      if (updates.username !== undefined) payload.username = updates.username;
      if (updates.fullName !== undefined) payload.full_name = updates.fullName;
      if (updates.nameArabic !== undefined) payload.name_arabic = updates.nameArabic;
      if (updates.email !== undefined) payload.email = updates.email;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.licenseNumber !== undefined) payload.license_number = updates.licenseNumber;
      if (updates.image !== undefined) payload.image = updates.image;
      if (updates.coverStyle !== undefined) payload.cover_style = updates.coverStyle;
      if (updates.nationalIdCard !== undefined) payload.national_id_card = updates.nationalIdCard;
      if (updates.nationalIdCardBack !== undefined) payload.national_id_card_back = updates.nationalIdCardBack;
      if (updates.mainSyndicateCard !== undefined) payload.main_syndicate_card = updates.mainSyndicateCard;
      if (updates.subSyndicateCard !== undefined) payload.sub_syndicate_card = updates.subSyndicateCard;

      const { data, error } = await supabase
        .from('user_profiles')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return this.mapToModel(data);
    } catch (err) {
      console.error('Failed to update user profile:', err);
      return null;
    }
  },

  mapToModel(row: any): UserProfile {
    return {
      id: row.id,
      username: row.username,
      fullName: row.full_name,
      nameArabic: row.name_arabic,
      email: row.email,
      phone: row.phone,
      licenseNumber: row.license_number,
      image: row.image,
      coverStyle: row.cover_style,
      nationalIdCard: row.national_id_card,
      nationalIdCardBack: row.national_id_card_back,
      mainSyndicateCard: row.main_syndicate_card,
      subSyndicateCard: row.sub_syndicate_card,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
};
