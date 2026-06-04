'use client';

import { useState, useEffect } from 'react';
import type { IssueLicenseForm } from '@/types';
import type { FacilityResponse, LicenseItem } from '@/types/api';
import { LICENSE_PLANS_WITH_PRICE, PAYMENT_METHODS_WITH_WAIVED } from '@/constants';
import { extractMaxSeatsFromPlan, extractAmountFromPlan, cleanPlanLabel } from '@/utils/planAmount';

interface IssueLicenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIssue: (data: IssueLicenseForm) => void;
  facilities: FacilityResponse[];
  /** Pass current licenses so already-licensed institutions are excluded */
  existingLicenses?: LicenseItem[];
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
  existingLicenses = [],
}: IssueLicenseModalProps) {
  const [form, setForm] = useState<IssueLicenseForm>({ ...EMPTY, startDate: today() });
  const [fetchedLicenses, setFetchedLicenses] = useState<LicenseItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ ...EMPTY, startDate: today() });
    // Fetch current licenses so we can filter out already-licensed institutions
    import('@/services/licenses.service')
      .then(({ listLicenses }) => listLicenses())
      .then(setFetchedLicenses)
      .catch(() => setFetchedLicenses([]));
  }, [isOpen]);

  // Use self-fetched licenses; fall back to prop if fetch hasn't completed yet
  const allLicenses = fetchedLicenses.length > 0 ? fetchedLicenses : existingLicenses;

  // Only show institutions that don't already have an active/valid license
  const licensedNames = new Set(
    allLicenses
      .filter((l) => {
        const s = (l.status ?? '').toLowerCase();
        // Allow expired/suspended to be re-issued; block active/expiring/trial
        return s === 'active' || s === 'expiring' || s === 'trial';
      })
      .map((l) => l.institution_name?.trim().toLowerCase()),
  );

  const availableFacilities = facilities.filter(
    (f) => !licensedNames.has(f.name.trim().toLowerCase()),
  );

  const handleFacilityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    const facility = availableFacilities.find((f) => f.id === id);
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

    // Enforce seat limit from plan
    const maxSeats = extractMaxSeatsFromPlan(form.plan);
    if (maxSeats !== null && form.seats && Number(form.seats) > maxSeats) {
      alert(`This plan only allows up to ${maxSeats} seats.`);
      return;
    }

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
                {availableFacilities.length === 0 ? (
                  <option disabled>All institutions already have active licenses</option>
                ) : (
                  availableFacilities.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))
                )}
              </select>
              {availableFacilities.length === 0 && (
                <div style={{ fontSize: '.72rem', color: 'var(--amber)', marginTop: '4px' }}>
                  All institutions have active licenses. Use the Renew button in the license table to renew existing ones.
                </div>
              )}
            </div>

            <div className="field">
              <label className="lbl">Plan <span className="req">*</span></label>
              <select className="sel" name="plan" value={form.plan} onChange={handleChange}>
                <option disabled value="">Select plan</option>
                <option value="30-day Free Trial">30-day Free Trial — GHS 0</option>
                {LICENSE_PLANS_WITH_PRICE.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              {form.plan && (
                <div style={{ fontSize: '.75rem', color: 'var(--ink-mid)', marginTop: '4px', fontFamily: "'JetBrains Mono',monospace" }}>
                  {extractAmountFromPlan(form.plan) > 0
                    ? `GHS ${extractAmountFromPlan(form.plan).toLocaleString()}`
                    : 'Free'}
                  {extractMaxSeatsFromPlan(form.plan) !== null
                    ? ` · max ${extractMaxSeatsFromPlan(form.plan)} seats`
                    : ' · unlimited seats'}
                </div>
              )}
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
              <label className="lbl">
                Seats
                {extractMaxSeatsFromPlan(form.plan) !== null && (
                  <span style={{ color: 'var(--gray)', fontWeight: 400, marginLeft: '6px', fontSize: '.72rem' }}>
                    (max {extractMaxSeatsFromPlan(form.plan)})
                  </span>
                )}
              </label>
              <input
                className="inp"
                type="number"
                name="seats"
                value={form.seats}
                onChange={(e) => {
                  const maxSeats = extractMaxSeatsFromPlan(form.plan);
                  const val = e.target.value;
                  if (maxSeats !== null && Number(val) > maxSeats) return;
                  setForm((prev) => ({ ...prev, seats: val }));
                }}
                placeholder={extractMaxSeatsFromPlan(form.plan) != null
                  ? `1 – ${extractMaxSeatsFromPlan(form.plan)}`
                  : 'e.g. 10'}
                min={1}
                max={extractMaxSeatsFromPlan(form.plan) ?? undefined}
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
