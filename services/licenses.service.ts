/**
 * Subscription / License service
 *
 * ─── Architecture ─────────────────────────────────────────────────────────────
 * All subscription business operations are exposed as semantic functions.
 * Components must NEVER call performSubscriptionAction() or api.* directly.
 * When the backend introduces a proper endpoint for any operation, only this
 * file needs to change — no React component, modal, or page should require
 * modification.
 *
 * Current backend endpoints:
 *   GET   /api/v1/super-admin/subscriptions
 *   POST  /api/v1/super-admin/subscriptions          (issue new)
 *   POST  /api/v1/super-admin/subscriptions/{id}/action
 *         action: "RENEW" | "SEND_REMINDER" | "SEND_RENEWAL_EMAIL" | "CONVERT_TRIAL"
 *
 * Pending backend endpoints (tracked in MISSING_ENDPOINTS.md):
 *   PATCH /api/v1/super-admin/subscriptions/{id}     (upgrade plan)
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

// ─── Response types ────────────────────────────────────────────────────────────

export interface SubscriptionsResponse {
  total_active: number;
  total_mrr: number;
  subscriptions: LicenseItem[];
}

/** Params for upgradeSubscription() — backend-agnostic */
export interface UpgradeSubscriptionParams {
  subscriptionId: string;       // existing sub ID (if any)
  organizationName: string;     // used as fallback when no proper ID endpoint exists
  targetPlan: string;
  seats?: number;
  paymentMethod?: string;
}

/** Params for renewSubscription() */
export interface RenewSubscriptionParams {
  subscriptionId: string;
  startDate: string;            // ISO date string
  seats?: number;
  paymentMethod?: string;
}

/** Params for issueSubscription() */
export interface IssueSubscriptionParams {
  organizationName: string;
  plan: string;
  seats?: number;
  paymentMethod?: string;
}

