'use client';

import { useEffect, useState, useMemo } from 'react';
import KpiCard from './KpiCard';
import ScreeningTrendChart, { type ScreeningTrendItem } from '@/components/charts/ScreeningTrendChart';
import BpDistributionChart, { type BpDistributionItem } from '@/components/charts/BpDistributionChart';
import Badge, { institutionTypeVariant } from '@/components/shared/Badge';
import AdherenceBar from '@/components/shared/AdherenceBar';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ToastType } from '@/types';
import type { FacilityResponse, TopInstitutionItem } from '@/types/api';
import { useCountUp } from '@/hooks/useCountUp';
import { deriveLicenseStatus, statusToVariant } from '@/utils/licenseStatus';
import { useInstitutionsStore } from '@/stores/institutionsStore';

interface DashboardViewProps {
  onViewAllInstitutions: () => void;
  onToast: (msg: string, type?: ToastType) => void;
  onExportReport: () => void;
  // Live data from API
  topInstitutions: TopInstitutionItem[];
  organisations: FacilityResponse[];   // combined facilities + institutions for onboardings
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
  onViewAllInstitutions,
  onToast,
  onExportReport,
  topInstitutions,
  organisations,
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

  // Suppress unused prop warning
  void analyticsError;

  const latestMonthValue = screeningTrend.length > 0 ? screeningTrend[screeningTrend.length - 1].value : null;
  const screenedSub = latestMonthValue
    ? `↑ ${latestMonthValue.toLocaleString()} this month`
    : 'All time, all organizations';

  const bpSub = totalScreened > 0
    ? `All time · ${totalScreened.toLocaleString()} patients`
    : 'All time, all patients';

  // Build recent onboardings from the store directly (reliable even before prop arrives)
  // Sort newest first, show top 5 regardless of whether created_at is set
  const storeOrgs = useInstitutionsStore((s) => s.institutions);
  const sourceList = organisations.length > 0 ? organisations : storeOrgs;

  const recentOnboardings = useMemo(() => {
    return [...sourceList]
      .sort((a, b) => {
        const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
        const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 5)
      .map((o) => ({
        id:         o.id,
        name:       o.name,
        kind:       o._entity_type === 'institution' ? 'Institution' : 'Facility',
        region:     o.region ?? (o as unknown as Record<string,unknown>)['state_region'] as string ?? '—',
        created_at: o.created_at ?? null,
      }));
  }, [sourceList]);

  function fmtJoined(iso: string | null | undefined): string {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return '—'; }
  }

  return (
    <div>
      {/* Header */}
      <div className="pg-hdr">
        <div>
          <div className="pg-title">Platform Overview</div>
          <div className="pg-sub">All organizations · All regions · Afya v1.0</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-ghost" onClick={onExportReport}>
            Export Report
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row">
        <AnimatedKpi
          icon="🏛"
          label="Active Organizations"
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
          icon="📊"
          label="Total Organizations"
          value={totalInstitutions}
          sub="Facilities + Institutions"
          valueColor=""
        />
      </div>

      {/* Charts row */}
      <div className="grid-2col">
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Screening Volume — Last 6 Months</div>
            <div className="card-sub">All organizations</div>
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

      {/* Recent Onboardings — top 5 newest organisations from the combined store */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Recent Onboardings</div>
          <div className="card-sub">Most recently registered organizations</div>
        </div>
        <div className="card-body">
          {recentOnboardings.length === 0 ? (
            <div style={{ padding: '16px 0', textAlign: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
                No recent onboardings
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {recentOnboardings.map((org, i) => (
                <div key={org.id} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 0',
                  borderBottom: i < recentOnboardings.length - 1 ? '1px solid var(--gray-xlt)' : 'none',
                }}>
                  {/* Icon */}
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '6px', flexShrink: 0,
                    background: org.kind === 'Facility' ? 'rgba(33,121,255,.1)' : 'rgba(34,197,94,.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1rem',
                  }}>
                    {org.kind === 'Facility' ? '🏥' : '🏛'}
                  </div>
                  {/* Name + type */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 500, fontSize: '.84rem', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {org.name}
                    </div>
                    <div style={{ fontSize: '.7rem', color: 'var(--gray)', marginTop: '1px' }}>
                      {org.kind}{org.region && org.region !== '—' ? ` · ${org.region}` : ''}
                    </div>
                  </div>
                  {/* Joined date */}
                  <div style={{
                    fontFamily: "'JetBrains Mono',monospace",
                    fontSize: '.68rem', color: 'var(--gray)',
                    flexShrink: 0, whiteSpace: 'nowrap',
                  }}>
                    {org.created_at ? `Joined ${fmtJoined(org.created_at)}` : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top organizations */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Top Performing Organizations</div>
          <button className="btn-sm" onClick={onViewAllInstitutions}>
            View All →
          </button>
        </div>
        <div className="tbl-scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Organization</th>
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
                    {analyticsLoading ? 'Loading…' : 'No data available'}
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
                      <Badge variant={statusToVariant(deriveLicenseStatus({
                        status: inst.license_status,
                        is_active: inst.status?.toLowerCase() !== 'suspended',
                        license_plan: inst.license_status ?? '',
                        expires_at: (inst as Record<string,unknown>).license_expires_at as string ?? null,
                      }))}>
                        {inst.license_status ?? '—'}
                      </Badge>
                    </td>
                    <td>
                      <Badge variant={statusToVariant(deriveLicenseStatus({
                        status: inst.status,
                        is_active: inst.is_active as boolean ?? (inst.status?.toLowerCase() === 'active'),
                        license_plan: inst.license_status ?? '',
                        expires_at: (inst as Record<string,unknown>).license_expires_at as string ?? null,
                      }))}>
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
