/**
 * Revenue service — /api/v1/super-admin/revenue/*
 * Replaces the broken billing.service.ts paths.
 */
import api from '@/lib/api';
import { triggerDownload } from '@/utils/download';
import { unwrapArray } from '@/utils/unwrapArray';
import type {
  RevenueSummaryResponse,
  RevenueMonthlyTrendResponse,
  RevenueByTypeResponse,
  RevenueTransactionItem,
} from '@/types/api';

/** GET /api/v1/super-admin/revenue/summary */
export async function getRevenueSummary(): Promise<RevenueSummaryResponse> {
  const res = await api.get<RevenueSummaryResponse>('/api/v1/super-admin/revenue/summary');
  return res.data;
}

/** GET /api/v1/super-admin/revenue/monthly-trend */
export async function getRevenueMonthlyTrend(): Promise<RevenueMonthlyTrendResponse> {
  const res = await api.get<RevenueMonthlyTrendResponse>(
    '/api/v1/super-admin/revenue/monthly-trend',
  );
  return res.data;
}

/** GET /api/v1/super-admin/revenue/by-type */
export async function getRevenueByType(): Promise<RevenueByTypeResponse> {
  const res = await api.get<RevenueByTypeResponse>('/api/v1/super-admin/revenue/by-type');
  return res.data;
}

/** GET /api/v1/super-admin/revenue/transactions */
export async function getRevenueTransactions(): Promise<RevenueTransactionItem[]> {
  const res = await api.get<unknown>('/api/v1/super-admin/revenue/transactions');
  return unwrapArray<RevenueTransactionItem>(res.data, 'RevenueTransactions');
}

/** GET /api/v1/super-admin/revenue/export — CSV download */
export async function exportRevenueCsv(): Promise<void> {
  const res = await api.get('/api/v1/super-admin/revenue/export', {
    responseType: 'blob',
  });
  triggerDownload(res.data as Blob, 'afya-revenue-report.csv');
}
