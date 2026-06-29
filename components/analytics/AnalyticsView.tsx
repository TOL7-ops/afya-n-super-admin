'use client';

import { useEffect, useState } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import AdherenceBar from '@/components/shared/AdherenceBar';
import { usePlatformAnalytics } from '@/hooks/useAnalytics';
import { exportAnalytics } from '@/services/analytics.service';
import type { ToastType } from '@/types';

interface AnalyticsViewProps {
  onToast: (msg: string, type?: ToastType) => void;
}

const BP_COLOR: Record<string, string> = {
  Normal:    'var(--green)',
  Elevated:  'var(--amber)',
  High:      'var(--red-soft)',
  Crisis:    'var(--red)',
};

const AGE_COLORS = ['var(--blue)', 'var(--amber)', 'var(--red)', 'var(--red-soft)', 'var(--green)'];

const DETECTION_COLORS = [
  'var(--blue)', 'var(--blue)', 'var(--amber)',
  'var(--amber)', 'var(--red-soft)', 'var(--red)',
];

function NoData({ label = 'No data available' }: { label?: string }) {
  return (
    <div style={{ padding: '24px 0', textAlign: 'center' }}>
      <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--gray)' }}>
        {label}
      </span>
    </div>
  );
}

export default function AnalyticsView({ onToast }: AnalyticsViewProps) {
  const { data, loading, error } = usePlatformAnalytics();
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    if (error) onToast(`Analytics error: ${error}`, 'warn');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setAnimated(true), 200);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const handleExport = async () => {
    try {
      onToast('Generating report…');
      await exportAnalytics();
      onToast('Report downloaded', 'success');
    } catch {
      onToast('Export failed — try again', 'warn');
    }
  };

  // ── Extract values ────────────────────────────────────────────────────────
  const summary     = data?.summary;
  const breakdowns  = data?.breakdowns;
  const performance = data?.performance ?? [];

  // KPIs
  const totalScreened       = summary?.total_screened ?? 0;
  const highBpDetections    = summary?.high_bp_detections ?? 0;
  const referrals           = summary?.referrals ?? 0;
  const followUpCompletions = summary?.follow_up_completions ?? 0;

  const detectionRate = totalScreened > 0
    ? Math.round((highBpDetections / totalScreened) * 100)
    : null;
  const referralRate = totalScreened > 0
    ? ((referrals / totalScreened) * 100).toFixed(1)
    : null;

  // ── Chart data — map from actual API field names ──────────────────────────

  // regional[].region + .screenings
  const regionalData = breakdowns?.regional ?? [];

  // age[].age_range + .count  →  convert to percent of total
  const ageRaw   = breakdowns?.age ?? [];
  const ageTotal = ageRaw.reduce((s, r) => s + r.count, 0);

  // gender[].gender + .count — deduplicate by gender label (API can return duplicates)
  // "Unknown" is remapped to "Others" for display
  const genderRaw = (() => {
    const raw = breakdowns?.gender ?? [];
    const merged = new Map<string, number>();
    for (const r of raw) {
      const label = r.gender === 'Unknown' ? 'Others' : r.gender;
      merged.set(label, (merged.get(label) ?? 0) + r.count);
    }
    return Array.from(merged.entries()).map(([gender, count]) => ({ gender, count }));
  })();
  const genderTotal = genderRaw.reduce((s, r) => s + r.count, 0);

  // risk_trends[].month + .normal_pct + .elevated_pct + .high_pct + .crisis_pct
  // Normalise to a common shape so the render doesn't care which field name the API used
  const riskTrends = (breakdowns?.risk_trends ?? []).map((item) => {
    const r = item as Record<string, unknown>;
    return {
      month:    item.month,
      // API returns *_pct suffixed names — fall back to bare names for resilience
      normal:   (r.normal_pct   ?? r.normal   ?? 0) as number,
      elevated: (r.elevated_pct ?? r.elevated ?? 0) as number,
      high:     (r.high_pct     ?? r.high     ?? 0) as number,
      crisis:   (r.crisis_pct   ?? r.crisis   ?? 0) as number,
    };
  });

  // detection_rate[].month + .rate
  const detectionRate2 = breakdowns?.detection_rate ?? [];
  const detectionMax   = detectionRate2.length > 0
    ? Math.max(...detectionRate2.map((d) => d.rate), 1)
    : 1;

  if (loading) {
    return (
      <div>
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Platform Analytics</div>
            <div className="pg-sub">Hypertension trends by region, gender, age, and risk level</div>
          </div>
        </div>
        <LoadingSpinner message="Loading analytics…" />
      </div>
    );
  }

  return (
    <div>
      {/* ── Header ── */}
      <div className="pg-hdr">
        <div>
          <div className="pg-title">Platform Analytics</div>
          <div className="pg-sub">Hypertension trends by region, gender, age, and risk level</div>
        </div>
        <button className="btn btn-ghost" onClick={handleExport}>
          Export Report ↓
        </button>
      </div>

      {/* ── KPIs ── */}
      <div className="kpi-row">
        <div className="kpi">
          <div className="kpi-lbl">Total Screened (All Time)</div>
          <div className="kpi-val" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2.4rem', fontWeight: 700 }}>
            {totalScreened > 0 ? totalScreened.toLocaleString() : '—'}
          </div>
          <div className="kpi-sub">Cumulative registrations</div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Hypertension Detected</div>
          <div className="kpi-val red" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2.4rem', fontWeight: 700 }}>
            {highBpDetections > 0 ? highBpDetections.toLocaleString() : '—'}
          </div>
          <div className="kpi-sub">
            {detectionRate != null ? `${detectionRate}% detection rate` : 'No BP data yet'}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Referred to Facility</div>
          <div className="kpi-val" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2.4rem', fontWeight: 700 }}>
            {referrals > 0 ? referrals.toLocaleString() : '—'}
          </div>
          <div className="kpi-sub">
            {referralRate != null ? `${referralRate}% referral rate` : 'No referral data yet'}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-lbl">Follow-up Completed</div>
          <div className="kpi-val green" style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2.4rem', fontWeight: 700 }}>
            {followUpCompletions > 0 ? followUpCompletions.toLocaleString() : '—'}
          </div>
          <div className="kpi-sub">Patients followed up</div>
        </div>
      </div>

      {/* ── Row 2: Screenings by Region + Age Distribution ── */}
      <div className="grid-2col">

        {/* Screenings by Region */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Screenings by Region</div>
          </div>
          <div className="card-body">
            {regionalData.length === 0 ? (
              <NoData label="No regional data yet" />
            ) : (
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                {regionalData.map((r, i) => (
                  <div key={`region-${r.region}-${i}`} style={{
                    flex: '1 1 140px', border: '1px solid var(--gray-xlt)',
                    borderRadius: '4px', padding: '14px 16px',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: '.82rem', marginBottom: '10px', color: 'var(--ink)' }}>
                      {r.region}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '.75rem', color: 'var(--gray)', marginBottom: '8px' }}>
                      <span>Screened</span>
                      <span style={{ fontFamily: "'JetBrains Mono',monospace", color: 'var(--ink-mid)', fontWeight: 600 }}>
                        {r.screenings.toLocaleString()}
                      </span>
                    </div>
                    {/* Progress bar relative to max in set */}
                    {(() => {
                      const maxS = Math.max(...regionalData.map(x => x.screenings), 1);
                      const pct  = Math.round((r.screenings / maxS) * 100);
                      return (
                        <div style={{ background: 'var(--color-primary-light)', borderRadius: '2px', height: '6px', overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', background: 'var(--blue)',
                            width: animated ? `${pct}%` : '0%',
                            transition: 'width 1s ease',
                          }} />
                        </div>
                      );
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Age Distribution */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Age Distribution of Screened Patients</div>
          </div>
          <div className="card-body">
            {ageRaw.length === 0 ? (
              <NoData label="No age distribution data yet" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {ageRaw.map((row, i) => {
                  const pct = ageTotal > 0 ? Math.round((row.count / ageTotal) * 100) : 0;
                  return (
                    <div key={`age-${row.age_range}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '48px', fontSize: '.74rem', color: 'var(--ink-mid)', flexShrink: 0 }}>
                        {row.age_range}
                      </div>
                      <div style={{ flex: 1, background: 'var(--gray-xlt)', borderRadius: '2px', height: '9px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%',
                          background: AGE_COLORS[i % AGE_COLORS.length],
                          borderRadius: '2px',
                          width: animated ? `${pct}%` : '0%',
                          transition: `width 1s ease ${i * 80}ms`,
                        }} />
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--gray)', width: '52px', textAlign: 'right' }}>
                        {row.count} ({pct}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 3: Gender + Risk Level Trend ── */}
      <div className="grid-2col">

        {/* Gender Distribution */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Screened by Gender</div>
            <div className="card-sub">All screened patients</div>
          </div>
          <div className="card-body">
            {genderRaw.length === 0 ? (
              <NoData label="No gender data yet" />
            ) : (
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                {genderRaw.map((g, i) => {
                  const pct      = genderTotal > 0 ? Math.round((g.count / genderTotal) * 100) : 0;
                  const color    = i === 0 ? 'var(--blue)' : 'var(--amber)';
                  return (
                    <div key={`${g.gender}-${i}`} style={{ flex: '1 1 120px', minWidth: '100px' }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2.4rem', fontWeight: 700, color, lineHeight: 1 }}>
                        {pct}%
                      </div>
                      <div style={{ fontSize: '.72rem', color: 'var(--gray)', marginBottom: '8px' }}>
                        {g.gender}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.75rem', color: 'var(--ink-mid)' }}>
                        {g.count.toLocaleString()} patients
                      </div>
                      {/* Bar */}
                      <div style={{ background: 'var(--color-primary-light)', borderRadius: '2px', height: '6px', overflow: 'hidden', marginTop: '8px' }}>
                        <div style={{
                          height: '100%', background: color,
                          width: animated ? `${pct}%` : '0%',
                          transition: `width 1s ease ${i * 100}ms`,
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Hypertension Detection Rate Trend */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Hypertension Detection Rate — Trend</div>
            <div className="card-sub">% of screened found to have high BP</div>
          </div>
          <div className="card-body">
            {detectionRate2.length === 0 ? (
              <NoData label="No detection rate data yet" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {detectionRate2.map((entry, i) => {
                  const isLast   = i === detectionRate2.length - 1;
                  const barColor = DETECTION_COLORS[Math.min(i, DETECTION_COLORS.length - 1)];
                  const widthPct = detectionMax > 0 ? (entry.rate / detectionMax) * 100 : 0;
                  return (
                    <div key={`${entry.month}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.65rem', color: 'var(--gray)', width: '28px', flexShrink: 0 }}>
                        {entry.month}
                      </div>
                      <div style={{ flex: 1, background: 'var(--color-primary-light)', borderRadius: '2px', height: '9px', overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', background: barColor, borderRadius: '2px',
                          width: animated ? `${widthPct}%` : '0%',
                          transition: `width 1s ease ${i * 80}ms`,
                        }} />
                      </div>
                      <div style={{
                        fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem',
                        color: isLast && entry.rate > 0 ? barColor : 'var(--gray)',
                        fontWeight: isLast && entry.rate > 0 ? 600 : 400,
                        width: '48px', textAlign: 'right', flexShrink: 0,
                      }}>
                        {entry.rate.toFixed(1)}%{isLast && entry.rate > 0 ? ' ↑' : ''}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 4: Risk Level Trend — full width ── */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Risk Level Trend — Monthly</div>
          <div className="card-sub">How BP risk categories are evolving across the platform</div>
        </div>
        <div className="card-body">
          {riskTrends.length === 0 ? (
            <NoData label="No risk trend data yet" />
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '120px' }}>
                {riskTrends.map((item, i) => {
                  const total = item.normal + item.elevated + item.high + item.crisis;
                  // Skip months with no data — show as empty bar
                  const hasData = total > 0;
                  return (
                    <div key={`${item.month}-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                      <div style={{
                        width: '100%', flex: 1,
                        display: 'flex', flexDirection: 'column-reverse', gap: '1px',
                        borderRadius: '3px 3px 0 0', overflow: 'hidden',
                        background: hasData ? 'transparent' : 'var(--gray-xlt)',
                      }}>
                        {hasData && [
                          { pct: item.normal,   color: BP_COLOR.Normal   },
                          { pct: item.elevated, color: BP_COLOR.Elevated },
                          { pct: item.high,     color: BP_COLOR.High     },
                          { pct: item.crisis,   color: BP_COLOR.Crisis   },
                        ].map((seg, j) => (
                          <div key={j} style={{
                            width: '100%',
                            background: seg.color,
                            height: animated ? `${seg.pct}%` : '0%',
                            transition: `height 1s ease ${300 + i * 80}ms`,
                          }} title={`${['Normal','Elevated','High','Crisis'][j]}: ${seg.pct}%`} />
                        ))}
                      </div>
                      <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.6rem', color: 'var(--gray)', marginTop: '5px' }}>
                        {item.month}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '14px', marginTop: '12px', flexWrap: 'wrap' }}>
                {['Normal', 'Elevated', 'High', 'Crisis'].map((label) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: BP_COLOR[label] }} />
                    <span style={{ fontSize: '.72rem', color: 'var(--gray)' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 5: Follow-up & Adherence by Organisation ── */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Follow-up &amp; Adherence Rates by Organisation</div>
          <div className="card-sub">Evaluating programme effectiveness</div>
        </div>
        <div className="tbl-scroll">
          {performance.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
                No organisation performance data yet
              </span>
            </div>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Organisation</th>
                  <th>Region</th>
                  <th>Total Screened</th>
                  <th>High BP</th>
                  <th>Referred</th>
                  <th>Followed Up</th>
                  <th>On Treatment</th>
                  <th>Adherence</th>
                </tr>
              </thead>
              <tbody>
                {performance.map((row, idx) => {
                  const r = row as Record<string, unknown>;

                  // Available from API
                  const name    = (row.institution_name ?? row.name ?? '—') as string;
                  const region  = (r.region as string | null) ?? '—';
                  const screened = Number(row.screened ?? row.total_screened ?? 0);
                  const highBpRate = Number(
                    r.high_bp_rate ?? row.high_bp ?? row.high_bp_count ?? 0,
                  );

                  // Not yet returned by API — show — until backend adds them
                  const referred   = row.referred    ?? row.referrals              ?? null;
                  const followedUp = row.followed_up ?? row.follow_up_completions  ?? null;
                  const onTreatment= row.on_treatment ?? row.on_active_treatment   ?? null;
                  const adherence  = row.adherence_rate ?? row.avg_adherence       ?? null;

                  return (
                    <tr key={name + idx}>
                      <td style={{ fontWeight: 500 }}>{name}</td>
                      <td style={{ fontSize: '.8rem', color: 'var(--ink-mid)' }}>{region}</td>
                      <td className="mono">{screened > 0 ? screened.toLocaleString() : '0'}</td>
                      <td>
                        {highBpRate > 0 ? (
                          <AdherenceBar
                            percent={Math.round(highBpRate)}
                            color={highBpRate >= 50 ? 'amber' : 'green'}
                          />
                        ) : (
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--gray)' }}>0%</span>
                        )}
                      </td>
                      <td className="mono" title={referred == null ? 'Data not yet available' : undefined}>
                        {referred != null ? Number(referred).toLocaleString() : '—'}
                      </td>
                      <td className="mono" title={followedUp == null ? 'Data not yet available' : undefined}>
                        {followedUp != null ? Number(followedUp).toLocaleString() : '—'}
                      </td>
                      <td className="mono" style={{ color: onTreatment != null && Number(onTreatment) > 0 ? 'var(--green)' : undefined }}
                          title={onTreatment == null ? 'Data not yet available' : undefined}>
                        {onTreatment != null ? Number(onTreatment).toLocaleString() : '—'}
                      </td>
                      <td title={adherence == null ? 'Data not yet available' : undefined}>
                        {adherence != null ? (
                          <AdherenceBar
                            percent={Math.round(Number(adherence))}
                            color={Number(adherence) >= 70 ? 'green' : 'amber'}
                          />
                        ) : (
                          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--gray)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
