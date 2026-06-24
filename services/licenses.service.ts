/**
 * Licenses service — /api/v1/super-admin/licenses/*
 *
 * BREAKING CHANGE (June 2026):
 *   All license IDs are now UUID strings.
 *   The 4 separate action endpoints have been consolidated into one:
 *     POST /api/v1/super-admin/licenses/{id}/action
 *     body: { action: "RENEW"|"SEND_REMINDER"|"SEND_RENEWAL_EMAIL"|"CONVERT_TRIAL", payload? }
 *
 *   Old individual functions are kept as thin wrappers around performLicenseAction()
 *   so existing call sites continue to work without changes.
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

/** GET /api/v1/super-admin/licenses/summary */
export async function getLicensesSummary(): Promise<LicenseSummaryResponse> {
  const res = await api.get<LicenseSummaryResponse>('/api/v1/super-admin/licenses/summary');
  return res.data;
}

/** GET /api/v1/super-admin/licenses */
export async function listLicenses(): Promise<LicenseItem[]> {
  const res = await api.get<unknown>('/api/v1/super-admin/licenses');
  const raw = unwrapArray<LicenseItem>(res.data, 'Licenses');

  // De-duplicate by license id
  const seen = new Map<string, LicenseItem>();
  for (const item of raw) {
    const key = String(item.id);
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return Array.from(seen.values());
}

/**
 * POST /api/v1/super-admin/licenses
 * Body: { institution_name, plan, start_date, seats, payment_method, notes }
 */
export async function issueLicense(payload: IssueLicensePayload): Promise<LicenseItem> {
  const res = await api.post<LicenseItem>('/api/v1/super-admin/licenses', payload);
  return res.data;
}

/**
 * POST /api/v1/super-admin/licenses/{id}/action
 * Consolidated action endpoint (June 2026).
 * action: "RENEW" | "SEND_REMINDER" | "SEND_RENEWAL_EMAIL" | "CONVERT_TRIAL"
 */
export async function performLicenseAction(
  id: string,
  action: 'RENEW' | 'SEND_REMINDER' | 'SEND_RENEWAL_EMAIL' | 'CONVERT_TRIAL',
  payload?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const res = await api.post<Record<string, unknown>>(
    `/api/v1/super-admin/licenses/${id}/action`,
    { action, payload: payload ?? null },
  );
  return res.data ?? {};
}

/**
 * Renew a license.
 * @deprecated Use performLicenseAction(id, 'RENEW') — kept for backward compat.
 */
export async function renewLicense(id: string): Promise<Record<string, unknown>> {
  return performLicenseAction(id, 'RENEW');
}

/**
 * Send a renewal reminder.
 * @deprecated Use performLicenseAction(id, 'SEND_REMINDER')
 */
export async function sendLicenseReminder(id: string): Promise<void> {
  await performLicenseAction(id, 'SEND_REMINDER');
}

/**
 * Convert a trial license to paid.
 * @deprecated Use performLicenseAction(id, 'CONVERT_TRIAL', { plan, payment_method })
 */
export async function convertTrial(
  id: string | number,
  payload: ConvertTrialPayload,
): Promise<void> {
  await performLicenseAction(String(id), 'CONVERT_TRIAL', payload as unknown as Record<string, unknown>);
}

/**
 * Send a renewal email.
 * @deprecated Use performLicenseAction(id, 'SEND_RENEWAL_EMAIL')
 */
export async function sendRenewalEmail(id: string): Promise<void> {
  await performLicenseAction(id, 'SEND_RENEWAL_EMAIL');
}

/** CSV export — still uses revenue export endpoint */
export async function exportLicensesCsv(): Promise<void> {
  const res = await api.get('/api/v1/super-admin/revenue/export', {
    responseType: 'blob',
  });
  triggerDownload(res.data as Blob, 'afya-licenses.csv');
}
