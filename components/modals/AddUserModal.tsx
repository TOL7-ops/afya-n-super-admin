'use client';

import { useState } from 'react';
import type { FacilityResponse } from '@/types/api';

interface AddUserForm {
  name: string;
  email: string;
  role: string;
  facility_id: number;
}

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: FacilityResponse[];
  onSave: (data: AddUserForm) => Promise<void>;
}

const EMPTY: AddUserForm = { name: '', email: '', role: 'field_worker', facility_id: 0 };

export default function AddUserModal({
  isOpen,
  onClose,
  facilities,
  onSave,
}: AddUserModalProps) {
  const [form, setForm] = useState<AddUserForm>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'facility_id' ? Number(value) : value,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.facility_id) {
      setErr('Please fill in name, email, and select an institution.');
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      await onSave(form);
      setForm({ ...EMPTY });
      onClose();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to create user');
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
          <div className="modal-title">Add New User</div>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
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
              <label className="lbl">Full Name <span className="req">*</span></label>
              <input
                className="inp"
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Ama Boateng"
              />
            </div>

            <div className="field span2">
              <label className="lbl">Email <span className="req">*</span></label>
              <input
                className="inp"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="user@institution.gh"
              />
            </div>

            <div className="field">
              <label className="lbl">Role <span className="req">*</span></label>
              <select className="sel" name="role" value={form.role} onChange={handleChange}>
                <option value="field_worker">Field Worker</option>
                <option value="facility_admin">Facility Admin</option>
                <option value="clinician">Clinician</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>

            <div className="field">
              <label className="lbl">Institution <span className="req">*</span></label>
              <select
                className="sel"
                name="facility_id"
                value={form.facility_id}
                onChange={handleChange}
              >
                <option value={0}>Select institution…</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button className="btn btn-red" onClick={handleSave} disabled={saving}>
              {saving ? 'Creating…' : 'Create User'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
