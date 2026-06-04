'use client';

import { useState, useEffect } from 'react';
import type { IssueLicenseForm } from '@/types';
import type { FacilityResponse } from '@/types/api';
import { LICENSE_PLANS_WITH_PRICE, PAYMENT_METHODS_WITH_WAIVED } from '@/constants';

interface IssueLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssue: (data: IssueLicenseForm) => void;
  facilities: FacilityResponse[];
}

const today = () => new Date().toISOString().split('T')[0];

const EMPTY: IssueLicenseForm = {
  facilityId: 0,
  institution: '',
  plan: '',
  startDate: today(),
  seats: '',
  paymentMethod: 'Bank Transfer',
  notes: '',
};

export default function IssueLicenseModal({
  isOpen,
  onClose,
  onIssue,
  facilities,
}: IssueLicenseModalProps) {
  const [form, setForm] = useState<IssueLicenseForm>({ ...EMPTY, startDate: today() });

  useEffect(() => {
    if (isOpen) setForm({ ...EMPTY, startDate: today() });
  }, [isOpen]);

  const handleFacilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const facility = facilities.find((f) => f.id === id);
    setForm((prev) => ({
      ...prev,
      facilityId: id,
      institution: facility?.name ?? '',
    }));
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleIssue = () => {
    if (!form.facilityId || !form.plan) return;
    onIssue(form);
    onClose();
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
          <div className="form-grid">
            <div className="field span2">
              <label className="lbl">Institution <span className="req">*</span></label>
              <select
                className="sel"
                value={form.facilityId}
                onChange={handleFacilityChange}
              >
                <option value={0}>Select institution…</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="lbl">Plan <span className="req">*</span></label>
              <select className="sel" name="plan" value={form.plan} onChange={handleChange}>
                <option disabled value="">Select plan</option>
                <option>30-day Free Trial</option>
                {LICENSE_PLANS_WITH_PRICE.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="lbl">Start Date</label>
              <input
                className="inp"
                type="date"
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
              />
            </div>

            <div className="field">
              <label className="lbl">Seats</label>
              <input
                className="inp"
                type="number"
                name="seats"
                value={form.seats}
                onChange={handleChange}
                placeholder="e.g. 10"
              />
            </div>

            <div className="field">
              <label className="lbl">Payment Method</label>
              <select className="sel" name="paymentMethod" value={form.paymentMethod} onChange={handleChange}>
                {PAYMENT_METHODS_WITH_WAIVED.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            <div className="field span2">
              <label className="lbl">Notes</label>
              <textarea
                className="inp"
                rows={2}
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any notes about this license issuance…"
                style={{ resize: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-red" onClick={handleIssue} disabled={!form.facilityId || !form.plan}>
              Issue License
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
