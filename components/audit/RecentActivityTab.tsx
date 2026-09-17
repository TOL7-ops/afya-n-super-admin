'use client';

import { useState, useMemo, useEffect } from 'react';
import type { AgentActivityLogResponse } from '@/types/api';

interface RecentActivityTabProps {
  entries: AgentActivityLogResponse[];
  loading: boolean;
  onExport: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

// ─── Badge config ─────────────────────────────────────────────────────────────
interface BadgeCfg {
  label: string; bg: string; color: string; border: string; dot: string;
  severity: 'Info' | 'Warning' | 'Critical';
  severityColor: string; severityBg: string;
}

function getBadge(action: string): BadgeCfg {
  const a = action.toUpperCase().replace(/[\s-]/g, '_');
  if (a.includes('LOGIN') || a.includes('AUTH') || a.includes('SIGN'))
    return { label: 'Login',        bg: '#eef9f3', color: '#1A7A4A', border: '#9DD0B8', dot: '#1A7A4A', severity: 'Info',     severityColor: '#1d4ed8', severityBg: '#dbeafe' };
  if (a.includes('PATIENT') || a.includes('REGISTER_PATIENT') || a.includes('CLINICAL') || a.includes('INTAKE') || a.includes('BP'))
    return { label: 'Patient',      bg: '#f0f5fa', color: '#074880', border: '#b3cde0', dot: '#074880', severity: 'Info',     severityColor: '#1d4ed8', severityBg: '#dbeafe' };
  if (a.includes('INSTITUTION') || a.includes('FACILITY') || a.includes('ORGANISATION') || a.includes('ONBOARD'))
    return { label: 'Organisation', bg: '#f5effc', color: '#6B3FA0', border: '#C9AAEA', dot: '#6B3FA0', severity: 'Info',     severityColor: '#1d4ed8', severityBg: '#dbeafe' };
  if (a.includes('LICENSE') || a.includes('SUBSCRIPTION') || a.includes('BILLING') || a.includes('PAYMENT'))
    return { label: 'Subscription', bg: '#fff8ec', color: '#916200', border: '#EDD080', dot: '#916200', severity: 'Warning',  severityColor: '#92400e', severityBg: '#fef3c7' };
  if (a.includes('USER') || a.includes('SUSPEND') || a.includes('DEACTIVAT'))
    return { label: 'User',         bg: '#fdf2f4', color: '#C41E3A', border: '#F5D5DB', dot: '#C41E3A', severity: 'Warning',  severityColor: '#92400e', severityBg: '#fef3c7' };
  if (a.includes('SETTING') || a.includes('CONFIG') || a.includes('WHATSAPP'))
    return { label: 'Settings',     bg: '#f5effc', color: '#6B3FA0', border: '#C9AAEA', dot: '#6B3FA0', severity: 'Info',     severityColor: '#1d4ed8', severityBg: '#dbeafe' };
  if (a.includes('DELETE') || a.includes('REMOVE') || a.includes('REJECT') || a.includes('BLOCK'))
    return { label: 'Critical',     bg: '#fdf2f4', color: '#C41E3A', border: '#F5D5DB', dot: '#C41E3A', severity: 'Critical', severityColor: '#991b1b', severityBg: '#fee2e2' };
  if (a.includes('EXPORT') || a.includes('REPORT') || a.includes('DOWNLOAD'))
    return { label: 'Export',       bg: '#eef9f3', color: '#1A7A4A', border: '#9DD0B8', dot: '#1A7A4A', severity: 'Info',     severityColor: '#1d4ed8', severityBg: '#dbeafe' };
  return   { label: 'System',      bg: '#f2eff4', color: '#7A717A', border: '#d4cfd8', dot: '#7A717A', severity: 'Info',     severityColor: '#1d4ed8', severityBg: '#dbeafe' };
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffH = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    const t = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (diffH < 24) return t;
    if (diffH < 48) return `Yesterday ${t}`;
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ` ${t}`;
  } catch { return iso ?? '—'; }
}

function initials(name: string): string {
  return name.split(' ').map((n) => n[0] ?? '').join('').toUpperCase().slice(0, 2) || '?';
}

