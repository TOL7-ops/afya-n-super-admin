'use client';

import { useState } from 'react';
import { LICENSE_PLANS_WITH_PRICE } from '@/constants';

interface RenewLicenseModalProps {
  isOpen: boolean;
  institutionName: string;
  onClose: () => void;
  onConfirm: (data: { plan: string; expiryDate: string }) => Promise<void>;
}

function defaultExpiry(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().split('T')[0];
}

export default function RenewLicenseModal({
  isOpen,
  institutionName,
  onClose,
  onConfirm,
}: RenewLicenseModalProps) {
  const [plan, setPlan] = useState('');
  const [expiryDate, setExpiryDate] = useState(defaultExpiry());
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleConfirm = async () => {
    if (!plan || !expiryDate) {
      setErr('Please select a plan and expiry date.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onConfirm({ plan, expiryDate });
      setPlan('');
      setExpiryDate(defaultExpiry());
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Renewal failed — try again');
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) onClose();
  };

  return (
    <div
      className={`modal-overlay${isOpen ? ' open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="modal" style={{ maxWidth: '440px' }}>
        <div className="modal-top">
          <div className="modal-title">Renew License</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '.85rem', color: 'var(--gray)', marginBottom: '18px' }}>
            Renewing license for <strong style={{ color: 'var(--ink)' }}>{institutionName}</strong>.
          </p>

          {err && (
            <div style={{
              marginBottom: '14px', padding: '10px 12px', background: 'var(--red-bg)',
              borderRadius: '3px', fontSize: '.8rem', color: 'var(--red)',
            }}>
              {err}
            </div>
          )}

          <div className="form-grid">
            <div className="field span2">
              <label className="lbl">New Plan <span className="req">*</span></label>
              <select className="sel" value={plan} onChange={(e) => setPlan(e.target.value)}>
                <option disabled value="">Select plan</option>
                {LICENSE_PLANS_WITH_PRICE.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="field span2">
              <label className="lbl">New Expiry Date <span className="req">*</span></label>
              <input
                className="inp"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-green" onClick={handleConfirm} disabled={saving}>
              {saving ? 'Renewing…' : 'Confirm Renewal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
