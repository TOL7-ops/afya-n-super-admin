'use client';

import { useEffect, useState } from 'react';
import KpiCard from './KpiCard';
import ScreeningTrendChart, { type ScreeningTrendItem } from '@/components/charts/ScreeningTrendChart';
import BpDistributionChart, { type BpDistributionItem } from '@/components/charts/BpDistributionChart';
import Badge, { institutionTypeVariant } from '@/components/shared/Badge';
import AdherenceBar from '@/components/shared/AdherenceBar';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ToastType } from '@/types';
import type { TopInstitutionItem } from '@/types/api';
import { useCountUp } from '@/hooks/useCountUp';
import { deriveLicenseStatus, statusToVariant } from '@/utils/licenseStatus';
import { useDemoRequests } from '@/hooks/useDemoRequests';
import DemoConfirmModal from '@/components/demo/DemoConfirmModal';

interface DashboardViewProps {
  onViewAllInstitutions: () => void;
  onViewDemoRequests: () => void;
  onToast: (msg: string, type?: ToastType) => void;
  onExportReport: () => void;
  topInstitutions: TopInstitutionItem[];
  activeInstitutions: number;
  totalScreened: number;
  onActiveTreatment: number;
  totalInstitutions: number;
  screeningTrend: ScreeningTrendItem[];
  bpDistribution: BpDistributionItem[];
  analyticsLoading: boolean;
  analyticsError: string | null;
}

function AnimatedKpi({
  icon, label, target, sub, valueColor, started,
}: {
  icon: string; label: string; target: number; sub: string;
  valueColor?: 'green' | 'amber' | 'red' | ''; started: boolean;
}) {
  const value = useCountUp(target, target > 1000 ? 1100 : 900, started);
  return <KpiCard icon={icon} label={label} value={value} sub={sub} valueColor={valueColor} />;
}

function orgTypeIcon(type: string | null): string {
  const t = (type ?? '').toLowerCase();
  if (t.includes('hospital') || t.includes('clinic') || t.includes('facility')) return '🏥';
  if (t.includes('ngo') || t.includes('programme') || t.includes('institution')) return '🏛';
  return '🏢';
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
}

