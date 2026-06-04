/**
 * Settings service — /api/v1/super-admin/settings/*
 */
import api from '@/lib/api';
import { unwrapArray } from '@/utils/unwrapArray';
import type {
  WhatsAppSettingsResponse,
  ComplianceSettingsResponse,
  PermissionRoleItem,
} from '@/types/api';

// ─── WhatsApp ─────────────────────────────────────────────────────────────────

/** GET /api/v1/super-admin/settings/whatsapp */
export async function getWhatsAppSettings(): Promise<WhatsAppSettingsResponse> {
  const res = await api.get<WhatsAppSettingsResponse>(
    '/api/v1/super-admin/settings/whatsapp',
  );
  return res.data;
}

/**
 * PUT /api/v1/super-admin/settings/whatsapp
 * Body: { provider, api_key, webhook_url }
 */
export async function updateWhatsAppSettings(
  body: { provider: string; api_key: string; webhook_url: string },
): Promise<WhatsAppSettingsResponse> {
  const res = await api.put<WhatsAppSettingsResponse>(
    '/api/v1/super-admin/settings/whatsapp',
    body,
  );
  return res.data;
}

// ─── Compliance ───────────────────────────────────────────────────────────────

/** GET /api/v1/super-admin/settings/compliance */
export async function getComplianceSettings(): Promise<ComplianceSettingsResponse> {
  const res = await api.get<ComplianceSettingsResponse>(
    '/api/v1/super-admin/settings/compliance',
  );
  return res.data;
}

/**
 * PUT /api/v1/super-admin/settings/compliance
 * Body: { consent_required, data_retention_days }
 */
export async function updateComplianceSettings(
  body: { consent_required: boolean; data_retention_days: number },
): Promise<ComplianceSettingsResponse> {
  const res = await api.put<ComplianceSettingsResponse>(
    '/api/v1/super-admin/settings/compliance',
    body,
  );
  return res.data;
}

// ─── Permissions ──────────────────────────────────────────────────────────────

/** GET /api/v1/super-admin/settings/permissions */
export async function getPermissions(): Promise<PermissionRoleItem[]> {
  const res = await api.get<unknown>('/api/v1/super-admin/settings/permissions');
  return unwrapArray<PermissionRoleItem>(res.data, 'Permissions');
}
