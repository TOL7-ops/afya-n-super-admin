'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Badge, { institutionTypeVariant } from '@/components/shared/Badge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import api from '@/lib/api';
import type { ToastType } from '@/types';
import type { FacilityResponse } from '@/types/api';
import { deriveLicenseStatus, statusToVariant } from '@/utils/licenseStatus';

interface OrganisationsViewProps {
  facilities: FacilityResponse[];
  loading: boolean;
  onAddFacility: () => void;
  onAddInstitution: () => void;
  onToast: (msg: string, type?: ToastType) => void;
  /** Called after a suspend/reactivate so the parent can refetch */
  onRefresh: () => void;
}

type Tab = 'facilities' | 'institutions' | 'all';
type StatusFilter = '' | 'Active' | 'Trial' | 'Suspended' | 'Pending' | 'Expiring';

interface ConfirmSuspend {
  id: string;
  name: string;
  entityType: 'facility' | 'institution';
}

function fmtExpiry(f: FacilityResponse, status: string): string {
  const iso = f.license_expiry ?? f.license_expires_at;
  if (!iso) return status === 'Trial' ? 'Trial' : '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function entityBase(entityType: 'facility' | 'institution'): string {
  return entityType === 'facility'
    ? '/api/v1/super-admin/facilities'
    : '/api/v1/super-admin/institutions';
}

