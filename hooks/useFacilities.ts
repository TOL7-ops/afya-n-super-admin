'use client';

/**
 * useFacilities — thin adapter over the global institutions store.
 *
 * Preserves the existing hook API so AdminShell needs no changes.
 * All reads come from the Zustand store (single source of truth).
 * All writes go through useInstitutionActions (also store-backed).
 */

import { useEffect } from 'react';
import { useInstitutionsStore } from '@/stores/institutionsStore';
import { useInstitutionActions } from '@/hooks/useInstitutionActions';
import { getAccessToken } from '@/services/authService';
import type { FacilityResponse, InstitutionCreatePayload } from '@/types/api';

export interface UseFacilitiesReturn {
  facilities: FacilityResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  suspend: (id: string, isActive: boolean) => Promise<void>;
  approve: (id: string) => Promise<void>;
  reject: (id: string) => Promise<void>;
  create: (payload: InstitutionCreatePayload) => Promise<FacilityResponse>;
  update: (
    id: string,
    body: Partial<{
      name: string; type: string; region: string;
      contact_name: string; email: string;
      license_plan: string; seats: number; contact_number: string;
    }>,
  ) => Promise<FacilityResponse>;
  extendTrial: (id: string, days?: number) => Promise<void>;
}

export function useFacilities(): UseFacilitiesReturn {
  const { institutions, loading, error, fetch, lastFetched } = useInstitutionsStore();
  const actions = useInstitutionActions();

  // Fetch on first mount if never fetched or stale (> 5 min) — only when authenticated
  useEffect(() => {
    if (!getAccessToken()) return; // no token yet — AuthGuard will redirect to /login
    const STALE_MS = 5 * 60 * 1000;
    if (!lastFetched || Date.now() - lastFetched > STALE_MS) {
      fetch();
    }
  }, [fetch, lastFetched]);

  return {
    facilities: institutions,
    loading,
    error,
    refetch: fetch,
    suspend: actions.suspend,
    approve: actions.approve,
    reject: actions.reject,
    create: actions.create,
    update: actions.update,
    extendTrial: actions.extendTrial,
  };
}
