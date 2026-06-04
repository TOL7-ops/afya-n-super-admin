/**
 * Analytics service — /api/v1/super-admin/dashboard/* and /analytics/*
 * All 26 endpoints are live and tested on the super-admin API.
 */
import api from '@/lib/api';
import { triggerDownload } from '@/utils/download';
import { unwrapArray } from '@/utils/unwrapArray';
import type {
  DashboardSummaryResponse,
  ScreeningsTrendResponse,
  BpDistributionResponse,
  PendingApprovalItem,
  TopInstitutionItem,
  AnalyticsSummaryResponse,
  AnalyticsBreakdownsResponse,
  InstitutionPerformanceItem,
} from '@/types/api';

// ─── Dashboard endpoints ──────────────────────────────────────────────────────

/** GET /api/v1/super-admin/dashboard/summary */
export async function getDashboardSummary(): Promise<DashboardSummaryResponse> {
  const res = await api.get<DashboardSummaryResponse>(
    '/api/v1/super-admin/dashboard/summary',
  );
  return res.data;
}

/** GET /api/v1/super-admin/dashboard/screenings-trend */
export async function getScreeningsTrend(): Promise<ScreeningsTrendResponse> {
  const res = await api.get<ScreeningsTrendResponse>(
    '/api/v1/super-admin/dashboard/screenings-trend',
  );
  return res.data;
}

/** GET /api/v1/super-admin/dashboard/bp-distribution */
export async function getBpDistribution(): Promise<BpDistributionResponse> {
  const res = await api.get<BpDistributionResponse>(
    '/api/v1/super-admin/dashboard/bp-distribution',
  );
  return res.data;
}

/** GET /api/v1/super-admin/dashboard/pending-approvals */
export async function getPendingApprovals(): Promise<PendingApprovalItem[]> {
  const res = await api.get<unknown>('/api/v1/super-admin/dashboard/pending-approvals');
  return unwrapArray<PendingApprovalItem>(res.data, 'PendingApprovals');
}

/** GET /api/v1/super-admin/dashboard/top-institutions */
export async function getTopInstitutions(): Promise<TopInstitutionItem[]> {
  const res = await api.get<unknown>('/api/v1/super-admin/dashboard/top-institutions');
  return unwrapArray<TopInstitutionItem>(res.data, 'TopInstitutions');
}

/** GET /api/v1/super-admin/dashboard/export-report — CSV download */
export async function exportDashboardReport(): Promise<void> {
  const res = await api.get('/api/v1/super-admin/dashboard/export-report', {
    responseType: 'blob',
  });
  triggerDownload(res.data as Blob, 'afya-dashboard-report.csv');
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
 * Returns ALL chart data in one call: region, age, gender, risk trend, detection trend.
 */
export async function getAnalyticsBreakdowns(): Promise<AnalyticsBreakdownsResponse> {
  const res = await api.get<AnalyticsBreakdownsResponse>(
    '/api/v1/super-admin/analytics/breakdowns',
  );
  return res.data;
}

/** GET /api/v1/super-admin/analytics/institutions-performance */
export async function getInstitutionsPerformance(): Promise<InstitutionPerformanceItem[]> {
  const res = await api.get<unknown>('/api/v1/super-admin/analytics/institutions-performance');
  return unwrapArray<InstitutionPerformanceItem>(res.data, 'InstitutionsPerformance');
}

/** GET /api/v1/super-admin/analytics/export — CSV download */
export async function exportAnalytics(): Promise<void> {
  const res = await api.get('/api/v1/super-admin/analytics/export', {
    responseType: 'blob',
  });
  triggerDownload(res.data as Blob, 'afya-analytics.csv');
}

// ─── Legacy aliases (kept for any remaining callers) ─────────────────────────

/** @deprecated Use exportAnalytics() */
export async function exportAnalyticsCsv(): Promise<void> {
  return exportAnalytics();
}

/** @deprecated Use exportAnalytics() */
export function downloadCsv(_csvContent: string, filename = 'afya-export.csv'): void {
  console.warn('[analytics.service] downloadCsv is deprecated — use exportAnalytics()');
  void filename;
}
