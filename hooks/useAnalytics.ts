'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getDashboard,
  getAnalyticsSummary,
  getAnalyticsBreakdowns,
  getInstitutionsPerformance,
} from '@/services/analytics.service';
import { getAccessToken } from '@/services/authService';
import type {
  DashboardSummaryResponse,
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
      // Single call to the unified dashboard endpoint (BC June 2026).
      const raw = await getDashboard();

      console.log('[Dashboard] Raw response keys:', Object.keys(raw));
      console.log('[Dashboard] Raw response:', JSON.stringify(raw).slice(0, 500));

      // The API may return data nested under a "summary" key OR flat at the top level.
      // Handle both shapes.
      const summary = (raw.summary ?? raw) as Record<string, unknown>;
      const trend   = raw.screenings_trend ?? (raw as Record<string, unknown>).screenings_trend ?? null;
      const bpDist  = raw.bp_distribution  ?? (raw as Record<string, unknown>).bp_distribution  ?? null;
      const pending = (raw.pending_approvals ?? (raw as Record<string, unknown>).pending_approvals ?? []) as typeof raw.pending_approvals;
      const top     = (raw.top_institutions  ?? (raw as Record<string, unknown>).top_institutions  ?? []) as typeof raw.top_institutions;

      console.log('[Dashboard] Summary:', summary);
      console.log('[Dashboard] Top institutions:', top);

      // Map BP distribution to chart items
      const bpDistRaw = bpDist as Record<string, unknown> | null;
      const bpDistribution: BpDistributionItem[] = bpDistRaw
        ? [
            { label: 'Normal',    percent: (bpDistRaw['normal_pct']    ?? bpDistRaw['normal']    ?? 0) as number, colorVar: 'var(--green)'    },
            { label: 'Elevated',  percent: (bpDistRaw['elevated_pct']  ?? bpDistRaw['elevated']  ?? 0) as number, colorVar: 'var(--amber)'    },
            { label: 'Stage 1/2', percent: (bpDistRaw['stage_1_2_pct'] ?? bpDistRaw['stage_1_2'] ?? 0) as number, colorVar: 'var(--red-soft)' },
            { label: 'Crisis',    percent: (bpDistRaw['crisis_pct']    ?? bpDistRaw['crisis']    ?? 0) as number, colorVar: 'var(--red)'      },
          ].filter((item) => item.percent > 0)
        : [];

      // Map screenings trend to chart items
      const trendRaw = trend as { months?: string[]; screenings?: number[] } | null;
      const screeningTrend: ScreeningTrendItem[] = trendRaw?.months
        ? trendRaw.months.map((month, i) => ({ month, value: trendRaw.screenings?.[i] ?? 0 }))
        : [];

      setData({
        activeInstitutions:    (summary?.['active_institutions']   ?? summary?.['active_institution_count'] ?? 0) as number,
        institutionsIncrement: (summary?.['institutions_increment'] ?? 0) as number,
        totalScreened:         (summary?.['total_screened']         ?? summary?.['total_patients_screened'] ?? 0) as number,
        onActiveTreatment:     (summary?.['on_active_treatment']    ?? summary?.['patients_on_treatment']   ?? 0) as number,
        bpDistribution,
        screeningTrend,
        pendingApprovals: pending ?? [],
        topInstitutions:  top ?? [],
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

  useEffect(() => {
    if (getAccessToken()) fetch();
  }, [fetch]);

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

  useEffect(() => {
    if (getAccessToken()) fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
