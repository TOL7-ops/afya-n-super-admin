'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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

export default function LicensesView({ onToast, refreshKey = 0 }: LicensesViewProps) {
  const [totalActive, setTotalActive] = useState<number | null>(null);
  const [licenses, setLicenses]       = useState<LicenseItem[]>([]);
  const [loading, setLoading]         = useState(true);
  const [viewingLicense, setViewingLicense] = useState<LicenseItem | null>(null);

  // ── Filter + sort state ──────────────────────────────────────────────────
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [planFilter,   setPlanFilter]   = useState('');
  const [sortKey,      setSortKey]      = useState('newest');
  const clearFilters = () => { setSearch(''); setStatusFilter(''); setPlanFilter(''); setSortKey('newest'); };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const { total_active, subscriptions } = await getSubscriptions();
      setTotalActive(total_active);
      setLicenses(subscriptions);
    } catch (err) {
      console.warn('[Licenses] load failed:', err);
      onToast('Failed to load subscriptions — try again', 'warn');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadAll(); }, [loadAll, refreshKey]);

  const storeInstitutions = useInstitutionsStore((s) => s.institutions);

  const licensesWithSyncedStatus = licenses.map((lic) => {
    const storeInst = storeInstitutions.find(
      (inst) => inst.id === lic.institution_id ||
        inst.name.trim().toLowerCase() === lic.institution_name?.trim().toLowerCase(),
    );
    if (!storeInst) return lic;
    return { ...lic, is_active: storeInst.is_active };
  });

  // ── Client-side filter + sort ────────────────────────────────────────────
  const filteredLicenses = useMemo(() => {
    let list = licensesWithSyncedStatus;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((l) => {
        const raw  = l as Record<string, unknown>;
        const name = ((raw.name as string | null) ?? l.institution_name ?? '').toLowerCase();
        const email = ((raw.email as string | null) ?? '').toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }
    if (statusFilter) {
      const statusMap: Record<string, string> = {
        'Active': 'Active', 'Trial': 'Trial', 'Expiring Soon': 'Expiring',
        'Expired': 'Suspended', 'Suspended': 'Suspended', 'Cancelled': 'Suspended',
      };
      const target = statusMap[statusFilter] ?? statusFilter;
      list = list.filter((l) => deriveLicenseStatus(l) === target);
    }
    if (planFilter) {
      const p = planFilter.toLowerCase();
      list = list.filter((l) => (l.plan ?? '').toLowerCase().includes(p));
    }
    list = [...list].sort((a, b) => {
      const rawA = a as Record<string, unknown>;
      const rawB = b as Record<string, unknown>;
      const nameA = ((rawA.name as string | null) ?? a.institution_name ?? '').toLowerCase();
      const nameB = ((rawB.name as string | null) ?? b.institution_name ?? '').toLowerCase();
      const expiryA = a.expires_at ? new Date(a.expires_at).getTime() : 0;
      const expiryB = b.expires_at ? new Date(b.expires_at).getTime() : 0;
      const startA  = a.start_date ? new Date(a.start_date).getTime() : 0;
      const startB  = b.start_date ? new Date(b.start_date).getTime() : 0;
      switch (sortKey) {
        case 'newest':      return startB  - startA;
        case 'oldest':      return startA  - startB;
        case 'expiry_asc':  return expiryA - expiryB;
        case 'expiry_desc': return expiryB - expiryA;
        case 'name_asc':    return nameA.localeCompare(nameB);
        case 'name_desc':   return nameB.localeCompare(nameA);
        default:            return 0;
      }
    });
    return list;
  }, [licensesWithSyncedStatus, search, statusFilter, planFilter, sortKey]);

  const hasActiveFilters = !!(search || statusFilter || planFilter || sortKey !== 'newest');

  const handleRemind = async (lic: LicenseItem) => {
    const name = (lic as Record<string,unknown>).name as string ?? lic.institution_name ?? '—';
    try { await sendLicenseReminder(lic.id); onToast(`Renewal reminder sent to ${name}`, 'success'); }
    catch { onToast(`Failed to send reminder for ${name}`, 'warn'); }
  };

  const handleSendRenewalEmail = async (lic: LicenseItem) => {
    const name = (lic as Record<string,unknown>).name as string ?? lic.institution_name ?? '—';
    try { await sendRenewalEmail(lic.id); onToast(`Renewal email sent to ${name}`, 'success'); }
    catch { onToast('Failed to send renewal email — try again', 'warn'); }
  };

  // ── KPI computations ─────────────────────────────────────────────────────
  const activeLicenses   = totalActive ?? licensesWithSyncedStatus.filter(l => deriveLicenseStatus(l) === 'Active').length;
  const expiringLicenses = licensesWithSyncedStatus.filter(l => deriveLicenseStatus(l) === 'Expiring').length;
  const hasAnyLimit = licenses.some(l => typeof (l as Record<string,unknown>).seats_limit === 'number');
  const seatsLimitTotal = licenses.reduce((s, l) => {
    const v = (l as Record<string,unknown>).seats_limit;
    return s + (typeof v === 'number' ? v : 0);
  }, 0);
  const seatsUsed = licenses.reduce((s, l) => {
    const v = (l as Record<string,unknown>).seats_used;
    return s + (typeof v === 'number' ? v : 0);
  }, 0);
  const seatUtilPct = hasAnyLimit && seatsLimitTotal > 0 ? Math.round((seatsUsed / seatsLimitTotal) * 100) : null;
  const seatDisplay = seatsUsed > 0 || hasAnyLimit ? (hasAnyLimit ? `${seatUtilPct}%` : `${seatsUsed}`) : '—';
  const seatSub = seatsUsed > 0
    ? hasAnyLimit ? `${seatsUsed} / ${seatsLimitTotal} seats used` : `${seatsUsed} seats in use · no limit set`
    : hasAnyLimit ? `0 / ${seatsLimitTotal} seats used` : 'No seats in use yet';
  const uniqueOrgs = new Set(licensesWithSyncedStatus.map(l => {
    const n = (l as Record<string,unknown>).name ?? l.institution_name;
    return typeof n === 'string' ? n.trim().toLowerCase() : '';
  })).size;

  if (loading) {
    return (
      <div>
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Subscription Management</div>
            <div className="pg-sub">Subscriptions, renewals, and billing across all organisations</div>
          </div>
        </div>
        <LoadingSpinner message="Loading subscriptions…" />
      </div>
    );
  }

  return (
    <div>
      <div className="pg-hdr">
        <div>
          <div className="pg-title">Subscription Management</div>
          <div className="pg-sub">Subscriptions and billing across all organizations</div>
        </div>
      </div>

      {/* KPIs */}
      <div className="kpi-row-3">
        <div className="kpi">
          <div className="kpi-ico">🔑</div>
          <div className="kpi-lbl">Active Subscriptions</div>
          <div className="kpi-val">{activeLicenses}</div>
          <div className="kpi-sub">Across {uniqueOrgs} organisations</div>
        </div>
        <div className="kpi">
          <div className="kpi-ico">⏰</div>
          <div className="kpi-lbl">Expiring in 30 Days</div>
          <div className="kpi-val amber">{expiringLicenses}</div>
          <div className="kpi-sub">{expiringLicenses > 0 ? 'Send renewal reminders' : 'None expiring soon'}</div>
        </div>
        <div className="kpi">
          <div className="kpi-ico">🪑</div>
          <div className="kpi-lbl">Seat Utilisation</div>
          <div className={`kpi-val${seatsUsed > 0 ? ' green' : ''}`}>{seatDisplay}</div>
          <div className="kpi-sub">{seatSub}</div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', padding: '14px 18px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-wrap" style={{ flex: '2 1 200px' }}>
            <svg className="search-ico" width="14" height="14" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input className="search-input" type="text" placeholder="Search organisation name…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="filter-sel" style={{ flex: '1 1 150px' }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Trial">Trial</option>
            <option value="Expiring Soon">Expiring Soon</option>
            <option value="Expired">Expired</option>
            <option value="Suspended">Suspended</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <select className="filter-sel" style={{ flex: '1 1 130px' }} value={planFilter} onChange={(e) => setPlanFilter(e.target.value)}>
            <option value="">All Plans</option>
            <option value="Starter">Starter</option>
            <option value="Pro">Pro</option>
            <option value="Plus">Plus</option>
            <option value="Enterprise">Enterprise</option>
            <option value="Trial">Trial</option>
          </select>
          <select className="filter-sel" style={{ flex: '1 1 190px' }} value={sortKey} onChange={(e) => setSortKey(e.target.value)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="expiry_asc">Expiry — Nearest First</option>
            <option value="expiry_desc">Expiry — Latest First</option>
            <option value="name_asc">Organisation A–Z</option>
            <option value="name_desc">Organisation Z–A</option>
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto', flexShrink: 0 }}>
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.65rem', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
              Showing {filteredLicenses.length} of {licensesWithSyncedStatus.length}
            </span>
            {hasActiveFilters && (
              <button className="btn btn-ghost" style={{ fontSize: '.76rem', padding: '6px 12px', minHeight: '36px' }} onClick={clearFilters}>
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Registry */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Subscription Registry</div>
          <div className="card-sub">
            {filteredLicenses.length} of {licensesWithSyncedStatus.length} subscription{licensesWithSyncedStatus.length !== 1 ? 's' : ''}
          </div>
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
              {filteredLicenses.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '24px', fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
                    {hasActiveFilters ? 'No subscriptions match your filters' : 'No subscriptions found'}
                  </td>
                </tr>
              ) : filteredLicenses.map((lic) => {
                const raw         = lic as Record<string, unknown>;
                const displayName = (raw.name as string | null) ?? lic.institution_name ?? '—';
                const displayType = (raw.type as string | null) ?? '—';
                const seatsLimit  = raw.seats_limit as number | null ?? lic.seats ?? null;
                const seatsUsedN  = raw.seats_used as number | null ?? null;
                const status      = deriveLicenseStatus(lic);
                const variant     = statusToVariant(status);
                const isExpiring  = status === 'Expiring';
                return (
                  <tr key={lic.id}>
                    <td style={{ fontWeight: 500 }}>{displayName}</td>
                    <td style={{ fontSize: '.8rem', color: 'var(--ink-mid)' }}>{displayType}</td>
                    <td style={{ fontSize: '.8rem' }}>{cleanPlanLabel(lic.plan)}</td>
                    <td className="mono">{seatsUsedN ?? 0}</td>
                    <td><UnlimitedPill seatsLimit={seatsLimit} /></td>
                    <td className="id-cell">{fmtDate(lic.start_date)}</td>
                    <td className="id-cell" style={isExpiring ? { color: 'var(--amber)', fontWeight: 500 } : undefined}>
                      {fmtDate(lic.expires_at)}
                    </td>
                    <td><Badge variant={variant}>{status}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {viewingLicense && (
        <LicenseViewModal
          isOpen={true}
          onClose={() => setViewingLicense(null)}
          data={{
            title: `Subscription — ${(viewingLicense as Record<string,unknown>).name ?? viewingLicense.institution_name ?? '—'}`,
            institution: (viewingLicense as Record<string,unknown>).name as string ?? viewingLicense.institution_name ?? '—',
            plan: cleanPlanLabel(viewingLicense.plan),
            seats: (viewingLicense as Record<string,unknown>).seats_limit as number ?? viewingLicense.seats ?? 0,
            startDate: fmtDate(viewingLicense.start_date),
            expiry: fmtDate(viewingLicense.expires_at),
            amount: viewingLicense.amount ?? 0,
          }}
          onRenewalEmail={() => { setViewingLicense(null); handleSendRenewalEmail(viewingLicense); }}
        />
      )}
    </div>
  );
}
