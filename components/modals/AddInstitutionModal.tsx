'use client';

import { useState } from 'react';
import { registerInstitution, type InstitutionRegistrationRequest } from '@/services/institutions.service';
import { REGIONS, LICENSE_PLANS } from '@/constants';
import type { ToastType } from '@/types';

interface AddInstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onToast: (msg: string, type?: ToastType) => void;
}

const EMPTY = {
  name: '', city: '', state_region: '', contact_name: '',
  email: '', phone: '', license_plan: 'Standard',
  seats: '1', notes: '',
};

export default function AddInstitutionModal({
  isOpen, onClose, onComplete, onToast,
}: AddInstitutionModalProps) {
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const reset = () => { setForm({ ...EMPTY }); setSaving(false); setError(null); };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setError(null); };

  const handleClose = () => { setError(null); setSaving(false); onClose(); };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) handleClose();
  };

  const handleSubmit = async () => {
    if (!form.name.trim())         { setError('Institution name is required.'); return; }
    if (!form.contact_name.trim()) { setError('Contact name is required.'); return; }
    if (!form.email.trim())        { setError('Admin email is required.'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload: InstitutionRegistrationRequest = {
        name:         form.name.trim(),
        city:         form.city.trim()         || undefined,
        state_region: form.state_region.trim() || undefined,
        contact_name: form.contact_name.trim(),
        email:        form.email.trim(),
        phone:        form.phone.trim()         || undefined,
        license_plan: form.license_plan        || 'Standard',
        seats:        form.seats ? Number(form.seats) : 1,
        notes:        form.notes.trim()         || undefined,
      };
      await registerInstitution(payload);
      onToast(`${form.name} registered — onboarding email sent`, 'success');
      reset();
      onComplete();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to register institution — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`modal-overlay${isOpen ? ' open' : ''}`} onClick={handleOverlayClick}>
      <div className="modal" style={{ maxWidth: '540px' }}>
        <div className="modal-top">
          <div className="modal-title">🏛 Add Institution / NGO</div>
          <button className="modal-close" onClick={handleClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          {error && (
            <div style={{
              marginBottom: '14px', padding: '10px 12px',
              background: 'var(--red-pale)', border: '1px solid var(--red-mist)',
              borderRadius: '3px', fontSize: '.8rem', color: 'var(--red)',
            }}>{error}</div>
          )}
          <div className="form-grid">
            <div className="field span2">
              <label className="lbl">Institution Name <span className="req">*</span></label>
              <input className="inp" type="text" name="name" value={form.name} onChange={handleChange} placeholder="e.g. Kpando Community Health NGO" />
            </div>
            <div className="field">
              <label className="lbl">City / Town</label>
              <input className="inp" type="text" name="city" value={form.city} onChange={handleChange} placeholder="e.g. Kpando" />
            </div>
            <div className="field">
              <label className="lbl">State / Region</label>
              <select className="sel" name="state_region" value={form.state_region} onChange={handleChange}>
                <option value="">Select region</option>
                {REGIONS.map((r) => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="lbl">Admin Contact Name <span className="req">*</span></label>
              <input className="inp" type="text" name="contact_name" value={form.contact_name} onChange={handleChange} placeholder="Full name" />
            </div>
            <div className="field">
              <label className="lbl">Admin Email <span className="req">*</span></label>
              <input className="inp" type="email" name="email" value={form.email} onChange={handleChange} placeholder="admin@institution.gh" />
            </div>
            <div className="field">
              <label className="lbl">Phone</label>
              <input className="inp" type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="0XXXXXXXXX" />
            </div>
            <div className="field">
              <label className="lbl">License Plan</label>
              <select className="sel" name="license_plan" value={form.license_plan} onChange={handleChange}>
                <option value="Standard">Standard</option>
                {LICENSE_PLANS.map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="lbl">Seats</label>
              <input className="inp" type="number" name="seats" value={form.seats} onChange={handleChange} placeholder="1" min={1} />
            </div>
            <div className="field span2">
              <label className="lbl">Notes</label>
              <textarea className="inp" rows={2} name="notes" value={form.notes} onChange={handleChange} placeholder="Any notes…" style={{ resize: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={handleClose} disabled={saving}>Cancel</button>
            <button className="btn btn-red" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Registering…' : 'Register Institution & Send Email'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
