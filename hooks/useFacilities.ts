'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listInstitutions,
  createInstitution,
  updateInstitution,
  updateInstitutionStatus,
  approveInstitution,
  rejectInstitution,
  extendTrial,
} from '@/services/institutions.service';
import type { FacilityResponse, InstitutionCreatePayload, InstitutionCreateResponse } from '@/types/api';

export interface UseFacilitiesReturn {
  facilities: FacilityResponse[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  /** suspend(id, false) = suspend, suspend(id, true) = reactivate/approve */
  suspend: (id: number, isActive: boolean) => Promise<void>;
  /** Approve a pending institution */
  approve: (id: number) => Promise<void>;
  /** Reject a pending institution */
  reject: (id: number) => Promise<void>;
  /** Create a new institution */
  create: (payload: InstitutionCreatePayload) => Promise<FacilityResponse>;
  /** Update editable fields */
  update: (
    id: number,
    body: Partial<{
      name: string;
      type: string;
      region: string;
      contact_name: string;
      email: string;
      license_plan: string;
      seats: number;
      // Legacy alias
      contact_number: string;
    }>,
  ) => Promise<FacilityResponse>;
  /** Extend trial by N days */
  extendTrial: (id: number, days?: number) => Promise<void>;
}

export function useFacilities(): UseFacilitiesReturn {
  const [facilities, setFacilities] = useState<FacilityResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listInstitutions();
      setFacilities(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load institutions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const suspend = useCallback(async (id: number, isActive: boolean) => {
    // Optimistic update — flip status immediately for instant UI feedback
    setFacilities((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, is_active: isActive, status: isActive ? 'Active' : 'Suspended' }
          : f,
      ),
    );
    try {
      const updated = await updateInstitutionStatus(id, isActive);
      // Merge API response onto the existing object so display fields are preserved.
      // The PATCH /status response only returns core fields, not field_workers_count
      // total_screened, license_expiry etc. We keep those from local state.
      setFacilities((prev) =>
        prev.map((f) => {
          if (f.id !== id) return f;
          return {
            ...f,                          // existing display fields
            ...updated,                    // server truth for is_active, status, etc.
            // Re-pin display-only fields that the PATCH response strips out
            field_workers_count: f.field_workers_count,
            total_screened:      f.total_screened,
            license_expiry:      f.license_expiry      ?? updated.license_expiry,
            license_expires_at:  f.license_expires_at  ?? updated.license_expires_at,
            type:                f.type                ?? updated.type,
            region:              f.region              ?? updated.region,
          };
        }),
      );
    } catch (err) {
      // Revert optimistic update — restore previous state
      setFacilities((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, is_active: !isActive, status: !isActive ? 'Active' : 'Suspended' }
            : f,
        ),
      );
      throw err;
    }
  }, []);

  const approve = useCallback(async (id: number) => {
    await approveInstitution(id);
    await fetchAll();
  }, [fetchAll]);

  const reject = useCallback(async (id: number) => {
    await rejectInstitution(id);
    setFacilities((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const create = useCallback(async (payload: InstitutionCreatePayload) => {
    const created = await createInstitution(payload);
    setFacilities((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(
    async (
      id: number,
      body: Partial<{
        name: string;
        type: string;
        region: string;
        contact_name: string;
        email: string;
        license_plan: string;
        seats: number;
        contact_number: string;
      }>,
    ) => {
      // Map legacy contact_number → contact_name if caller uses old field name
      const mapped: Parameters<typeof updateInstitution>[1] = {};
      if (body.name) mapped.name = body.name;
      if (body.type) mapped.type = body.type;
      if (body.region) mapped.region = body.region;
      if (body.contact_name) mapped.contact_name = body.contact_name;
      // Legacy: contact_number was used for contact name in old code
      if (body.contact_number && !body.contact_name) mapped.contact_name = body.contact_number;
      if (body.email) mapped.email = body.email;
      if (body.license_plan) mapped.license_plan = body.license_plan;
      if (body.seats != null) mapped.seats = body.seats;

      const updated = await updateInstitution(id, mapped);
      // Merge onto existing — preserve display-only fields the PUT doesn't return
      setFacilities((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, ...updated, field_workers_count: f.field_workers_count, total_screened: f.total_screened }
            : f,
        ),
      );
      return updated;
    },
    [],
  );

  const extend = useCallback(async (id: number, days = 30) => {
    await extendTrial(id, days);
    await fetchAll();
  }, [fetchAll]);

  return {
    facilities,
    loading,
    error,
    refetch: fetchAll,
    suspend,
    approve,
    reject,
    create,
    update,
    extendTrial: extend,
  };
}
