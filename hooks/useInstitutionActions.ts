'use client';

/**
 * All institution write operations flow through this hook.
 * Optimistic updates fire immediately via the store.
 * API calls confirm or rollback.
 *
 * Actions route to the correct endpoint based on _entity_type:
 *   'institution' → /api/v1/super-admin/institutions/{id}/...
 *   'facility'    → /api/v1/super-admin/facilities/{id}/...
 * Records without _entity_type default to the institutions endpoint.
 */

import { useCallback } from 'react';
import { useInstitutionsStore } from '@/stores/institutionsStore';
import {
  updateInstitutionStatus,
  createInstitution,
} from '@/services/institutions.service';
import api from '@/lib/api';
import type { InstitutionCreatePayload, FacilityResponse } from '@/types/api';

/** Determine the base URL prefix for an entity based on its type tag. */
function entityBase(entityType?: 'institution' | 'facility'): string {
  // All status/action operations go through /facilities — the backend has no
  // /institutions/{id}/status endpoint (returns 404). Institution records are
  // stored as facilities in the backend DB.
  void entityType; // kept for call-site readability but routing is unified
  return '/api/v1/super-admin/facilities';
}

/** Update status (suspend/reactivate) routing to the correct endpoint. */
async function patchStatus(id: string, entityType: 'institution' | 'facility' | undefined, isActive: boolean): Promise<void> {
  // Always use /facilities/{id}/status — institutions share the same backend table
  await api.patch(`/api/v1/super-admin/facilities/${id}/status`, { is_active: isActive });
}

export function useInstitutionActions() {
  const { setStatus, removeById, upsert, fetch, institutions } = useInstitutionsStore();

  /** Look up the _entity_type for a given id from the current store. */
  const entityTypeFor = useCallback((id: string): 'institution' | 'facility' | undefined => {
    const found = institutions.find((i) => i.id === id);
    return found?._entity_type;
  }, [institutions]);

  // ── Suspend / Reactivate ─────────────────────────────────────────────────
  const suspend = useCallback(async (id: string, isActive: boolean) => {
    const entityType = entityTypeFor(id);

    // Optimistic: flip immediately
    setStatus(id, isActive);

    try {
      await patchStatus(id, entityType, isActive);
      await fetch();
    } catch (err) {
      // Rollback
      setStatus(id, !isActive);
      throw err;
    }
  }, [setStatus, fetch, entityTypeFor]);

  // ── Approve (PATCH /status true — POST /action does not persist) ─────────
  const approve = useCallback(async (id: string) => {
    const entityType = entityTypeFor(id);
    setStatus(id, true);
    try {
      await patchStatus(id, entityType, true);
      await fetch();
    } catch (err) {
      setStatus(id, false);
      throw err;
    }
  }, [setStatus, fetch, entityTypeFor]);

  // ── Reject ───────────────────────────────────────────────────────────────
  const reject = useCallback(async (id: string) => {
    const entityType = entityTypeFor(id);
    // Remove optimistically
    removeById(id);
    try {
      const base = entityBase(entityType);
      try {
        await api.post(`${base}/${id}/action`, { action: 'reject' });
      } catch {
        // Action endpoint failed — fall back to suspending
        await patchStatus(id, entityType, false);
      }
      await fetch();
    } catch {
      await fetch();
    }
  }, [removeById, fetch, entityTypeFor]);

  // ── Update ───────────────────────────────────────────────────────────────
  const update = useCallback(async (
    id: string,
    body: Partial<{
      name: string; type: string; region: string;
      contact_name: string; email: string;
      license_plan: string; seats: number; contact_number: string;
    }>,
  ): Promise<FacilityResponse> => {
    const mapped: Record<string, unknown> = {};
    if (body.name)         mapped.name         = body.name;
    if (body.type)         mapped.type         = body.type;
    if (body.region)       mapped.region       = body.region;
    if (body.contact_name) mapped.contact_name = body.contact_name;
    if (body.contact_number && !body.contact_name) mapped.contact_name = body.contact_number;
    if (body.email)        mapped.email        = body.email;
    if (body.license_plan) mapped.license_plan = body.license_plan;
    if (body.seats != null) mapped.seats       = body.seats;

    // PUT /api/v1/super-admin/facilities/{id} is the ONLY super-admin update endpoint
    // that exists in the OpenAPI spec (confirmed). There is no PUT for /institutions/.
    // Both institution and facility entities are updated through the facilities endpoint.
    const res = await api.put<FacilityResponse>(
      `/api/v1/super-admin/facilities/${id}`,
      mapped,
    );
    const updated = res.data;
    upsert(updated);
    await fetch();
    return updated;
  }, [upsert, fetch]);

  // ── Create ───────────────────────────────────────────────────────────────
  const create = useCallback(async (payload: InstitutionCreatePayload): Promise<FacilityResponse> => {
    const created = await createInstitution(payload);
    upsert(created);
    return created;
  }, [upsert]);

  // ── Extend trial ─────────────────────────────────────────────────────────
  const extendTrial = useCallback(async (id: string, days = 30) => {
    const entityType = entityTypeFor(id);
    const base = entityBase(entityType);
    await api.post(`${base}/${id}/extend-trial`, { days });
    await fetch();
  }, [fetch, entityTypeFor]);

  return { suspend, approve, reject, update, create, extendTrial };
}

