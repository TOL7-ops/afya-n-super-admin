'use client';

import { useEffect, useState } from 'react';
import KpiCard from './KpiCard';
import ScreeningTrendChart, { type ScreeningTrendItem } from '@/components/charts/ScreeningTrendChart';
import BpDistributionChart, { type BpDistributionItem } from '@/components/charts/BpDistributionChart';
import Badge, { institutionTypeVariant } from '@/components/shared/Badge';
import AdherenceBar from '@/components/shared/AdherenceBar';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { PendingInstitution, ToastType } from '@/types';
import type { TopInstitutionItem } from '@/types/api';
import { useCountUp } from '@/hooks/useCountUp';

interface DashboardViewProps {
  onAddInstitution: () => void;
  onViewAllInstitutions: () => void;
  onToast: (msg: string, type?: ToastType) => void;
  onExportReport: () => void;
  // Live data from API
  pendingApprovals: PendingInstitution[];
  topInstitutions: TopInstitutionItem[];
  onApprove: (id: string, name: string) => void;
  onReject: (id: string, name: string) => void;
  // KPI values
  activeInstitutions: number;
  totalScreened: number;
  onActiveTreatment: number;
  totalInstitutions: number;
  // Chart data
  screeningTrend: ScreeningTrendItem[];
  bpDistribution: BpDistributionItem[];
  analyticsLoading: boolean;
  analyticsError: string | null;
}

function AnimatedKpi({
  icon, label, target, sub, valueColor, started,
}: {
  icon: string;
  label: string;
  target: number;
  sub: string;
  valueColor?: 'green' | 'amber' | 'red' | '';
  started: boolean;
}) {
  const value = useCountUp(target, target > 1000 ? 1100 : 900, started);
  return (
    <KpiCard icon={icon} label={label} value={value} sub={sub} valueColor={valueColor} />
  );
}

export default function DashboardView({
  onAddInstitution,
  onViewAllInstitutions,
  onToast,
  onExportReport,
  pendingApprovals,
  topInstitutions,
  onApprove,
  onReject,
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

  useEffect(() => {
    if (!analyticsLoading) {
      const t = setTimeout(() => setStarted(true), 300);
      return () => clearTimeout(t);
    }
  }, [analyticsLoading]);

  // Dynamic subtitle for screened KPI — show last month delta if available
  const latestMonthValue = screeningTrend.length > 0 ? screeningTrend[screeningTrend.length - 1].value : null;
  const screenedSub = latestMonthValue
    ? `↑ ${latestMonthValue.toLocaleString()} this month`
    : 'All time, all institutions';

  // BP chart subtitle
  const bpSub = totalScreened > 0
    ? `All time · ${totalScreened.toLocaleString()} patients`
    : 'All time, all patients';

  return (
    <div>
      {/* Header */}
      <div className="pg-hdr">
        <div>
          <div className="pg-title">Platform Overview</div>
          <div className="pg-sub">All institutions · All regions · Afya v1.0</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" onClick={onExportReport}>
            Export Report
          </button>
          <button className="btn btn-red" onClick={onAddInstitution}>
            + Add Institution
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row">
        <AnimatedKpi
          icon="🏛"
          label="Active Institutions"
          target={activeInstitutions}
          sub={totalInstitutions > 0 ? `${totalInstitutions} total registered` : 'Registered on platform'}
          started={started}
        />
        <AnimatedKpi
          icon="🩺"
          label="Total Screened"
          target={totalScreened}
          sub={screenedSub}
          started={started}
        />
        <AnimatedKpi
          icon="💊"
          label="On Active Treatment"
          target={onActiveTreatment}
          sub="WA reminders running"
          valueColor="green"
          started={started}
        />
        <KpiCard
          icon="⚠"
          label="Pending Approval"
          value={pendingApprovals.length}
          sub="Institutions awaiting review"
          valueColor="amber"
        />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Screening Volume — Last 6 Months</div>
            <div className="card-sub">All institutions</div>
          </div>
          <div className="card-body">
            {analyticsLoading ? (
              <LoadingSpinner message="Loading chart…" />
            ) : (
              <ScreeningTrendChart data={screeningTrend} />
            )}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">BP Category Distribution</div>
            <div className="card-sub">{bpSub}</div>
          </div>
          <div className="card-body">
            {analyticsLoading ? (
              <LoadingSpinner message="Loading chart…" />
            ) : (
              <BpDistributionChart data={bpDistribution} />
            )}
          </div>
        </div>
      </div>

      {/* Pending approvals — always visible, above Top Performers */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Pending Institution Approvals</div>
          <div className="card-sub">Requires your action</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          {pendingApprovals.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
                No pending approvals
              </span>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Type</th>
                  <th>Region</th>
                  <th>Contact</th>
                  <th>Requested</th>
                  <th>Plan</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingApprovals.map((inst) => (
                  <tr key={inst.id}>
                    <td style={{ fontWeight: 500 }}>{inst.name}</td>
                    <td>
                      <Badge variant={institutionTypeVariant(inst.type)}>{inst.type}</Badge>
                    </td>
                    <td>{inst.region}</td>
                    <td style={{ fontSize: '.76rem' }}>{inst.contact}</td>
                    <td className="id-cell">{inst.requestedDate}</td>
                    <td>
                      <Badge variant={inst.plan.toLowerCase().includes('trial') ? 'trial' : 'active'}>
                        {inst.plan}
                      </Badge>
                    </td>
                    <td style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <button
                        className="btn-icon"
                        style={{ color: 'var(--green)', borderColor: 'var(--green-border)' }}
                        onClick={() => onApprove(inst.id, inst.name)}
                      >
                        ✓ Approve
                      </button>
                      <button
                        className="btn-icon"
                        onClick={() => onReject(inst.id, inst.name)}
                      >
                        ✕ Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Top institutions */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Top Performing Institutions</div>
          <button className="btn-sm" onClick={onViewAllInstitutions}>
            View All →
          </button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Institution</th>
                <th>Type</th>
                <th>Field Workers</th>
                <th>Screened</th>
                <th>On Treatment</th>
                <th>Adherence</th>
                <th>License</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {topInstitutions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{
                    textAlign: 'center', padding: '24px',
                    fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)',
                  }}>
                    {analyticsLoading ? 'Loading…' : 'No active institutions yet'}
                  </td>
                </tr>
              ) : (
                topInstitutions.map((inst) => (
                  <tr key={inst.id ?? inst.name} style={{ cursor: 'pointer' }} onClick={() => onViewAllInstitutions()}>
                    <td style={{ fontWeight: 500 }}>{inst.name}</td>
                    <td>
                      <Badge variant={institutionTypeVariant(inst.type ?? '')}>{inst.type ?? '—'}</Badge>
                    </td>
                    <td className="mono">
                      {inst.field_workers != null ? inst.field_workers : '—'}
                    </td>
                    <td className="mono">
                      {inst.screened != null ? inst.screened.toLocaleString() : '—'}
                    </td>
                    <td className="mono" style={{ color: 'var(--green)' }}>
                      {inst.on_treatment != null ? inst.on_treatment : '—'}
                    </td>
                    <td>
                      {inst.adherence_rate != null ? (
                        <AdherenceBar
                          percent={Math.round(inst.adherence_rate)}
                          color={inst.adherence_rate >= 70 ? 'green' : 'amber'}
                        />
                      ) : (
                        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--gray)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <Badge variant="active">{inst.license_status ?? 'Active'}</Badge>
                    </td>
                    <td>
                      <Badge variant={inst.status?.toLowerCase() === 'active' ? 'active' : 'pending'}>
                        {inst.status ?? '—'}
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
