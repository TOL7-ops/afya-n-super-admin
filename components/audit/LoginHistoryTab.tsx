'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { getAccessToken } from '@/services/authService';
import type { ToastType } from '@/types';

// ─── Confirmed API shape from GET /api/v1/super-admin/audit-logs/logins ────────
interface LoginEntry {
  id: string;
  timestamp: string;
  email: string | null;
  agent_name: string | null;
  role: string | null;
  status: 'SUCCESS' | 'FAILED' | null;  // null = old records before status was tracked
  failure_reason: string | null;
  institution: string | null;           // org name, "None" if no institution
  [key: string]: unknown;
}

interface LoginHistoryTabProps {
  onToast: (msg: string, type?: ToastType) => void;
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffH = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    const t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (diffH < 24) return `Today ${t}`;
    if (diffH < 48) return `Yesterday ${t}`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + ` · ${t}`;
  } catch { return iso ?? '—'; }
}

/** True = successful or unknown (null). False = explicitly FAILED. */
function isSuccess(status: LoginEntry['status']): boolean {
  return status !== 'FAILED';
}

const COL = '180px 1fr 90px 1fr 150px';  // User · Organisation · Status · Reason · Time

export default function LoginHistoryTab({ onToast }: LoginHistoryTabProps) {
  const [logins, setLogins]           = useState<LoginEntry[]>([]);
  const [total, setTotal]             = useState<number | null>(null);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState<'all' | 'SUCCESS' | 'FAILED'>('all');

  const fetchLogins = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const res = await api.get<unknown>('/api/v1/super-admin/audit-logs/logins');
      const raw = res.data as Record<string, unknown>;
      const items: LoginEntry[] = Array.isArray(raw)
        ? (raw as LoginEntry[])
        : ((raw['items'] as LoginEntry[] | undefined) ??
           (raw['data']  as LoginEntry[] | undefined) ??
           (raw['logs']  as LoginEntry[] | undefined) ??
           []);
      const serverTotal = typeof raw['total'] === 'number' ? raw['total'] : items.length;
      setLogins(items);
      setTotal(serverTotal);
      console.log('[LoginHistory] loaded:', items.length, '/ total:', serverTotal);
    } catch (err) {
      console.error('[LoginHistory] fetch failed:', err);
      setLogins([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLogins(); }, [fetchLogins]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setLoading(true);
    await fetchLogins();
    setLastRefreshed(new Date());
    setRefreshing(false);
  }, [fetchLogins]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logins.filter((l) => {
      const matchSearch =
        !q ||
        (l.agent_name ?? '').toLowerCase().includes(q) ||
        (l.email ?? '').toLowerCase().includes(q) ||
        (l.institution ?? '').toLowerCase().includes(q) ||
        (l.role ?? '').toLowerCase().includes(q);
      const matchStatus =
        statusFilter === 'all' ||
        // null status treated as SUCCESS for filter purposes
        (statusFilter === 'SUCCESS' ? l.status !== 'FAILED' : l.status === 'FAILED');
      return matchSearch && matchStatus;
    });
  }, [logins, search, statusFilter]);

  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: '10px', padding: '14px 20px',
        borderBottom: '1px solid var(--gray-lt)', background: 'var(--off)',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div className="search-wrap" style={{ flex: 1, minWidth: '200px' }}>
          <svg className="search-ico" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="search-input" type="text"
            placeholder="Search by user, email or organisation…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        <select className="filter-sel" value={statusFilter}
          onChange={(e) => setStatus(e.target.value as 'all' | 'SUCCESS' | 'FAILED')}>
          <option value="all">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
        </select>

        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.62rem', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
          Updated {lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button className="btn btn-ghost" onClick={handleRefresh} disabled={refreshing} style={{ minWidth: '90px' }}>
          {refreshing ? '↻ …' : '↻ Refresh'}
        </button>
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid', gridTemplateColumns: COL, gap: '10px',
        padding: '8px 20px', background: 'var(--off)',
        borderBottom: '1px solid var(--gray-lt)',
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: '.56rem', letterSpacing: '.12em',
        textTransform: 'uppercase' as const, color: 'var(--color-primary)',
      }}>
        <span>User</span>
        <span>Organisation</span>
        <span>Status</span>
        <span>Failure Reason</span>
        <span style={{ textAlign: 'right' }}>Time</span>
      </div>

      {/* Loading */}
      {loading ? (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
            Loading login history…
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '56px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>🔐</div>
          <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--ink)', marginBottom: '4px' }}>
            No login history available.
          </div>
          <div style={{ fontSize: '.76rem', color: 'var(--gray)' }}>
            {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Login events will appear here once users sign in.'}
          </div>
        </div>
      ) : (
        <div>
          {filtered.map((log, i) => {
            const name   = log.agent_name ?? 'Unknown';
            const email  = log.email ?? '';
            const org    = (log.institution && log.institution !== 'None') ? log.institution : '—';
            const time   = log.timestamp;
            const ok     = isSuccess(log.status);
            const reason = log.failure_reason;
            const init   = initials(name);

            return (
              <div key={log.id} style={{
                display: 'grid', gridTemplateColumns: COL, gap: '10px',
                padding: '11px 20px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-xlt)' : 'none',
                alignItems: 'center',
                background: ok ? 'transparent' : 'rgba(196,30,58,.025)',
              }}>
                {/* User */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: ok ? 'var(--color-primary)' : 'var(--red)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.6rem', fontWeight: 700, flexShrink: 0,
                  }}>{init}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--ink)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {name}
                    </div>
                    {email && (
                      <div style={{ fontSize: '.66rem', color: 'var(--gray)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email}
                      </div>
                    )}
                    {log.role && (
                      <div style={{ fontSize: '.62rem', color: 'var(--gray)', fontFamily: "'JetBrains Mono',monospace" }}>
                        {log.role}
                      </div>
                    )}
                  </div>
                </div>

                {/* Organisation */}
                <div style={{ fontSize: '.78rem', color: 'var(--ink-mid)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {org}
                </div>

                {/* Status badge */}
                <div>
                  {log.status === null ? (
                    <span style={{ fontSize: '.65rem', color: 'var(--gray)',
                      fontFamily: "'JetBrains Mono',monospace" }}>—</span>
                  ) : (
                    <span style={{
                      fontSize: '.65rem', fontWeight: 600, padding: '3px 9px', borderRadius: '999px',
                      background: ok ? 'var(--green-bg)' : 'var(--red-pale)',
                      color: ok ? 'var(--green)' : 'var(--red)',
                      border: `1px solid ${ok ? 'var(--green-border)' : 'var(--red-mist)'}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {ok ? '✓ Success' : '✕ Failed'}
                    </span>
                  )}
                </div>

                {/* Failure Reason */}
                <div style={{ fontSize: '.74rem', color: reason ? 'var(--red)' : 'var(--gray)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  fontStyle: reason ? 'normal' : 'italic' }}>
                  {reason ?? '—'}
                </div>

                {/* Time */}
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.66rem',
                  color: 'var(--gray)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {fmtTime(time)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!loading && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--gray-lt)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.62rem', color: 'var(--gray)' }}>
            Showing {filtered.length}
            {filtered.length !== logins.length ? ` of ${logins.length} loaded` : ''}
            {total !== null && total > logins.length ? ` · ${total} total on server` : ''}
          </span>
          {(search || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStatus('all'); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '.72rem', color: 'var(--color-primary)' }}>
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
