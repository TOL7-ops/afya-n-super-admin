'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getDashboardSummary,
  getScreeningsTrend,
  getBpDistribution,
  getPendingApprovals,
  getTopInstitutions,
  getAnalyticsSummary,
  getAnalyticsBreakdowns,
  getInstitutionsPerformance,
} from '@/services/analytics.service';
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

// ─── Shared types (used by chart components) ──────────────────────────────────
export interface BpDistributionItem {
  label: string;
  percent: number;
  colorVar: string;
}

export interface ScreeningTrendItem {
  month: string;
  value: number;
}

export interface DashboardAnalytics {
  activeInstitutions: number;
  institutionsIncrement: number;
  totalScreened: number;
  onActiveTreatment: number;
  bpDistribution: BpDistributionItem[];
  screeningTrend: ScreeningTrendItem[];
  pendingApprovals: PendingApprovalItem[];
  topInstitutions: TopInstitutionItem[];
}

// ─── Dashboard analytics hook ────────────────────────────────────────────────
export interface UseDashboardAnalyticsReturn {
  data: DashboardAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardAnalytics(): UseDashboardAnalyticsReturn {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Use allSettled so a single slow/failing endpoint doesn't block the whole dashboard
      const [summaryRes, trendRes, bpDistRes, pendingRes, topRes] = await Promise.allSettled([
        getDashboardSummary(),
        getScreeningsTrend(),
        getBpDistribution(),
        getPendingApprovals(),
        getTopInstitutions(),
      ]);

      // Extract values with safe fallbacks for any rejected promises
      const summary = summaryRes.status === 'fulfilled' ? summaryRes.value : null;
      const trend   = trendRes.status   === 'fulfilled' ? trendRes.value   : null;
      const bpDist  = bpDistRes.status  === 'fulfilled' ? bpDistRes.value  : null;
      const pending = pendingRes.status === 'fulfilled' ? pendingRes.value  : [];
      const top     = topRes.status     === 'fulfilled' ? topRes.value      : [];

      // Log any failures for debugging
      [summaryRes, trendRes, bpDistRes, pendingRes, topRes].forEach((r, i) => {
        if (r.status === 'rejected') {
          const names = ['summary', 'trend', 'bp-dist', 'pending', 'top'];
          console.warn(`[Dashboard] ${names[i]} failed:`, r.reason);
        }
      });

      console.log('[Dashboard] Summary:', summary);
      console.log('[Dashboard] Top institutions:', top);

      // Map BP distribution to chart items
      const bpDistribution: BpDistributionItem[] = bpDist
        ? [
            { label: 'Normal',    percent: bpDist.normal_pct,    colorVar: 'var(--green)'    },
            { label: 'Elevated',  percent: bpDist.elevated_pct,  colorVar: 'var(--amber)'    },
            { label: 'Stage 1/2', percent: bpDist.stage_1_2_pct, colorVar: 'var(--red-soft)' },
            { label: 'Crisis',    percent: bpDist.crisis_pct,    colorVar: 'var(--red)'      },
          ].filter((item) => item.percent > 0)
        : [];

      // Map screenings trend to chart items
      const screeningTrend: ScreeningTrendItem[] = trend
        ? trend.months.map((month, i) => ({ month, value: trend.screenings[i] ?? 0 }))
        : [];

      setData({
        activeInstitutions:   summary?.active_institutions   ?? 0,
        institutionsIncrement: summary?.institutions_increment ?? 0,
        totalScreened:        summary?.total_screened         ?? 0,
        onActiveTreatment:    summary?.on_active_treatment    ?? 0,
        bpDistribution,
        screeningTrend,
        pendingApprovals: pending,
        topInstitutions:  top,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load dashboard';
      const status = (err as { response?: { status?: number } }).response?.status;
      console.error('[Dashboard] Error:', msg, 'HTTP:', status);
      setError(msg);
      setData({
        activeInstitutions: 0, institutionsIncrement: 0,
        totalScreened: 0, onActiveTreatment: 0,
        bpDistribution: [], screeningTrend: [],
        pendingApprovals: [], topInstitutions: [],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ─── Full platform analytics hook (Analytics page) ───────────────────────────
export interface PlatformAnalyticsData {
  summary: AnalyticsSummaryResponse;
  breakdowns: AnalyticsBreakdownsResponse;
  performance: InstitutionPerformanceItem[];
}

export interface UsePlatformAnalyticsReturn {
  data: PlatformAnalyticsData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function usePlatformAnalytics(): UsePlatformAnalyticsReturn {
  const [data, setData] = useState<PlatformAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, breakdownsRes, performanceRes] = await Promise.allSettled([
        getAnalyticsSummary(),
        getAnalyticsBreakdowns(),
        getInstitutionsPerformance(),
      ]);

      const summary     = summaryRes.status     === 'fulfilled' ? summaryRes.value     : null;
      const breakdowns  = breakdownsRes.status  === 'fulfilled' ? breakdownsRes.value  : null;
      const performance = performanceRes.status === 'fulfilled' ? performanceRes.value : [];

      [summaryRes, breakdownsRes, performanceRes].forEach((r, i) => {
        if (r.status === 'rejected') {
          const names = ['summary', 'breakdowns', 'performance'];
          console.warn(`[Analytics] ${names[i]} failed:`, r.reason);
        }
      });

      console.log('[Analytics] Summary:', summary);
      console.log('[Analytics] Breakdowns:', breakdowns);
      console.log('[Analytics] Performance full[0]:', JSON.stringify(performance[0] ?? {}));
      console.log('[Analytics] Performance all fields:', performance.map(p => Object.keys(p)));

      // Provide safe empty defaults so components never crash on null
      setData({
        summary: summary ?? {
          total_screened: 0, high_bp_detections: 0,
          referrals: 0, follow_up_completions: 0,
        },
        breakdowns: breakdowns ?? {
          regional: null, age: null,
          gender: null, risk_trends: null,
          detection_rate: null,
        },
        performance,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load analytics';
      const status = (err as { response?: { status?: number } }).response?.status;
      console.error('[Analytics] Error:', msg, 'HTTP:', status);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
