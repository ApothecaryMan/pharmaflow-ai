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
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          username: updates.username,
          full_name: updates.fullName,
          phone: updates.phone,
          license_number: updates.licenseNumber
        })
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
      phone: row.phone,
      licenseNumber: row.license_number,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
};
