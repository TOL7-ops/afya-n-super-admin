'use client';

import { useEffect, useState, useCallback } from 'react';
import Badge from '@/components/shared/Badge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ToastType } from '@/types';
import {
  getLicensesSummary,
  listLicenses,
  renewLicense,
  sendLicenseReminder,
  sendRenewalEmail,
  convertTrial,
} from '@/services/licenses.service';
import type { LicenseSummaryResponse, LicenseItem } from '@/types/api';

interface LicensesViewProps {
  onIssueLicense: () => void;
  onConvertTrial: (id: string, name: string) => void;
  onToast: (msg: string, type?: ToastType) => void;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/** Derive status from is_active + expires_at since API doesn't always return status */
function deriveLicenseStatus(lic: LicenseItem): string {
  // If API gives us an explicit status string, use it
  if (lic.status) return lic.status;

  if (!lic.is_active) return 'Suspended';

  const expiryIso = lic.expires_at ?? lic.expiry_date;
  if (!expiryIso) {
    // Active but no expiry — plan says "Trial"
    if ((lic.plan ?? '').toLowerCase().includes('trial')) return 'Trial';
    return 'Active';
  }

  const expiryMs = new Date(expiryIso).getTime();
  const now = Date.now();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;

  if (expiryMs <= now)                return 'Expired';
  if (expiryMs - now <= thirtyDays)   return 'Expiring';
  return 'Active';
}

function licenseStatusVariant(
  status: string | null | undefined,
): 'active' | 'expiring' | 'trial' | 'suspended' | 'pending' {
  if (!status) return 'pending';
  const s = status.toLowerCase();
  if (s === 'active')                          return 'active';
  if (s === 'expiring' || s.includes('expir')) return 'expiring';
  if (s === 'trial'    || s.includes('trial')) return 'trial';
  if (s === 'suspended' || s === 'expired')    return 'suspended';
  return 'pending';
}

export default function LicensesView({
  onIssueLicense,
  onConvertTrial,
  onToast,
}: LicensesViewProps) {
  const [summary, setSummary]   = useState<LicenseSummaryResponse | null>(null);
  const [licenses, setLicenses] = useState<LicenseItem[]>([]);
  const [loading, setLoading]   = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // Load licenses first — always needed; summary is best-effort
      const [licRes, sumRes] = await Promise.allSettled([
        listLicenses(),
        getLicensesSummary(),
      ]);

      if (licRes.status === 'fulfilled') {
        setLicenses(licRes.value);
        console.log('[Licenses] List:', licRes.value);
      } else {
        console.warn('[Licenses] List failed:', licRes.reason);
        onToast('Failed to load licenses — try again', 'warn');
      }

      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value);
        console.log('[Licenses] Summary:', sumRes.value);
      } else {
        console.warn('[Licenses] Summary failed (non-critical):', sumRes.reason);
        // Derive KPIs from the license list itself as fallback
        if (licRes.status === 'fulfilled') {
          const list = licRes.value;
          const now = Date.now();
          const thirtyDays = 30 * 24 * 60 * 60 * 1000;
          const active = list.filter(l => {
            const s = deriveLicenseStatus(l);
            return s === 'Active' || s === 'Expiring';
          }).length;
          const expiring = list.filter(l => {
            const exp = l.expires_at ?? l.expiry_date;
            if (!exp) return false;
            const ms = new Date(exp).getTime() - now;
            return ms > 0 && ms <= thirtyDays;
          }).length;
          const totalSeats = list.reduce((s, l) => s + (l.seats ?? 0), 0);
          const totalRevenue = list.reduce((s, l) => s + (l.amount ?? 0), 0);
          setSummary({
            active_licenses: active,
            expiring_licenses: expiring,
            seat_utilization_pct: 0,
            seats_active: totalSeats,
          });
          console.log('[Licenses] Fallback KPIs — active:', active, 'expiring:', expiring, 'seats:', totalSeats, 'revenue:', totalRevenue);
        }
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRenew = async (lic: LicenseItem) => {
    try {
      await renewLicense(lic.id);
      onToast(`✓ Renewal initiated for ${lic.institution_name}`, 'success');
      loadAll();
    } catch {
      onToast(`Failed to renew ${lic.institution_name} — try again`, 'warn');
    }
  };

  const handleRemind = async (lic: LicenseItem) => {
    try {
      await sendLicenseReminder(lic.id);
      onToast(`Renewal reminder sent to ${lic.institution_name}`, 'success');
    } catch {
      onToast(`Failed to send reminder for ${lic.institution_name}`, 'warn');
    }
  };

  const handleSendRenewalEmail = async (lic: LicenseItem) => {
    try {
      await sendRenewalEmail(lic.id);
      onToast(`Renewal email sent to ${lic.institution_name}`, 'success');
    } catch {
      onToast(`Failed to send renewal email — try again`, 'warn');
    }
  };

  const handleConvertTrial = async (lic: LicenseItem) => {
    // Open the convert trial modal via parent callback
    onConvertTrial(String(lic.id), lic.institution_name);
  };

  if (loading) {
    return (
      <div>
        <div className="pg-hdr">
          <div>
            <div className="pg-title">License Management</div>
            <div className="pg-sub">Subscriptions, renewals, and billing across all institutions</div>
          </div>
        </div>
        <LoadingSpinner message="Loading licenses…" />
      </div>
    );
  }

  // ── KPI display values ────────────────────────────────────────────────────
  const activeLicenses  = summary?.active_licenses ?? 0;
  const expiringCount   = summary?.expiring_licenses ?? 0;
  const seatUtilPct     = summary?.seat_utilization_pct ?? null;
  const seatsActive     = summary?.seats_active ?? null;

  const seatDisplay = seatUtilPct != null
    ? `${seatUtilPct.toFixed(0)}%`
    : '—';
  const seatSub = seatsActive != null
    ? `${seatsActive} seats active`
    : 'No seat data available';

  return (
    <div>
      <div className="pg-hdr">
        <div>
          <div className="pg-title">License Management</div>
          <div className="pg-sub">Subscriptions, renewals, and billing across all institutions</div>
        </div>
        <button className="btn btn-red" onClick={onIssueLicense}>
          Issue License
        </button>
      </div>

      {/* KPIs — from /super-admin/licenses/summary */}
      <div className="kpi-row-3">
        <div className="kpi">
          <div className="kpi-ico">🔑</div>
          <div className="kpi-lbl">Active Licenses</div>
          <div className="kpi-val">{activeLicenses}</div>
          <div className="kpi-sub">Across {licenses.length} institutions</div>
        </div>
        <div className="kpi">
          <div className="kpi-ico">⏰</div>
          <div className="kpi-lbl">Expiring in 30 Days</div>
          <div className="kpi-val amber">{expiringCount}</div>
          <div className="kpi-sub">
            {expiringCount > 0 ? 'Send renewal reminders' : 'None expiring soon'}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi-ico">🪑</div>
          <div className="kpi-lbl">Seat Utilisation</div>
          <div className={`kpi-val${seatUtilPct != null ? ' green' : ''}`}>{seatDisplay}</div>
          <div className="kpi-sub">{seatSub}</div>
        </div>
      </div>

      {/* License Registry */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">License Registry</div>
          <div className="card-sub">All active and pending licenses</div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Institution</th>
                <th>Plan</th>
                <th>Seats</th>
                <th>Start Date</th>
                <th>Expiry</th>
                <th>Amount (GHS)</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {licenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    style={{
                      textAlign: 'center', padding: '24px',
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: '.72rem', color: 'var(--gray)',
                    }}
                  >
                    No licenses found
                  </td>
                </tr>
              ) : (
                licenses.map((lic) => {
                  const derivedStatus = deriveLicenseStatus(lic);
                  const statusKey     = licenseStatusVariant(derivedStatus);
                  const isExpiring    = statusKey === 'expiring';
                  const expiryIso     = lic.expires_at ?? lic.expiry_date;
                  const expiryStyle   = isExpiring
                    ? { color: 'var(--amber)', fontWeight: 500 }
                    : undefined;

                  return (
                    <tr key={lic.id}>
                      <td style={{ fontWeight: 500 }}>{lic.institution_name}</td>
                      <td style={{ fontSize: '.8rem' }}>{lic.plan}</td>
                      <td className="mono">
                        {lic.seats != null ? `${lic.seats} seats` : '—'}
                      </td>
                      {/* Start date — now returned by API */}
                      <td className="id-cell">{fmtDate(lic.start_date)}</td>
                      <td className="id-cell" style={expiryStyle}>
                        {fmtDate(expiryIso)}
                      </td>
                      <td className="mono" style={{ color: (lic.amount ?? 0) > 0 ? 'var(--green)' : 'var(--gray)' }}>
                        {lic.amount != null ? `GHS ${lic.amount.toLocaleString()}` : '—'}
                      </td>
                      <td>
                        <Badge variant={statusKey}>{derivedStatus}</Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>

                          {statusKey === 'active' && (
                            <>
                              <button className="btn-icon" onClick={() => handleRenew(lic)}>
                                Renew
                              </button>
                              <button className="btn-icon" onClick={() => handleSendRenewalEmail(lic)}>
                                Email
                              </button>
                            </>
                          )}

                          {statusKey === 'expiring' && (
                            <button
                              className="btn-icon"
                              style={{ color: 'var(--amber)', borderColor: 'var(--amber-border)' }}
                              onClick={() => handleRemind(lic)}
                            >
                              Remind
                            </button>
                          )}

                          {statusKey === 'trial' && (
                            <button
                              className="btn-icon"
                              onClick={() => handleConvertTrial(lic)}
                            >
                              Convert to Paid
                            </button>
                          )}

                          {(statusKey === 'suspended' || statusKey === 'pending') && (
                            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.65rem', color: 'var(--gray)' }}>
                              Inactive
                            </span>
                          )}
                        </div>
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
