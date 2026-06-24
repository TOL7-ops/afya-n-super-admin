'use client';

import { useState, useEffect } from 'react';
import { LICENSE_PLANS_WITH_PRICE, PAYMENT_METHODS_WITH_WAIVED } from '@/constants';
import { extractMaxSeatsFromPlan, extractAmountFromPlan } from '@/utils/planAmount';

export interface RenewLicenseData {
  plan: string;
  seats: number | null;
  startDate: string;
  paymentMethod: string;
  notes: string;
}

interface RenewLicenseModalProps {
  isOpen: boolean;
  institutionName: string;
  /** Pre-fill from current license */
  currentPlan?: string | null;
  currentSeats?: number | null;
  onClose: () => void;
  onConfirm: (data: RenewLicenseData) => Promise<void>;
}

const today = () => new Date().toISOString().split('T')[0];

export default function RenewLicenseModal({
  isOpen,
  institutionName,
  currentPlan,
  currentSeats,
  onClose,
  onConfirm,
}: RenewLicenseModalProps) {
  const [plan,          setPlan]          = useState('');
  const [seats,         setSeats]         = useState('');
  const [startDate,     setStartDate]     = useState(today());
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [notes,         setNotes]         = useState('');
  const [saving,        setSaving]        = useState(false);
  const [err,           setErr]           = useState<string | null>(null);

  // Pre-fill whenever modal opens or props change
  useEffect(() => {
    if (!isOpen) return;
    setPlan(currentPlan ?? '');
    setSeats(currentSeats != null ? String(currentSeats) : '');
    setStartDate(today());
    setPaymentMethod('Bank Transfer');
    setNotes('');
    setSaving(false);
    setErr(null);
  }, [isOpen, currentPlan, currentSeats]);

  const maxSeatsForPlan = extractMaxSeatsFromPlan(plan);

  const handleConfirm = async () => {
    if (!plan) { setErr('Please select a plan.'); return; }
    if (maxSeatsForPlan !== null && seats && Number(seats) > maxSeatsForPlan) {
      setErr(`This plan only allows up to ${maxSeatsForPlan} seats.`);
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onConfirm({
        plan,
        seats: seats ? Number(seats) : null,
        startDate,
        paymentMethod,
        notes,
      });
      onClose();
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setErr(typeof detail === 'string' ? detail : (e instanceof Error ? e.message : 'Renewal failed — try again'));
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
      <div className="modal" style={{ maxWidth: '480px' }}>
        <div className="modal-top">
          <div className="modal-title">Renew License</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '.85rem', color: 'var(--gray)', marginBottom: '18px' }}>
            Renewing license for <strong style={{ color: 'var(--ink)' }}>{institutionName}</strong>.
            This extends the license by one year and updates the plan, seats, and billing details.
          </p>

          {err && (
            <div style={{
              marginBottom: '14px', padding: '10px 12px',
              background: 'var(--red-pale)', border: '1px solid var(--red-mist)',
              borderRadius: '3px', fontSize: '.8rem', color: 'var(--red)',
            }}>
              {err}
            </div>
          )}

          <div className="form-grid">

            {/* Plan */}
            <div className="field span2">
              <label className="lbl">Plan <span className="req">*</span></label>
              <select
                className="sel"
                value={plan}
                onChange={(e) => { setPlan(e.target.value); setErr(null); }}
              >
                <option disabled value="">Select plan</option>
                {LICENSE_PLANS_WITH_PRICE.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
              {plan && (
                <div style={{ fontSize: '.75rem', color: 'var(--ink-mid)', marginTop: '4px', fontFamily: "'JetBrains Mono',monospace" }}>
                  {extractAmountFromPlan(plan) > 0
                    ? `GHS ${extractAmountFromPlan(plan).toLocaleString()}`
                    : 'Free'}
                  {maxSeatsForPlan !== null ? ` · max ${maxSeatsForPlan} seats` : ' · unlimited seats'}
                </div>
              )}
            </div>

            {/* Start Date */}
            <div className="field">
              <label className="lbl">Start Date</label>
              <input
                className="inp"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            {/* Seats */}
            <div className="field">
              <label className="lbl">
                Seats
                {maxSeatsForPlan !== null && (
                  <span style={{ color: 'var(--gray)', fontWeight: 400, marginLeft: '6px', fontSize: '.72rem' }}>
                    (max {maxSeatsForPlan})
                  </span>
                )}
              </label>
              <input
                className="inp"
                type="number"
                value={seats}
                onChange={(e) => {
                  if (maxSeatsForPlan !== null && Number(e.target.value) > maxSeatsForPlan) return;
                  setSeats(e.target.value);
                  setErr(null);
                }}
                placeholder={maxSeatsForPlan != null ? `1 – ${maxSeatsForPlan}` : 'e.g. 10'}
                min={1}
                max={maxSeatsForPlan ?? undefined}
              />
            </div>

            {/* Payment Method */}
            <div className="field span2">
              <label className="lbl">Payment Method</label>
              <select
                className="sel"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {PAYMENT_METHODS_WITH_WAIVED.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="field span2">
              <label className="lbl">Notes</label>
              <textarea
                className="inp"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes about this renewal…"
                style={{ resize: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-green" onClick={handleConfirm} disabled={saving || !plan}>
              {saving ? 'Renewing…' : 'Confirm Renewal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
