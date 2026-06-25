'use client';

import { useEffect, useState, useCallback } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useAuditLog } from '@/hooks/useAuditLog';
import { exportAuditLogCsv, listUsers } from '@/services/users.service';
import { getAccessToken } from '@/services/authService';
import type { ToastType } from '@/types';
import type { AgentActivityLogResponse, UserResponse } from '@/types/api';

interface AuditViewProps {
  onToast: (msg: string, type?: ToastType) => void;
}

// ─── Action category mapping ─────────────────────────────────────────────────
interface ActionMeta {
  label: string;
  icon: string;
  dotClass: string;
}

function getActionMeta(action: string): ActionMeta {
  const a = action.toUpperCase().replace(/[\s-]/g, '_');

  if (a.includes('LOGIN') || a.includes('LOGGED_IN') || a.includes('AUTH') || a.includes('SIGN_IN'))
    return { label: 'Authentication', icon: '🔐', dotClass: 'login' };

  if (a.includes('CLINICAL_INTAKE') || a.includes('INTAKE'))
    return { label: 'Clinical Intake', icon: '🏥', dotClass: 'create' };

  if (a.includes('REGISTER_PATIENT') || a.includes('PATIENT_REGISTER') || a.includes('NEW_PATIENT'))
    return { label: 'Patient Registration', icon: '👤', dotClass: 'create' };

  if (a.includes('CLAIM_ONBOARDING') || a.includes('ONBOARDING') || a.includes('SETUP_TOKEN') || a.includes('ONBOARD'))
    return { label: 'Onboarding Activity', icon: '🚀', dotClass: 'create' };

  if (a.includes('UPDATE_PATIENT') || a.includes('PATIENT_STATUS') || a.includes('PATIENT_UPDATE'))
    return { label: 'Patient Status Update', icon: '📋', dotClass: 'update' };

  if (a.includes('SUSPEND') || a.includes('DEACTIVAT') || a.includes('BLOCK'))
    return { label: 'Account Suspended', icon: '🚫', dotClass: 'suspend' };

  if (a.includes('CREAT') || a.includes('REGISTER') || a.includes('START') || a.includes('NEW') || a.includes('ADD'))
    return { label: 'Record Created', icon: '✅', dotClass: 'create' };

  if (a.includes('UPDAT') || a.includes('RENEW') || a.includes('MODIF') || a.includes('APPROV') || a.includes('ACTIV'))
    return { label: 'Record Updated', icon: '✏️', dotClass: 'update' };

  if (a.includes('DELET') || a.includes('REMOV') || a.includes('REJECT') || a.includes('EXPIR'))
    return { label: 'Record Removed', icon: '🗑️', dotClass: 'delete' };

  if (a.includes('EXPORT') || a.includes('DOWNLOAD') || a.includes('REPORT'))
    return { label: 'Export / Report', icon: '📥', dotClass: 'update' };

  // Default: humanise the raw action string
  const humanised = action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label: humanised, icon: '📌', dotClass: 'update' };
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
    if (diffHours < 24) return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    if (diffHours < 48) return `Yesterday ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    return (
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' · ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    );
  } catch { return iso; }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    }) + ' · ' + new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

export default function AuditView({ onToast }: AuditViewProps) {
  const { entries, loading, error, refetch } = useAuditLog();

  // Last login — find from users list
  const [lastLoginUser, setLastLoginUser]     = useState<UserResponse | null>(null);
  const [loginLoading, setLoginLoading]       = useState(true);
  const [lastRefreshed, setLastRefreshed]     = useState<Date>(new Date());
  const [refreshing, setRefreshing]           = useState(false);

  const fetchLastLogin = useCallback(async () => {
    if (!getAccessToken()) return;
    setLoginLoading(true);
    try {
      const users = await listUsers();
      // Find the user with the most recent last_login
      const withLogin = users
        .filter((u) => u.last_login ?? (u as Record<string,unknown>)['last_login_at'])
        .sort((a, b) => {
          const ta = new Date(a.last_login ?? (a as Record<string,unknown>)['last_login_at'] as string ?? 0).getTime();
          const tb = new Date(b.last_login ?? (b as Record<string,unknown>)['last_login_at'] as string ?? 0).getTime();
          return tb - ta;
        });
      setLastLoginUser(withLogin[0] ?? null);
    } catch {
      setLastLoginUser(null);
    } finally {
      setLoginLoading(false);
    }
  }, []);

  useEffect(() => { fetchLastLogin(); }, [fetchLastLogin]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.allSettled([refetch(), fetchLastLogin()]);
    setLastRefreshed(new Date());
    setRefreshing(false);
  }, [refetch, fetchLastLogin]);

  const handleExport = async () => {
    try {
      onToast('Exporting log…');
      await exportAuditLogCsv();
      onToast('Audit log exported', 'success');
    } catch {
      onToast('Export failed — try again', 'warn');
    }
  };

  useEffect(() => {
    if (error) onToast(`Audit log error: ${error}`, 'warn');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  if (loading && entries.length === 0) {
    return (
      <div>
        <div className="pg-hdr">
          <div>
            <div className="pg-title">Audit Log</div>
            <div className="pg-sub">All system activity — user actions, data changes, logins</div>
          </div>
        </div>
        <LoadingSpinner message="Loading audit log…" />
      </div>
    );
  }

  const lastLoginTimestamp =
    lastLoginUser?.last_login ??
    (lastLoginUser as Record<string,unknown> | null)?.['last_login_at'] as string ?? null;

  return (
    <div>
      {/* ── Header ── */}
      <div className="pg-hdr">
        <div>
          <div className="pg-title">Audit Log</div>
          <div className="pg-sub">All system activity — user actions, data changes, logins</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.62rem', color: 'var(--gray)' }}>
            Updated {lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button className="btn btn-ghost" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? '↻ Refreshing…' : '↻ Refresh'}
          </button>
          <button className="btn btn-ghost" onClick={handleExport}>
            Export Log ↓
          </button>
        </div>
      </div>

      {/* ── Last Login summary card ── */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-hdr">
          <div className="card-title">Last Login</div>
          <div className="card-sub">Most recent platform sign-in</div>
        </div>
        <div className="card-body">
          {loginLoading ? (
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
              Loading…
            </div>
          ) : !lastLoginUser || !lastLoginTimestamp ? (
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
              No login activity available
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '50%',
                background: 'var(--red)', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '.9rem', flexShrink: 0,
              }}>
                {lastLoginUser.full_name?.charAt(0).toUpperCase() ?? '?'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--ink)' }}>
                  {lastLoginUser.full_name}
                </div>
                <div style={{ fontSize: '.74rem', color: 'var(--gray)', marginTop: '2px' }}>
                  {lastLoginUser.role} · {lastLoginUser.email}
                </div>
              </div>
              <div style={{
                fontFamily: "'JetBrains Mono',monospace",
                fontSize: '.7rem', color: 'var(--ink-mid)',
                textAlign: 'right', flexShrink: 0,
              }}>
                {formatDate(lastLoginTimestamp)}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Activity feed ── */}
      <div className="card">
        <div className="card-hdr">
          <div className="card-title">Recent Activity</div>
          <div className="card-sub">{entries.length} events loaded</div>
        </div>
        <div className="card-body">
          {entries.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center' }}>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '.72rem', color: 'var(--gray)' }}>
                No activity logged yet
              </span>
            </div>
          ) : (
            <div id="audit-entries">
              {entries.map((entry: AgentActivityLogResponse) => {
                const meta = getActionMeta(entry.action);
                const agentName = entry.agent_name ?? null;
                return (
                  <div key={entry.id} className="audit-row" style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    padding: '10px 0',
                    borderBottom: '1px solid var(--gray-xlt)',
                  }}>
                    {/* Category icon */}
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '6px',
                      background: 'var(--color-primary-light)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '.85rem', flexShrink: 0, marginTop: '1px',
                    }}>
                      {meta.icon}
                    </div>
                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
                        {agentName && (
                          <span style={{ fontWeight: 600, fontSize: '.82rem', color: 'var(--ink)' }}>
                            {agentName}
                          </span>
                        )}
                        <span style={{ fontSize: '.82rem', color: 'var(--ink-mid)' }}>
                          {meta.label}
                        </span>
                      </div>
                      {entry.details && (
                        <div style={{ fontSize: '.74rem', color: 'var(--gray)', marginTop: '2px', lineHeight: 1.4 }}>
                          {entry.details}
                        </div>
                      )}
                    </div>
                    {/* Timestamp */}
                    <div style={{
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: '.66rem', color: 'var(--gray)',
                      flexShrink: 0, whiteSpace: 'nowrap', paddingTop: '2px',
                    }}>
                      {formatTime(entry.timestamp)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
