import { supabase } from '../../../lib/supabase';
import type { EmploymentRequest } from '../../../types';
import { employeeProfileRepository } from './employeeProfileRepository';
import { employeeService } from '../employeeService';

export const employmentRequestRepository = {
  /**
   * Send a new employment request from an organization to a specific username
   */
  async sendRequest(request: Omit<EmploymentRequest, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<{ success: boolean; data?: EmploymentRequest; message?: string }> {
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

      const { data, error } = await supabase
        .from('employment_requests')
        .insert({
          org_id: request.orgId,
          target_username: request.targetUsername,
          role: request.role,
          branch_id: request.branchId || null,
          status: 'pending'
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
   * Fetch all requests targeted at a specific username
   */
  async getByUsername(username: string): Promise<EmploymentRequest[]> {
    try {
      const { data, error } = await supabase
        .from('employment_requests')
        .select('*, organizations(name)')
        .eq('target_username', username)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      return (data || []).map(this.mapToModel);
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
      // 1. Fetch request details
      const { data: request, error: reqError } = await supabase
        .from('employment_requests')
        .select('*')
        .eq('id', requestId)
        .single();
        
      if (reqError || !request) throw new Error('Request not found or already processed');
      if (request.status !== 'pending') throw new Error('Request is not pending');
      if (request.target_username !== username) throw new Error('Username mismatch');

      // 1b. Check if employee already exists to prevent duplicates
      const { data: existingEmployee } = await supabase
        .from('employees')
        .select('id')
        .eq('org_id', request.org_id)
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (existingEmployee) {
        throw new Error('You are already an employee in this organization.');
      }

      // 2. Fetch User Profile for Full Name and Phone
      const profile = await employeeProfileRepository.getById(userId);
      if (!profile) throw new Error('Profile not found');

      // 3. Create Employee record FIRST (before changing status)
      // This way, if creation fails, the request stays 'pending' and can be retried.
      await employeeService.create({
        id: '', 
        employeeCode: '', 
        userId: userId,
        username: username,
        name: profile.fullName,
        nameArabic: '',
        position: request.role,
        department: 'pharmacy',
        role: request.role as any,
        status: 'pending',
        startDate: new Date().toISOString().split('T')[0],
        phone: profile.phone || '',
        email: '',
        salary: 0,
        branchId: request.branch_id || undefined,
        orgId: request.org_id,
      } as any, request.branch_id || undefined, request.org_id);

      // 4. Update status to accepted ONLY after employee was created successfully
      const { error: updateError } = await supabase
        .from('employment_requests')
        .update({ status: 'accepted' })
        .eq('id', requestId);
        
      if (updateError) {
        // Employee was created but status update failed — log but don't fail
        // The employee record exists, which is the critical part
        console.error('Employee created but status update failed:', updateError);
      }

      return true;
    } catch (err) {
      console.error('Failed to accept employment request:', err);
      return false;
    }
  },

  mapToModel(row: any): EmploymentRequest {
    return {
      id: row.id,
      orgId: row.org_id,
      targetUsername: row.target_username,
      role: row.role,
      branchId: row.branch_id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // Optional populated fields depending on the query
      orgName: row.organizations?.name
    };
  }
};
