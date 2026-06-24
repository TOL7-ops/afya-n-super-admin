/**
 * Institutions service — /api/v1/super-admin/institutions/* and /api/v1/super-admin/facilities/*
 *
 * ─── OpenAPI confirmation (read from craw.md / live Swagger) ──────────────────
 * POST /api/v1/super-admin/institutions  — registers an Institution (NGO/programme)
 *   body: InstitutionRegistrationRequest
 *   { name, city?, state_region?, contact_name, email, phone?,
 *     license_plan (default "Standard"), seats (default 1), notes? }
 *   returns: {} (no id in response — opaque)
 *
 * POST /api/v1/super-admin/facilities    — registers a clinical Facility (hospital/clinic)
 *   body: FacilityRegistrationRequest
 *   { name, type, region, contact_name, email, phone?,
 *     license_plan (default "30-day Free Trial"), seats (default 10), notes? }
 *   returns: {} (no id in response — opaque)
 *
 * These are TWO SEPARATE records. Registering an institution does NOT auto-create a facility.
 * The CreateInstitutionModal now collects both sets of fields as a two-step flow.
 * ──────────────────────────────────────────────────────────────────────────────
 */
import api from '@/lib/api';
import type {
  FacilityResponse,
  InstitutionCreatePayload,
  InstitutionCreateResponse,
} from '@/types/api';
import { unwrapArray } from '@/utils/unwrapArray';

export interface InstitutionsListParams {
  q?: string;
  type?: string;
  status?: string;
  page?: number;
  page_size?: number;
}

// ─── New request types from OpenAPI spec ──────────────────────────────────────

/** Body for POST /api/v1/super-admin/institutions */
export interface InstitutionRegistrationRequest {
  name: string;
  city?: string | null;
  state_region?: string | null;
  contact_name: string;
  email: string;
  phone?: string | null;
  license_plan?: string;   // default "Standard"
  seats?: number;          // default 1
  notes?: string | null;
}

/** Body for POST /api/v1/super-admin/facilities */
export interface FacilityRegistrationRequest {
  name: string;
  type: string;
  region: string;
  contact_name: string;
  email: string;
  phone?: string | null;
  license_plan?: string;   // default "30-day Free Trial"
  seats?: number;          // default 10
  notes?: string | null;
}

// ─── List / Get ───────────────────────────────────────────────────────────────

/** GET /api/v1/super-admin/institutions */
export async function listInstitutions(
  params?: InstitutionsListParams,
): Promise<FacilityResponse[]> {
  const res = await api.get<unknown>(
    '/api/v1/super-admin/institutions',
    { params: { page: 1, page_size: 200, ...params } },
  );

  const raw = res.data;

  let institutions: FacilityResponse[];
  if (Array.isArray(raw)) {
    institutions = raw as FacilityResponse[];
  } else if (raw && typeof raw === 'object') {
    const d = raw as Record<string, unknown>;
    console.log('[Institutions] Response keys:', Object.keys(d));
    institutions = (
      Array.isArray(d['data'])          ? d['data'] :
      Array.isArray(d['institutions'])  ? d['institutions'] :
      Array.isArray(d['items'])         ? d['items'] :
      Array.isArray(d['results'])       ? d['results'] :
      []
    ) as FacilityResponse[];
  } else {
    institutions = [];
  }

  if (institutions.length > 0) {
    console.log('[Institutions] count:', institutions.length);
    console.log('[Institutions] raw[0] keys:', Object.keys(institutions[0] as object));
    console.log('[Institutions] raw[0]:', JSON.stringify(institutions[0], null, 2));

    institutions = institutions.map((inst) => {
      const raw = inst as unknown as Record<string, unknown>;
      const rawActive = raw['is_active'] ?? raw['active'];
      const apiStatus = ((raw['status'] as string) ?? '').toLowerCase().trim();
      const isActive =
        apiStatus === 'suspended'
          ? false
          : rawActive === undefined || rawActive === null
          ? true
          : rawActive === true || rawActive === 'true' || rawActive === 1;

      console.log(`[Institutions] id=${inst.id} name="${inst.name}" status="${raw['status']}" is_active raw="${String(rawActive)}" → ${isActive}`);

      return { ...inst, is_active: isActive };
    });
  } else {
    console.warn('[Institutions] Empty list — raw response:', JSON.stringify(raw).slice(0, 300));
  }
  return institutions;
}

/** GET /api/v1/super-admin/institutions/{id} */
export async function getInstitution(id: string): Promise<FacilityResponse> {
  const res = await api.get<FacilityResponse>(`/api/v1/super-admin/institutions/${id}`);
  return res.data;
}

/**
 * GET /api/v1/super-admin/facilities
 * Returns only clinical facility records (hospitals, clinics, pharmacies).
 * For the combined list (NGOs + facilities) use listAllEntities().
 */
