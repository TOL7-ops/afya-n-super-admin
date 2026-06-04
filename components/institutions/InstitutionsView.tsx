'use client';

import { useState } from 'react';
import Badge, { institutionTypeVariant } from '@/components/shared/Badge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import type { ToastType } from '@/types';
import type { FacilityResponse } from '@/types/api';
import { getFacilityStatus } from '@/utils/facilityStatus';

interface InstitutionsViewProps {
  facilities: FacilityResponse[];
  loading: boolean;
  onAddInstitution: () => void;
  onEdit: (facility: FacilityResponse) => void;
  onSuspend: (id: number, active: boolean, name: string) => void;
  onExtendTrial: (id: number, name: string) => void;
  onToast: (msg: string, type?: ToastType) => void;
}

type StatusFilter = '' | 'Active' | 'Trial' | 'Suspended' | 'Pending' | 'Expiring';
type TypeFilter   = '' | 'Government' | 'NGO' | 'Hospital' | 'Pharmacy' | 'Employer' | 'Research';

function facilityStatusLabel(f: FacilityResponse): StatusFilter {
  return getFacilityStatus(f) as StatusFilter;
}

function statusVariant(
  status: StatusFilter,
): 'active' | 'suspended' | 'pending' | 'trial' | 'expiring' {
  if (status === 'Active')    return 'active';
  if (status === 'Suspended') return 'suspended';
  if (status === 'Trial')     return 'trial';
  if (status === 'Expiring')  return 'expiring';
  return 'pending';
}

export default function InstitutionsView({
  facilities,
  loading,
  onAddInstitution,
  onEdit,
  onSuspend,
  onExtendTrial,
  onToast,
}: InstitutionsViewProps) {
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [typeFilter, setTypeFilter]     = useState<TypeFilter>('');

  const filtered = facilities.filter((f) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      f.name.toLowerCase().includes(q) ||
      (f.region ?? '').toLowerCase().includes(q) ||
      (f.license_plan ?? '').toLowerCase().includes(q);
    const status = facilityStatusLabel(f);
    const matchS = !statusFilter || status === statusFilter;
    // type comes directly from API — no heuristics needed
    const type   = f.type ?? '—';
    const matchT = !typeFilter || type === typeFilter;
    return matchQ && matchS && matchT;
  });

  if (loading) {
    return (
      <div>
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Institution Management</div>
            <div className="pg-sub">All registered organisations on the Afya platform</div>
          </div>
          <button className="btn btn-red" onClick={onAddInstitution}>+ Add Institution</button>
        </div>
        <LoadingSpinner message="Loading institutions…" />
      </div>
    );
  }

  return (
    <div>
      <div className="pg-hdr">
        <div>
          <div className="pg-title">Institution Management</div>
          <div className="pg-sub">All registered organisations on the Afya platform</div>
        </div>
        <button className="btn btn-red" onClick={onAddInstitution}>
          + Add Institution
        </button>
      </div>

      <div className="card">
        <div className="card-hdr">
          <div>
            <div className="card-title">All Institutions</div>
            <div className="card-sub">
              {filtered.length} organisation{filtered.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div style={{ padding: '14px 18px' }}>
          <div className="search-bar">
            <div className="search-wrap" style={{ flex: 1 }}>
              <svg
                className="search-ico" width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="search-input"
                type="text"
                placeholder="Search by name or region…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="filter-sel"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            >
              <option value="">All Types</option>
              <option value="Government">Government</option>
              <option value="NGO">NGO</option>
              <option value="Hospital">Hospital</option>
              <option value="Pharmacy">Pharmacy</option>
              <option value="Employer">Employer</option>
              <option value="Research">Research</option>
            </select>
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

        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Institution</th>
                <th>Type</th>
                <th>Region</th>
                <th>Seats</th>
                <th>Field Workers</th>
                <th>Total Screened</th>
                <th>License Expires</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="inst-tbody">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{
                      textAlign: 'center', padding: '24px',
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: '.72rem', color: 'var(--gray)',
                    }}
                  >
                    No institutions match your filters
                  </td>
                </tr>
              ) : (
                filtered.map((f) => {
                  const status = facilityStatusLabel(f);
                  const type          = f.type ?? '—';
                  const fieldWorkers  = f.field_workers_count ?? 0;
                  const totalScreened = f.total_screened ?? 0;
                  const seats         = f.seats ?? f.max_seats ?? null;
                  // API returns license_expiry; fall back to license_expires_at
                  const expiryIso = f.license_expiry ?? f.license_expires_at;
                  const expiry = expiryIso
                    ? new Date(expiryIso).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })
                    : status === 'Trial'
                    ? 'Trial'
                    : '—';

                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 500 }}>{f.name}</td>
                      <td>
                        <Badge variant={institutionTypeVariant(type)}>{type}</Badge>
                      </td>
                      <td>{f.region ?? '—'}</td>
                      <td className="mono">
                        {seats != null ? seats : '—'}
                      </td>
                      <td className="mono">
                        {fieldWorkers}
                      </td>
                      <td className="mono">
                        {totalScreened.toLocaleString()}
                      </td>
                      <td className="id-cell">{expiry}</td>
                      <td>
                        <Badge variant={statusVariant(status)}>{status}</Badge>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>

                          {(status === 'Active' || status === 'Expiring') && (
                            <>
                              <button className="btn-icon" onClick={() => onEdit(f)}>
                                Edit
                              </button>
                              <button
                                className="btn-icon"
                                onClick={() => onSuspend(f.id, false, f.name)}
                              >
                                Suspend
                              </button>
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
                              <button
                                className="btn-icon"
                                onClick={() => onExtendTrial(f.id, f.name)}
                              >
                                Extend
                              </button>
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
