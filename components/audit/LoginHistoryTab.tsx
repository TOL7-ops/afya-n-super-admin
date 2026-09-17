'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { getAccessToken } from '@/services/authService';
import type { ToastType } from '@/types';

interface LoginEntry {
  id: string;
  timestamp: string;
  email: string | null;
  agent_name: string | null;
  role: string | null;
  status: 'SUCCESS' | 'FAILED' | null;
  failure_reason: string | null;
  institution: string | null;
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

function isSuccess(status: LoginEntry['status']): boolean {
  return status !== 'FAILED';
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    setMobile(mq.matches);
    const h = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);
  return mobile;
}

const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono',monospace", fontSize: '.58rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gray)' };

function StatusBadge({ status }: { status: LoginEntry['status'] }) {
  if (status === null) return <span style={{ fontSize: '.65rem', color: 'var(--gray)', fontFamily: "'JetBrains Mono',monospace" }}>—</span>;
  const ok = isSuccess(status);
  return (
    <span style={{
      fontSize: '.65rem', fontWeight: 600, padding: '3px 9px', borderRadius: '999px',
      background: ok ? 'var(--green-bg)' : 'var(--red-pale)',
      color: ok ? 'var(--green)' : 'var(--red)',
      border: `1px solid ${ok ? 'var(--green-border)' : 'var(--red-mist)'}`,
      whiteSpace: 'nowrap',
    }}>
      {ok ? '✓ Success' : '✕ Failed'}
    </span>
  );
}

