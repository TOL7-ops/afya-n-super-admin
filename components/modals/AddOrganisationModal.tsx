'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { GHANA_REGIONS, LICENSE_PLANS } from '@/constants';
import type { ToastType } from '@/types';

interface AddOrganisationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  onToast: (msg: string, type?: ToastType) => void;
}

// ─── Type classification ───────────────────────────────────────────────────────
const FACILITY_TYPES = [
  'Hospital',
  'Clinic',
  'Pharmacy',
  'Diagnostic Centre',
  'Polyclinic',
  'Health Centre',
  'Maternity Home',
  'Research Institution',
];

const INSTITUTION_TYPES = [
  'NGO',
  'Employer',
  'Health Programme',
  'Community Organisation',
  'Government Agency',
  'Faith-Based Organisation',
];

function isFacilityType(type: string): boolean {
  return FACILITY_TYPES.includes(type);
}

// ─── Empty form ────────────────────────────────────────────────────────────────
const EMPTY = {
  type: '',
  name: '',
  region: '',
  contact_name: '',
  email: '',
  phone: '',
  license_plan: '30-day Free Trial',
  max_seats: '10',   // facility
  seats: '1',        // institution
  city: '',
  notes: '',
};

export default function AddOrganisationModal({
  isOpen, onClose, onComplete, onToast,
}: AddOrganisationModalProps) {
  const [form, setForm]   = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [error, setError]  = useState<string | null>(null);

  const isFacility    = isFacilityType(form.type);
  const isInstitution = !isFacility && form.type !== '';

  const reset = () => { setForm({ ...EMPTY }); setSaving(false); setError(null); };

  useEffect(() => {
    if (!isOpen) reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const set = (field: string, val: string) => {
    setForm((f) => ({ ...f, [field]: val }));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!form.type)         { setError('Organisation type is required.'); return; }
    if (!form.name.trim())  { setError('Organisation name is required.'); return; }
    if (!form.region)       { setError('Region is required.'); return; }
    if (!form.contact_name.trim()) { setError('Admin contact name is required.'); return; }
    if (!form.email.trim()) { setError('Admin email is required.'); return; }

    setSaving(true);
    setError(null);

    try {
      if (isFacility) {
        await api.post('/api/v1/super-admin/facilities', {
          name:         form.name.trim(),
          type:         form.type,
          region:       form.region,
          contact_name: form.contact_name.trim(),
          email:        form.email.trim(),
          phone:        form.phone.trim() || undefined,
          license_plan: form.license_plan || '30-day Free Trial',
          seats:        form.max_seats ? Number(form.max_seats) : 10,
          notes:        form.notes.trim() || undefined,
        });
        onToast(`${form.name} registered as a clinical facility — onboarding email sent`, 'success');
      } else {
        await api.post('/api/v1/super-admin/institutions', {
          name:         form.name.trim(),
          city:         form.city.trim() || undefined,
          state_region: form.region,
          contact_name: form.contact_name.trim(),
          email:        form.email.trim(),
          phone:        form.phone.trim() || undefined,
          license_plan: form.license_plan || '30-day Free Trial',
          seats:        form.seats ? Number(form.seats) : 1,
          notes:        form.notes.trim() || undefined,
        });
        onToast(`${form.name} registered as an institution — onboarding email sent`, 'success');
      }
      reset();
      onComplete();
      onClose();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Registration failed — try again');
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay') && !saving) onClose();
  };

  const submitLabel = isFacility
    ? 'Register Facility'
    : isInstitution
      ? 'Register Institution'
      : 'Register Organisation';

  return (
    <div className={`modal-overlay${isOpen ? ' open' : ''}`} onClick={handleOverlayClick}>
      <div className="modal" style={{ maxWidth: '560px' }}>
        <div className="modal-top">
          <div>
            <div className="modal-title">Add Organisation</div>
            <div style={{ fontSize: '.74rem', color: 'var(--gray)', marginTop: '2px' }}>
              Register a clinical facility or institution
            </div>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Close" disabled={saving}>✕</button>
        </div>

        <div className="modal-body">
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

            {/* ── Row 1: Type + Region ── */}
            <div className="field">
              <label className="lbl">Organisation Type <span className="req">*</span></label>
              <select
                className="sel"
                value={form.type}
                onChange={(e) => set('type', e.target.value)}
              >
                <option value="">Select organisation type…</option>
                <optgroup label="── Clinical Facilities ──">
                  {FACILITY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </optgroup>
                <optgroup label="── Institutions / NGOs ──">
                  {INSTITUTION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </optgroup>
              </select>
              {/* Entity type pill */}
              {isFacility && (
                <div style={{
                  marginTop: '5px', display: 'inline-block',
                  fontSize: '.7rem', fontWeight: 600, padding: '2px 10px',
                  borderRadius: '999px',
                  background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                  border: '1px solid var(--blue-border)',
                }}>
                  🏥 Clinical Facility
                </div>
              )}
              {isInstitution && (
                <div style={{
                  marginTop: '5px', display: 'inline-block',
                  fontSize: '.7rem', fontWeight: 600, padding: '2px 10px',
                  borderRadius: '999px',
                  background: 'var(--green-bg)', color: 'var(--green)',
                  border: '1px solid var(--green-border)',
                }}>
                  🏛 Institution / NGO
                </div>
              )}
            </div>

            <div className="field">
              <label className="lbl">Region <span className="req">*</span></label>
              <select
                className="sel"
                value={form.region}
                onChange={(e) => set('region', e.target.value)}
              >
                <option value="">Select region…</option>
                {GHANA_REGIONS.map((r) => (
                  <option key={r} value={r}>{r} Region</option>
                ))}
              </select>
            </div>

            {/* Organisation Name — full width */}
            <div className="field span2">
              <label className="lbl">Organisation Name <span className="req">*</span></label>
              <input
                className="inp" type="text" name="name"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder={isFacility
                  ? 'e.g. Ho Municipal Hospital'
                  : isInstitution
                    ? 'e.g. Kpando Community Health NGO'
                    : 'e.g. Ho Municipal Hospital'}
              />
            </div>

            {/* Admin Contact Name + Admin Email */}
            <div className="field">
              <label className="lbl">Admin Contact Name <span className="req">*</span></label>
              <input
                className="inp" type="text"
                value={form.contact_name}
                onChange={(e) => set('contact_name', e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div className="field">
              <label className="lbl">Admin Email <span className="req">*</span></label>
              <input
                className="inp" type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="admin@organisation.gh"
              />
            </div>

            {/* Phone + License Plan */}
            <div className="field">
              <label className="lbl">Phone</label>
              <input
                className="inp" type="tel"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="0XXXXXXXXX"
              />
            </div>

            <div className="field">
              <label className="lbl">License Plan</label>
              <select
                className="sel"
                value={form.license_plan}
                onChange={(e) => set('license_plan', e.target.value)}
              >
                {LICENSE_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            {/* Facility-only: Max Seats + Notes */}
            {isFacility && (
              <>
                <div className="field">
                  <label className="lbl">Max Seats</label>
                  <input
                    className="inp" type="number" min={1}
                    value={form.max_seats}
                    onChange={(e) => set('max_seats', e.target.value)}
                    placeholder="10"
                  />
                </div>
                <div className="field">
                  <label className="lbl">Notes</label>
                  <input
                    className="inp" type="text"
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Any notes…"
                  />
                </div>
              </>
            )}

            {/* Institution-only: City + Seat Count + Notes */}
            {isInstitution && (
              <>
                <div className="field">
                  <label className="lbl">City / Town</label>
                  <input
                    className="inp" type="text"
                    value={form.city}
                    onChange={(e) => set('city', e.target.value)}
                    placeholder="e.g. Kpando"
                  />
                </div>
                <div className="field">
                  <label className="lbl">Seat Count</label>
                  <input
                    className="inp" type="number" min={1}
                    value={form.seats}
                    onChange={(e) => set('seats', e.target.value)}
                    placeholder="1"
                  />
                </div>
                <div className="field span2">
                  <label className="lbl">Notes</label>
                  <input
                    className="inp" type="text"
                    value={form.notes}
                    onChange={(e) => set('notes', e.target.value)}
                    placeholder="Any notes…"
                  />
                </div>
              </>
            )}

            {/* Neither type selected yet: show a generic Notes field */}
            {!form.type && (
              <div className="field span2">
                <label className="lbl">Notes</label>
                <input
                  className="inp" type="text"
                  value={form.notes}
                  onChange={(e) => set('notes', e.target.value)}
                  placeholder="Any notes…"
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn btn-red"
              onClick={handleSubmit}
              disabled={saving}
            >
              {saving ? 'Registering…' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
