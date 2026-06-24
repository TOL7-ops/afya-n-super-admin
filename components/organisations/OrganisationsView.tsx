'use client';

import { useState, useRef, useEffect } from 'react';
import Badge, { institutionTypeVariant } from '@/components/shared/Badge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ToastType } from '@/types';
import type { FacilityResponse } from '@/types/api';
import { deriveLicenseStatus, statusToVariant } from '@/utils/licenseStatus';

interface OrganisationsViewProps {
  facilities: FacilityResponse[];
  loading: boolean;
  onAddFacility: () => void;
  onAddInstitution: () => void;
  onEdit: (entity: FacilityResponse) => void;
  onSuspend: (id: string, active: boolean, name: string) => void;
  onExtendTrial: (id: string, name: string) => void;
  onToast: (msg: string, type?: ToastType) => void;
}

type Tab = 'facilities' | 'institutions' | 'all';
type StatusFilter = '' | 'Active' | 'Trial' | 'Suspended' | 'Pending' | 'Expiring';

function fmtExpiry(f: FacilityResponse, status: string): string {
  const iso = f.license_expiry ?? f.license_expires_at;
  if (!iso) return status === 'Trial' ? 'Trial' : '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function OrganisationsView({
  facilities,
  loading,
  onAddFacility,
  onAddInstitution,
  onEdit,
  onSuspend,
  onExtendTrial,
  onToast: _onToast,
}: OrganisationsViewProps) {
  const [tab, setTab]                   = useState<Tab>('facilities');
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
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

  // Split combined list by entity type
  const facilityList     = facilities.filter((f) => f._entity_type === 'facility' || !f._entity_type);
  const institutionList  = facilities.filter((f) => f._entity_type === 'institution');

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
    const status  = deriveLicenseStatus(f);
    const matchS  = !statusFilter || status === statusFilter;
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

  // Action buttons shared by all tabs
  const renderActions = (f: FacilityResponse) => {
    const status = deriveLicenseStatus(f);
    return (
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        {(status === 'Active' || status === 'Expiring') && (
          <>
            <button className="btn-icon" onClick={() => onEdit(f)}>Edit</button>
            <button className="btn-icon" onClick={() => onSuspend(f.id, false, f.name)}>Suspend</button>
          </>
        )}
        {status === 'Pending' && (
          <button
            className="btn-icon"
            style={{ color: 'var(--green)', borderColor: 'var(--green-border)' }}
            onClick={() => onSuspend(f.id, true, f.name)}
          >
            ✓ Approve
          </button>
        )}
        {status === 'Trial' && (
          <>
            <button
              className="btn-icon"
              style={{ color: 'var(--green)', borderColor: 'var(--green-border)' }}
              onClick={() => onSuspend(f.id, true, f.name)}
            >
              ✓ Approve
            </button>
            <button className="btn-icon" onClick={() => onExtendTrial(f.id, f.name)}>Extend</button>
          </>
        )}
        {status === 'Suspended' && (
          <button
            className="btn-icon"
            style={{ color: 'var(--green)', borderColor: 'var(--green-border)' }}
            onClick={() => onSuspend(f.id, true, f.name)}
          >
            Reactivate
          </button>
        )}
      </div>
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
              background: 'var(--white)', border: '1px solid var(--gray-lt)',
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
              color: tab === t.id ? 'var(--red)' : 'var(--gray)',
              borderBottom: tab === t.id ? '2px solid var(--red)' : '2px solid transparent',
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
                  const status  = deriveLicenseStatus(f);
                  const variant = statusToVariant(status);
                  const isFacility = f._entity_type === 'facility' || !f._entity_type;
                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 500 }}>{f.name}</td>
                      <td>
                        <span style={{
                          fontSize: '.72rem',
                          fontFamily: "'JetBrains Mono', monospace",
                          padding: '2px 7px', borderRadius: '3px',
                          background: isFacility ? 'rgba(59,130,246,.1)' : 'rgba(34,197,94,.1)',
                          color: isFacility ? 'var(--blue)' : 'var(--green)',
                          border: `1px solid ${isFacility ? 'rgba(59,130,246,.25)' : 'rgba(34,197,94,.25)'}`,
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
    </div>
  );
}
