'use client';

import { useState, useCallback } from 'react';
import { useAuditLog } from '@/hooks/useAuditLog';
import { exportAuditLogCsv } from '@/services/users.service';
import RecentActivityTab from './RecentActivityTab';
import LoginHistoryTab from './LoginHistoryTab';
import type { ToastType } from '@/types';

interface AuditViewProps {
  onToast: (msg: string, type?: ToastType) => void;
}

type Tab = 'activity' | 'logins';

export default function AuditView({ onToast }: AuditViewProps) {
  const [activeTab, setActiveTab]     = useState<Tab>('activity');
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing]   = useState(false);

  const { entries, loading, error, refetch } = useAuditLog();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setLastRefreshed(new Date());
    setRefreshing(false);
  }, [refetch]);

  const handleExport = useCallback(async () => {
    try {
      onToast('Exporting log…');
      await exportAuditLogCsv();
      onToast('Audit log exported', 'success');
    } catch {
      onToast('Export failed — try again', 'warn');
    }
  }, [onToast]);

  // Surface any audit log fetch error once
  if (error) {
    console.warn('[AuditView] audit log error:', error);
  }

  return (
    <div>
      {/* ── Page header ── */}
      <div className="pg-hdr">
        <div>
          <div className="pg-title">Audit Log</div>
          <div className="pg-sub">Monitor platform activity and authentication history.</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: "'JetBrains Mono',monospace",
            fontSize: '.62rem', color: 'var(--gray)', whiteSpace: 'nowrap',
          }}>
            Updated {lastRefreshed.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '2px solid var(--gray-lt)',
        marginBottom: '16px',
      }}>
        {([
          { id: 'activity' as Tab, label: 'Recent Activity',  icon: '📋' },
          { id: 'logins'   as Tab, label: 'Login History',    icon: '🔐' },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '10px 22px',
              border: 'none', background: 'none', cursor: 'pointer',
              fontSize: '.82rem',
              fontWeight: activeTab === t.id ? 600 : 400,
              color: activeTab === t.id ? 'var(--color-primary)' : 'var(--gray)',
              borderBottom: activeTab === t.id
                ? '2px solid var(--color-primary)'
                : '2px solid transparent',
              marginBottom: '-2px',
              fontFamily: "'Outfit', sans-serif",
              display: 'flex', alignItems: 'center', gap: '6px',
              transition: 'color .15s',
            }}
          >
            <span style={{ fontSize: '.82rem' }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab panels — each manages its own state independently ── */}
      <div style={{
        background: 'var(--color-primary-light)',
        border: '1px solid var(--blue-border)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}>
        {activeTab === 'activity' && (
          <RecentActivityTab
            entries={entries}
            loading={loading}
            onExport={handleExport}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}
        {activeTab === 'logins' && (
          <LoginHistoryTab onToast={onToast} />
        )}
      </div>
    </div>
  );
}
