/**
 * Institutions service — /api/v1/super-admin/institutions/*
 * Replaces the old facilities.service.ts paths.
 */
import api from '@/lib/api';
import type {
  FacilityResponse,
  InstitutionCreatePayload,
} from '@/types/api';
import { unwrapArray } from '@/utils/unwrapArray';

export interface InstitutionsListParams {
  q?: string;
  type?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

/** GET /api/v1/super-admin/institutions */
export async function listInstitutions(
  params?: InstitutionsListParams,
): Promise<FacilityResponse[]> {
  const res = await api.get<unknown>(
    '/api/v1/super-admin/institutions',
    { params: { page: 1, page_size: 200, ...params } },
  );
  return unwrapArray<FacilityResponse>(res.data, 'Institutions');
}

/** GET /api/v1/super-admin/institutions/{id} */
export async function getInstitution(id: number): Promise<FacilityResponse> {
  const res = await api.get<FacilityResponse>(`/api/v1/super-admin/institutions/${id}`);
  return res.data;
}

/**
 * POST /api/v1/super-admin/institutions
 * Body: { name, type, region, contact_name, email, phone, license_plan, seats, notes }
 */
export async function createInstitution(
  payload: InstitutionCreatePayload,
): Promise<FacilityResponse> {
  // Map legacy admin_name/admin_email fields if present
  const body: Record<string, unknown> = { ...payload };
  if ('admin_name' in body && !body.contact_name) {
    body.contact_name = body.admin_name;
    delete body.admin_name;
  }
  if ('admin_email' in body && !body.email) {
    body.email = body.admin_email;
    delete body.admin_email;
  }
  // Map legacy contact_number → phone
  if ('contact_number' in body && !body.phone) {
    body.phone = body.contact_number;
    delete body.contact_number;
  }
  const res = await api.post<FacilityResponse>('/api/v1/super-admin/institutions', body);
  return res.data;
}

/**
 * PUT /api/v1/super-admin/institutions/{id}
 * Body: { name, type, region, contact_name, email, license_plan, seats }
 */
export async function updateInstitution(
  id: number,
  body: Partial<{
    name: string;
    type: string;
    region: string;
    contact_name: string;
    email: string;
    license_plan: string;
    seats: number;
  }>,
): Promise<FacilityResponse> {
  const res = await api.put<FacilityResponse>(
    `/api/v1/super-admin/institutions/${id}`,
    body,
  );
  return res.data;
}

/**
 * PATCH /api/v1/super-admin/institutions/{id}/status
 * Body: { is_active: true | false }
 */
export async function updateInstitutionStatus(
  id: number,
  isActive: boolean,
): Promise<FacilityResponse> {
  const res = await api.patch<FacilityResponse>(
    `/api/v1/super-admin/institutions/${id}/status`,
    { is_active: isActive },
  );
  return res.data;
}

/**
 * POST /api/v1/super-admin/institutions/{id}/action
 * Body: { action: "approve" | "reject" }
 * {id} MUST be a numeric integer — backend rejects string tokens.
 */
export async function institutionAction(
  id: number,
  action: 'approve' | 'reject',
): Promise<void> {
  const res = await api.post(
    `/api/v1/super-admin/institutions/${id}/action`,
    { action },
  );
  console.log(`[institutionAction] ${action} id=${id} →`, res.status);
}

/** Convenience wrappers */
export const approveInstitution = (id: number) => institutionAction(id, 'approve');
export const rejectInstitution  = (id: number) => institutionAction(id, 'reject');

/**
 * POST /api/v1/super-admin/institutions/{id}/extend-trial
 * Body: { days: 30 }
 */
export async function extendTrial(id: number, days = 30): Promise<void> {
  await api.post(`/api/v1/super-admin/institutions/${id}/extend-trial`, { days });
}

/**
 * POST /api/v1/super-admin/institutions/{id}/resend-onboarding
 * NOTE: backend returns 404 — kept as stub, caller handles gracefully.
 */
export async function resendOnboarding(id: number): Promise<void> {
  await api.post(`/api/v1/super-admin/institutions/${id}/resend-onboarding`);
}