function humanLabel(action: string): string {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

const ACTION_FILTERS = [
  { value: 'all',             label: 'All Actions' },
  { value: 'LOGIN',           label: 'Logins' },
  { value: 'CLINICAL_INTAKE', label: 'Clinical Intake' },
  { value: 'PATIENT',         label: 'Patient' },
  { value: 'REGISTER',        label: 'Registrations' },
  { value: 'UPDATE',          label: 'Updates' },
  { value: 'DELETE',          label: 'Deletions' },
  { value: 'EXPORT',          label: 'Exports' },
];

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

// Shared label pill
const MONO: React.CSSProperties = { fontFamily: "'JetBrains Mono',monospace", fontSize: '.56rem', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gray)' };

export default function RecentActivityTab({ entries, loading, onExport, onRefresh, refreshing }: RecentActivityTabProps) {
  const isMobile = useIsMobile();
  const [search, setSearch]       = useState('');
  const [actionFilter, setAction] = useState('all');
  const [expanded, setExpanded]   = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return entries.filter((log) => {
      const matchSearch = !q || (log.agent_name ?? '').toLowerCase().includes(q) || (log.action ?? '').toLowerCase().includes(q) || (log.details ?? '').toLowerCase().includes(q);
      const matchAction = actionFilter === 'all' || (log.action ?? '').toUpperCase().includes(actionFilter);
      return matchSearch && matchAction;
    });
  }, [entries, search, actionFilter]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  if (loading && entries.length === 0) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '12px' }}>⏳</div>
        <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>Loading activity…</div>
      </div>
    );
  }

  return (
    <div>
      {/* ── Toolbar ── */}
      <div style={{
        display: 'flex', gap: '10px', padding: '14px 20px',
        borderBottom: '1px solid var(--gray-lt)', background: 'var(--off)',
        flexWrap: 'wrap', alignItems: 'center',
      }}>
        <div className="search-wrap" style={{ flex: '1 1 180px', minWidth: isMobile ? '100%' : '180px' }}>
          <svg className="search-ico" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input className="search-input" type="text" placeholder="Search by user, action, or details…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="filter-sel" style={{ flex: isMobile ? '1 1 100%' : '0 0 auto' }} value={actionFilter} onChange={(e) => setAction(e.target.value)}>
          {ACTION_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <button className="btn btn-ghost" style={{ flex: isMobile ? '1 1 100%' : '0 0 auto', justifyContent: 'center', minHeight: '44px' }} onClick={onExport}>Export ↓</button>
      </div>

      {/* ── Empty state ── */}
      {filtered.length === 0 && !loading && (
        <div style={{ padding: '56px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '2.4rem', marginBottom: '12px' }}>📭</div>
          <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--ink)', marginBottom: '4px' }}>No activity recorded yet.</div>
          <div style={{ fontSize: '.76rem', color: 'var(--gray)' }}>
            {search || actionFilter !== 'all' ? 'Try adjusting your filters.' : 'Activity will appear here as events are logged.'}
          </div>
        </div>
      )}

      {/* ── MOBILE: card layout ── */}
      {isMobile && filtered.length > 0 && (
        <div>
          {filtered.map((log, i) => {
            const id     = String(log.id ?? i);
            const action = log.action ?? '';
            const agent  = log.agent_name ?? 'System';
            const badge  = getBadge(action);
            const isOpen = expanded.has(id);
            return (
              <div key={id} style={{
                borderBottom: '1px solid var(--gray-xlt)',
                background: isOpen ? 'rgba(7,72,128,.03)' : 'transparent',
              }}>
                {/* Card header — full row tappable */}
                <div
                  role="button"
                  onClick={() => toggleExpand(id)}
                  style={{ padding: '14px 16px', cursor: 'pointer', display: 'flex', gap: '12px', alignItems: 'flex-start', minHeight: '44px' }}
                >
                  {/* Avatar */}
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.65rem', fontWeight: 700, flexShrink: 0 }}>
                    {initials(agent)}
                  </div>
                  {/* Content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '.84rem', color: 'var(--ink)' }}>{agent}</span>
                      <span style={{ fontSize: '.63rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: 'nowrap' }}>{badge.label}</span>
                    </div>
                    <div style={{ fontSize: '.78rem', color: 'var(--ink-mid)', marginBottom: '2px' }}>{humanLabel(action)}</div>
                    {log.details && !isOpen && (
                      <div style={{ fontSize: '.72rem', color: 'var(--gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details}</div>
                    )}
                    <div style={{ fontSize: '.68rem', color: 'var(--gray)', marginTop: '4px', fontFamily: "'JetBrains Mono',monospace" }}>{fmtTime(log.timestamp)}</div>
                  </div>
                  {/* Chevron */}
                  <div style={{ color: 'var(--gray)', fontSize: '.8rem', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s', flexShrink: 0, paddingTop: '4px' }}>▾</div>
                </div>
                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ padding: '12px 16px 16px', background: 'rgba(7,72,128,.035)', borderTop: '1px solid var(--blue-border)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                      <div><div style={MONO}>Action</div><div style={{ fontSize: '.78rem', color: 'var(--ink)', fontWeight: 500, marginTop: '3px' }}>{humanLabel(action)}</div></div>
                      <div>
                        <div style={MONO}>Severity</div>
                        <span style={{ fontSize: '.68rem', fontWeight: 600, padding: '2px 9px', borderRadius: '999px', background: badge.severityBg, color: badge.severityColor, display: 'inline-block', marginTop: '3px' }}>{badge.severity}</span>
                      </div>
                      <div><div style={MONO}>Time</div><div style={{ fontSize: '.72rem', color: 'var(--ink-mid)', fontFamily: "'JetBrains Mono',monospace", marginTop: '3px' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString('en-GB') : '—'}</div></div>
                      {log.id && <div><div style={MONO}>Event ID</div><div style={{ fontSize: '.66rem', color: 'var(--gray)', fontFamily: "'JetBrains Mono',monospace", marginTop: '3px', wordBreak: 'break-all' }}>{log.id}</div></div>}
                    </div>
                    {log.details && (
                      <div style={{ marginTop: '12px' }}>
                        <div style={MONO}>Details</div>
                        <div style={{ fontSize: '.78rem', color: 'var(--ink-mid)', lineHeight: 1.5, marginTop: '3px', wordBreak: 'break-word' }}>{log.details}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── DESKTOP: table layout ── */}
      {!isMobile && filtered.length > 0 && (
        <>
          {/* Table header — nowrap enforced */}
          <div style={{
            display: 'grid', gridTemplateColumns: '28px 200px 1fr 110px 100px 32px',
            gap: '10px', padding: '8px 20px', background: 'var(--off)',
            borderBottom: '1px solid var(--gray-lt)',
            fontFamily: "'JetBrains Mono',monospace", fontSize: '.56rem',
            letterSpacing: '.12em', textTransform: 'uppercase' as const,
            color: 'var(--color-primary)',
          }}>
            <span />
            <span style={{ whiteSpace: 'nowrap' }}>User</span>
            <span style={{ whiteSpace: 'nowrap' }}>Action / Details</span>
            <span style={{ whiteSpace: 'nowrap' }}>Category</span>
            <span style={{ whiteSpace: 'nowrap', textAlign: 'right' }}>Time</span>
            <span />
          </div>

          <div>
            {filtered.map((log, i) => {
              const id     = String(log.id ?? i);
              const action = log.action ?? '';
              const agent  = log.agent_name ?? 'System';
              const badge  = getBadge(action);
              const isOpen = expanded.has(id);
              return (
                <div key={id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--gray-xlt)' : 'none', background: isOpen ? 'rgba(7,72,128,.03)' : 'transparent', transition: 'background .15s' }}>
                  <div
                    style={{ display: 'grid', gridTemplateColumns: '28px 200px 1fr 110px 100px 32px', gap: '10px', padding: '13px 20px', alignItems: 'center', cursor: 'pointer', minHeight: '44px' }}
                    onClick={() => toggleExpand(id)}
                  >
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: badge.dot, margin: '0 auto' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '.6rem', fontWeight: 700, flexShrink: 0 }}>{initials(agent)}</div>
                      <span style={{ fontSize: '.78rem', fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{agent}</span>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: '.78rem', color: 'var(--ink-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{humanLabel(action)}</div>
                      {log.details && !isOpen && <div style={{ fontSize: '.7rem', color: 'var(--gray)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{log.details}</div>}
                    </div>
                    <div><span style={{ fontSize: '.63rem', fontWeight: 600, padding: '2px 8px', borderRadius: '999px', background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`, whiteSpace: 'nowrap' }}>{badge.label}</span></div>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.64rem', color: 'var(--gray)', textAlign: 'right', whiteSpace: 'nowrap' }}>{fmtTime(log.timestamp)}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gray)', fontSize: '.7rem', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }}>▾</div>
                  </div>
                  {isOpen && (
                    <div style={{ padding: '12px 20px 14px 68px', background: 'rgba(7,72,128,.035)', borderTop: '1px solid var(--blue-border)' }}>
                      <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
                        <div><div style={MONO}>Action</div><div style={{ fontSize: '.78rem', color: 'var(--ink)', fontWeight: 500 }}>{humanLabel(action)}</div></div>
                        {log.details && <div style={{ flex: 1, minWidth: 0 }}><div style={MONO}>Details</div><div style={{ fontSize: '.78rem', color: 'var(--ink-mid)', lineHeight: 1.5, wordBreak: 'break-word' }}>{log.details}</div></div>}
                        <div><div style={MONO}>Severity</div><span style={{ fontSize: '.68rem', fontWeight: 600, padding: '2px 9px', borderRadius: '999px', background: badge.severityBg, color: badge.severityColor }}>{badge.severity}</span></div>
                        <div><div style={MONO}>Timestamp</div><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.7rem', color: 'var(--ink-mid)' }}>{log.timestamp ? new Date(log.timestamp).toLocaleString('en-GB') : '—'}</div></div>
                        <div><div style={MONO}>Event ID</div><div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.68rem', color: 'var(--gray)' }}>{log.id}</div></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Footer */}
      {filtered.length > 0 && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--gray-lt)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.62rem', color: 'var(--gray)' }}>
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}{filtered.length !== entries.length ? ` (filtered from ${entries.length})` : ''}
          </span>
          {(search || actionFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setAction('all'); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '.72rem', color: 'var(--color-primary)' }}>Clear filters</button>
          )}
        </div>
      )}
    </div>
  );
}