export default function LoginHistoryTab({ onToast }: LoginHistoryTabProps) {
  const isMobile = useIsMobile();
  const [logins, setLogins]         = useState<LoginEntry[]>([]);
  const [total, setTotal]           = useState<number | null>(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
        : ((raw['items'] as LoginEntry[] | undefined) ?? (raw['data'] as LoginEntry[] | undefined) ?? (raw['logs'] as LoginEntry[] | undefined) ?? []);
      setLogins(items);
      setTotal(typeof raw['total'] === 'number' ? raw['total'] : items.length);
    } catch (err) {
      console.error('[LoginHistory] fetch failed:', err);
      setLogins([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchLogins(); }, [fetchLogins]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true); setLoading(true);
    await fetchLogins();
    setLastRefreshed(new Date()); setRefreshing(false);
  }, [fetchLogins]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logins.filter((l) => {
      const matchSearch = !q || (l.agent_name ?? '').toLowerCase().includes(q) || (l.email ?? '').toLowerCase().includes(q) || (l.institution ?? '').toLowerCase().includes(q) || (l.role ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || (statusFilter === 'SUCCESS' ? l.status !== 'FAILED' : l.status === 'FAILED');
      return matchSearch && matchStatus;
    });
  }, [logins, search, statusFilter]);

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', gap: '10px', padding: '14px 20px', borderBottom: '1px solid var(--gray-lt)', background: 'var(--off)', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-wrap" style={{ flex: '1 1 180px', minWidth: isMobile ? '100%' : '180px' }}>
          <svg className="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="search-input" type="text" placeholder="Search by user, email or organisation…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-sel" style={{ flex: isMobile ? '1 1 100%' : '0 0 auto' }} value={statusFilter} onChange={(e) => setStatus(e.target.value as 'all' | 'SUCCESS' | 'FAILED')}>
          <option value="all">All Statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
        </select>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: isMobile ? '1 1 100%' : '0 0 auto', justifyContent: isMobile ? 'space-between' : 'flex-start' }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.62rem', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
            Updated {lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button className="btn btn-ghost" onClick={handleRefresh} disabled={refreshing} style={{ minHeight: '44px', minWidth: '90px' }}>
            {refreshing ? '↻ …' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ padding: '48px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
          <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>Loading login history…</div>
        </div>
      )}

      {/* ── Empty ── */}
      {!loading && filtered.length === 0 && (
        <div style={{ padding: '56px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>🔐</div>
          <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--ink)', marginBottom: '4px' }}>No login history available.</div>
          <div style={{ fontSize: '.76rem', color: 'var(--gray)' }}>{search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'Login events will appear here once users sign in.'}</div>
        </div>
      )}

      {/* ── MOBILE: card layout ── */}
      {!loading && isMobile && filtered.length > 0 && (
        <div>
          {filtered.map((log, i) => {
            const name   = log.agent_name ?? 'Unknown';
            const email  = log.email ?? '';
            const org    = (log.institution && log.institution !== 'None') ? log.institution : null;
            const ok     = isSuccess(log.status);
            const init   = initials(name);
            return (
              <div key={log.id} style={{
                padding: '14px 16px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-xlt)' : 'none',
                background: ok ? 'transparent' : 'rgba(196,30,58,.018)',
              }}>
                {/* Top row: avatar + name + status */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0, background: ok ? 'var(--color-primary)' : 'var(--red)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.68rem', fontWeight: 700 }}>{init}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 700, fontSize: '.88rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                      <StatusBadge status={log.status} />
                    </div>
                    {email && <div style={{ fontSize: '.72rem', color: 'var(--gray)', marginBottom: '6px' }}>{email}</div>}
                    {/* Detail grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
                      {log.role && (
                        <div><div style={MONO}>Role</div><div style={{ fontSize: '.78rem', color: 'var(--ink-mid)', marginTop: '2px' }}>{log.role}</div></div>
                      )}
                      {org && (
                        <div><div style={MONO}>Organisation</div><div style={{ fontSize: '.78rem', color: 'var(--ink-mid)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org}</div></div>
                      )}
                      {log.failure_reason && (
                        <div style={{ gridColumn: '1 / -1' }}><div style={MONO}>Failure Reason</div><div style={{ fontSize: '.78rem', color: 'var(--red)', marginTop: '2px' }}>{log.failure_reason}</div></div>
                      )}
                      <div style={{ gridColumn: '1 / -1' }}><div style={MONO}>Time</div><div style={{ fontSize: '.72rem', color: 'var(--gray)', fontFamily: "'JetBrains Mono',monospace", marginTop: '2px' }}>{fmtTime(log.timestamp)}</div></div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── DESKTOP: table layout ── */}
      {!loading && !isMobile && filtered.length > 0 && (
        <>
          {/* Table header — nowrap enforced */}
          <div style={{
            display: 'grid', gridTemplateColumns: '200px 1fr 90px 1fr 160px', gap: '10px',
            padding: '8px 20px', background: 'var(--off)', borderBottom: '1px solid var(--gray-lt)',
            fontFamily: "'JetBrains Mono',monospace", fontSize: '.56rem', letterSpacing: '.12em',
            textTransform: 'uppercase' as const, color: 'var(--color-primary)',
          }}>
            <span style={{ whiteSpace: 'nowrap' }}>User</span>
            <span style={{ whiteSpace: 'nowrap' }}>Organisation</span>
            <span style={{ whiteSpace: 'nowrap' }}>Status</span>
            <span style={{ whiteSpace: 'nowrap' }}>Failure Reason</span>
            <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Time</span>
          </div>
          <div>
            {filtered.map((log, i) => {
              const name   = log.agent_name ?? 'Unknown';
              const email  = log.email ?? '';
              const org    = (log.institution && log.institution !== 'None') ? log.institution : '—';
              const ok     = isSuccess(log.status);
              const reason = log.failure_reason;
              return (
                <div key={log.id} style={{
                  display: 'grid', gridTemplateColumns: '200px 1fr 90px 1fr 160px', gap: '10px',
                  padding: '12px 20px', minHeight: '44px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-xlt)' : 'none',
                  alignItems: 'center',
                  background: ok ? 'transparent' : 'rgba(196,30,58,.025)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: ok ? 'var(--color-primary)' : 'var(--red)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 700, flexShrink: 0 }}>{initials(name)}</div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '.78rem', fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                      {email && <div style={{ fontSize: '.66rem', color: 'var(--gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</div>}
                      {log.role && <div style={{ fontSize: '.62rem', color: 'var(--gray)', fontFamily: "'JetBrains Mono',monospace" }}>{log.role}</div>}
                    </div>
                  </div>
                  <div style={{ fontSize: '.78rem', color: 'var(--ink-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{org}</div>
                  <div><StatusBadge status={log.status} /></div>
                  <div style={{ fontSize: '.74rem', color: reason ? 'var(--red)' : 'var(--gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontStyle: reason ? 'normal' : 'italic' }}>{reason ?? '—'}</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.66rem', color: 'var(--gray)', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtTime(log.timestamp)}</div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer */}
      {!loading && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--gray-lt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.62rem', color: 'var(--gray)' }}>
            Showing {filtered.length}{filtered.length !== logins.length ? ` of ${logins.length} loaded` : ''}
            {total !== null && total > logins.length ? ` · ${total} total on server` : ''}
          </span>
          {(search || statusFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStatus('all'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.72rem', color: 'var(--color-primary)' }}>Clear filters</button>
          )}
        </div>
      )}
    </div>
  );
}
