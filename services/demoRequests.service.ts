/**
 * Demo Requests service
 *
 * GET   /api/v1/institutions/demo-requests       → returns ALL requests (no filter param)
 * PATCH /api/v1/institutions/demo-requests/{id}?new_status=Approved|Rejected
 *
 * API response shape (confirmed):
 * [{ id, name, email, organization_name, organization_type, status, created_at }]
 *
 * Client-side status filtering is done by the hook/view — not via query param.
 */
import api from '@/lib/api';
import { unwrapArray } from '@/utils/unwrapArray';
import type { DemoRequest } from '@/types/api';

const BASE = '/api/v1/institutions/demo-requests';

/** Fetch all demo requests — filter client-side by status */
export async function listDemoRequests(): Promise<DemoRequest[]> {
  const res = await api.get<unknown>(BASE, { timeout: 15000 });
  return unwrapArray<DemoRequest>(res.data, 'DemoRequests');
}

/**
 * Approve or reject a single demo request.
 * PATCH /api/v1/institutions/demo-requests/{id}?new_status=Approved|Rejected
 * Returns the updated DemoRequest (or synthesises one if the API just returns a message).
 */
export async function updateDemoRequestStatus(
  requestId: string,
  newStatus: 'Approved' | 'Rejected',
): Promise<DemoRequest> {
  const res = await api.patch<unknown>(
    `${BASE}/${requestId}`,
    null,  // no body — status goes in query param only
    { params: { new_status: newStatus }, timeout: 15000 },
  );
  const data = res.data as Record<string, unknown>;
  // If the API echoes back the updated object, use it
  if (data && typeof data === 'object' && 'id' in data) {
    return data as unknown as DemoRequest;
  }
  // Otherwise synthesise a minimal updated object so callers can proceed
  return { id: requestId, status: newStatus } as unknown as DemoRequest;
}
