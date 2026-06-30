'use client';

import { useEffect, useState, useCallback } from 'react';
import SeatsCell from '@/components/shared/SeatsCell';
import type { FacilityResponse, LicenseItem } from '@/types/api';
import { getSubscriptionState, STATE_COLORS, EXPIRING_DAYS } from '@/utils/subscriptionState';
import type { SubscriptionInfo } from '@/utils/subscriptionState';
import { getSubscriptions, resolveOrgSubscription, renewSubscription, upgradeSubscription, issueSubscription } from '@/services/licenses.service';
import { LICENSE_PLANS } from '@/constants';

// Available upgrade plans (static until plan-listing endpoint exists)
const UPGRADE_PLANS = ['Starter', 'Pro', 'Plus', 'Enterprise'];

interface OrgDetailsPanelProps {
  org: FacilityResponse | null;
  onClose: () => void;
  onSuspend: (org: FacilityResponse) => void;
  onReactivate: (org: FacilityResponse) => void;
  onToast: (msg: string, type?: '' | 'success' | 'warn') => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{ fontSize: '.66rem', fontWeight: 600, color: 'var(--gray)', marginBottom: '8px',
        textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'JetBrains Mono',monospace" }}>
        {title}
      </div>
      <div style={{ border: '1px solid var(--gray-lt)', borderRadius: '6px', padding: '4px 12px' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '8px 0', fontSize: '.82rem', borderBottom: '1px solid var(--gray-xlt)' }}>
      <span style={{ color: 'var(--gray)', flexShrink: 0, marginRight: '12px' }}>{label}</span>
      <span style={{ color: accent ? 'var(--color-primary)' : 'var(--ink)', fontWeight: 500,
        textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}

// ── Renew modal ────────────────────────────────────────────────────────────────
function RenewModal({ sub, orgName, onClose, onSuccess, onToast }:
  { sub: LicenseItem; orgName: string; onClose: () => void; onSuccess: () => void;
    onToast: (m: string, t?: '' | 'success' | 'warn') => void }) {
  const [seats, setSeats] = useState(String((sub as Record<string,unknown>).seats_limit ?? sub.seats ?? ''));
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleRenew = async () => {
    setSaving(true); setErr(null);
    try {
      await renewSubscription({
        subscriptionId: sub.id,
        startDate:      startDate,
        seats:          seats ? Number(seats) : undefined,
        paymentMethod:  payMethod,
      });
      onToast(`Subscription renewed for ${orgName}`, 'success');
      onSuccess();
    } catch (e: unknown) {
      const d = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setErr(typeof d === 'string' ? d : 'Renew failed — try again');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'rgba(0,0,0,.5)' }} onClick={() => { if (!saving) onClose(); }}>
      <div style={{ background: 'var(--color-primary-light)', borderRadius: '8px', padding: '28px',
        maxWidth: '420px', width: 'calc(100% - 32px)', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '4px' }}>Renew Subscription</div>
        <div style={{ fontSize: '.78rem', color: 'var(--gray)', marginBottom: '20px' }}>
          Current plan: <strong>{sub.plan}</strong>. The plan is preserved.
        </div>
        {err && <div style={{ marginBottom: '12px', padding: '9px 12px', background: 'var(--red-pale)',
          border: '1px solid var(--red-mist)', borderRadius: '3px', fontSize: '.78rem', color: 'var(--red)' }}>{err}</div>}
        <div className="form-grid" style={{ marginBottom: '20px' }}>
          <div className="field"><label className="lbl">New Start Date</label>
            <input className="inp" type="date" value={startDate} min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setStartDate(e.target.value)} /></div>
          <div className="field"><label className="lbl">Seats</label>
            <input className="inp" type="number" min={1} placeholder="Leave blank to keep current"
              value={seats} onChange={(e) => setSeats(e.target.value)} /></div>
          <div className="field span2"><label className="lbl">Payment Method</label>
            <select className="sel" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {['Bank Transfer','Mobile Money','Cash','Invoice','Waived'].map((m) =>
                <option key={m} value={m}>{m}</option>)}
            </select></div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-red" onClick={handleRenew} disabled={saving}>
            {saving ? 'Renewing…' : 'Confirm Renewal'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Upgrade modal ──────────────────────────────────────────────────────────────
function UpgradeModal({ sub, orgName, onClose, onSuccess, onToast }:
  { sub: LicenseItem | null; orgName: string; onClose: () => void; onSuccess: () => void;
    onToast: (m: string, t?: '' | 'success' | 'warn') => void }) {
  const currentPlan = sub?.plan ?? '';
  const [selectedPlan, setSelectedPlan] = useState('');
  const [seats, setSeats] = useState('');
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleUpgrade = async () => {
    if (!selectedPlan) { setErr('Please select a plan.'); return; }
    setSaving(true); setErr(null);
    try {
      if (sub) {
        // Existing subscription — upgrade it
        await upgradeSubscription({
          subscriptionId:   sub.id,
          organizationName: orgName,
          targetPlan:       selectedPlan,
          seats:            seats ? Number(seats) : undefined,
          paymentMethod:    payMethod,
        });
      } else {
        // No subscription yet — issue a new one
        await issueSubscription({
          organizationName: orgName,
          plan:             selectedPlan,
          seats:            seats ? Number(seats) : undefined,
          paymentMethod:    payMethod,
        });
      }
      onToast(`Plan changed to ${selectedPlan} for ${orgName}`, 'success');
      onSuccess();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : null;
      const detail = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      // Surface "not implemented" errors as a friendly toast rather than a modal error
      if (msg?.toLowerCase().includes('not implemented') || msg?.toLowerCase().includes('pending')) {
        onToast('Subscription upgrade is not yet available. Backend support is pending.', 'warn');
        onClose();
      } else {
        setErr(typeof detail === 'string' ? detail : (msg ?? 'Upgrade failed — try again'));
      }
    } finally { setSaving(false); }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'rgba(0,0,0,.5)' }} onClick={() => { if (!saving) onClose(); }}>
      <div style={{ background: 'var(--color-primary-light)', borderRadius: '8px', padding: '28px',
        maxWidth: '460px', width: 'calc(100% - 32px)', boxShadow: '0 8px 32px rgba(0,0,0,.2)' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '4px' }}>Upgrade Plan</div>
        <div style={{ fontSize: '.78rem', color: 'var(--gray)', marginBottom: '20px' }}>
          {currentPlan ? <>Currently on <strong>{currentPlan}</strong>. Select a new plan below.</> : 'Select a plan to issue a new subscription.'}
        </div>
        {err && <div style={{ marginBottom: '12px', padding: '9px 12px', background: 'var(--red-pale)',
          border: '1px solid var(--red-mist)', borderRadius: '3px', fontSize: '.78rem', color: 'var(--red)' }}>{err}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          {UPGRADE_PLANS.map((p) => {
            const isCurrent = p.toLowerCase() === currentPlan.toLowerCase();
            const isSelected = p === selectedPlan;
            return (
              <button key={p} onClick={() => { if (!isCurrent) setSelectedPlan(p); }}
                disabled={isCurrent}
                style={{ padding: '12px 16px', borderRadius: '6px', textAlign: 'left', cursor: isCurrent ? 'not-allowed' : 'pointer',
                  border: `2px solid ${isSelected ? 'var(--color-primary)' : 'var(--gray-lt)'}`,
                  background: isSelected ? 'var(--color-primary-light)' : isCurrent ? 'var(--gray-xlt)' : 'var(--color-primary-light)',
                  opacity: isCurrent ? 0.5 : 1, fontWeight: isSelected ? 600 : 400,
                  color: isSelected ? 'var(--color-primary)' : 'var(--ink)', fontSize: '.84rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>{p}</span>
                {isCurrent && <span style={{ fontSize: '.65rem', fontFamily: "'JetBrains Mono',monospace",
                  color: 'var(--gray)' }}>Current</span>}
                {isSelected && !isCurrent && <span style={{ fontSize: '.7rem', color: 'var(--color-primary)' }}>✓ Selected</span>}
              </button>
            );
          })}
        </div>
        <div className="form-grid" style={{ marginBottom: '20px' }}>
          <div className="field"><label className="lbl">Seats</label>
            <input className="inp" type="number" min={1} placeholder="e.g. 10"
              value={seats} onChange={(e) => setSeats(e.target.value)} /></div>
          <div className="field"><label className="lbl">Payment Method</label>
            <select className="sel" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
              {['Bank Transfer','Mobile Money','Cash','Invoice','Waived'].map((m) =>
                <option key={m} value={m}>{m}</option>)}
            </select></div>
        </div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn btn-red" onClick={handleUpgrade} disabled={saving || !selectedPlan}>
            {saving ? 'Upgrading…' : 'Confirm Upgrade'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────
export default function OrgDetailsPanel({ org, onClose, onSuspend, onReactivate, onToast }: OrgDetailsPanelProps) {
  const [sub, setSub]             = useState<LicenseItem | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [showRenew, setShowRenew] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  useEffect(() => {
    if (!org) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [org, onClose]);

  const fetchSub = useCallback(async () => {
    if (!org) return;
    setSubLoading(true);
    try {
      const { subscriptions } = await getSubscriptions();
      // resolveOrgSubscription handles duplicate detection, logging, and newest-active selection
      const match = resolveOrgSubscription(subscriptions, org.name);
      setSub(match);
    } catch { setSub(null); }
    finally { setSubLoading(false); }
  }, [org]);

  useEffect(() => { if (org) fetchSub(); else setSub(null); }, [org, fetchSub]);

  if (!org) return null;

  const isFacility  = org._entity_type === 'facility' || !org._entity_type;
  const seatsUsed   = org.field_workers_count ?? 0;
  const seatsLimit  = org.seats ?? org.max_seats ?? null;
  const raw         = org as unknown as Record<string, unknown>;
  const city        = raw['city'] as string | null ?? null;
  const region      = org.region ?? (raw['state_region'] as string | null) ?? null;
  const contactName = (raw['contact_name'] as string | null) ?? org.contact_name ?? null;
  const status      = org.status ?? (org.is_active ? 'Active' : 'Suspended');
  const isSuspended = status.toLowerCase() === 'suspended' || !org.is_active;

  // Derive subscription state from the loaded sub record
  const subRaw: Record<string,unknown> | null = sub ? (sub as unknown as Record<string,unknown>) : null;
  const subInput = sub ? {
    id: sub.id, plan: sub.plan, expires_at: subRaw?.['expires_at'] as string ?? sub.expires_at,
    is_active: sub.is_active,
    seats_limit: subRaw?.['seats_limit'] as number ?? null,
    seats_used:  subRaw?.['seats_used']  as number ?? null,
  } : null;
  const subInfo: SubscriptionInfo = getSubscriptionState(subInput);
  const stateColors = STATE_COLORS[subInfo.state];

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', justifyContent: 'flex-end',
      background: 'rgba(0,0,0,.4)' }} onClick={onClose}>
      <div style={{ width: '440px', maxWidth: '94vw', height: '100%',
        background: 'var(--color-primary-light)', padding: '24px', boxSizing: 'border-box',
        overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,.18)' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '8px', flexShrink: 0,
              background: 'var(--gray-xlt)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: '18px' }}>{isFacility ? '🏥' : '🏛'}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ink)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org.name}</div>
              <div style={{ fontSize: '.76rem', color: 'var(--gray)', marginTop: '2px' }}>
                {isFacility ? (org.type ?? 'Clinical Facility') : 'Institution / NGO'}
              </div>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close panel"
            style={{ width: '28px', height: '28px', padding: 0, border: 'none',
              background: 'transparent', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--gray)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginLeft: '8px' }}>
            ×
          </button>
        </div>

        {/* Org status badge */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: '3px',
            background: isSuspended ? 'var(--red-pale)' : 'var(--green-bg)',
            color: isSuspended ? 'var(--red)' : 'var(--green)',
            border: `1px solid ${isSuspended ? 'var(--red-mist)' : 'var(--green-border)'}` }}>
            {isSuspended ? 'Suspended' : 'Active'}
          </span>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--gray-xlt)', borderRadius: '6px', padding: '12px' }}>
            <div style={{ fontSize: '.68rem', color: 'var(--gray)', marginBottom: '4px' }}>Field workers / seats</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>
              <SeatsCell seatsUsed={seatsUsed} seatsLimit={seatsLimit} />
            </div>
          </div>
          <div style={{ background: 'var(--gray-xlt)', borderRadius: '6px', padding: '12px' }}>
            <div style={{ fontSize: '.68rem', color: 'var(--gray)', marginBottom: '4px' }}>Total screened</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>
              {(org.total_screened ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Location */}
        {(city || region) && (
          <Section title="Location">
            {city   && <Row label="City"   value={city} />}
            {region && <Row label="Region" value={region} />}
          </Section>
        )}

        {/* Contact */}
        <Section title="Contact">
          <Row label="Name"  value={contactName && contactName !== 'N/A' ? contactName : '—'} />
          <Row label="Email" value={org.email && org.email !== 'N/A' ? org.email : '—'}
            accent={!!(org.email && org.email !== 'N/A')} />
        </Section>

        {/* ── Subscription section ── */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '.66rem', fontWeight: 600, color: 'var(--gray)', marginBottom: '10px',
            textTransform: 'uppercase', letterSpacing: '.08em', fontFamily: "'JetBrains Mono',monospace" }}>
            Subscription
          </div>

          {subLoading ? (
            <div style={{ fontSize: '.78rem', color: 'var(--gray)', padding: '16px 0', textAlign: 'center',
              fontFamily: "'JetBrains Mono',monospace" }}>Loading…</div>
          ) : (
            <div style={{ border: `1px solid ${stateColors.border}`, borderRadius: '8px',
              background: stateColors.bg, padding: '16px' }}>

              {/* Status badge + plan */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '999px',
                  background: stateColors.bg, color: stateColors.color, border: `1px solid ${stateColors.border}` }}>
                  {stateColors.label}
                </span>
                {subInfo.plan && (
                  <span style={{ fontSize: '.7rem', fontFamily: "'JetBrains Mono',monospace",
                    color: 'var(--ink-mid)', fontWeight: 600 }}>{subInfo.plan}</span>
                )}
              </div>

              {/* Details */}
              {subInfo.state === 'NONE' ? (
                <div style={{ fontSize: '.8rem', color: 'var(--gray)', marginBottom: '12px' }}>
                  No active subscription found for this organisation.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                  {subInfo.expiresAt && (
                    <div style={{ fontSize: '.78rem', color: 'var(--ink-mid)' }}>
                      Expires: <strong>{fmtDate(subInfo.expiresAt)}</strong>
                    </div>
                  )}
                  {subInfo.state === 'TRIAL' && subInfo.daysLeft !== null && (
                    <div style={{ fontSize: '.78rem', color: 'var(--color-primary)', fontWeight: 500 }}>
                      {subInfo.daysLeft} day{subInfo.daysLeft !== 1 ? 's' : ''} remaining
                    </div>
                  )}
                  {subInfo.state === 'EXPIRING' && subInfo.daysLeft !== null && (
                    <div style={{ fontSize: '.78rem', color: 'var(--amber)', fontWeight: 500 }}>
                      Expiring in {subInfo.daysLeft} day{subInfo.daysLeft !== 1 ? 's' : ''}
                    </div>
                  )}
                  {subInfo.state === 'EXPIRED' && subInfo.daysOverdue !== null && (
                    <div style={{ fontSize: '.78rem', color: 'var(--red)', fontWeight: 500 }}>
                      Expired {subInfo.daysOverdue} day{subInfo.daysOverdue !== 1 ? 's' : ''} ago
                    </div>
                  )}
                  {subInfo.seatsUsed !== null && (
                    <div style={{ fontSize: '.78rem', color: 'var(--ink-mid)' }}>
                      Seats: <SeatsCell seatsUsed={subInfo.seatsUsed} seatsLimit={subInfo.seatsLimit} />
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons — derived from subscription state */}
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {subInfo.state === 'NONE' && (
                  <button className="btn btn-red" style={{ fontSize: '.78rem', padding: '7px 14px' }}
                    onClick={() => setShowUpgrade(true)}>
                    Issue Subscription
                  </button>
                )}
                {subInfo.state === 'ACTIVE' && (
                  <button className="btn btn-ghost" style={{ fontSize: '.78rem', padding: '7px 14px' }}
                    onClick={() => setShowUpgrade(true)}>
                    Upgrade Plan
                  </button>
                )}
                {subInfo.state === 'TRIAL' && (
                  <button className="btn btn-ghost" style={{ fontSize: '.78rem', padding: '7px 14px' }}
                    onClick={() => setShowUpgrade(true)}>
                    Upgrade Plan
                  </button>
                )}
                {(subInfo.state === 'EXPIRING' || subInfo.state === 'EXPIRED') && (
                  <>
                    <button className="btn btn-red" style={{ fontSize: '.78rem', padding: '7px 14px' }}
                      onClick={() => setShowRenew(true)}>
                      Renew
                    </button>
                    <button className="btn btn-ghost" style={{ fontSize: '.78rem', padding: '7px 14px' }}
                      onClick={() => setShowUpgrade(true)}>
                      Upgrade Plan
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Suspend / Reactivate */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {isSuspended ? (
            <button className="btn-icon" style={{ flex: 1, justifyContent: 'center',
              color: 'var(--green)', borderColor: 'var(--green-border)' }}
              onClick={() => onReactivate(org)}>Reactivate</button>
          ) : (
            <button className="btn-icon" style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => onSuspend(org)}>Suspend org</button>
          )}
        </div>
      </div>

      {/* Renew modal */}
      {showRenew && sub && (
        <RenewModal sub={sub} orgName={org.name} onClose={() => setShowRenew(false)}
          onSuccess={() => { setShowRenew(false); fetchSub(); }}
          onToast={onToast} />
      )}

      {/* Upgrade modal */}
      {showUpgrade && (
        <UpgradeModal sub={sub} orgName={org.name} onClose={() => setShowUpgrade(false)}
          onSuccess={() => { setShowUpgrade(false); fetchSub(); }}
          onToast={onToast} />
      )}
    </div>
  );
}
