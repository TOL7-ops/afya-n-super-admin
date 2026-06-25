'use client';

import { useEffect, useState, useCallback } from 'react';
import Badge from '@/components/shared/Badge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import LicenseViewModal from '@/components/modals/LicenseViewModal';
import type { ToastType } from '@/types';
import {
  getLicensesSummary,
  listLicenses,
  sendLicenseReminder,
  sendRenewalEmail,
} from '@/services/licenses.service';
import type { LicenseSummaryResponse, LicenseItem } from '@/types/api';
import { extractAmountFromPlan, cleanPlanLabel } from '@/utils/planAmount';
import { deriveLicenseStatus, statusToVariant } from '@/utils/licenseStatus';
import { useInstitutionsStore } from '@/stores/institutionsStore';

interface LicensesViewProps {
  onToast: (msg: string, type?: ToastType) => void;
  refreshKey?: number;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function LicensesView({
  onToast,
  refreshKey = 0,
}: LicensesViewProps) {
  const [summary, setSummary]         = useState<LicenseSummaryResponse | null>(null);
  const [licenses, setLicenses]       = useState<LicenseItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [viewingLicense, setViewingLicense] = useState<LicenseItem | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [licRes, sumRes] = await Promise.allSettled([
        listLicenses(),
        getLicensesSummary(),
      ]);

      if (licRes.status === 'fulfilled') {
        setLicenses(licRes.value);
        console.log('[Licenses] count:', licRes.value.length, 'sample[0]:', licRes.value[0]);
      } else {
        console.warn('[Licenses] list failed:', licRes.reason);
        onToast('Failed to load licenses — try again', 'warn');
      }

      if (sumRes.status === 'fulfilled') {
        setSummary(sumRes.value);
      } else {
        console.warn('[Licenses] summary failed (non-critical):', sumRes.reason);
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadAll(); }, [loadAll, refreshKey]);

  // Sync is_active from the global store into the licenses list.
  // When a user suspends from the Institutions page, the store updates immediately.
  // This effect mirrors that change into licenses so both pages stay in sync.
  const storeInstitutions = useInstitutionsStore((s) => s.institutions);

  const licensesWithSyncedStatus = licenses.map((lic) => {
    const storeInst = storeInstitutions.find(
      (inst) => inst.id === lic.institution_id ||
        inst.name.trim().toLowerCase() === lic.institution_name?.trim().toLowerCase(),
    );
    if (!storeInst) return lic;
    return { ...lic, is_active: storeInst.is_active };
  });

