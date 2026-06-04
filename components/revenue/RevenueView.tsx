'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ToastType } from '@/types';
import {
  getRevenueSummary,
  getRevenueMonthlyTrend,
  getRevenueByType,
  getRevenueTransactions,
  exportRevenueCsv,
} from '@/services/revenue.service';
import { listLicenses } from '@/services/licenses.service';
import { listInstitutions } from '@/services/institutions.service';
import type {
  RevenueSummaryResponse,
  RevenueMonthlyTrendResponse,
  RevenueByTypeResponse,
  RevenueTransactionItem,
  LicenseItem,
  FacilityResponse,
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

function statusChip(status: string): string {
  const s = status.toLowerCase();
  if (s.includes('paid') || s.includes('active')) return 'chip-active';
  if (s.includes('trial'))     return 'chip-trial';
  if (s.includes('due') || s.includes('expir')) return 'chip-pending';
  if (s.includes('suspend'))   return 'chip-suspended';
  return 'chip-ngo';
}

export default function RevenueView({ onToast }: RevenueViewProps) {
  const [summary, setSummary]       = useState<RevenueSummaryResponse | null>(null);
  const [trend, setTrend]           = useState<RevenueMonthlyTrendResponse | null>(null);
  const [byType, setByType]         = useState<RevenueByTypeResponse | null>(null);
  const [transactions, setTxns]     = useState<RevenueTransactionItem[]>([]);
  const [licenses, setLicenses]     = useState<LicenseItem[]>([]);
  const [institutions, setInstitutions] = useState<FacilityResponse[]>([]);
  const [loading, setLoading]       = useState(true);
  const [animated, setAnimated]     = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, t, bt, txns, lics, insts] = await Promise.all([
        getRevenueSummary(),
        getRevenueMonthlyTrend(),
        getRevenueByType(),
        getRevenueTransactions(),
        listLicenses().catch(() => [] as LicenseItem[]),
        listInstitutions().catch(() => [] as FacilityResponse[]),
      ]);
      setSummary(s);
      setTrend(t);
      setByType(bt);
      setTxns(txns);
      setLicenses(lics);
      setInstitutions(insts);
      console.log('[Revenue] Summary:', s);
      console.log('[Revenue] Trend:', t);
      console.log('[Revenue] ByType:', bt);
      console.log('[Revenue] Transactions raw[0]:', txns[0] ?? 'empty array');
      console.log('[Revenue] Licenses[0]:', lics[0] ?? 'empty');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load revenue data';
      onToast(`Revenue error: ${msg}`, 'warn');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

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

  // ── Monthly trend chart data ───────────────────────────────────────────────
  const trendMonths  = trend?.months  ?? [];
  const trendAmounts = trend?.revenue ?? [];
  const maxRevenue   = trendAmounts.length > 0 ? Math.max(...trendAmounts, 1) : 1;

  // ── By-type chart data ────────────────────────────────────────────────────
  const byTypeEntries = byType
    ? Object.entries(byType).filter(([, v]) => v > 0)
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
          <div className="kpi-val green">{summary ? fmtGhs(summary.total_revenue) : '—'}</div>
          <div className="kpi-sub">Cumulative licensing income</div>
        </div>
        <div className="kpi">
          <div className="kpi-ico">📅</div>
          <div className="kpi-lbl">MRR</div>
          <div className="kpi-val green">
            {summary ? fmtGhs(summary.MRR) : '—'}
          </div>
          <div className="kpi-sub">Monthly recurring revenue</div>
        </div>
        <div className="kpi">
          <div className="kpi-ico">🔄</div>
          <div className="kpi-lbl">Renewals Due (30 Days)</div>
          <div className="kpi-val amber">
            {summary
              ? summary.renewals_due_30_days > 0
                ? fmtGhs(summary.renewals_due_30_days)
                : '—'
              : '—'}
          </div>
          <div className="kpi-sub">Revenue at risk if not renewed</div>
        </div>
        <div className="kpi">
          <div className="kpi-ico">📈</div>
          <div className="kpi-lbl">ARR</div>
          <div className="kpi-val">{summary ? fmtGhs(summary.ARR) : '—'}</div>
          <div className="kpi-sub">Annual recurring revenue</div>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

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
        <div style={{ overflowX: 'auto' }}>
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

                  // Look up license data by institution name to get plan, type, period
                  const lic = licenses.find(
                    (l) => l.institution_name?.trim().toLowerCase() === instName.trim().toLowerCase(),
                  );
                  const inst = institutions.find(
                    (i) => i.name.trim().toLowerCase() === instName.trim().toLowerCase(),
                  ) ?? institutions.find(
                    (i) =>
                      i.name.trim().toLowerCase().includes(instName.trim().toLowerCase()) ||
                      instName.trim().toLowerCase().includes(i.name.trim().toLowerCase()),
                  );

                  if (!inst) {
                    console.log(`[Revenue] No institution match for "${instName}". Available:`, institutions.map(i => i.name));
                  } else {
                    console.log(`[Revenue] Matched "${instName}" → type: "${inst.type}"`);
                  }

                  const plan     = lic?.plan ?? '—';
                  const instType = inst?.type ?? '—';
                  const amount = tx.amount ?? 0;

                  // payment date — API uses paid_at
                  const paymentDate = tx.paid_at ?? tx.payment_date ?? null;

                  const method  = tx.payment_method ?? '—';
                  const statusVal = tx.status ?? 'Paid';

                  // Period — compute from license start_date + expires_at
                  let period = '—';
                  if (lic?.start_date && lic?.expires_at) {
                    const fmtMon = (iso: string) =>
                      new Date(iso).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
                    period = `${fmtMon(lic.start_date)} – ${fmtMon(lic.expires_at)}`;
                  }

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
                        <span className={`chip ${statusChip(statusVal)}`} style={{ fontSize: '.62rem' }}>
                          {statusVal}
                        </span>
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
