/**
 * Revenue service
 *
 * BREAKING CHANGE (June 2026):
 *   Revenue KPI data moved to GET /api/v1/analytics/revenue
 *   Transactions still at GET /api/v1/super-admin/revenue/transactions
 *   Transactions CSV: same endpoint with ?format=csv
 *
 * Old individual endpoints are kept as @deprecated wrappers so
 * existing callers continue to compile while they migrate.
 */
import api from '@/lib/api';
import { triggerDownload } from '@/utils/download';
import { unwrapArray } from '@/utils/unwrapArray';
import type {
  RevenueAnalyticsResponse,
  RevenueSummaryResponse,
  RevenueMonthlyTrendResponse,
  RevenueByTypeResponse,
  RevenueTransactionItem,
} from '@/types/api';

/**
 * GET /api/v1/analytics/revenue
 * Returns KPIs + monthly_trend + revenue_by_type in one response.
 */
export async function getRevenueAnalytics(): Promise<RevenueAnalyticsResponse> {
  const res = await api.get<RevenueAnalyticsResponse>('/api/v1/analytics/revenue');
  return res.data;
}

/**
 * GET /api/v1/super-admin/revenue/transactions
 * Pass format='csv' to download as a CSV file instead.
 */
export async function getTransactions(format?: 'csv'): Promise<RevenueTransactionItem[]> {
  if (format === 'csv') {
    const res = await api.get('/api/v1/super-admin/revenue/transactions', {
      params: { format: 'csv' },
      responseType: 'blob',
    });
    triggerDownload(res.data as Blob, 'afya-revenue-report.csv');
    return [];
  }
  const res = await api.get<unknown>('/api/v1/super-admin/revenue/transactions');
  return unwrapArray<RevenueTransactionItem>(res.data, 'RevenueTransactions');
}

// ─── Deprecated wrappers (kept for backward compat) ───────────────────────────

/**
 * @deprecated Use getRevenueAnalytics() — maps to the new unified endpoint.
 */
export async function getRevenueSummary(): Promise<RevenueSummaryResponse> {
  const data = await getRevenueAnalytics();
  return {
    ARR:                  data.annual_run_rate     ?? 0,
    MRR:                  data.revenue_this_month  ?? 0,
    renewals_due_30_days: data.renewals_due_30_days ?? 0,
    total_revenue:        data.total_revenue        ?? 0,
  };
}

/**
 * @deprecated Use getRevenueAnalytics() and read .monthly_trend
 */
export async function getRevenueMonthlyTrend(): Promise<RevenueMonthlyTrendResponse> {
  const data = await getRevenueAnalytics();
  return data.monthly_trend ?? { months: [], revenue: [] };
}

/**
 * @deprecated Use getRevenueAnalytics() and read .revenue_by_type
 */
export async function getRevenueByType(): Promise<RevenueByTypeResponse> {
  const data = await getRevenueAnalytics();
  return (data.revenue_by_type ?? {}) as RevenueByTypeResponse;
}

/**
 * @deprecated Use getTransactions()
 */
export async function getRevenueTransactions(): Promise<RevenueTransactionItem[]> {
  return getTransactions();
}

/**
 * @deprecated Use getTransactions('csv')
 */
export async function exportRevenueCsv(): Promise<void> {
  await getTransactions('csv');
}
