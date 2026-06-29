'use client';

import { useState } from 'react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import DemoConfirmModal from './DemoConfirmModal';
import { useDemoRequests } from '@/hooks/useDemoRequests';
import type { ToastType } from '@/types';
import type { DemoRequest, DemoRequestStatus } from '@/types/api';

interface DemoRequestsViewProps {
  onToast: (msg: string, type?: ToastType) => void;
}

type StatusFilter = 'all' | DemoRequestStatus;

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  } catch { return '—'; }
}

function StatusBadge({ status }: { status: DemoRequestStatus }) {
  const cfg: Record<DemoRequestStatus, { bg: string; color: string; border: string }> = {
    Pending:  { bg: 'var(--amber-bg)',   color: 'var(--amber)', border: 'var(--amber-border)' },
    Approved: { bg: 'var(--green-bg)',   color: 'var(--green)', border: 'var(--green-border)' },
    Rejected: { bg: 'var(--red-pale)',   color: 'var(--red)',   border: 'var(--red-mist)'    },
  };
  const s = cfg[status] ?? cfg.Pending;
  return (
    <span style={{
      fontFamily: "'JetBrains Mono',monospace",
      fontSize: '.65rem', fontWeight: 600,
      padding: '3px 8px', borderRadius: '3px',
      background: s.bg, color: s.color,
      border: `1px solid ${s.border}`,
    }}>
      {status}
    </span>
  );
}

export default function DemoRequestsView({ onToast }: DemoRequestsViewProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [search, setSearch]             = useState('');

  const {
    all,
    loading,
    actionInFlight,
    confirmAction,
    confirming,
    initiateAction,
    cancelAction,
    executeAction,
    refetch,
  } = useDemoRequests();

  // ── Client-side filter ────────────────────────────────────────────────────
  const filtered: DemoRequest[] = all.filter((r) => {
    const matchStatus = statusFilter === 'all' || r.status === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.name.toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q) ||
      r.organization_name.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <div>
      {/* Header */}
      <div className="pg-hdr">
        <div>
          <div className="pg-title">Demo Requests</div>
          <div className="pg-sub">All incoming demo requests — full history</div>
        </div>
        <button className="btn btn-ghost" onClick={refetch}>↻ Refresh</button>
      </div>

      {/* KPI pills */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {(['all', 'Pending', 'Approved', 'Rejected'] as StatusFilter[]).map((s) => {
          const count =
            s === 'all'
              ? all.length
              : all.filter((r) => r.status === s).length;
          const active = statusFilter === s;
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '6px 14px', borderRadius: '3px', fontSize: '.78rem', fontWeight: 500,
                cursor: 'pointer', border: '1px solid',
                borderColor:  active ? 'var(--color-primary)' : 'var(--gray-lt)',
                background:   active ? 'var(--color-primary)' : 'var(--color-primary-light)',
                color:        active ? 'white'                 : 'var(--ink-mid)',
                transition: 'all .15s',
              }}
            >
              {s === 'all' ? 'All' : s} ({count})
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="card-hdr">
          <div className="card-title">
            {statusFilter === 'all' ? 'All Requests' : `${statusFilter} Requests`}
          </div>
          <div className="card-sub">{filtered.length} record{filtered.length !== 1 ? 's' : ''}</div>
        </div>

        {/* Search */}
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
                placeholder="Search by name, email or organization…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '24px' }}>
            <LoadingSpinner message="Loading demo requests…" />
          </div>
        ) : (
          <div className="tbl-scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Organization</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date Requested</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{
                      textAlign: 'center', padding: '24px',
                      fontFamily: "'JetBrains Mono',monospace",
                      fontSize: '.72rem', color: 'var(--gray)',
                    }}>
                      No demo requests found
                    </td>
                  </tr>
                ) : filtered.map((req) => {
                  const inFlight  = actionInFlight.has(req.id);
                  const isPending = req.status === 'Pending';

                  return (
                    <tr key={req.id} style={{ opacity: inFlight ? 0.6 : 1, transition: 'opacity .2s' }}>
                      <td style={{ fontWeight: 500 }}>{req.name}</td>
                      <td style={{ fontSize: '.76rem', color: 'var(--ink-mid)' }}>
                        {req.email ?? '—'}
                      </td>
                      <td style={{ fontWeight: 500 }}>{req.organization_name}</td>
                      <td style={{ fontSize: '.8rem' }}>{req.organization_type ?? '—'}</td>
                      <td><StatusBadge status={req.status} /></td>
                      <td className="id-cell">{fmtDate(req.created_at)}</td>
                      <td>
                        {isPending ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {/* Approve */}
                            <button
                              title="Approve"
                              disabled={inFlight}
                              onClick={() => initiateAction(req, 'Approved')}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '4px 10px', borderRadius: '3px', fontSize: '.74rem',
                                fontWeight: 500, cursor: inFlight ? 'not-allowed' : 'pointer',
                                border: '1px solid var(--green-border)',
                                background: 'var(--green-bg)', color: 'var(--green)',
                                minHeight: '30px', transition: 'all .15s',
                              }}
                            >
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5"
                                strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                              Approve
                            </button>
                            {/* Reject */}
                            <button
                              title="Reject"
                              disabled={inFlight}
                              onClick={() => initiateAction(req, 'Rejected')}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '4px',
                                padding: '4px 10px', borderRadius: '3px', fontSize: '.74rem',
                                fontWeight: 500, cursor: inFlight ? 'not-allowed' : 'pointer',
                                border: '1px solid var(--red-mist)',
                                background: 'var(--red-pale)', color: 'var(--red)',
                                minHeight: '30px', transition: 'all .15s',
                              }}
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.5"
                                strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{
                            fontFamily: "'JetBrains Mono',monospace",
                            fontSize: '.65rem', color: 'var(--gray)',
                          }}>
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shared confirm modal */}
      <DemoConfirmModal
        confirmAction={confirmAction}
        confirming={confirming}
        onConfirm={() => executeAction(onToast)}
        onCancel={cancelAction}
      />
    </div>
  );
}
