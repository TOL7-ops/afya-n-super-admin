'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import { getAccessToken } from '@/services/authService';
import { exportAuditLogCsv } from '@/services/users.service';
import type { ToastType } from '@/types';

interface LoginEntry {
  user_name?: string | null;
  full_name?: string | null;
  agent_name?: string | null;
  email?: string | null;
  role?: string | null;
  facility_name?: string | null;
  institution_name?: string | null;
  organisation?: string | null;
  status?: string | null;           // "Success" | "Failed" | null
  ip_address?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  user_agent?: string | null;
  timestamp?: string | null;
  logged_in_at?: string | null;
  created_at?: string | null;
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

/** Attempt to parse a browser/OS from a raw user-agent string */
function parseUserAgent(ua: string | null | undefined): { browser: string; os: string } {
  if (!ua) return { browser: '—', os: '—' };
  const s = ua.toLowerCase();
  const browser =
    s.includes('chrome')  ? 'Chrome'  :
    s.includes('firefox') ? 'Firefox' :
    s.includes('safari') && !s.includes('chrome') ? 'Safari' :
    s.includes('edge')    ? 'Edge'    :
    'Unknown';
  const os =
    s.includes('android')    ? 'Android' :
    s.includes('iphone') || s.includes('ipad') ? 'iOS' :
    s.includes('windows')    ? 'Windows' :
    s.includes('mac')        ? 'macOS'   :
    s.includes('linux')      ? 'Linux'   :
    '—';
  return { browser, os };
}

export default function LoginHistoryTab({ onToast }: LoginHistoryTabProps) {
  const [logins, setLogins]       = useState<LoginEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState<'all' | 'Success' | 'Failed'>('all');

  const fetchLogins = useCallback(async () => {
    if (!getAccessToken()) return;
    try {
      const res = await api.get<unknown>('/api/v1/super-admin/audit-logs/logins');
      const raw = res.data;
      const data: LoginEntry[] = Array.isArray(raw)
        ? (raw as LoginEntry[])
        : ((raw as Record<string, unknown>)?.['items'] as LoginEntry[] | undefined) ??
          ((raw as Record<string, unknown>)?.['data'] as LoginEntry[] | undefined) ??
          ((raw as Record<string, unknown>)?.['logs'] as LoginEntry[] | undefined) ??
          [];
      setLogins(data);
      console.log('[LoginHistory] entries:', data.length, 'sample:', data[0]);
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
    await fetchLogins();
    setLastRefreshed(new Date());
    setRefreshing(false);
  }, [fetchLogins]);

  const handleExport = async () => {
    try {
      onToast('Exporting…');
      await exportAuditLogCsv();
      onToast('Exported', 'success');
    } catch {
      onToast('Export failed — try again', 'warn');
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return logins.filter((l) => {
      const name = String(l.user_name ?? l.full_name ?? l.agent_name ?? '');
      const org  = String(l.facility_name ?? l.institution_name ?? l.organisation ?? '');
      const matchSearch =
        !q ||
        name.toLowerCase().includes(q) ||
        org.toLowerCase().includes(q) ||
        (l.email ?? '').toLowerCase().includes(q) ||
        (l.ip_address ?? '').includes(q);
      const loginStatus = (l.status ?? 'Success');
      const matchStatus =
        statusFilter === 'all' ||
        loginStatus.toLowerCase().includes(statusFilter.toLowerCase());
      return matchSearch && matchStatus;
    });
  }, [logins, search, statusFilter]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: '10px', padding: '14px 20px',
        borderBottom: '1px solid var(--gray-lt)', background: 'var(--off)',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <div className="search-wrap" style={{ flex: 1, minWidth: '200px' }}>
          <svg className="search-ico" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="search-input" type="text"
            placeholder="Search by user, email, org, or IP…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {/* Status filter */}
        <select
          className="filter-sel"
          value={statusFilter}
          onChange={(e) => setStatus(e.target.value as 'all' | 'Success' | 'Failed')}
        >
          <option value="all">All Statuses</option>
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
        </select>

        {/* Updated timestamp */}
        <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.62rem', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
          Updated {lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
        </span>

        <button className="btn btn-ghost" onClick={handleRefresh} disabled={refreshing} style={{ minWidth: '90px' }}>
          {refreshing ? '↻ …' : '↻ Refresh'}
        </button>
        <button className="btn btn-ghost" onClick={handleExport}>Export ↓</button>
      </div>

      {/* Table header */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr 100px 140px',
        gap: '10px',
        padding: '8px 20px',
        background: 'var(--off)',
        borderBottom: '1px solid var(--gray-lt)',
        fontFamily: "'JetBrains Mono',monospace",
        fontSize: '.56rem', letterSpacing: '.12em',
        textTransform: 'uppercase' as const,
        color: 'var(--color-primary)',
      }}>
        <span>User</span>
        <span>Organisation</span>
        <span>Status</span>
        {/* <span>IP Address</span> — commented out, not returned by API yet */}
        {/* <span>Device / Browser</span> — commented out, not returned by API yet */}
        <span style={{ textAlign: 'right' }}>Login Time</span>
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
        /* Empty state */
        <div style={{ padding: '56px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>🔐</div>
          <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--ink)', marginBottom: '4px' }}>
            No login history available.
          </div>
          <div style={{ fontSize: '.76rem', color: 'var(--gray)' }}>
            {search || statusFilter !== 'all'
              ? 'Try adjusting your filters.'
              : 'Login events will appear here once users sign in.'}
          </div>
        </div>
      ) : (
        /* Rows */
        <div>
          {filtered.map((log, i) => {
            const name       = String(log.user_name ?? log.full_name ?? log.agent_name ?? 'Unknown');
            const email      = String(log.email ?? '');
            const org        = String(log.facility_name ?? log.institution_name ?? log.organisation ?? '—');
            const time       = String(log.timestamp ?? log.logged_in_at ?? log.created_at ?? '');
            const ip         = String(log.ip_address ?? '—');
            const rawUa      = String(log.user_agent ?? '');
            const device     = log.device ?? log.browser ?? null;
            const { browser, os } = parseUserAgent(rawUa || null);
            const displayBrowser = device ? String(device) : browser;
            const displayOs  = log.os ? String(log.os) : os;
            const loginStatus = String(log.status ?? 'Success');
            const isSuccess  = !loginStatus.toLowerCase().includes('fail') && !loginStatus.toLowerCase().includes('error');
            const init       = initials(name);

            return (
              <div
                key={`login-${i}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '200px 1fr 100px 140px',
                  gap: '10px',
                  padding: '11px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-xlt)' : 'none',
                  alignItems: 'center',
                  transition: 'background .12s',
                }}
              >
                {/* User */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: isSuccess ? 'var(--color-primary)' : 'var(--red)',
                    color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '.6rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {init}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{
                      fontSize: '.78rem', fontWeight: 600, color: 'var(--ink)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {name}
                    </div>
                    {email && (
                      <div style={{ fontSize: '.66rem', color: 'var(--gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {email}
                      </div>
                    )}
                  </div>
                </div>

                {/* Organisation */}
                <div style={{ fontSize: '.78rem', color: 'var(--ink-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {org}
                </div>

                {/* Status badge */}
                <div>
                  <span style={{
                    fontSize: '.65rem', fontWeight: 600, padding: '3px 9px',
                    borderRadius: '999px',
                    background: isSuccess ? 'var(--green-bg)' : 'var(--red-pale)',
                    color: isSuccess ? 'var(--green)' : 'var(--red)',
                    border: `1px solid ${isSuccess ? 'var(--green-border)' : 'var(--red-mist)'}`,
                    whiteSpace: 'nowrap',
                  }}>
                    {isSuccess ? '✓ Success' : '✕ Failed'}
                  </span>
                </div>

                {/* IP address — commented out, not returned by API yet
                <div style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: '.68rem', color: 'var(--gray)', whiteSpace: 'nowrap',
                }}>
                  {ip}
                </div>
                */}

                {/* Device / Browser / OS — commented out, not returned by API yet
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '.74rem', color: 'var(--ink-mid)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {displayBrowser}
                  </div>
                  {displayOs !== '—' && (
                    <div style={{ fontSize: '.65rem', color: 'var(--gray)', marginTop: '1px' }}>
                      {displayOs}
                    </div>
                  )}
                </div>
                */}

                {/* Time */}
                <div style={{
                  fontFamily: "'JetBrains Mono',monospace",
                  fontSize: '.66rem', color: 'var(--gray)',
                  textAlign: 'right', whiteSpace: 'nowrap',
                }}>
                  {fmtTime(time)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {!loading && filtered.length > 0 && (
        <div style={{
          padding: '10px 20px', borderTop: '1px solid var(--gray-lt)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.62rem', color: 'var(--gray)' }}>
            {filtered.length} sign-in{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== logins.length ? ` (filtered from ${logins.length})` : ''}
          </span>
          {(search || statusFilter !== 'all') && (
            <button
              onClick={() => { setSearch(''); setStatus('all'); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.72rem', color: 'var(--color-primary)' }}
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
