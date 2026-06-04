'use client';

import { useEffect } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { useAuditLog } from '@/hooks/useAuditLog';
import { exportAuditLogCsv } from '@/services/users.service';
import type { ToastType } from '@/types';
import type { AgentActivityLogResponse } from '@/types/api';

interface AuditViewProps {
  onToast: (msg: string, type?: ToastType) => void;
}

function dotClass(action: string): string {
  const a = action.toLowerCase();
  if (a.includes('login') || a.includes('logged in')) return 'login';
  if (a.includes('suspend') || a.includes('deactivat')) return 'suspend';
  if (a.includes('register') || a.includes('creat') || a.includes('start') || a.includes('new')) return 'create';
  if (a.includes('updat') || a.includes('renew') || a.includes('modif') || a.includes('approv')) return 'update';
  if (a.includes('delet') || a.includes('remov') || a.includes('reject')) return 'delete';
  return 'update';
}

function buildText(entry: AgentActivityLogResponse): string {
  const parts: string[] = [];

  // agent_name is now resolved server-side
  if (entry.agent_name) parts.push(entry.agent_name);

  parts.push(entry.action);

  if (entry.details) parts.push(`— ${entry.details}`);
  if (entry.patient_id != null) parts.push(`(Patient #${entry.patient_id})`);

  return parts.join(' ');
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 24) {
      return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffHours < 48) {
      return `Yesterday ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return (
      d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
      ' · ' +
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    );
  } catch {
    return iso;
  }
}

export default function AuditView({ onToast }: AuditViewProps) {
  const { entries, loading, error } = useAuditLog();

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

  return (
    <div>
      <div className="pg-hdr">
        <div>
          <div className="pg-title">Audit Log</div>
          <div className="pg-sub">All system activity — user actions, data changes, logins</div>
        </div>
        <button className="btn btn-ghost" onClick={handleExport}>
          Export Log ↓
        </button>
      </div>

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
              {entries.map((entry: AgentActivityLogResponse) => (
                <div key={entry.id} className="audit-row">
                  <div className={`audit-dot ${dotClass(entry.action)}`} />
                  <div className="audit-text">{buildText(entry)}</div>
                  <div className="audit-time">{formatTime(entry.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
