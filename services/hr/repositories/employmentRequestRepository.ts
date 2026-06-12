import { supabase } from '../../../lib/supabase';
import type { EmploymentRequest } from '../../../types';
import { employeeProfileRepository } from './employeeProfileRepository';
import { employeeService } from '../employeeService';

export const employmentRequestRepository = {
  /**
   * Send a new employment request from an organization to a specific username
   */
  async sendRequest(request: Omit<EmploymentRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'expiresAt'> & { sentByName?: string; orgName?: string; expiresInHours?: number }): Promise<{ success: boolean; data?: EmploymentRequest; message?: string }> {
    try {
      // Check if a pending request already exists
      const { data: existing } = await supabase
        .from('employment_requests')
        .select('id')
        .eq('org_id', request.orgId)
        .eq('target_username', request.targetUsername)
        .eq('status', 'pending')
        .maybeSingle();

      if (existing) {
        return { success: false, message: 'A pending request already exists for this user.' };
      }

      // Check if the user is already an employee in this organization
      const targetProfile = await employeeProfileRepository.getByUsername(request.targetUsername);
      if (!targetProfile) {
        return { success: false, message: 'User profile not found. The user must be registered before sending an invitation.' };
      }

      if (targetProfile) {
        const { data: existingEmployee } = await supabase
          .from('employees')
          .select('id')
          .eq('org_id', request.orgId)
          .eq('auth_user_id', targetProfile.id)
          .maybeSingle();

        if (existingEmployee) {
          return { success: false, message: 'This user is already registered as an employee in your organization.' };
        }
      }

      const expiresAt = request.expiresInHours 
        ? new Date(Date.now() + request.expiresInHours * 3600000).toISOString()
        : null;

      const { data, error } = await supabase
        .from('employment_requests')
        .insert({
          org_id: request.orgId,
          target_username: request.targetUsername,
          target_user_id: targetProfile.id,
          role: request.role,
          branch_id: request.branchId || null,
          sent_by_name: request.sentByName || null,
          org_name: request.orgName || null,
          status: 'pending',
          expires_at: expiresAt
        })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.mapToModel(data) };
    } catch (err: any) {
      console.error('Failed to send employment request:', err);
      return { success: false, message: err.message };
    }
  },

  /**
   * Fetch all requests sent by an organization
   */
  async getByOrg(orgId: string): Promise<EmploymentRequest[]> {
    try {
      const { data, error } = await supabase
        .from('employment_requests')
        .select('*')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(this.mapToModel);
    } catch (err) {
      console.error('Failed to get org requests:', err);
      return [];
    }
  },

  /**
   * Fetch all requests targeted at a specific User ID (O(1) fast fetch)
   */
  async getByUserId(userId: string): Promise<EmploymentRequest[]> {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('employment_requests')
        .select('*, organizations(name), branches(name)')
        .eq('target_user_id', userId)
        .eq('status', 'pending')
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map((row) => this.mapToModel(row));
    } catch (err) {
      console.error('Failed to get user requests:', err);
      return [];
    }
  },

  /**
   * Accept or Reject a request
   */
  async updateStatus(id: string, status: 'accepted' | 'rejected'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('employment_requests')
        .update({ status })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update request status:', err);
      return false;
    }
  },

  /**
   * Accept an employment request and create the employee record
   */
  async acceptEmploymentRequest(requestId: string, userId: string, username: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('accept_employment_request', {
        p_request_id: requestId,
        p_user_id: userId,
        p_username: username
      });

      if (error) {
        console.error('RPC Error accepting employment request:', error);
        throw error;
      }
      return true;
    } catch (err) {
      console.error('Failed to accept employment request:', err);
      return false;
    }
  },

  /**
   * Cancel a pending employment request
   */
  async cancelRequest(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('employment_requests')
        .delete()
        .eq('id', id)
        .eq('status', 'pending');

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to cancel employment request:', err);
      return false;
    }
  },

  mapToModel(row: any): EmploymentRequest {
    return {
      id: row.id,
      orgId: row.org_id,
      targetUsername: row.target_username,
      targetUserId: row.target_user_id,
      role: row.role,
      branchId: row.branch_id,
      status: row.status,
      sentByName: row.sent_by_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      expiresAt: row.expires_at,
      // denormalized org_name first, fallback to joined data
      orgName: row.org_name || row.organizations?.name,
      branchName: row.branches?.name
    };
  }
};
