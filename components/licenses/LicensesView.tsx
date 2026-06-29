'use client';

import { useEffect, useState, useCallback } from 'react';
import Badge from '@/components/shared/Badge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import LicenseViewModal from '@/components/modals/LicenseViewModal';
import type { ToastType } from '@/types';
import {
  getSubscriptions,
  sendLicenseReminder,
  sendRenewalEmail,
} from '@/services/licenses.service';
import type { LicenseItem } from '@/types/api';
import { cleanPlanLabel } from '@/utils/planAmount';
import { deriveLicenseStatus, statusToVariant } from '@/utils/licenseStatus';
import { useInstitutionsStore } from '@/stores/institutionsStore';
import UnlimitedPill from '@/components/shared/UnlimitedPill';

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
  const [totalActive, setTotalActive]   = useState<number | null>(null);
  const [totalMrr, setTotalMrr]         = useState<number | null>(null);
  const [licenses, setLicenses]         = useState<LicenseItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [viewingLicense, setViewingLicense] = useState<LicenseItem | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { total_active, total_mrr, subscriptions } = await getSubscriptions();
      setTotalActive(total_active);
      setTotalMrr(total_mrr);
      setLicenses(subscriptions);
      console.log('[Licenses] count:', subscriptions.length, 'sample[0]:', subscriptions[0]);
    } catch (err) {
      console.warn('[Licenses] load failed:', err);
      onToast('Failed to load licenses — try again', 'warn');
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
    const displayName = (lic as Record<string,unknown>).name as string ?? lic.institution_name ?? '—';
    try {
      await sendLicenseReminder(lic.id);
      onToast(`Renewal reminder sent to ${displayName}`, 'success');
    } catch {
      onToast(`Failed to send reminder for ${displayName}`, 'warn');
    }
  };

  const handleSendRenewalEmail = async (lic: LicenseItem) => {
    const displayName = (lic as Record<string,unknown>).name as string ?? lic.institution_name ?? '—';
    try {
      await sendRenewalEmail(lic.id);
      onToast(`Renewal email sent to ${displayName}`, 'success');
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

  // KPIs — from the real API fields
  // total_active comes from the wrapper; expiring computed from list
  const activeLicenses   = totalActive ?? licensesWithSyncedStatus.filter(l => deriveLicenseStatus(l) === 'Active').length;
  const expiringLicenses = licensesWithSyncedStatus.filter(l => deriveLicenseStatus(l) === 'Expiring').length;

  // Seat totals — sum across all subscriptions
  // seats_limit is null for unlimited plans — sum only non-null values
  const seatsLimitTotal = licenses.reduce((s, l) => {
    const v = (l as Record<string,unknown>).seats_limit;
    return s + (typeof v === 'number' ? v : 0);
  }, 0);
  // Count rows that actually have a seats_limit set (non-null)
  const hasAnyLimit = licenses.some(l => {
    const v = (l as Record<string,unknown>).seats_limit;
    return typeof v === 'number';
  });
  const seatsUsed = licenses.reduce((s, l) => {
    const v = (l as Record<string,unknown>).seats_used;
    return s + (typeof v === 'number' ? v : 0);
  }, 0);

  // Utilisation % only meaningful when there's a limit
  const seatUtilPct = hasAnyLimit && seatsLimitTotal > 0
    ? Math.round((seatsUsed / seatsLimitTotal) * 100)
    : null;

  // Display: always show seats used; percentage only when limit exists
  const seatDisplay = seatsUsed > 0 || hasAnyLimit
    ? hasAnyLimit
      ? `${seatUtilPct}%`
      : `${seatsUsed}`
    : '—';
  const seatSub = seatsUsed > 0
    ? hasAnyLimit
      ? `${seatsUsed} / ${seatsLimitTotal} seats used`
      : `${seatsUsed} seats in use · no limit set`
    : hasAnyLimit
      ? `0 / ${seatsLimitTotal} seats used`
      : 'No seats in use yet';

  const uniqueInstitutions = new Set(
    licensesWithSyncedStatus.map(l => {
      const n = (l as Record<string,unknown>).name ?? l.institution_name;
      return typeof n === 'string' ? n.trim().toLowerCase() : '';
    }),
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
          <div className={`kpi-val${seatsUsed > 0 ? ' green' : ''}`}>{seatDisplay}</div>
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
                <th>Organisation Name</th>
                <th>Type</th>
                <th>Plan</th>
                <th>Seats Used</th>
                <th>Seats Limit</th>
                <th>Start Date</th>
                <th>Expiry</th>
                <th>Status</th>
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
                licensesWithSyncedStatus.map((lic) => {
                  const raw         = lic as Record<string, unknown>;
                  // Real API fields: name, type, plan, expires_at, is_active, seats_limit, seats_used
                  const displayName = (raw.name as string | null) ?? lic.institution_name ?? '—';
                  const displayType = (raw.type as string | null) ?? '—';
                  const seatsLimit  = raw.seats_limit as number | null ?? lic.seats ?? null;
                  const seatsUsedN  = raw.seats_used  as number | null ?? null;

                  const status     = deriveLicenseStatus(lic);
                  const variant    = statusToVariant(status);
                  const isExpiring = status === 'Expiring';

                  return (
                    <tr key={lic.id}>
                      <td style={{ fontWeight: 500 }}>{displayName}</td>
                      <td style={{ fontSize: '.8rem', color: 'var(--ink-mid)' }}>{displayType}</td>
                      <td style={{ fontSize: '.8rem' }}>{cleanPlanLabel(lic.plan)}</td>
                      <td className="mono">{seatsUsedN ?? 0}</td>
                      <td>
                        <UnlimitedPill seatsLimit={seatsLimit} />
                      </td>
                      <td className="id-cell">{fmtDate(lic.start_date)}</td>
                      <td
                        className="id-cell"
                        style={isExpiring ? { color: 'var(--amber)', fontWeight: 500 } : undefined}
                      >
                        {fmtDate(lic.expires_at)}
                      </td>
                      <td>
                        <Badge variant={variant}>{status}</Badge>
                      </td>
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
            title: `License — ${(viewingLicense as Record<string,unknown>).name ?? viewingLicense.institution_name ?? '—'}`,
            institution: (viewingLicense as Record<string,unknown>).name as string ?? viewingLicense.institution_name ?? '—',
            plan: cleanPlanLabel(viewingLicense.plan),
            seats: (viewingLicense as Record<string,unknown>).seats_limit as number ?? viewingLicense.seats ?? 0,
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
