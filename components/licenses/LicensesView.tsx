'use client';

import { useEffect, useState, useCallback } from 'react';import Badge from '@/components/shared/Badge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import LicenseViewModal from '@/components/modals/LicenseViewModal';
import type { ToastType } from '@/types';
import {
  getSubscriptions,
  sendLicenseReminder,
  sendRenewalEmail,
  issueLicense,
  performLicenseAction,
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

// ─── Static license types (swap for API call when endpoint is available) ──────
const LICENSE_TYPES = ['Basic', 'Professional', 'Enterprise', 'Plus', 'Trial'];

// ─── Issue License Modal ───────────────────────────────────────────────────────
interface IssueLicenseModalInlineProps {
  isOpen: boolean;
  onClose: () => void;
  onToast: (msg: string, type?: '' | 'success' | 'warn') => void;
  onSuccess: () => void;
  /** Currently loaded subscriptions — used to detect duplicates before submitting */
  existingSubs: LicenseItem[];
}

function IssueLicenseModalInline({ isOpen, onClose, onToast, onSuccess, existingSubs }: IssueLicenseModalInlineProps) {
  const storeOrgs  = useInstitutionsStore((s) => s.institutions);

  const EMPTY_FORM = {
    organization: '',
    licenseType: '',
    seats: '',
    expirationDate: '',
    paymentMethod: 'Bank Transfer',
    notes: '',
  };

  const [form, setForm]         = useState({ ...EMPTY_FORM });
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [orgSearch, setOrgSearch]   = useState('');
  const [orgDropOpen, setOrgDropOpen] = useState(false);

  // Duplicate-guard confirmation state
  type DupAction = 'renew' | 'upgrade' | 'issue_anyway';
  const [dupModal, setDupModal] = useState<{
    existingSub: LicenseItem;
    orgName: string;
  } | null>(null);
  const [dupSaving, setDupSaving] = useState(false);
  const [dupMessage, setDupMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setForm({ ...EMPTY_FORM });
      setSaving(false);
      setError(null);
      setOrgSearch('');
      setDupModal(null);
      setDupMessage(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const selectedOrg = storeOrgs.find((o) => o.id === form.organization);

  const filteredOrgs = storeOrgs.filter((o) =>
    o.name.toLowerCase().includes(orgSearch.toLowerCase())
  );

  /** Find any active subscription for the selected org (match by name — no institution_id yet) */
  const findExistingSubscription = (orgName: string): LicenseItem | null => {
    const normalised = orgName.trim().toLowerCase();
    return existingSubs.find((sub) => {
      const raw  = sub as Record<string, unknown>;
      const name = ((raw.name as string | null) ?? sub.institution_name ?? '').trim().toLowerCase();
      return name === normalised && sub.is_active !== false;
    }) ?? null;
  };

  /** Actual POST call — used both for "Issue Anyway" and first-time issue */
  const doIssueLicense = async (orgName: string) => {
    console.log('[IssueLicense] Submitting for org:', orgName, 'id:', selectedOrg?.id ?? 'unknown');
    await issueLicense({
      institution_name: orgName.trim(),
      plan:             form.licenseType,
      start_date:       new Date().toISOString(),
      seats:            form.seats ? Number(form.seats) : 10,
      payment_method:   form.paymentMethod,
    });
  };

  const handleSubmit = async () => {
    if (!form.organization)   { setError('Please select an organization.'); return; }
    if (!form.licenseType)    { setError('Please select a license type.'); return; }
    if (!form.expirationDate) { setError('Please set an expiration date.'); return; }

    const orgName    = selectedOrg!.name;
    const existingSub = findExistingSubscription(orgName);

    if (existingSub) {
      // Block and show confirmation — don't fire the API yet
      console.warn(
        '[IssueLicense] Org already has an active subscription:',
        '\n  Org:', orgName, '| Org ID:', selectedOrg?.id,
        '\n  Existing sub ID:', existingSub.id,
        '\n  Existing plan:', existingSub.plan,
        '\n  is_active:', existingSub.is_active,
      );
      setDupModal({ existingSub, orgName });
      return;
    }

    // No existing subscription — proceed directly
    setSaving(true);
    setError(null);
    try {
      await doIssueLicense(orgName);
      onToast(`License issued to ${orgName}`, 'success');
      onSuccess();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to issue license — try again');
    } finally {
      setSaving(false);
    }
  };

  const handleDupAction = async (action: DupAction) => {
    if (!dupModal) return;
    const { orgName, existingSub } = dupModal;

    if (action === 'renew') {
      setDupSaving(true);
      setDupMessage(null);
      try {
        await performLicenseAction(existingSub.id, 'RENEW');
        setDupModal(null);
        onToast(`Renewal triggered for ${orgName}`, 'success');
        onSuccess();
      } catch {
        setDupMessage('Renew endpoint is not yet available.');
      } finally {
        setDupSaving(false);
      }
      return;
    }

    if (action === 'upgrade') {
      // No upgrade endpoint available yet
      setDupMessage('Upgrade endpoint is not yet available. Contact backend team.');
      return;
    }

    // issue_anyway — user explicitly confirmed
    setDupSaving(true);
    setDupMessage(null);
    try {
      await doIssueLicense(orgName);
      setDupModal(null);
      onToast(`License issued to ${orgName}`, 'success');
      onSuccess();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setDupMessage(typeof detail === 'string' ? detail : 'Failed to issue license — try again');
    } finally {
      setDupSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay open"
      onClick={(e) => { if ((e.target as HTMLElement).classList.contains('modal-overlay')) onClose(); }}
    >
      <div className="modal" style={{ maxWidth: '520px' }}>
        <div className="modal-top">
          <div className="modal-title">🔑 Issue License</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{ marginBottom: '14px', padding: '10px 12px', background: 'var(--red-pale)', border: '1px solid var(--red-mist)', borderRadius: '3px', fontSize: '.8rem', color: 'var(--red)' }}>
              {error}
            </div>
          )}

          <div className="form-grid">
            {/* Organization — searchable dropdown */}
            <div className="field span2" style={{ position: 'relative' }}>
              <label className="lbl">Organization <span className="req">*</span></label>
              <input
                className="inp"
                type="text"
                placeholder="Search organizations…"
                value={selectedOrg ? selectedOrg.name : orgSearch}
                onChange={(e) => {
                  setOrgSearch(e.target.value);
                  setForm((f) => ({ ...f, organization: '' }));
                  setOrgDropOpen(true);
                  setError(null);
                }}
                onFocus={() => setOrgDropOpen(true)}
                autoComplete="off"
              />
              {orgDropOpen && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                  background: 'var(--color-primary-light)', border: '1px solid var(--blue-border)',
                  borderRadius: '4px', boxShadow: '0 4px 16px rgba(0,0,0,.1)',
                  maxHeight: '200px', overflowY: 'auto',
                }}>
                  {filteredOrgs.length === 0 ? (
                    <div style={{ padding: '12px 14px', fontSize: '.8rem', color: 'var(--gray)' }}>
                      No organizations found
                    </div>
                  ) : filteredOrgs.map((o) => (
                    <button
                      key={o.id}
                      style={{
                        width: '100%', padding: '10px 14px', textAlign: 'left',
                        background: form.organization === o.id ? 'var(--color-primary-light)' : 'none',
                        border: 'none', cursor: 'pointer', fontSize: '.84rem',
                        borderBottom: '1px solid var(--gray-xlt)',
                        fontWeight: form.organization === o.id ? 600 : 400,
                      }}
                      onClick={() => {
                        setForm((f) => ({ ...f, organization: o.id }));
                        setOrgSearch('');
                        setOrgDropOpen(false);
                        setError(null);
                      }}
                    >
                      {o.name}
                      <span style={{ fontSize: '.7rem', color: 'var(--gray)', marginLeft: '8px' }}>
                        {o._entity_type === 'institution' ? 'Institution' : 'Facility'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* License Type */}
            <div className="field">
              <label className="lbl">License Type <span className="req">*</span></label>
              <select className="sel" value={form.licenseType}
                onChange={(e) => { setForm((f) => ({ ...f, licenseType: e.target.value })); setError(null); }}>
                <option value="">Select type</option>
                {LICENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Seats */}
            <div className="field">
              <label className="lbl">Seats</label>
              <input className="inp" type="number" min={1} placeholder="e.g. 10 (leave blank for unlimited)"
                value={form.seats}
                onChange={(e) => setForm((f) => ({ ...f, seats: e.target.value }))} />
            </div>

            {/* Expiration Date */}
            <div className="field">
              <label className="lbl">Expiration Date <span className="req">*</span></label>
              <input className="inp" type="date" value={form.expirationDate}
                min={new Date().toISOString().split('T')[0]}
                onChange={(e) => { setForm((f) => ({ ...f, expirationDate: e.target.value })); setError(null); }} />
            </div>

            {/* Payment Method */}
            <div className="field">
              <label className="lbl">Payment Method</label>
              <select className="sel" value={form.paymentMethod}
                onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Mobile Money">Mobile Money</option>
                <option value="Cash">Cash</option>
                <option value="Invoice">Invoice</option>
                <option value="Waived">Waived</option>
              </select>
            </div>

            {/* Notes */}
            <div className="field span2">
              <label className="lbl">Notes</label>
              <textarea className="inp" rows={2} placeholder="Optional notes about this license…"
                style={{ resize: 'none' }} value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
            <button className="btn btn-red" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Issuing…' : 'Issue License'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Duplicate subscription confirmation ── */}
      {dupModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 600,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,.55)',
          }}
          onClick={() => { if (!dupSaving) { setDupModal(null); setDupMessage(null); } }}
        >
          <div
            style={{
              background: 'var(--color-primary-light)', borderRadius: '8px',
              padding: '28px', maxWidth: '440px', width: 'calc(100% - 32px)',
              boxShadow: '0 8px 32px rgba(0,0,0,.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '10px' }}>
              This organisation already has an active license.
            </div>
            <p style={{ fontSize: '.84rem', color: 'var(--gray)', lineHeight: 1.6, marginBottom: '8px' }}>
              <strong style={{ color: 'var(--ink)' }}>{dupModal.orgName}</strong> currently has a{' '}
              <strong style={{ color: 'var(--ink)' }}>{dupModal.existingSub.plan ?? 'active'}</strong>{' '}
              subscription. Issuing another license may create a duplicate subscription record.
            </p>
            <p style={{ fontSize: '.84rem', color: 'var(--gray)', lineHeight: 1.6, marginBottom: '20px' }}>
              Would you like to renew or upgrade the existing license instead?
            </p>

            {dupMessage && (
              <div style={{
                marginBottom: '14px', padding: '9px 12px',
                background: 'var(--amber-bg)', border: '1px solid var(--amber-border)',
                borderRadius: '3px', fontSize: '.78rem', color: 'var(--amber)',
              }}>
                {dupMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                onClick={() => { setDupModal(null); setDupMessage(null); }}
                disabled={dupSaving}
              >
                Cancel
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => handleDupAction('renew')}
                disabled={dupSaving}
              >
                {dupSaving ? '…' : 'Renew License'}
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => handleDupAction('upgrade')}
                disabled={dupSaving}
              >
                Upgrade Plan
              </button>
              <button
                className="btn"
                style={{
                  background: 'var(--red)', color: 'white',
                  border: '1px solid var(--red)', minHeight: '44px',
                  fontSize: '.8rem', fontWeight: 500, padding: '9px 16px',
                  borderRadius: '3px', cursor: 'pointer',
                  opacity: dupSaving ? 0.6 : 1,
                }}
                onClick={() => handleDupAction('issue_anyway')}
                disabled={dupSaving}
              >
                {dupSaving ? 'Issuing…' : 'Issue Anyway'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
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
  const [issueLicenseOpen, setIssueLicenseOpen] = useState(false);

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
        <button className="btn btn-red" onClick={() => setIssueLicenseOpen(true)}>
          + Issue License
        </button>
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

      {/* ── Issue License Modal ── */}
      <IssueLicenseModalInline
        isOpen={issueLicenseOpen}
        onClose={() => setIssueLicenseOpen(false)}
        onToast={onToast}
        onSuccess={() => { setIssueLicenseOpen(false); loadAll(); }}
        existingSubs={licenses}
      />
    </div>
  );
}