  // ── Action handlers — Remind and Email only ─────────────────────────────
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
      onToast('Failed to send renewal email — try again', 'warn');
    }
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

  // ── FIX 2: KPI cards — computed from synced licenses (store is_active applied) ──
  const activeLicenses   = licensesWithSyncedStatus.filter(l => deriveLicenseStatus(l) === 'Active').length;
  const expiringLicenses = licensesWithSyncedStatus.filter(l => deriveLicenseStatus(l) === 'Expiring').length;

  // ── FIX 5: Seat utilisation — from summary only ───────────────────────────
  const seatUtilPct  = summary?.seat_utilization_pct ?? null;
  const seatsActive  = summary?.seats_active ?? null;
  const seatsTotal   = (summary as Record<string, unknown> | null)?.seats_total as number | undefined ?? null;

  const seatDisplay = seatUtilPct != null
    ? `${Math.round(seatUtilPct)}%`
    : '—';
  const seatSub = seatsActive != null
    ? seatsTotal != null
      ? `${seatsActive} / ${seatsTotal} seats (${Math.round(seatUtilPct ?? 0)}%)`
      : `${seatsActive} seats active`
    : 'No seat data available';

  const uniqueInstitutions = new Set(
    licensesWithSyncedStatus.map(l => l.institution_name?.trim().toLowerCase()),
  ).size;

  return (
    <div>
      <div className="pg-hdr">
        <div>
          <div className="pg-title">License Management</div>
          <div className="pg-sub">Subscriptions and billing across all organizations</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row-3">
        <div className="kpi">
          <div className="kpi-ico">🔑</div>
          <div className="kpi-lbl">Active Licenses</div>
          <div className="kpi-val">{activeLicenses}</div>
          <div className="kpi-sub">Across {uniqueInstitutions} institutions</div>
        </div>
        <div className="kpi">
          <div className="kpi-ico">⏰</div>
          <div className="kpi-lbl">Expiring in 30 Days</div>
          <div className="kpi-val amber">{expiringLicenses}</div>
          <div className="kpi-sub">
            {expiringLicenses > 0 ? 'Send renewal reminders' : 'None expiring soon'}
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
        <div className="tbl-scroll">
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
                {/* <th>Actions</th> — commented out, not needed for now */}
              </tr>
            </thead>
            <tbody>
              {licenses.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
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
                licensesWithSyncedStatus.map((lic) => {
                  const status    = deriveLicenseStatus(lic);
                  const variant   = statusToVariant(status);
                  const isExpiring = status === 'Expiring';

                  return (
                    <tr key={lic.id}>
                      <td style={{ fontWeight: 500 }}>{lic.institution_name}</td>
                      <td style={{ fontSize: '.8rem' }}>{cleanPlanLabel(lic.plan)}</td>
                      <td className="mono">
                        {lic.seats != null ? `${lic.seats} seats` : '—'}
                      </td>
                      <td className="id-cell">{fmtDate(lic.start_date)}</td>
                      <td
                        className="id-cell"
                        style={isExpiring ? { color: 'var(--amber)', fontWeight: 500 } : undefined}
                      >
                        {fmtDate(lic.expires_at)}
                      </td>
                      <td
                        className="mono"
                        style={{ color: (lic.amount ?? 0) > 0 ? 'var(--green)' : 'var(--gray)' }}
                      >
                        {(lic.amount ?? 0) > 0
                          ? `GHS ${(lic.amount as number).toLocaleString()}`
                          : '—'}
                      </td>
                      <td>
                        <Badge variant={variant}>{status}</Badge>
                      </td>
                      {/* Actions column — commented out for now
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                          {(variant === 'active' || variant === 'expiring' || variant === 'trial') && (
                            <button className="btn-icon" onClick={() => setViewingLicense(lic)}>
                              View
                            </button>
                          )}
                          {variant === 'active' && (
                            <button className="btn-icon" onClick={() => handleSendRenewalEmail(lic)}>
                              Email
                            </button>
                          )}
                          {variant === 'expiring' && (
                            <button
                              className="btn-icon"
                              style={{ color: 'var(--amber)', borderColor: 'var(--amber-border)' }}
                              onClick={() => handleRemind(lic)}
                            >
                              Remind
                            </button>
                          )}
                          {(variant === 'suspended' || variant === 'pending') && (
                            <span style={{
                              fontFamily: "'JetBrains Mono',monospace",
                              fontSize: '.65rem',
                              color: 'var(--gray)',
                            }}>
                              Inactive
                            </span>
                          )}
                        </div>
                      </td>
                      */}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewingLicense && (
        <LicenseViewModal
          isOpen={true}
          onClose={() => setViewingLicense(null)}
          data={{
            title: `License — ${viewingLicense.institution_name}`,
            institution: viewingLicense.institution_name,
            plan: cleanPlanLabel(viewingLicense.plan),
            seats: viewingLicense.seats ?? 0,
            startDate: fmtDate(viewingLicense.start_date),
            expiry: fmtDate(viewingLicense.expires_at),
            amount: viewingLicense.amount ?? 0,
          }}
          onRenewalEmail={() => {
            setViewingLicense(null);
            handleSendRenewalEmail(viewingLicense);
          }}
        />
      )}
    </div>
  );
}