export async function listFacilities(
  params?: InstitutionsListParams,
): Promise<FacilityResponse[]> {
  const res = await api.get<unknown>(
    '/api/v1/super-admin/facilities',
    { params: { page: 1, page_size: 200, ...params } },
  );
  const raw = res.data;
  let facilities: FacilityResponse[];
  if (Array.isArray(raw)) {
    facilities = raw as FacilityResponse[];
  } else if (raw && typeof raw === 'object') {
    const d = raw as Record<string, unknown>;
    facilities = (
      Array.isArray(d['data'])       ? d['data'] :
      Array.isArray(d['facilities']) ? d['facilities'] :
      Array.isArray(d['items'])      ? d['items'] :
      Array.isArray(d['results'])    ? d['results'] :
      []
    ) as FacilityResponse[];
  } else {
    facilities = [];
  }
  return facilities.map((f) => ({
    ...f,
    _entity_type: 'facility' as const,
    is_active: (() => {
      const r = f as unknown as Record<string, unknown>;
      const apiStatus = ((r['status'] as string) ?? '').toLowerCase().trim();
      if (apiStatus === 'suspended') return false;
      const v = r['is_active'] ?? r['active'];
      return v === undefined || v === null ? true : v === true || v === 'true' || v === 1;
    })(),
  }));
}

/**
 * Fetch both institutions AND facilities and return a combined, tagged array.
 * Use this everywhere the UI must show the full combined list.
 * Each record includes _entity_type: 'institution' | 'facility'.
 */
export async function listAllEntities(
  params?: InstitutionsListParams,
): Promise<FacilityResponse[]> {
  const [instList, facList] = await Promise.all([
    listInstitutions(params).catch(() => [] as FacilityResponse[]),
    listFacilities(params).catch(() => [] as FacilityResponse[]),
  ]);
  // listInstitutions doesn't tag — add tag here
  const taggedInst = instList.map((i) => ({ ...i, _entity_type: 'institution' as const }));
  // listFacilities already tags as 'facility'
  return [...taggedInst, ...facList];
}

// ─── Create (new two-step flow) ───────────────────────────────────────────────

/**
 * POST /api/v1/super-admin/institutions
 * Step 1 of the two-step registration flow.
 * Registers an Institution (NGO/programme/employer).
 * Returns {} — no id in response.
 */
export async function registerInstitution(
  body: InstitutionRegistrationRequest,
): Promise<void> {
  await api.post('/api/v1/super-admin/institutions', body);
}

/**
 * POST /api/v1/super-admin/facilities
 * Step 2 of the two-step registration flow.
 * Registers a clinical Facility (hospital, clinic, pharmacy, etc.).
 * Returns {} — no id in response.
 */
export async function registerFacility(
  body: FacilityRegistrationRequest,
): Promise<void> {
  await api.post('/api/v1/super-admin/facilities', body);
}

/**
 * @deprecated — backend split this into registerInstitution() + registerFacility().
 * Remove once all call sites are updated.
 * Kept temporarily so EmailPreviewModal's onSent callback continues to compile.
 */
export async function createInstitution(
  payload: InstitutionCreatePayload,
): Promise<InstitutionCreateResponse> {
  const body: Record<string, unknown> = { ...payload };
  if ('admin_name' in body && !body.contact_name) {
    body.contact_name = body.admin_name;
    delete body.admin_name;
  }
  if ('admin_email' in body && !body.email) {
    body.email = body.admin_email;
    delete body.admin_email;
  }
  if ('contact_number' in body && !body.phone) {
    body.phone = body.contact_number;
    delete body.contact_number;
  }
  const res = await api.post<InstitutionCreateResponse>('/api/v1/super-admin/institutions', body);
  return res.data;
}

// ─── Update ───────────────────────────────────────────────────────────────────

/**
 * PUT /api/v1/super-admin/institutions/{id}
 * Body: { name, type, region, contact_name, email, license_plan, seats }
 */
export async function updateInstitution(
  id: string,
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
  id: string,
  isActive: boolean,
): Promise<FacilityResponse> {
  const res = await api.patch<FacilityResponse>(
    `/api/v1/super-admin/institutions/${id}/status`,
    { is_active: isActive },
  );
  const data = res.data as unknown as Record<string, unknown>;
  const rawActive = data['is_active'] ?? data['active'];
  const normActive =
    rawActive === undefined || rawActive === null
      ? isActive
      : rawActive === true || rawActive === 'true' || rawActive === 1;

  console.log(`[updateStatus] id=${id} sent is_active=${isActive} → response is_active raw="${String(rawActive)}" normalised=${normActive}`);

  return { ...res.data, is_active: normActive };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/super-admin/institutions/{id}/action
 * Body: { action: "approve" | "reject" }
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
 * NOTE: backend returns 404 for unclaimed tokens — caller handles gracefully.
 */
export async function resendOnboarding(id: number): Promise<void> {
  await api.post(`/api/v1/super-admin/institutions/${id}/resend-onboarding`);
}
