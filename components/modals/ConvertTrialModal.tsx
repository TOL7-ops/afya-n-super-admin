'use client';

import { useState } from 'react';
import { LICENSE_PLANS_WITH_PRICE, PAYMENT_METHODS } from '@/constants';

interface ConvertTrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  institutionName: string;
  onConfirm: (plan: string) => void;
}

export default function ConvertTrialModal({
  isOpen,
  onClose,
  institutionName,
  onConfirm,
}: ConvertTrialModalProps) {
  const [plan, setPlan] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) onClose();
  };

  const handleConfirm = () => {
    if (!plan) return;
    onConfirm(plan);
    setPlan('');
    onClose();
  };

  return (
    <div
      className={`modal-overlay${isOpen ? ' open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="modal" style={{ maxWidth: '480px' }}>
        <div className="modal-top">
          <div className="modal-title">Convert Trial to Paid</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '.85rem', color: 'var(--gray)', marginBottom: '18px' }}>
            Convert <strong style={{ color: 'var(--ink)' }}>{institutionName}</strong> from trial
            to a paid plan.
          </p>

          <div className="form-grid">
            <div className="field span2">
              <label className="lbl">Select Plan <span className="req">*</span></label>
              <select
                className="sel"
                value={plan}
                onChange={(e) => setPlan(e.target.value)}
              >
                <option disabled value="">Select plan</option>
                {LICENSE_PLANS_WITH_PRICE.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="field span2">
              <label className="lbl">Payment Method</label>
              <select
                className="sel"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-green" onClick={handleConfirm}>
              Convert &amp; Activate License
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
