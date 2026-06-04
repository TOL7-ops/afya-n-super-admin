'use client';

import { useState, useEffect } from 'react';
import Badge from '@/components/shared/Badge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useUsers } from '@/hooks/useUsers';
import type { ToastType } from '@/types';
import type { UserResponse } from '@/types/api';

interface UsersViewProps {
  onToast: (msg: string, type?: ToastType) => void;
}

const ROLE_CHIP: Record<string, string> = {
  'Super Admin':  'chip-gov',
  Admin:          'chip-ngo',
  'CHW/Operator': 'chip-hosp',
  Clinician:      'chip-hosp',
  'Field Worker': 'chip-hosp',
};

function roleLabel(role: string): string {
  if (role === 'CHW/Operator') return 'Field Worker';
  return role;
}

function fmtLastLogin(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    if (diffHours < 1)  return 'Just now';
    if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
    if (diffHours < 48) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
}

// UsersView no longer receives facilities prop — institution name comes from API
export default function UsersView({ onToast }: UsersViewProps) {
  const { users, loading, error, updateStatus } = useUsers();
  const [search, setSearch]       = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const filtered = users.filter((u: UserResponse) => {
    const q = search.toLowerCase();
    const matchQ =
      !q ||
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.facility_name ?? '').toLowerCase().includes(q);
    const matchR = !roleFilter || roleLabel(u.role) === roleFilter;
    return matchQ && matchR;
  });

  const handleSuspend = async (id: number, name: string) => {
    try {
      await updateStatus(id, false);
      onToast(`${name} suspended`, 'warn');
    } catch {
      onToast('Failed to suspend user — try again', 'warn');
    }
  };

  const handleReactivate = async (id: number, name: string) => {
    try {
      await updateStatus(id, true);
      onToast(`✓ ${name} reactivated`, 'success');
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404 || status === 405) {
        onToast('Reactivate endpoint not available — contact backend', 'warn');
      } else {
        onToast('Failed to reactivate user — try again', 'warn');
      }
    }
  };

  useEffect(() => {
    if (error) onToast(`Users error: ${error}`, 'warn');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  if (loading) {
    return (
      <div>
        <div className="pg-hdr">
          <div>
            <div className="pg-title">All Users</div>
            <div className="pg-sub">Every account on the Afya platform across all institutions</div>
          </div>
        </div>
        <LoadingSpinner message="Loading users…" />
      </div>
    );
  }

  return (
    <div>
      <div className="pg-hdr">
        <div>
          <div className="pg-title">All Users</div>
          <div className="pg-sub">Every account on the Afya platform across all institutions</div>
        </div>
      </div>

      <div className="card">
        <div className="card-hdr">
          <div className="card-title">User Registry</div>
          <div className="card-sub">{users.length} total accounts</div>
        </div>

        <div style={{ padding: '14px 18px' }}>
          <div className="search-bar">
            <div className="search-wrap">
              <svg
                className="search-ico"
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                className="search-input"
                type="text"
                placeholder="Search by name, email or institution…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="filter-sel"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="Admin">Institutional Admin</option>
              <option value="Field Worker">Field Worker</option>
              <option value="Clinician">Facility Clinician</option>
              <option value="Super Admin">Super Admin</option>
            </select>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Role</th>
                <th>Institution</th>
                <th>Email</th>
                <th>Last Login</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: 'center', padding: '24px',
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: '.72rem', color: 'var(--gray)',
                    }}
                  >
                    {search || roleFilter ? 'No users match your filters' : 'No users loaded'}
                  </td>
                </tr>
              ) : (
                filtered.map((user: UserResponse) => {
                  const isActive    = user.is_active;
                  const displayRole = roleLabel(user.role);
                  // facility_name is resolved server-side — no client lookup needed
                  const institutionName = user.facility_name ?? (user.facility_id != null ? `#${user.facility_id}` : '—');

                  return (
                    <tr key={user.id}>
                      <td style={{ fontWeight: 500 }}>{user.full_name}</td>
                      <td>
                        <span className={`chip ${ROLE_CHIP[user.role] ?? 'chip-ngo'}`} style={{ fontSize: '.62rem' }}>
                          {displayRole}
                        </span>
                      </td>
                      <td style={{ fontSize: '.8rem' }}>{institutionName}</td>
                      <td style={{ fontSize: '.76rem' }}>{user.email}</td>
                      <td className="id-cell">{fmtLastLogin(
                        user.last_login ??
                        (user as Record<string, unknown>).last_login_at as string ??
                        (user as Record<string, unknown>).last_seen as string ??
                        (user as Record<string, unknown>).last_active as string ??
                        null
                      )}</td>
                      <td>
                        <Badge variant={isActive ? 'active' : 'suspended'}>
                          {isActive ? 'Active' : 'Suspended'}
                        </Badge>
                      </td>
                      <td>
                        {isActive ? (
                          <button
                            className="btn-icon"
                            onClick={() => handleSuspend(user.id, user.full_name)}
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            className="btn-icon"
                            style={{ color: 'var(--green)', borderColor: 'var(--green-border)' }}
                            onClick={() => handleReactivate(user.id, user.full_name)}
                          >
                            Reactivate
                          </button>
                        )}
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
