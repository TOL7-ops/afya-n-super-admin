/**
 * Users service — /api/v1/super-admin/users/*
 * NOTE: /api/v1/users/login and /api/v1/users/register paths are NOT changed.
 */
import api from '@/lib/api';
import type { UserResponse } from '@/types/api';
import { triggerDownload } from '@/utils/download';
import { unwrapArray } from '@/utils/unwrapArray';

/** GET /api/v1/super-admin/users — facility name and last_login already resolved */
export async function listUsers(): Promise<UserResponse[]> {
  const res = await api.get<unknown>('/api/v1/super-admin/users');
  const users = unwrapArray<UserResponse>(res.data, 'Users');
  if (users.length > 0) {
    const raw = users[0] as Record<string, unknown>;
    console.log('[Users] ALL fields in raw[0]:', JSON.stringify(raw, null, 2));
    // Specifically look for any date-like fields
    const dateFields = Object.entries(raw).filter(([, v]) => typeof v === 'string' && v.includes('T'));
    console.log('[Users] Date fields:', dateFields.map(([k, v]) => `${k}: ${v}`));
  }
  return users;
}

/** GET /api/v1/super-admin/users/{id} */
export async function getUserById(userId: number): Promise<UserResponse> {
  const res = await api.get<UserResponse>(`/api/v1/super-admin/users/${userId}`);
  return res.data;
}

/**
 * PATCH /api/v1/super-admin/users/{id}/status
 * Replaces both deactivateUser() and reactivateUser() — single endpoint.
 * @param isActive true = reactivate, false = suspend
 */
export async function updateUserStatus(
  userId: number,
  isActive: boolean,
): Promise<UserResponse> {
  const res = await api.patch<UserResponse>(
    `/api/v1/super-admin/users/${userId}/status`,
    { is_active: isActive },
  );
  return res.data;
}

/** @deprecated Use updateUserStatus(id, false) */
export async function deactivateUser(userId: number): Promise<UserResponse> {
  return updateUserStatus(userId, false);
}

/** @deprecated Use updateUserStatus(id, true) */
export async function reactivateUser(userId: number): Promise<UserResponse> {
  return updateUserStatus(userId, true);
}

/**
 * Register a new platform user.
 * Path unchanged: POST /api/v1/users/register
 */
export async function registerUser(body: {
  name: string;
  email: string;
  role: string;
  facility_id: number;
}): Promise<UserResponse> {
  const res = await api.post<UserResponse>('/api/v1/users/register', {
    full_name: body.name,
    email: body.email,
    role: body.role,
    facility_id: body.facility_id,
    is_active: true,
  });
  return res.data;
}

// ─── Audit log ────────────────────────────────────────────────────────────────

import type { AgentActivityLogResponse } from '@/types/api';

/**
 * GET /api/v1/super-admin/audit-logs
 * agent_name is now resolved server-side — no client-side lookup needed.
 */
export async function listActivityLogs(
  _skip = 0,
  _limit = 100,
): Promise<AgentActivityLogResponse[]> {
  const res = await api.get<unknown>('/api/v1/super-admin/audit-logs');
  return unwrapArray<AgentActivityLogResponse>(res.data, 'AuditLogs');
}

/** GET /api/v1/super-admin/audit-logs/export — CSV blob download */
export async function exportAuditLogCsv(): Promise<void> {
  const res = await api.get('/api/v1/super-admin/audit-logs/export', {
    responseType: 'blob',
  });
  triggerDownload(res.data as Blob, 'afya-audit-log.csv');
}
