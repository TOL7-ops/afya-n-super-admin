'use client';

interface LicenseViewData {
  title: string;
  institution: string;
  plan: string;
  seats: number;
  startDate: string;
  expiry: string;
  amount: number;
}

interface LicenseViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: LicenseViewData | null;
  onRenewalEmail: () => void;
}

export default function LicenseViewModal({
  isOpen,
  onClose,
  data,
  onRenewalEmail,
}: LicenseViewModalProps) {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) onClose();
  };

  const content = data
    ? `Institution: ${data.institution}\nPlan: ${data.plan}\nSeats: ${data.seats}\nStart Date: ${data.startDate}\nExpiry: ${data.expiry}\nAmount: GHS ${data.amount.toLocaleString()}`
    : '';

  return (
    <div
      className={`modal-overlay${isOpen ? ' open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="modal" style={{ maxWidth: '480px' }}>
        <div className="modal-top">
          <div className="modal-title">{data?.title ?? 'Subscription Details'}</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div
            style={{
              background: 'var(--color-primary-light)',
              borderRadius: '3px',
              padding: '16px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '.82rem',
              lineHeight: 1.8,
              whiteSpace: 'pre-line',
            }}
          >
            {content}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
            <button className="btn btn-ghost" onClick={onClose}>Close</button>
            <button className="btn btn-red" onClick={onRenewalEmail}>
              Send Renewal Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
