/**
 * Licenses service
 *
 * Endpoint migration (backend renamed all /licenses/* → /subscriptions/*):
 *   GET  /api/v1/super-admin/subscriptions   ← returns { total_active, total_mrr, subscriptions: [...] }
 *   POST /api/v1/super-admin/subscriptions/{id}/action
 *
 * Real response shape (confirmed from browser logs):
 * {
 *   "total_active": 27,
 *   "total_mrr": 0,
 *   "subscriptions": [
 *     { id, type, name, plan, expires_at, is_active, seats_limit, seats_used }
 *   ]
 * }
 *
 * NOTE: /subscriptions/summary does NOT exist — KPIs come from the list endpoint.
 */
import api from '@/lib/api';
import { triggerDownload } from '@/utils/download';
import { unwrapArray } from '@/utils/unwrapArray';
import type {
  LicenseSummaryResponse,
  LicenseItem,
  IssueLicensePayload,
  ConvertTrialPayload,
} from '@/types/api';

export interface SubscriptionsResponse {
  total_active: number;
  total_mrr: number;
  subscriptions: LicenseItem[];
}

/**
 * GET /api/v1/super-admin/subscriptions
 * Returns both the KPI header values AND the full subscription list.
 * Use this instead of calling list + summary separately.
 */
export async function getSubscriptions(): Promise<SubscriptionsResponse> {
  const res = await api.get<unknown>('/api/v1/super-admin/subscriptions');
  const raw = res.data as Record<string, unknown>;

  const total_active = typeof raw?.total_active === 'number' ? raw.total_active : 0;
  const total_mrr    = typeof raw?.total_mrr    === 'number' ? raw.total_mrr    : 0;
  const items        = unwrapArray<LicenseItem>(raw, 'Licenses');

  // De-duplicate by id
  const seen = new Map<string, LicenseItem>();
  for (const item of items) {
    const key = String(item.id);
    if (!seen.has(key)) seen.set(key, item);
  }

  return {
    total_active,
    total_mrr,
    subscriptions: Array.from(seen.values()),
  };
}

/**
 * @deprecated Kept for backward compatibility — use getSubscriptions() instead.
 * GET /api/v1/super-admin/subscriptions (list only, no KPIs)
 */
export async function listLicenses(): Promise<LicenseItem[]> {
  try {
    const { subscriptions } = await getSubscriptions();
    return subscriptions;
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } }).response?.status;
    if (status === 404) {
      console.warn('[Licenses] subscriptions list not found — returning empty list');
      return [];
    }
    throw err;
  }
}

/**
 * @deprecated The /summary endpoint does not exist.
 * KPIs now come from getSubscriptions().total_active / total_mrr.
 * This stub is kept so old call sites don't break at compile time.
 */
export async function getLicensesSummary(): Promise<LicenseSummaryResponse> {
  console.warn('[Licenses] getLicensesSummary() is deprecated — use getSubscriptions() instead');
  return { active_licenses: 0, expiring_licenses: 0, seat_utilization_pct: 0, seats_active: 0 };
}

/**
 * POST /api/v1/super-admin/subscriptions (issue new subscription)
 */
export async function issueLicense(payload: IssueLicensePayload): Promise<LicenseItem> {
  const res = await api.post<LicenseItem>('/api/v1/super-admin/subscriptions', payload);
  return res.data;
}

/**
 * POST /api/v1/super-admin/subscriptions/{id}/action
 * action: "RENEW" | "SEND_REMINDER" | "SEND_RENEWAL_EMAIL" | "CONVERT_TRIAL"
 */
export async function performLicenseAction(
  id: string,
  action: 'RENEW' | 'SEND_REMINDER' | 'SEND_RENEWAL_EMAIL' | 'CONVERT_TRIAL',
  payload?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await api.post<Record<string, unknown>>(
    `/api/v1/super-admin/subscriptions/${id}/action`,
    { action, payload: payload ?? null },
  );
  return res.data ?? {};
}

/** @deprecated Use performLicenseAction(id, 'RENEW') */
export async function renewLicense(id: string): Promise<Record<string, unknown>> {
  return performLicenseAction(id, 'RENEW');
}

/** @deprecated Use performLicenseAction(id, 'SEND_REMINDER') */
export async function sendLicenseReminder(id: string): Promise<void> {
  await performLicenseAction(id, 'SEND_REMINDER');
}

/** @deprecated Use performLicenseAction(id, 'CONVERT_TRIAL', { plan, payment_method }) */
export async function convertTrial(
  id: string | number,
  payload: ConvertTrialPayload,
): Promise<void> {
  await performLicenseAction(String(id), 'CONVERT_TRIAL', payload as unknown as Record<string, unknown>);
}

/** @deprecated Use performLicenseAction(id, 'SEND_RENEWAL_EMAIL') */
export async function sendRenewalEmail(id: string): Promise<void> {
  await performLicenseAction(id, 'SEND_RENEWAL_EMAIL');
}

/** CSV export */
export async function exportLicensesCsv(): Promise<void> {
  const res = await api.get('/api/v1/super-admin/revenue/export', {
    responseType: 'blob',
  });
  triggerDownload(res.data as Blob, 'afya-licenses.csv');
}
