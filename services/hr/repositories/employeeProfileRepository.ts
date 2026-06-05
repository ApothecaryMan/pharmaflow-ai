import { supabase } from '../../../lib/supabase';
import type { UserProfile } from '../../../types';

export const employeeProfileRepository = {
  BASE_PROFILE_COLUMNS: 'id, username, full_name, name_arabic, email, phone, license_number, image, cover_style, created_at, updated_at',

  /**
   * Fetch a user profile by ID
   */
  async getById(id: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(this.BASE_PROFILE_COLUMNS)
        .eq('id', id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') return null; // not found
        throw error;
      }
      let profile = this.mapToModel(data);

      // Email backfill
      if (profile && !profile.email) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.email) {
            const updated = await this.update(id, { email: user.email });
            if (updated) profile = updated;
          }
        } catch (authErr) {
          console.error('Failed to backfill email:', authErr);
        }
      }

      return profile;
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
        .select(this.BASE_PROFILE_COLUMNS)
        .in('username', usernames);

      if (error) throw error;
      return (data || []).map(this.mapToModel);
    } catch (err) {
      console.error('Failed to get user profiles by usernames:', err);
      return [];
    }
  },

  /**
   * Fetch a user profile by username.
   * Normalizes the @ prefix internally — callers can pass
   * "ahmed", "@ahmed", or any variant and it will match.
   */
  async getByUsername(username: string): Promise<UserProfile | null> {
    // Canonical format in user_profiles is @username
    const bare = username.replace(/^@/, '');
    const prefixed = `@${bare}`;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(this.BASE_PROFILE_COLUMNS)
        .or(`username.eq.${prefixed},username.eq.${bare}`)
        .limit(1)
        .maybeSingle();
        
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data ? this.mapToModel(data) : null;
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

  /**
   * Fetch only the heavy base64 document strings for a user
   */
  async getDocuments(id: string): Promise<Partial<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('national_id_card, national_id_card_back, main_syndicate_card, sub_syndicate_card')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return {
        nationalIdCard: data.national_id_card,
        nationalIdCardBack: data.national_id_card_back,
        mainSyndicateCard: data.main_syndicate_card,
        subSyndicateCard: data.sub_syndicate_card,
      };
    } catch (err) {
      console.error('Failed to get user documents:', err);
      return {};
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
