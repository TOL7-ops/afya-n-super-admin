'use client';

/**
 * Issue License Modal
 *
 * Selects an EXISTING institution and updates its license plan + seats via
 * PUT /super-admin/institutions/{id}.
 *
 * Also records start date, payment method, and notes for billing purposes.
 * NEVER calls POST /super-admin/licenses — that creates a duplicate record.
 */

import { useState, useEffect } from 'react';
import type { FacilityResponse } from '@/types/api';
import { LICENSE_PLANS_WITH_PRICE, PAYMENT_METHODS_WITH_WAIVED } from '@/constants';
import { extractMaxSeatsFromPlan, extractAmountFromPlan } from '@/utils/planAmount';

export interface IssueLicenseData {
  facilityId: string;
  plan: string;
  seats: number | null;
  startDate: string;
  paymentMethod: string;
  notes: string;
}

interface IssueLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssue: (data: IssueLicenseData) => Promise<void>;
  facilities: FacilityResponse[];
}

const today = () => new Date().toISOString().split('T')[0];

export default function IssueLicenseModal({
  isOpen,
  onClose,
  onIssue,
  facilities,
}: IssueLicenseModalProps) {
  const [facilityId,     setFacilityId]     = useState('');
  const [plan,           setPlan]           = useState('');
  const [seats,          setSeats]          = useState('');
  const [startDate,      setStartDate]      = useState(today());
  const [paymentMethod,  setPaymentMethod]  = useState('Bank Transfer');
  const [notes,          setNotes]          = useState('');
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  // Reset on open
  useEffect(() => {
    if (!isOpen) return;
    setFacilityId('');
    setPlan('');
    setSeats('');
    setStartDate(today());
    setPaymentMethod('Bank Transfer');
    setNotes('');
    setSaving(false);
    setError(null);
  }, [isOpen]);

  // Pre-fill seats from the selected facility's current max_seats
  const selectedFacility = facilities.find((f) => f.id === facilityId) ?? null;
  useEffect(() => {
    if (selectedFacility) {
      const current = selectedFacility.max_seats ?? selectedFacility.seats ?? null;
      setSeats(current != null ? String(current) : '');
    }
  }, [selectedFacility]);

  const maxSeatsForPlan = extractMaxSeatsFromPlan(plan);

  const handleSubmit = async () => {
    // NOTE: Do NOT change this to call issueLicense() from licenses.service.ts.
    // That function calls POST /super-admin/licenses which creates a duplicate
    // facility record in the database. This modal intentionally calls
    // updateInstitution() to attach license data to the existing institution.
    // See: API Integration Audit §4.5 for full explanation.
    if (!facilityId || !plan) {
      setError('Please select an institution and a plan.');
      return;
    }
    if (maxSeatsForPlan !== null && seats && Number(seats) > maxSeatsForPlan) {
      setError(`This plan only allows up to ${maxSeatsForPlan} seats.`);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onIssue({
        facilityId,
        plan,
        seats: seats ? Number(seats) : null,
        startDate,
        paymentMethod,
        notes,
      });
      onClose();
    } catch (err: unknown) {
      const detail =
        (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to issue license — try again');
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
      <div className="modal" style={{ maxWidth: '520px' }}>
        <div className="modal-top">
          <div className="modal-title">Issue New License</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="modal-body">
          {/* Info banner */}
          <div className="info-box" style={{ marginBottom: '16px' }}>
            <div className="ico">ℹ</div>
            <div>
              Select an existing institution and assign or update their license plan.
              This updates the institution record — it does <strong>not</strong> create a duplicate entry.
            </div>
          </div>

          {error && (
            <div style={{
              marginBottom: '14px', padding: '10px 12px',
              background: 'var(--red-pale)', border: '1px solid var(--red-mist)',
              borderRadius: '3px', fontSize: '.8rem', color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          <div className="form-grid">

            {/* Institution */}
            <div className="field span2">
              <label className="lbl">Institution <span className="req">*</span></label>
              <select
                className="sel"
                value={facilityId}
                onChange={(e) => { setFacilityId(e.target.value); setError(null); }}
              >
                <option value="">Select institution…</option>
                {facilities.length === 0 ? (
                  <option disabled>No institutions loaded</option>
                ) : (
                  facilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                      {f.license_plan ? ` — ${f.license_plan}` : ''}
                      {f.max_seats != null ? ` (${f.max_seats} seats)` : ''}
                    </option>
                  ))
                )}
              </select>
              {selectedFacility && (
                <div style={{ fontSize: '.72rem', color: 'var(--gray)', marginTop: '4px', fontFamily: "'JetBrains Mono',monospace" }}>
                  Current plan: {selectedFacility.license_plan ?? '—'} ·
                  Seats: {selectedFacility.max_seats ?? '—'} ·
                  Status: {selectedFacility.status ?? (selectedFacility.is_active ? 'Active' : 'Inactive')}
                </div>
              )}
            </div>

            {/* Plan */}
            <div className="field">
              <label className="lbl">Plan <span className="req">*</span></label>
              <select
                className="sel"
                value={plan}
                onChange={(e) => { setPlan(e.target.value); setError(null); }}
              >
                <option disabled value="">Select plan</option>
                <option value="30-day Free Trial">30-day Free Trial — GHS 0</option>
                {LICENSE_PLANS_WITH_PRICE.map((p) => (
                  <option key={p} value={p}>{p}</option>
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
                placeholder="Any notes about this license issuance…"
                style={{ resize: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn btn-red"
              onClick={handleSubmit}
              disabled={saving || !facilityId || !plan}
            >
              {saving ? 'Saving…' : 'Issue License'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
