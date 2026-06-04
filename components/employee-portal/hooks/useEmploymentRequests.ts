import { useState, useCallback, useEffect } from 'react';
import type { EmploymentRequest } from '../../../types';
import { useEmployeePortalServices } from '../context/EmployeePortalContext';

export const useEmploymentRequests = (username: string | undefined) => {
  const { employmentRequestRepository } = useEmployeePortalServices();
  const [requests, setRequests] = useState<EmploymentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchRequests = useCallback(async () => {
    if (!username) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await employmentRequestRepository.getByUsername(username);
      setRequests(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch employment requests'));
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  const acceptRequest = useCallback(async (id: string, updatedBy: string) => {
    try {
      await employmentRequestRepository.acceptRequest(id, updatedBy);
      await fetchRequests();
    } catch (err) {
      throw err;
    }
  }, [fetchRequests]);

  const rejectRequest = useCallback(async (id: string, updatedBy: string) => {
    try {
      await employmentRequestRepository.rejectRequest(id, updatedBy);
      await fetchRequests();
    } catch (err) {
      throw err;
    }
  }, [fetchRequests]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  return { requests, isLoading, error, refresh: fetchRequests, acceptRequest, rejectRequest };
};
