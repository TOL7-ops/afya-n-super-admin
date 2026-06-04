/**
 * @deprecated All billing endpoints now live in revenue.service.ts
 * This file is kept only to avoid import errors on any remaining callers.
 */
export {
  getRevenueSummary as getBillingMonthlySummary,
  getRevenueMonthlyTrend as getBillingTimeline,
  getRevenueTransactions as getBillingTransactions,
  exportRevenueCsv as exportBillingCsv,
} from './revenue.service';

export type { RevenueSummaryResponse as BillingMonthlySummary } from '@/types/api';
export type { RevenueTransactionItem as BillingTransaction } from '@/types/api';
