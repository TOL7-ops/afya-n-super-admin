'use client';

import { useState } from 'react';
import type { CreateInstitutionForm } from '@/types';
import { INSTITUTION_TYPES, REGIONS, LICENSE_PLANS } from '@/constants';

interface CreateInstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateInstitutionForm) => void;
}

const EMPTY_FORM: CreateInstitutionForm = {
  name: '',
  type: '',
  region: '',
  contact: '',
  email: '',
  phone: '',
  plan: '',
  seats: '',
  notes: '',
};

export default function CreateInstitutionModal({
  isOpen,
  onClose,
  onSubmit,
}: CreateInstitutionModalProps) {
  const [form, setForm] = useState<CreateInstitutionForm>(EMPTY_FORM);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = () => {
    if (!form.name.trim() || !form.email.trim()) {
      return; // parent handles toast
    }
    onSubmit(form);
    setForm(EMPTY_FORM);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) onClose();
  };

  return (
    <div
      className={`modal-overlay${isOpen ? ' open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="modal">
        <div className="modal-top">
          <div className="modal-title">Add New Institution</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="info-box">
            <div className="ico">ℹ</div>
            <div>
              After creating the institution, onboarding credentials will be sent to the admin
              email address. They can then log in, create field worker accounts, and begin
              conducting screenings.
            </div>
          </div>

          <div className="form-grid">
            <div className="field span2">
              <label className="lbl">
                Institution Name <span className="req">*</span>
              </label>
              <input
                className="inp"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Ho Municipal Health Directorate"
              />
            </div>

            <div className="field">
              <label className="lbl">
                Institution Type <span className="req">*</span>
              </label>
              <select className="sel" name="type" value={form.type} onChange={handleChange}>
                <option disabled value="">Select type</option>
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="lbl">
                Region <span className="req">*</span>
              </label>
              <select className="sel" name="region" value={form.region} onChange={handleChange}>
                <option disabled value="">Select region</option>
                {REGIONS.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="lbl">
                Admin Contact Name <span className="req">*</span>
              </label>
              <input
                className="inp"
                type="text"
                name="contact"
                value={form.contact}
                onChange={handleChange}
                placeholder="Full name of primary admin"
              />
            </div>

            <div className="field">
              <label className="lbl">
                Admin Email <span className="req">*</span>
              </label>
              <input
                className="inp"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="admin@institution.gh"
              />
            </div>

            <div className="field">
              <label className="lbl">Admin Phone</label>
              <input
                className="inp"
                type="tel"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="0XXXXXXXXX"
              />
            </div>

            <div className="field">
              <label className="lbl">
                License Plan <span className="req">*</span>
              </label>
              <select className="sel" name="plan" value={form.plan} onChange={handleChange}>
                <option disabled value="">Select plan</option>
                {LICENSE_PLANS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="lbl">Field Worker Seats</label>
              <input
                className="inp"
                type="number"
                name="seats"
                value={form.seats}
                onChange={handleChange}
                placeholder="e.g. 10"
              />
            </div>

            <div className="field span2">
              <label className="lbl">Notes</label>
              <textarea
                className="inp"
                rows={2}
                name="notes"
                value={form.notes}
                onChange={handleChange}
                placeholder="Any additional notes about this institution…"
                style={{ resize: 'none' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-red" onClick={handleSubmit}>
              Create Institution &amp; Send Onboarding Email
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
