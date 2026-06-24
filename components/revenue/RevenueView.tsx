'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ToastType } from '@/types';
import {
  getRevenueAnalytics,
  getTransactions,
  exportRevenueCsv,
} from '@/services/revenue.service';
import { deriveLicenseStatus, statusToVariant } from '@/utils/licenseStatus';
import Badge from '@/components/shared/Badge';
import type {
  RevenueAnalyticsResponse,
  RevenueTransactionItem,
} from '@/types/api';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface RevenueViewProps {
  onToast: (msg: string, type?: ToastType) => void;
}

const TYPE_COLORS: Record<string, string> = {
  Government: 'var(--blue)',
  NGO:        'var(--purple, #7c3aed)',
  Hospital:   'var(--amber)',
  Pharmacy:   'var(--green)',
  Employer:   'var(--red-soft)',
};

function fmtGhs(n: number) {
  return n > 0 ? `GHS ${n.toLocaleString()}` : '—';
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function RevenueView({ onToast }: RevenueViewProps) {
  const [analytics, setAnalytics]   = useState<RevenueAnalyticsResponse | null>(null);
  const [transactions, setTxns]     = useState<RevenueTransactionItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [animated, setAnimated]     = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [analyticsResult, txnsResult] = await Promise.allSettled([
        getRevenueAnalytics(),
        getTransactions(),
      ]);

      if (analyticsResult.status === 'fulfilled') {
        const raw = analyticsResult.value as Record<string, unknown>;
        console.log('[Revenue] Analytics keys:', Object.keys(raw));
        console.log('[Revenue] Analytics:', raw);
        setAnalytics(analyticsResult.value);
      } else {
        const e = analyticsResult.reason as { response?: { status?: number; data?: unknown } };
        console.error('[Revenue] Analytics failed:', e?.response?.status, e?.response?.data ?? analyticsResult.reason);
      }

      if (txnsResult.status === 'fulfilled') {
        setTxns(txnsResult.value as RevenueTransactionItem[]);
        console.log('[Revenue] Transactions[0]:', (txnsResult.value as RevenueTransactionItem[])[0] ?? 'empty');
      } else {
        console.warn('[Revenue] Transactions failed:', txnsResult.reason);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load revenue data';
      console.error('[Revenue] loadAll error:', err);
      onToast(`Revenue error: ${msg}`, 'warn');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only fetch when authenticated
  useEffect(() => {
    import('@/services/authService').then(({ getAccessToken }) => {
      if (getAccessToken()) loadAll();
    });
  }, [loadAll]);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setAnimated(true), 300);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const handleExport = async () => {
    try {
      onToast('Generating report…');
      await exportRevenueCsv();
      onToast('Report downloaded', 'success');
    } catch {
      onToast('Export failed — try again', 'warn');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Revenue</div>
            <div className="pg-sub">Licensing income across all institutions · Afya Platform</div>
          </div>
        </div>
        <LoadingSpinner message="Loading revenue data…" />
      </div>
    );
  }

  // ── KPI helpers — API returns { kpis: {...}, monthly_trend: [{month,amount}], revenue_by_type: {...} }
  const a    = analytics as Record<string, unknown> | null;
  // KPIs may be nested under 'kpis' or flat at the top level
  const kpis = (a?.['kpis'] ?? a) as Record<string, unknown> | null;
  const totalRevenue      = Number(kpis?.['total_revenue']        ?? kpis?.['total_revenue_all_time'] ?? 0);
  const revenueThisMonth  = Number(kpis?.['revenue_this_month']   ?? kpis?.['MRR']                   ?? 0);
  const renewalsDue       = Number(kpis?.['renewals_due_30_days'] ?? kpis?.['renewals_due']           ?? 0);
  const annualRunRate     = Number(kpis?.['annual_run_rate']       ?? kpis?.['ARR']                  ?? 0);

  // ── Monthly trend — API returns [{ month: "Jan", amount: 0 }, ...]
  // Also handle legacy shape { months: [], revenue: [] }
  const rawTrend = a?.['monthly_trend'];
  let trendMonths: string[]  = [];
  let trendAmounts: number[] = [];
  if (Array.isArray(rawTrend) && rawTrend.length > 0) {
    // New shape: array of { month, amount }
    trendMonths  = (rawTrend as Array<Record<string, unknown>>).map((r) => String(r['month'] ?? ''));
    trendAmounts = (rawTrend as Array<Record<string, unknown>>).map((r) => Number(r['amount'] ?? r['revenue'] ?? 0));
  } else if (rawTrend && typeof rawTrend === 'object' && !Array.isArray(rawTrend)) {
    // Legacy shape: { months: [], revenue: [] }
    const t = rawTrend as Record<string, unknown>;
    trendMonths  = (t['months']  as string[] | undefined) ?? [];
    trendAmounts = (t['revenue'] as number[] | undefined) ?? [];
  }
  const maxRevenue = trendAmounts.length > 0 ? Math.max(...trendAmounts, 1) : 1;

  // ── By-type — API returns { Government: 0, Hospital: 6000, ... }
  const byTypeRaw = (a?.['revenue_by_type'] ?? a?.['by_type'] ?? null) as Record<string, number> | null;
  const byTypeEntries = byTypeRaw
    ? Object.entries(byTypeRaw).filter(([, v]) => v > 0)
    : [];
  const maxByType = byTypeEntries.length > 0
    ? Math.max(...byTypeEntries.map(([, v]) => v), 1)
    : 1;

  return (
    <div>
      {/* ── Header ── */}
      <div className="pg-hdr">
        <div>
          <div className="pg-title">Revenue</div>
          <div className="pg-sub">Licensing income across all institutions · Afya Platform</div>
        </div>
        <button className="btn btn-ghost" onClick={handleExport}>
          Export Report ↓
        </button>
      </div>

      {/* ── KPI Row ── */}
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-ico">💰</div>
          <div className="kpi-lbl">Total Revenue (All Time)</div>
          <div className="kpi-val green">{analytics ? fmtGhs(totalRevenue) : '—'}</div>
          <div className="kpi-sub">Cumulative licensing income</div>
        </div>
        <div className="kpi">
          <div className="kpi-ico">📅</div>
          <div className="kpi-lbl">MRR</div>
          <div className="kpi-val green">{analytics ? fmtGhs(revenueThisMonth) : '—'}</div>
          <div className="kpi-sub">Monthly recurring revenue</div>
        </div>
        <div className="kpi">
          <div className="kpi-ico">🔄</div>
          <div className="kpi-lbl">Renewals Due (30 Days)</div>
          <div className="kpi-val amber">
            {analytics ? (renewalsDue > 0 ? fmtGhs(renewalsDue) : '—') : '—'}
          </div>
          <div className="kpi-sub">Revenue at risk if not renewed</div>
        </div>
        <div className="kpi">
          <div className="kpi-ico">📈</div>
          <div className="kpi-lbl">ARR</div>
          <div className="kpi-val">{analytics ? fmtGhs(annualRunRate) : '—'}</div>
          <div className="kpi-sub">Annual recurring revenue</div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid-2col">

        {/* Monthly Revenue Trend */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Monthly Revenue — Trend</div>
          </div>
          <div className="card-body">
            {trendMonths.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--gray)' }}>
                  No revenue trend data yet
                </span>
              </div>
            ) : (
              <>
                <div style={{
                  display: 'flex', alignItems: 'flex-end',
                  justifyContent: 'space-between', height: '80px', gap: '6px',
                }}>
                  {trendMonths.map((month, i) => {
                    const amount = trendAmounts[i] ?? 0;
                    const isLast = i === trendMonths.length - 1;
                    const heightPct = maxRevenue > 0
                      ? Math.max((amount / maxRevenue) * 100, amount > 0 ? 4 : 0)
                      : 0;
                    return (
                      <div
                        key={`${month}-${i}`}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%', justifyContent: 'flex-end' }}
                      >
                        {amount > 0 && (
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.56rem', color: 'var(--gray)' }}>
                            {amount >= 1000 ? `${(amount / 1000).toFixed(0)}k` : amount}
                          </span>
                        )}
                        <div
                          title={amount > 0 ? `GHS ${amount.toLocaleString()}` : 'No revenue'}
                          style={{
                            width: '100%',
                            borderRadius: '3px 3px 0 0',
                            background: isLast ? 'var(--green)' : amount > 0 ? 'rgba(26,122,74,.4)' : 'var(--gray-xlt)',
                            height: animated ? `${heightPct}%` : '0%',
                            minHeight: amount > 0 ? '4px' : '2px',
                            transition: `height 1s ease ${200 + i * 100}ms`,
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
                  {trendMonths.map((m, i) => (
                    <span key={`lbl-${i}`} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.6rem', color: 'var(--gray)' }}>
                      {m}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Revenue by Institution Type */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Revenue by Institution Type</div>
          </div>
          <div className="card-body">
            {byTypeEntries.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--gray)' }}>
                  No revenue by type data yet
                </span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {byTypeEntries.map(([type, amount]) => {
                  const pct = Math.round((amount / maxByType) * 100);
                  const color = TYPE_COLORS[type] ?? 'var(--gray)';
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontSize: '.74rem', color: 'var(--ink-mid)', width: '80px', textAlign: 'right', flexShrink: 0 }}>
                        {type}
                      </div>
                      <div style={{ flex: 1, background: 'var(--gray-xlt)', borderRadius: '2px', height: '9px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', background: color, borderRadius: '2px',
                          width: animated ? `${pct}%` : '0%',
                          transition: 'width 1s ease',
                        }} />
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--gray)', width: '64px', textAlign: 'right' }}>
                        {fmtGhs(amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Transaction History ── */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Transaction History</div>
          <div className="card-sub">
            {transactions.length > 0
              ? `${transactions.length} transactions`
              : 'No paid transactions yet'}
          </div>
        </div>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Institution</th>
                <th>Type</th>
                <th>Plan</th>
                <th>Amount (GHS)</th>
                <th>Payment Date</th>
                <th>Method</th>
                <th>Period</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
                    No transactions recorded yet
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const instName = tx.institution_name ?? '—';
                  const amount   = tx.amount ?? 0;
                  const paymentDate = tx.paid_at ?? tx.payment_date ?? null;
                  const method   = tx.payment_method ?? '—';
                  const statusVal = tx.status ?? 'Paid';

                  // API now returns plan, type, period directly on each transaction
                  const plan    = (tx.plan ?? (tx as Record<string,unknown>)['plan'] ?? '—') as string;
                  const instType = (tx.type ?? (tx as Record<string,unknown>)['type'] ?? '—') as string;
                  const period  = (tx.period ?? (tx as Record<string,unknown>)['period'] ?? '—') as string;

                  return (
                    <tr key={tx.id}>
                      <td style={{ fontWeight: 500 }}>{instName}</td>
                      <td style={{ fontSize: '.76rem', color: 'var(--ink-mid)' }}>{instType}</td>
                      <td style={{ fontSize: '.8rem' }}>{plan}</td>
                      <td className="mono" style={{ color: amount > 0 ? 'var(--green)' : 'var(--gray)', fontWeight: amount > 0 ? 500 : 400 }}>
                        {amount > 0 ? `GHS ${amount.toLocaleString()}` : '0'}
                      </td>
                      <td className="id-cell">{fmtDate(paymentDate)}</td>
                      <td style={{ fontSize: '.8rem', color: 'var(--ink-mid)' }}>{method}</td>
                      <td style={{ fontSize: '.76rem', color: 'var(--ink-mid)', fontFamily: "'JetBrains Mono',monospace" }}>
                        {period}
                      </td>
                      <td>
                        <Badge variant={statusToVariant(deriveLicenseStatus({
                          is_active: !statusVal.toLowerCase().includes('suspend'),
                          license_plan: statusVal.toLowerCase().includes('trial') ? 'trial' : 'paid',
                          expires_at: (tx as Record<string,unknown>).expires_at as string ?? null,
                        }))}>
                          {statusVal}
                        </Badge>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
