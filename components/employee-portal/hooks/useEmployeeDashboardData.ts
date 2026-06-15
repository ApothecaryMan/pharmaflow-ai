import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { authService } from '../../../services/auth/authService';
import { employeeProfileRepository } from '../../../services/hr/repositories/employeeProfileRepository';
import { employeeRepository } from '../../../services/hr/repositories/employeeRepository';
import { employmentRequestRepository } from '../../../services/hr/repositories/employmentRequestRepository';
import type { Employee, EmploymentRequest, UserProfile } from '../../../types';

export interface WorkspaceData extends Employee {
  orgName?: string;
  branchName?: string;
  organizations?: { name: string };
  branches?: { name: string };
}

export function useEmployeeDashboardData() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [requests, setRequests] = useState<EmploymentRequest[]>([]);
  const [workspaces, setWorkspaces] = useState<WorkspaceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async (refreshSession = false) => {
    setIsLoading(true);
    try {
      if (refreshSession) {
        await authService.refreshSession();
        window.location.reload();
        return;
      }

      const session = await authService.getCurrentUser();
      if (session?.userId) {
        // Run independent queries in parallel to avoid waterfall
        const [initialProfile, pendingRequests, workspacesRes] = await Promise.all([
          employeeProfileRepository.getById(session.userId),
          employmentRequestRepository.getByUserId(session.userId),
          supabase.rpc('get_my_workspaces'),
        ]);

        let userProfile = initialProfile;

        // Backfill email from auth.users if missing in user_profiles
        if (userProfile && !userProfile.email) {
          const {
            data: { user: authUser },
          } = await supabase.auth.getUser();
          if (authUser?.email) {
            userProfile = { ...userProfile, email: authUser.email };
          }
        }

        setProfile(userProfile);
        setRequests(pendingRequests || []);

        if (workspacesRes.error) {
          console.error('get_my_workspaces RPC error:', workspacesRes.error);
        }
        if (workspacesRes.data) {
          // RPC returns flat rows with org_name/branch_name already joined
          const mappedWorkspaces = workspacesRes.data.map((row: any) => ({
            ...employeeRepository.mapFromDb(row),
            orgName: row.org_name,
            branchName: row.branch_name,
          }));
          setWorkspaces(mappedWorkspaces);
        }
      }
    } catch (err) {
      console.error('Failed to load employee dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime subscription for incoming employment requests
  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel('public:employment_requests')
      // Listen for INSERT and UPDATE (requires filter to be efficient)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'employment_requests',
          filter: `target_user_id=eq.${profile.id}`,
        },
        () => loadData()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'employment_requests',
          filter: `target_user_id=eq.${profile.id}`,
        },
        () => loadData()
      )
      // Listen for DELETE globally because REPLICA IDENTITY doesn't send target_user_id
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'employment_requests',
        },
        (payload) => {
          setRequests((prev) => {
            if (prev.some((r) => r.id === payload.old.id)) {
              return prev.filter((r) => r.id !== payload.old.id);
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id, loadData]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    const session = await authService.getCurrentUser();
    if (!session?.userId) throw new Error('No user session');
    const updated = await employeeProfileRepository.update(session.userId, updates);
    if (updated) setProfile(updated);
  }, []);

  const actionRequest = useCallback(
    async (id: string, action: 'accepted' | 'rejected') => {
      if (!profile?.id) throw new Error('Profile not found');

      if (action === 'accepted') {
        if (!profile.username) throw new Error('Profile username missing');
        await employmentRequestRepository.acceptEmploymentRequest(id, profile.id, profile.username);
      } else {
        await employmentRequestRepository.updateStatus(id, 'rejected');
      }
      // Refresh to update UI and fetch workspaces if needed
      await loadData(true);
    },
    [profile, loadData]
  );

  return {
    profile,
    requests,
    workspaces,
    isLoading,
    loadData,
    updateProfile,
    actionRequest,
  };
}