export default function OrganisationsView({
  facilities,
  loading,
  onAddFacility,
  onAddInstitution,
  onToast,
  onRefresh,
}: OrganisationsViewProps) {
  const [tab, setTab]                       = useState<Tab>('facilities');
  const [search, setSearch]                 = useState('');
  const [statusFilter, setStatusFilter]     = useState<StatusFilter>('');
  const [dropdownOpen, setDropdownOpen]     = useState(false);
  const [confirmSuspend, setConfirmSuspend] = useState<ConfirmSuspend | null>(null);
  const [suspending, setSuspending]         = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Reactivate — direct, no confirmation ────────────────────────────────
  const handleReactivate = useCallback(async (f: FacilityResponse) => {
    const entityType = f._entity_type === 'institution' ? 'institution' : 'facility';
    const base = entityBase(entityType);
    try {
      await api.patch(`${base}/${f.id}/status`, { is_active: true });
      onToast(`${f.name} has been reactivated`, 'success');
      onRefresh();
    } catch {
      onToast('Failed to reactivate organisation — try again', 'warn');
    }
  }, [onToast, onRefresh]);

  // ── Confirm suspend → call API ───────────────────────────────────────────
  const handleConfirmSuspend = useCallback(async () => {
    if (!confirmSuspend) return;
    setSuspending(true);
    const base = entityBase(confirmSuspend.entityType);
    try {
      await api.patch(`${base}/${confirmSuspend.id}/status`, { is_active: false });
      onToast(`${confirmSuspend.name} has been suspended`, 'warn');
      setConfirmSuspend(null);
      onRefresh();
    } catch {
      onToast('Failed to suspend organisation — try again', 'warn');
    } finally {
      setSuspending(false);
    }
  }, [confirmSuspend, onToast, onRefresh]);

  // Split combined list by entity type
  const facilityList    = facilities.filter((f) => f._entity_type === 'facility' || !f._entity_type);
  const institutionList = facilities.filter((f) => f._entity_type === 'institution');

  const sourceList =
    tab === 'facilities'   ? facilityList :
    tab === 'institutions' ? institutionList :
    facilities;

  const filtered = sourceList.filter((f) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      f.name.toLowerCase().includes(q) ||
      (f.region ?? '').toLowerCase().includes(q) ||
      (f.license_plan ?? '').toLowerCase().includes(q);
    const status = deriveLicenseStatus(f);
    const matchS = !statusFilter || status === statusFilter;
    return matchQ && matchS;
  });

  if (loading) {
    return (
      <div>
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Organisations</div>
            <div className="pg-sub">All registered organisations on the Afya platform</div>
          </div>
        </div>
        <LoadingSpinner message="Loading organisations…" />
      </div>
    );
  }

  // ── Actions: Suspend (with confirmation) or Reactivate only ─────────────
  const renderActions = (f: FacilityResponse) => {
    const status     = deriveLicenseStatus(f);
    const entityType = f._entity_type === 'institution' ? 'institution' : 'facility';

    if (status === 'Suspended') {
      return (
        <button
          className="btn-icon"
          style={{ color: 'var(--green)', borderColor: 'var(--green-border)' }}
          onClick={() => handleReactivate(f)}
        >
          Reactivate
        </button>
      );
    }

    // Active, Expiring, Trial, Pending — show Suspend button → opens confirmation
    return (
      <button
        className="btn-icon"
        onClick={() => setConfirmSuspend({ id: f.id, name: f.name, entityType })}
      >
        Suspend
      </button>
    );
  };

  return (
    <div>
      {/* ── Page header ── */}
      <div className="pg-hdr">
        <div>
          <div className="pg-title">Organisations</div>
          <div className="pg-sub">All registered organisations on the Afya platform</div>
        </div>

        {/* + Add dropdown */}
        <div style={{ position: 'relative' }} ref={dropRef}>
          <button
            className="btn btn-red"
            onClick={() => setDropdownOpen((v) => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            + Add ▾
          </button>
          {dropdownOpen && (
            <div style={{
              position: 'absolute', right: 0, top: 'calc(100% + 6px)',
              background: 'var(--color-primary-light)', border: '1px solid var(--blue-border)',
              borderRadius: '4px', boxShadow: '0 4px 16px rgba(0,0,0,.1)',
              minWidth: '220px', zIndex: 100,
            }}>
              <button
                style={{
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: '1px solid var(--gray-xlt)',
                  display: 'flex', flexDirection: 'column', gap: '2px',
                }}
                onClick={() => { setDropdownOpen(false); onAddFacility(); }}
              >
                <span style={{ fontWeight: 600, fontSize: '.84rem' }}>🏥 Add Clinical Facility</span>
                <span style={{ fontSize: '.72rem', color: 'var(--gray)' }}>Hospital, clinic, etc</span>
              </button>
              <button
                style={{
                  width: '100%', padding: '12px 16px', textAlign: 'left',
                  background: 'none', border: 'none', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', gap: '2px',
                }}
                onClick={() => { setDropdownOpen(false); onAddInstitution(); }}
              >
                <span style={{ fontWeight: 600, fontSize: '.84rem' }}>🏛 Add Institution / NGO</span>
                <span style={{ fontSize: '.72rem', color: 'var(--gray)' }}>Programme, employer</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex', gap: '0', borderBottom: '2px solid var(--gray-lt)',
        marginBottom: '16px',
      }}>
        {([
          { id: 'facilities',   label: `Facilities (${facilityList.length})` },
          { id: 'institutions', label: `Institutions (${institutionList.length})` },
          { id: 'all',          label: `All (${facilities.length})` },
        ] as { id: Tab; label: string }[]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '.82rem', fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--color-primary)' : 'var(--gray)',
              borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              marginBottom: '-2px',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="card">
        <div className="card-hdr">
          <div>
            <div className="card-title">
              {tab === 'facilities' ? 'Clinical Facilities' :
               tab === 'institutions' ? 'Institutions / NGOs' : 'All Organisations'}
            </div>
            <div className="card-sub">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* ── Search + status filter ── */}
        <div style={{ padding: '14px 18px' }}>
          <div className="search-bar">
            <div className="search-wrap" style={{ flex: 1 }}>
              <svg className="search-ico" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="search-input" type="text"
                placeholder="Search by name or region…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="filter-sel"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expiring">Expiring</option>
              <option value="Trial">Trial</option>
              <option value="Pending">Pending</option>
              <option value="Suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="tbl-scroll">
          {/* ── FACILITIES tab ── */}
          {tab === 'facilities' && (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Region</th>
                  <th>Email</th>
                  <th>Seats</th>
                  <th>Screened</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px', fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
                    No facilities match your filters
                  </td></tr>
                ) : filtered.map((f) => {
                  const status  = deriveLicenseStatus(f);
                  const variant = statusToVariant(status);
                  const seats   = f.seats ?? f.max_seats ?? null;
                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 500 }}>{f.name}</td>
                      <td><Badge variant={institutionTypeVariant(f.type ?? '')}>{f.type ?? '—'}</Badge></td>
                      <td>{f.region ?? '—'}</td>
                      <td style={{ fontSize: '.76rem', color: 'var(--ink-mid)' }}>{f.email ?? '—'}</td>
                      <td className="mono">{seats != null ? seats : '—'}</td>
                      <td className="mono">{(f.total_screened ?? 0).toLocaleString()}</td>
                      <td className="id-cell">{fmtExpiry(f, status)}</td>
                      <td><Badge variant={variant}>{status}</Badge></td>
                      <td>{renderActions(f)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ── INSTITUTIONS tab ── */}
          {tab === 'institutions' && (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>City</th>
                  <th>Region</th>
                  <th>Email</th>
                  <th>Seats</th>
                  <th>Screened</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px', fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
                    No institutions match your filters
                  </td></tr>
                ) : filtered.map((f) => {
                  const status  = deriveLicenseStatus(f);
                  const variant = statusToVariant(status);
                  const seats   = f.seats ?? f.max_seats ?? null;
                  const city    = (f as unknown as Record<string, unknown>)['city'] as string | null ?? '—';
                  const region  = f.region ?? (f as unknown as Record<string, unknown>)['state_region'] as string | null ?? '—';
                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 500 }}>{f.name}</td>
                      <td style={{ fontSize: '.8rem' }}>{city}</td>
                      <td>{region}</td>
                      <td style={{ fontSize: '.76rem', color: 'var(--ink-mid)' }}>{f.email ?? '—'}</td>
                      <td className="mono">{seats != null ? seats : '—'}</td>
                      <td className="mono">{(f.total_screened ?? 0).toLocaleString()}</td>
                      <td className="id-cell">{fmtExpiry(f, status)}</td>
                      <td><Badge variant={variant}>{status}</Badge></td>
                      <td>{renderActions(f)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {/* ── ALL tab ── */}
          {tab === 'all' && (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kind</th>
                  <th>Region</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px', fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
                    No organisations match your filters
                  </td></tr>
                ) : filtered.map((f) => {
                  const status     = deriveLicenseStatus(f);
                  const variant    = statusToVariant(status);
                  const isFacility = f._entity_type === 'facility' || !f._entity_type;
                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 500 }}>{f.name}</td>
                      <td>
                        <span style={{
                          fontSize: '.72rem',
                          fontFamily: "'JetBrains Mono', monospace",
                          padding: '2px 7px', borderRadius: '3px',
                          background: isFacility ? 'rgba(33,121,255,.1)' : 'rgba(34,197,94,.1)',
                          color: isFacility ? 'var(--blue)' : 'var(--green)',
                          border: `1px solid ${isFacility ? 'rgba(33,121,255,.25)' : 'rgba(34,197,94,.25)'}`,
                        }}>
                          {isFacility ? '🏥 Facility' : '🏛 Institution'}
                        </span>
                      </td>
                      <td>{f.region ?? '—'}</td>
                      <td><Badge variant={variant}>{status}</Badge></td>
                      <td>{renderActions(f)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Suspend confirmation modal ── */}
      {confirmSuspend && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,.45)',
          }}
          onClick={() => { if (!suspending) setConfirmSuspend(null); }}
        >
          <div
            style={{
              background: 'var(--color-primary-light)',
              borderRadius: '8px',
              padding: '28px',
              maxWidth: '400px', width: 'calc(100% - 32px)',
              boxShadow: '0 8px 32px rgba(0,0,0,.18)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '10px' }}>
              Suspend Organisation?
            </div>
            <p style={{ fontSize: '.85rem', color: 'var(--gray)', lineHeight: 1.6, marginBottom: '24px' }}>
              Are you sure you want to suspend{' '}
              <strong style={{ color: 'var(--ink)' }}>{confirmSuspend.name}</strong>?
              Their admin and all associated users will lose access immediately.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-ghost"
                onClick={() => setConfirmSuspend(null)}
                disabled={suspending}
              >
                Cancel
              </button>
              <button
                className="btn btn-red"
                onClick={handleConfirmSuspend}
                disabled={suspending}
              >
                {suspending ? 'Suspending…' : 'Yes, Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
