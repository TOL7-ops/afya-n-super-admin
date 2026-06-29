'use client';

/**
 * Shared confirmation modal for Approve / Reject demo request actions.
 * Used by both DashboardView widget and DemoRequestsView full page.
 */
import type { ConfirmDemoAction } from '@/hooks/useDemoRequests';

interface DemoConfirmModalProps {
  confirmAction: ConfirmDemoAction | null;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DemoConfirmModal({
  confirmAction,
  confirming,
  onConfirm,
  onCancel,
}: DemoConfirmModalProps) {
  if (!confirmAction) return null;

  const isApprove = confirmAction.action === 'Approved';

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.45)',
      }}
      onClick={() => { if (!confirming) onCancel(); }}
    >
      <div
        style={{
          background: 'var(--color-primary-light)',
          borderRadius: '8px', padding: '28px',
          maxWidth: '420px', width: 'calc(100% - 32px)',
          boxShadow: '0 8px 32px rgba(0,0,0,.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--ink)', marginBottom: '10px' }}>
          {isApprove ? 'Approve Demo Request?' : 'Reject Demo Request?'}
        </div>
        <p style={{ fontSize: '.85rem', color: 'var(--gray)', lineHeight: 1.6, marginBottom: '24px' }}>
          {isApprove ? (
            <>
              Approve the demo request from{' '}
              <strong style={{ color: 'var(--ink)' }}>{confirmAction.orgName}</strong>?{' '}
              A confirmation email will be sent to{' '}
              <strong style={{ color: 'var(--ink)' }}>
                {confirmAction.requesterEmail ?? confirmAction.requesterName}
              </strong>.
            </>
          ) : (
            <>
              Reject the demo request from{' '}
              <strong style={{ color: 'var(--ink)' }}>{confirmAction.orgName}</strong>?{' '}
              The requester will be notified.
            </>
          )}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-ghost" onClick={onCancel} disabled={confirming}>
            Cancel
          </button>
          <button
            className="btn"
            style={{
              background: isApprove ? 'var(--green)' : 'var(--red)',
              color: 'white',
              border: `1px solid ${isApprove ? 'var(--green)' : 'var(--red)'}`,
              minHeight: '44px',
            }}
            onClick={onConfirm}
            disabled={confirming}
          >
            {confirming
              ? isApprove ? 'Approving…' : 'Rejecting…'
              : isApprove ? 'Yes, Approve' : 'Yes, Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}
