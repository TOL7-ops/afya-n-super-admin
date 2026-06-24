/**
 * Analytics service
 *
 * BREAKING CHANGE (June 2026):
 *   Dashboard is now ONE endpoint: GET /api/v1/super-admin/dashboard
 *   The 5 sub-endpoints (summary, screenings-trend, bp-distribution,
 *   pending-approvals, top-institutions) no longer exist.
 *   Use getDashboard() with the ?include= param instead.
 *
 *   Old sub-endpoint functions are kept as @deprecated aliases so
 *   existing callers continue to compile while they migrate.
 */
import api from '@/lib/api';
import { triggerDownload } from '@/utils/download';
import { unwrapArray } from '@/utils/unwrapArray';
import type {
  DashboardResponse,
  DashboardSummaryResponse,
  ScreeningsTrendResponse,
  BpDistributionResponse,
  PendingApprovalItem,
  TopInstitutionItem,
  AnalyticsSummaryResponse,
  AnalyticsBreakdownsResponse,
  InstitutionPerformanceItem,
} from '@/types/api';

// ─── Dashboard — unified endpoint ─────────────────────────────────────────────

/**
 * GET /api/v1/super-admin/dashboard
 * Returns all dashboard widgets in one response.
 * Pass ?include= to limit which widgets are returned, e.g.
 *   getDashboard('summary,pending_approvals')
 */
export async function getDashboard(include?: string): Promise<DashboardResponse> {
  const params = include ? { include } : {};
  const res = await api.get<DashboardResponse>('/api/v1/super-admin/dashboard', {
    params,
    timeout: 90000,
  });
  return res.data;
}

/** GET /api/v1/super-admin/dashboard/export-report — CSV download */
export async function exportDashboardReport(): Promise<void> {
  const res = await api.get('/api/v1/super-admin/dashboard/export-report', {
    responseType: 'blob',
  });
  triggerDownload(res.data as Blob, 'afya-dashboard-report.csv');
}

// ─── Deprecated dashboard sub-endpoint wrappers ───────────────────────────────
// These call the new unified endpoint and pluck the relevant widget.
// They exist only for backward compatibility — migrate callers to getDashboard().

/** @deprecated Use getDashboard() — sub-endpoints removed in June 2026 */
export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const data = await getDashboard('summary');
  const s = data.summary;
  return s ?? { active_institutions: 0, institutions_increment: 0, total_screened: 0, on_active_treatment: 0 };
}

/** @deprecated Use getDashboard() */
export async function getScreeningsTrend(): Promise<ScreeningsTrendResponse> {
  const data = await getDashboard('screenings_trend');
  const t = data.screenings_trend;
  return t ?? { months: [], screenings: [] };
}

/** @deprecated Use getDashboard() */
export async function getBpDistribution(): Promise<BpDistributionResponse> {
  const data = await getDashboard('bp_distribution');
  const b = data.bp_distribution;
  return b ?? { normal_pct: 0, elevated_pct: 0, stage_1_2_pct: 0, crisis_pct: 0 };
}

/** @deprecated Use getDashboard() */
export async function getPendingApprovals(): Promise<PendingApprovalItem[]> {
  const data = await getDashboard('pending_approvals');
  return data.pending_approvals ?? [];
}

/** @deprecated Use getDashboard() */
export async function getTopInstitutions(): Promise<TopInstitutionItem[]> {
  const data = await getDashboard('top_institutions');
  return data.top_institutions ?? [];
}

// ─── Analytics page endpoints ─────────────────────────────────────────────────

/** GET /api/v1/super-admin/analytics/summary */
export async function getAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
  const res = await api.get<AnalyticsSummaryResponse>(
    '/api/v1/super-admin/analytics/summary',
  );
  return res.data;
}

/**
 * GET /api/v1/super-admin/analytics/breakdowns
 * Returns ALL chart data in one call.
 */
export async function getAnalyticsBreakdowns(): Promise<AnalyticsBreakdownsResponse> {
  const res = await api.get<AnalyticsBreakdownsResponse>(
    '/api/v1/super-admin/analytics/breakdowns',
  );
  return res.data;
}

/** GET /api/v1/super-admin/analytics/institutions-performance */
export async function getInstitutionsPerformance(): Promise<InstitutionPerformanceItem[]> {
  const res = await api.get<unknown>('/api/v1/super-admin/analytics/institutions-performance', {
    timeout: 90000,
  });
  return unwrapArray<InstitutionPerformanceItem>(res.data, 'InstitutionsPerformance');
}

/** GET /api/v1/super-admin/analytics/export — CSV download */
export async function exportAnalytics(): Promise<void> {
  const res = await api.get('/api/v1/super-admin/analytics/export', {
    responseType: 'blob',
  });
  triggerDownload(res.data as Blob, 'afya-analytics.csv');
}

/** @deprecated Use exportAnalytics() */
export async function exportAnalyticsCsv(): Promise<void> {
  return exportAnalytics();
}

/** @deprecated Use exportAnalytics() */
export function downloadCsv(_csvContent: string, filename = 'afya-export.csv'): void {
  console.warn('[analytics.service] downloadCsv is deprecated — use exportAnalytics()');
  void filename;
}
