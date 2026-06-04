'use client';

import { useState, useEffect } from 'react';
import type { EditInstitutionForm } from '@/types';
import { INSTITUTION_TYPES, REGIONS, LICENSE_PLANS } from '@/constants';

interface EditInstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData: EditInstitutionForm | null;
  onSave: (data: EditInstitutionForm) => void;
}

const EMPTY: EditInstitutionForm = {
  name: '',
  type: '',
  region: '',
  contact: '',
  email: '',
  plan: '',
  seats: '',
};

export default function EditInstitutionModal({
  isOpen,
  onClose,
  initialData,
  onSave,
}: EditInstitutionModalProps) {
  const [form, setForm] = useState<EditInstitutionForm>(EMPTY);

  useEffect(() => {
    if (initialData) setForm(initialData);
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
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
          <div className="modal-title">Edit Institution</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <div className="form-grid">
            <div className="field span2">
              <label className="lbl">Institution Name <span className="req">*</span></label>
              <input className="inp" type="text" name="name" value={form.name} onChange={handleChange} />
            </div>

            <div className="field">
              <label className="lbl">Type</label>
              <select className="sel" name="type" value={form.type} onChange={handleChange}>
                <option value="">Select type</option>
                {INSTITUTION_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>

            <div className="field">
              <label className="lbl">Region</label>
              <select className="sel" name="region" value={form.region} onChange={handleChange}>
                <option value="">Select region</option>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div className="field">
              <label className="lbl">Admin Contact Name</label>
              <input className="inp" type="text" name="contact" value={form.contact} onChange={handleChange} />
            </div>

            <div className="field">
              <label className="lbl">Admin Email</label>
              <input className="inp" type="email" name="email" value={form.email} onChange={handleChange} />
            </div>

            <div className="field">
              <label className="lbl">License Plan</label>
              <select className="sel" name="plan" value={form.plan} onChange={handleChange}>
                <option value="">Select plan</option>
                {LICENSE_PLANS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>

            <div className="field">
              <label className="lbl">Field Worker Seats</label>
              <input className="inp" type="number" name="seats" value={form.seats} onChange={handleChange} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-red" onClick={handleSave}>Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
}
