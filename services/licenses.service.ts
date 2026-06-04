/**
 * Licenses service — /api/v1/super-admin/licenses/*
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
  return unwrapArray<LicenseItem>(res.data, 'Licenses');
}

/**
 * POST /api/v1/super-admin/licenses
 * Body: { institution_name, plan, start_date, seats, payment_method, notes }
 */
export async function issueLicense(payload: IssueLicensePayload): Promise<LicenseItem> {
  const res = await api.post<LicenseItem>('/api/v1/super-admin/licenses', payload);
  return res.data;
}

/** POST /api/v1/super-admin/licenses/{id}/renew */
export async function renewLicense(id: number): Promise<void> {
  await api.post(`/api/v1/super-admin/licenses/${id}/renew`);
}

/** POST /api/v1/super-admin/licenses/{id}/send-reminder */
export async function sendLicenseReminder(id: number): Promise<void> {
  await api.post(`/api/v1/super-admin/licenses/${id}/send-reminder`);
}

/**
 * POST /api/v1/super-admin/licenses/{id}/convert-trial
 * Body: { plan, payment_method }
 */
export async function convertTrial(
  id: number,
  payload: ConvertTrialPayload,
): Promise<void> {
  await api.post(`/api/v1/super-admin/licenses/${id}/convert-trial`, payload);
}

/** POST /api/v1/super-admin/licenses/{id}/send-renewal-email */
export async function sendRenewalEmail(id: number): Promise<void> {
  await api.post(`/api/v1/super-admin/licenses/${id}/send-renewal-email`);
}

/** GET /api/v1/super-admin/revenue/export — CSV blob download */
export async function exportLicensesCsv(): Promise<void> {
  const res = await api.get('/api/v1/super-admin/revenue/export', {
    responseType: 'blob',
  });
  triggerDownload(res.data as Blob, 'afya-licenses.csv');
}
