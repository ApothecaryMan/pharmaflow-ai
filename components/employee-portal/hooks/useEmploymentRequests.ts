import { useCallback, useEffect, useState } from 'react';
import type { EmploymentRequest } from '../../../types';
import { useEmployeePortalServices } from '../context/EmployeePortalContext';

export const useEmploymentRequests = (userId: string | undefined) => {
  const { employmentRequestRepository } = useEmployeePortalServices();
  const [requests, setRequests] = useState<EmploymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!userId) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await employmentRequestRepository.getByUserId(userId);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch employment requests'));
    } finally {
      setIsLoading(false);
    }
  }, [userId, employmentRequestRepository]);

  const acceptRequest = useCallback(
    async (id: string, updatedBy: string) => {
      await employmentRequestRepository.acceptRequest(id, updatedBy);
      await fetchRequests();
    },
    [fetchRequests, employmentRequestRepository]
  );

  const rejectRequest = useCallback(
    async (id: string, updatedBy: string) => {
      await employmentRequestRepository.rejectRequest(id, updatedBy);
      await fetchRequests();
    },
    [fetchRequests, employmentRequestRepository]
  );

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return { requests, isLoading, error, refresh: fetchRequests, acceptRequest, rejectRequest };
};