export default function DashboardView({
  onViewAllInstitutions,
  onViewDemoRequests,
  onToast,
  onExportReport,
  topInstitutions,
  activeInstitutions,
  totalScreened,
  onActiveTreatment,
  totalInstitutions,
  screeningTrend,
  bpDistribution,
  analyticsLoading,
  analyticsError,
}: DashboardViewProps) {
  const [started, setStarted] = useState(false);
  void analyticsError;

  useEffect(() => {
    if (!analyticsLoading) {
      const t = setTimeout(() => setStarted(true), 300);
      return () => clearTimeout(t);
    }
  }, [analyticsLoading]);

  // ── Shared demo requests hook ──────────────────────────────────────────────
  const {
    pending,
    loading: demoLoading,
    actionInFlight,
    confirmAction,
    confirming,
    initiateAction,
    cancelAction,
    executeAction,
    refetch: refetchDemo,
  } = useDemoRequests();

  // Widget shows max 5 pending
  const widgetRows = pending.slice(0, 5);

  const latestMonthValue = screeningTrend.length > 0
    ? screeningTrend[screeningTrend.length - 1].value
    : null;
  const screenedSub = latestMonthValue
    ? `↑ ${latestMonthValue.toLocaleString()} this month`
    : 'All time, all organizations';
  const bpSub = totalScreened > 0
    ? `All time · ${totalScreened.toLocaleString()} patients`
    : 'All time, all patients';

  return (
    <div>
      {/* Header */}
      <div className="pg-hdr">
        <div>
          <div className="pg-title">Platform Overview</div>
          <div className="pg-sub">All organizations · All regions · Afya v1.0</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" onClick={onExportReport}>Export Report</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row">
        <AnimatedKpi icon="🏛" label="Active Organizations" target={activeInstitutions}
          sub={totalInstitutions > 0 ? `${totalInstitutions} total registered` : 'Registered on platform'}
          started={started} />
        <AnimatedKpi icon="🩺" label="Total Screened" target={totalScreened}
          sub={screenedSub} started={started} />
        <AnimatedKpi icon="💊" label="On Active Treatment" target={onActiveTreatment}
          sub="WA reminders running" valueColor="green" started={started} />
        <KpiCard icon="📊" label="Total Organizations" value={totalInstitutions}
          sub="Facilities + Institutions" valueColor="" />
      </div>

      {/* Charts */}
      <div className="grid-2col">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Screening Volume — Last 6 Months</div>
            <div className="card-sub">All organizations</div>
          </div>
          <div className="card-body">
            {analyticsLoading
              ? <LoadingSpinner message="Loading chart…" />
              : <ScreeningTrendChart data={screeningTrend} />}
          </div>
        </div>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">BP Category Distribution</div>
            <div className="card-sub">{bpSub}</div>
          </div>
          <div className="card-body">
            {analyticsLoading
              ? <LoadingSpinner message="Loading chart…" />
              : <BpDistributionChart data={bpDistribution} />}
          </div>
        </div>
      </div>

      {/* ── Demo Requests widget ── */}
      <div className="card">
        <div className="card-hdr">
          <div>
            <div className="card-title">Demo Requests</div>
            <div className="card-sub">Pending requests awaiting review</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn-sm" onClick={refetchDemo} title="Refresh">↻</button>
            <button className="btn-sm" onClick={onViewDemoRequests}>View all →</button>
          </div>
        </div>
        <div className="card-body">
          {demoLoading ? (
            <LoadingSpinner message="Loading demo requests…" />
          ) : widgetRows.length === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
                No pending demo requests
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {widgetRows.map((req, i) => {
                const inFlight = actionInFlight.has(req.id);
                return (
                  <div key={req.id} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '10px 0',
                    borderBottom: i < widgetRows.length - 1 ? '1px solid var(--gray-xlt)' : 'none',
                    opacity: inFlight ? 0.6 : 1, transition: 'opacity .2s',
                  }}>
                    {/* Icon */}
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0,
                      background: 'rgba(7,72,128,.1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
                    }}>
                      {orgTypeIcon(req.organization_type)}
                    </div>

                    {/* Name + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 500, fontSize: '.84rem', color: 'var(--ink)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {req.organization_name}
                      </div>
                      <div style={{ fontSize: '.7rem', color: 'var(--gray)', marginTop: '1px' }}>
                        {req.name}
                        {req.organization_type ? ` · ${req.organization_type}` : ''}
                        {' · '}{fmtDate(req.created_at)}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button
                        title="Approve"
                        disabled={inFlight}
                        onClick={() => initiateAction(req, 'Approved')}
                        style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          border: '1px solid var(--green-border)', background: 'var(--green-bg)',
                          color: 'var(--green)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', cursor: inFlight ? 'not-allowed' : 'pointer',
                          transition: 'all .15s', flexShrink: 0,
                        }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </button>
                      <button
                        title="Reject"
                        disabled={inFlight}
                        onClick={() => initiateAction(req, 'Rejected')}
                        style={{
                          width: '30px', height: '30px', borderRadius: '50%',
                          border: '1px solid var(--red-mist)', background: 'var(--red-pale)',
                          color: 'var(--red)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', cursor: inFlight ? 'not-allowed' : 'pointer',
                          transition: 'all .15s', flexShrink: 0,
                        }}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top organizations */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Top Performing Organizations</div>
          <button className="btn-sm" onClick={onViewAllInstitutions}>View All →</button>
        </div>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Organization</th><th>Type</th><th>Field Workers</th>
                <th>Screened</th><th>On Treatment</th><th>Adherence</th>
                <th>License</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {topInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{
                    textAlign: 'center', padding: '24px',
                    fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)',
                  }}>
                    {analyticsLoading ? 'Loading…' : 'No data available'}
                  </td>
                </tr>
              ) : topInstitutions.map((inst) => (
                <tr key={inst.id ?? inst.name} style={{ cursor: 'pointer' }}
                  onClick={() => onViewAllInstitutions()}>
                  <td style={{ fontWeight: 500 }}>{inst.name}</td>
                  <td><Badge variant={institutionTypeVariant(inst.type ?? '')}>{inst.type ?? '—'}</Badge></td>
                  <td className="mono">{inst.field_workers != null ? inst.field_workers : '—'}</td>
                  <td className="mono">{inst.screened != null ? inst.screened.toLocaleString() : '—'}</td>
                  <td className="mono" style={{ color: 'var(--green)' }}>
                    {inst.on_treatment != null ? inst.on_treatment : '—'}
                  </td>
                  <td>
                    {inst.adherence_rate != null ? (
                      <AdherenceBar percent={Math.round(inst.adherence_rate)}
                        color={inst.adherence_rate >= 70 ? 'green' : 'amber'} />
                    ) : (
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--gray)' }}>—</span>
                    )}
                  </td>
                  <td>
                    <Badge variant={statusToVariant(deriveLicenseStatus({
                      status: inst.license_status,
                      is_active: inst.status?.toLowerCase() !== 'suspended',
                      license_plan: inst.license_status ?? '',
                      expires_at: (inst as Record<string,unknown>).license_expires_at as string ?? null,
                    }))}>{inst.license_status ?? '—'}</Badge>
                  </td>
                  <td>
                    <Badge variant={statusToVariant(deriveLicenseStatus({
                      status: inst.status,
                      is_active: inst.is_active as boolean ?? (inst.status?.toLowerCase() === 'active'),
                      license_plan: inst.license_status ?? '',
                      expires_at: (inst as Record<string,unknown>).license_expires_at as string ?? null,
                    }))}>{inst.status ?? '—'}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shared confirm modal */}
      <DemoConfirmModal
        confirmAction={confirmAction}
        confirming={confirming}
        onConfirm={() => executeAction(onToast)}
        onCancel={cancelAction}
      />
    </div>
  );
}
