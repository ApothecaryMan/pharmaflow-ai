import { useCallback, useEffect, useState } from 'react';
import type { UserProfile } from '../../../types';
import { useEmployeePortalServices } from '../context/EmployeePortalContext';

export const useEmployeeProfile = (userId: string | undefined) => {
  const { employeeProfileRepository } = useEmployeePortalServices();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await employeeProfileRepository.getById(userId);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch profile'));
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!userId) return;
      try {
        const updated = await employeeProfileRepository.update(userId, updates);
        if (updated) {
          setProfile(updated);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update profile'));
        throw err;
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profile, isLoading, error, refresh: fetchProfile, updateProfile };
};