// ─── Low-level action dispatcher (internal — not exported to components) ───────
async function _performAction(
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

// ─── Read ──────────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/super-admin/subscriptions
 * Returns KPIs + full subscription list in one call.
 *
 * Duplicate detection: logs a warning when multiple active subscriptions
 * exist for the same organisation name (backend bug — POST uses name not ID).
 */
export async function getSubscriptions(): Promise<SubscriptionsResponse> {
  const res = await api.get<unknown>('/api/v1/super-admin/subscriptions');
  const raw = res.data as Record<string, unknown>;

  const total_active = typeof raw?.total_active === 'number' ? raw.total_active : 0;
  const total_mrr    = typeof raw?.total_mrr    === 'number' ? raw.total_mrr    : 0;
  const items        = unwrapArray<LicenseItem>(raw, 'Licenses');

  // De-duplicate by exact id only — show backend data truthfully
  const seen = new Map<string, LicenseItem>();
  for (const item of items) {
    const key = String(item.id);
    if (!seen.has(key)) seen.set(key, item);
  }

  // Developer logging — detect same-name duplicates
  if (process.env.NODE_ENV !== 'production') {
    const byName = new Map<string, LicenseItem[]>();
    for (const item of seen.values()) {
      const r    = item as Record<string, unknown>;
      const name = ((r.name as string | null) ?? item.institution_name ?? '').trim().toLowerCase();
      if (!name) continue;
      if (!byName.has(name)) byName.set(name, []);
      byName.get(name)!.push(item);
    }
    for (const [name, rows] of byName.entries()) {
      if (rows.length > 1) {
        console.warn(
          '[Subscriptions] ⚠ Duplicate subscriptions for org:', name,
          '| count:', rows.length,
          '| IDs:', rows.map((r) => r.id).join(', '),
          '| Plans:', rows.map((r) => r.plan).join(', '),
          '→ Root cause: POST /subscriptions uses institution_name not institution_id',
        );
      }
    }
  }

  return { total_active, total_mrr, subscriptions: Array.from(seen.values()) };
}

/**
 * Find the best matching subscription for an organisation.
 * Prefers: active → newest start_date → first match.
 * Logs a warning if duplicates are found.
 */
export function resolveOrgSubscription(
  subscriptions: LicenseItem[],
  orgName: string,
): LicenseItem | null {
  const normalised = orgName.trim().toLowerCase();
  const matches = subscriptions.filter((s) => {
    const r    = s as Record<string, unknown>;
    const name = ((r.name as string | null) ?? s.institution_name ?? '').trim().toLowerCase();
    return name === normalised;
  });

  if (matches.length === 0) return null;

  if (matches.length > 1) {
    console.warn(
      '[Subscriptions] resolveOrgSubscription: multiple matches for', orgName,
      '| count:', matches.length,
      '| IDs:', matches.map((m) => m.id).join(', '),
    );
  }

  // Prefer active, then newest start_date
  const active = matches.filter((m) => m.is_active !== false);
  const pool   = active.length > 0 ? active : matches;
  return pool.sort((a, b) => {
    const ta = a.start_date ? new Date(a.start_date).getTime() : 0;
    const tb = b.start_date ? new Date(b.start_date).getTime() : 0;
    return tb - ta;
  })[0];
}

// ─── Write: semantic business operations ──────────────────────────────────────

/**
 * Issue a brand-new subscription for an organisation.
 * POST /api/v1/super-admin/subscriptions
 */
export async function issueSubscription(params: IssueSubscriptionParams): Promise<LicenseItem> {
  const res = await api.post<LicenseItem>('/api/v1/super-admin/subscriptions', {
    institution_name: params.organizationName.trim(),
    plan:             params.plan,
    start_date:       new Date().toISOString(),
    seats:            params.seats ?? 10,
    payment_method:   params.paymentMethod ?? 'Bank Transfer',
  });
  return res.data;
}

/**
 * Renew an existing subscription (extends expiry, preserves plan).
 * Currently: POST /subscriptions/{id}/action { action: "RENEW", ... }
 * When backend adds PATCH /subscriptions/{id}/renew, update only here.
 */
export async function renewSubscription(params: RenewSubscriptionParams): Promise<void> {
  await _performAction(params.subscriptionId, 'RENEW', {
    start_date:     params.startDate,
    payment_method: params.paymentMethod ?? 'Bank Transfer',
    ...(params.seats != null ? { seats: params.seats } : {}),
  });
}

/**
 * Upgrade a subscription to a different plan.
 *
 * ⚠ BACKEND PENDING: No dedicated upgrade endpoint exists yet.
 * Current workaround: issues a NEW subscription with the target plan.
 * When backend adds PATCH /subscriptions/{id} or POST .../action { action: "UPGRADE" },
 * update ONLY this function — no UI component needs to change.
 *
 * TODO: Replace body of this function when backend is ready.
 */
export async function upgradeSubscription(params: UpgradeSubscriptionParams): Promise<void> {
  // --- Replace this block when backend provides a proper upgrade endpoint ---
  // Future implementation (example):
  //   await api.patch(`/api/v1/super-admin/subscriptions/${params.subscriptionId}`, {
  //     plan: params.targetPlan,
  //     seats: params.seats,
  //     payment_method: params.paymentMethod,
  //   });
  // -------------------------------------------------------------------------

  // Interim: issue a new subscription row with the target plan
  console.log('[upgradeSubscription] Workaround: issuing new subscription',
    '| org:', params.organizationName,
    '| from sub:', params.subscriptionId,
    '| to plan:', params.targetPlan,
  );
  await api.post('/api/v1/super-admin/subscriptions', {
    institution_name: params.organizationName.trim(),
    plan:             params.targetPlan,
    start_date:       new Date().toISOString(),
    seats:            params.seats ?? 10,
    payment_method:   params.paymentMethod ?? 'Bank Transfer',
  });
}

/**
 * Send a renewal reminder notification to the organisation.
 * POST /subscriptions/{id}/action { action: "SEND_REMINDER" }
 */
export async function sendRenewalReminder(subscriptionId: string): Promise<void> {
  await _performAction(subscriptionId, 'SEND_REMINDER');
}

/**
 * Send a renewal email to the organisation.
 * POST /subscriptions/{id}/action { action: "SEND_RENEWAL_EMAIL" }
 */
export async function sendRenewalEmailNotification(subscriptionId: string): Promise<void> {
  await _performAction(subscriptionId, 'SEND_RENEWAL_EMAIL');
}

// ─── Deprecated — kept for backward compatibility only ────────────────────────

/** @deprecated Use issueSubscription() */
export async function issueLicense(payload: IssueLicensePayload): Promise<LicenseItem> {
  return issueSubscription({
    organizationName: payload.institution_name,
    plan:             payload.plan,
    seats:            payload.seats ?? undefined,
    paymentMethod:    payload.payment_method ?? undefined,
  });
}

/** @deprecated Use renewSubscription() or sendRenewalReminder() */
export async function performLicenseAction(
  id: string,
  action: 'RENEW' | 'SEND_REMINDER' | 'SEND_RENEWAL_EMAIL' | 'CONVERT_TRIAL',
  payload?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return _performAction(id, action, payload);
}

/** @deprecated Use sendRenewalReminder() */
export async function sendLicenseReminder(id: string): Promise<void> {
  await sendRenewalReminder(id);
}

/** @deprecated Use sendRenewalEmailNotification() */
export async function sendRenewalEmail(id: string): Promise<void> {
  await sendRenewalEmailNotification(id);
}

/** @deprecated Use getSubscriptions() */
export async function listLicenses(): Promise<LicenseItem[]> {
  const { subscriptions } = await getSubscriptions();
  return subscriptions;
}

/** @deprecated No-op stub — /summary endpoint does not exist */
export async function getLicensesSummary(): Promise<LicenseSummaryResponse> {
  console.warn('[Subscriptions] getLicensesSummary() is deprecated');
  return { active_licenses: 0, expiring_licenses: 0, seat_utilization_pct: 0, seats_active: 0 };
}

/** @deprecated Use upgradeSubscription() */
export async function convertTrial(
  id: string | number,
  payload: ConvertTrialPayload,
): Promise<void> {
  await _performAction(String(id), 'CONVERT_TRIAL',
    payload as unknown as Record<string, unknown>);
}

/** CSV export */
export async function exportLicensesCsv(): Promise<void> {
  const res = await api.get('/api/v1/super-admin/revenue/export', { responseType: 'blob' });
  triggerDownload(res.data as Blob, 'afya-licenses.csv');
}
