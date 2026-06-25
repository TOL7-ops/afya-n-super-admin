'use client';

/**
 * CreateInstitutionModal — two-step registration flow.
 *
 * Step 1 — Register Institution (NGO/programme)
 *   POST /api/v1/super-admin/institutions  →  InstitutionRegistrationRequest
 *
 * Step 2 — Register Facility (clinical hospital/clinic under that institution)
 *   POST /api/v1/super-admin/facilities    →  FacilityRegistrationRequest
 *
 * If the user completes Step 1 then closes the modal, the institution record
 * exists on the backend without a facility. On next open, if pendingStep is 2,
 * the modal skips directly to Step 2.
 *
 * Both endpoints return {} — no id comes back, so Step 2 is independent.
 */

import { useState } from 'react';
import {
  registerInstitution,
  registerFacility,
  type InstitutionRegistrationRequest,
  type FacilityRegistrationRequest,
} from '@/services/institutions.service';
import { INSTITUTION_TYPES, REGIONS, LICENSE_PLANS } from '@/constants';
import type { ToastType } from '@/types';

interface CreateInstitutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after Step 2 completes successfully so the parent can refresh. */
  onComplete: () => void;
  onToast: (msg: string, type?: ToastType) => void;
}

// ─── Step 1 form state ────────────────────────────────────────────────────────
interface Step1Form {
  name: string;
  city: string;
  state_region: string;
  contact_name: string;
  email: string;
  phone: string;
  license_plan: string;
  seats: string;
  notes: string;
}

// ─── Step 2 form state ────────────────────────────────────────────────────────
interface Step2Form {
  name: string;
  type: string;
  region: string;
  contact_name: string;
  email: string;
  phone: string;
  license_plan: string;
  seats: string;
  notes: string;
}

const EMPTY_STEP1: Step1Form = {
  name: '',
  city: '',
  state_region: '',
  contact_name: '',
  email: '',
  phone: '',
  license_plan: 'Standard',
  seats: '1',
  notes: '',
};

const EMPTY_STEP2: Step2Form = {
  name: '',
  type: '',
  region: '',
  contact_name: '',
  email: '',
  phone: '',
  license_plan: '30-day Free Trial',
  seats: '10',
  notes: '',
};

export default function CreateInstitutionModal({
  isOpen,
  onClose,
  onComplete,
  onToast,
}: CreateInstitutionModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [step1, setStep1] = useState<Step1Form>(EMPTY_STEP1);
  const [step2, setStep2] = useState<Step2Form>(EMPTY_STEP2);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setStep(1);
    setStep1(EMPTY_STEP1);
    setStep2(EMPTY_STEP2);
    setSaving(false);
    setError(null);
  };

  const handleClose = () => {
    // Don't reset — preserve step 1 completion so user can re-open at step 2
    setError(null);
    setSaving(false);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('modal-overlay')) handleClose();
  };

  // ── Step 1 handlers ──────────────────────────────────────────────────────────
  const handleStep1Change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setStep1((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleStep1Submit = async () => {
    if (!step1.name.trim()) { setError('Institution name is required.'); return; }
    if (!step1.contact_name.trim()) { setError('Contact name is required.'); return; }
    if (!step1.email.trim()) { setError('Admin email is required.'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload: InstitutionRegistrationRequest = {
        name:         step1.name.trim(),
        city:         step1.city.trim()         || undefined,
        state_region: step1.state_region.trim() || undefined,
        contact_name: step1.contact_name.trim(),
        email:        step1.email.trim(),
        phone:        step1.phone.trim()         || undefined,
        license_plan: step1.license_plan         || 'Standard',
        seats:        step1.seats ? Number(step1.seats) : 1,
        notes:        step1.notes.trim()         || undefined,
      };
      await registerInstitution(payload);
      onToast(`${step1.name} institution registered`, 'success');
      // Pre-fill Step 2 contact info from Step 1
      setStep2((prev) => ({
        ...prev,
        contact_name: step1.contact_name,
        email:        step1.email,
        phone:        step1.phone,
        region:       step1.state_region,
      }));
      setStep(2);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        .response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to register institution — try again');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 2 handlers ──────────────────────────────────────────────────────────
  const handleStep2Change = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    setStep2((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const handleStep2Submit = async () => {
    if (!step2.name.trim())         { setError('Facility name is required.'); return; }
    if (!step2.type.trim())         { setError('Facility type is required.'); return; }
    if (!step2.region.trim())       { setError('Region is required.'); return; }
    if (!step2.contact_name.trim()) { setError('Contact name is required.'); return; }
    if (!step2.email.trim())        { setError('Admin email is required.'); return; }

    setSaving(true);
    setError(null);
    try {
      const payload: FacilityRegistrationRequest = {
        name:         step2.name.trim(),
        type:         step2.type,
        region:       step2.region,
        contact_name: step2.contact_name.trim(),
        email:        step2.email.trim(),
        phone:        step2.phone.trim()         || undefined,
        license_plan: step2.license_plan         || '30-day Free Trial',
        seats:        step2.seats ? Number(step2.seats) : 10,
        notes:        step2.notes.trim()         || undefined,
      };
      await registerFacility(payload);
      onToast(`${step2.name} facility registered — onboarding email sent`, 'success');
      reset();
      onComplete();
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })
        .response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to register facility — try again');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`modal-overlay${isOpen ? ' open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="modal" style={{ maxWidth: '560px' }}>
        {/* Header */}
        <div className="modal-top">
          <div className="modal-title">
            {step === 1 ? 'Register Institution (NGO / Programme)' : 'Register Clinical Facility'}
          </div>
          <button className="modal-close" onClick={handleClose} aria-label="Close">✕</button>
        </div>

        {/* Step indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 20px',
          background: 'var(--color-primary-light)',
          borderBottom: '1px solid var(--gray-lt)',
          fontSize: '.72rem',
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%',
            background: step === 1 ? 'var(--color-primary)' : 'var(--green)',
            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.65rem', fontWeight: 700, flexShrink: 0,
          }}>
            {step === 1 ? '1' : '✓'}
          </div>
          <span style={{ color: step === 1 ? 'var(--ink)' : 'var(--green)', fontWeight: step === 1 ? 600 : 400 }}>
            Step 1 — Institution
          </span>
          <div style={{ flex: 1, height: '2px', background: step === 2 ? 'var(--green)' : 'var(--gray-lt)' }} />
          <div style={{
            width: '20px', height: '20px', borderRadius: '50%',
            background: step === 2 ? 'var(--color-primary)' : 'var(--gray-lt)',
            color: step === 2 ? 'white' : 'var(--gray)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '.65rem', fontWeight: 700, flexShrink: 0,
          }}>
            2
          </div>
          <span style={{ color: step === 2 ? 'var(--ink)' : 'var(--gray)', fontWeight: step === 2 ? 600 : 400 }}>
            Step 2 — Facility
          </span>
        </div>

        <div className="modal-body">
          {/* Error banner */}
          {error && (
            <div style={{
              marginBottom: '14px', padding: '10px 12px',
              background: 'var(--red-pale)', border: '1px solid var(--red-mist)',
              borderRadius: '3px', fontSize: '.8rem', color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          {step === 1 ? (
            <>
              {/* ── STEP 1 — Institution ── */}
              <div className="info-box" style={{ marginBottom: '16px' }}>
                <div className="ico">ℹ</div>
                <div>
                  Register the <strong>NGO / programme / organisation</strong> first.
                  Then in Step 2 you'll register the clinical facility that operates under it.
                </div>
              </div>

              <div className="form-grid">
                <div className="field span2">
                  <label className="lbl">Institution Name <span className="req">*</span></label>
                  <input
                    className="inp" type="text" name="name"
                    value={step1.name} onChange={handleStep1Change}
                    placeholder="e.g. Kpando Community Health NGO"
                  />
                </div>

                <div className="field">
                  <label className="lbl">City / Town</label>
                  <input
                    className="inp" type="text" name="city"
                    value={step1.city} onChange={handleStep1Change}
                    placeholder="e.g. Kpando"
                  />
                </div>

                <div className="field">
                  <label className="lbl">State / Region</label>
                  <select className="sel" name="state_region" value={step1.state_region} onChange={handleStep1Change}>
                    <option value="">Select region</option>
                    {REGIONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="lbl">Admin Contact Name <span className="req">*</span></label>
                  <input
                    className="inp" type="text" name="contact_name"
                    value={step1.contact_name} onChange={handleStep1Change}
                    placeholder="Full name"
                  />
                </div>

                <div className="field">
                  <label className="lbl">Admin Email <span className="req">*</span></label>
                  <input
                    className="inp" type="email" name="email"
                    value={step1.email} onChange={handleStep1Change}
                    placeholder="admin@institution.gh"
                  />
                </div>

                <div className="field">
                  <label className="lbl">Phone</label>
                  <input
                    className="inp" type="tel" name="phone"
                    value={step1.phone} onChange={handleStep1Change}
                    placeholder="0XXXXXXXXX"
                  />
                </div>

                <div className="field">
                  <label className="lbl">License Plan</label>
                  <select className="sel" name="license_plan" value={step1.license_plan} onChange={handleStep1Change}>
                    <option value="Standard">Standard</option>
                    {LICENSE_PLANS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="lbl">Seats</label>
                  <input
                    className="inp" type="number" name="seats"
                    value={step1.seats} onChange={handleStep1Change}
                    placeholder="1" min={1}
                  />
                </div>

                <div className="field span2">
                  <label className="lbl">Notes</label>
                  <textarea
                    className="inp" rows={2} name="notes"
                    value={step1.notes} onChange={handleStep1Change}
                    placeholder="Any additional notes…" style={{ resize: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
                <button className="btn btn-ghost" onClick={handleClose} disabled={saving}>
                  Cancel
                </button>
                <button className="btn btn-red" onClick={handleStep1Submit} disabled={saving}>
                  {saving ? 'Registering…' : 'Register Institution & Continue →'}
                </button>
              </div>
            </>
          ) : (
            <>
              {/* ── STEP 2 — Facility ── */}
              <div className="info-box" style={{ marginBottom: '16px' }}>
                <div className="ico">ℹ</div>
                <div>
                  Now register the <strong>clinical facility</strong> (hospital, clinic, pharmacy, etc.)
                  that operates under the institution. An onboarding email will be sent after this step.
                </div>
              </div>

              <div className="form-grid">
                <div className="field span2">
                  <label className="lbl">Facility Name <span className="req">*</span></label>
                  <input
                    className="inp" type="text" name="name"
                    value={step2.name} onChange={handleStep2Change}
                    placeholder="e.g. Kpando District Hospital"
                  />
                </div>

                <div className="field">
                  <label className="lbl">Facility Type <span className="req">*</span></label>
                  <select className="sel" name="type" value={step2.type} onChange={handleStep2Change}>
                    <option value="">Select type</option>
                    {INSTITUTION_TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="lbl">Region <span className="req">*</span></label>
                  <select className="sel" name="region" value={step2.region} onChange={handleStep2Change}>
                    <option value="">Select region</option>
                    {REGIONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="lbl">Admin Contact Name <span className="req">*</span></label>
                  <input
                    className="inp" type="text" name="contact_name"
                    value={step2.contact_name} onChange={handleStep2Change}
                    placeholder="Full name"
                  />
                </div>

                <div className="field">
                  <label className="lbl">Admin Email <span className="req">*</span></label>
                  <input
                    className="inp" type="email" name="email"
                    value={step2.email} onChange={handleStep2Change}
                    placeholder="admin@facility.gh"
                  />
                </div>

                <div className="field">
                  <label className="lbl">Phone</label>
                  <input
                    className="inp" type="tel" name="phone"
                    value={step2.phone} onChange={handleStep2Change}
                    placeholder="0XXXXXXXXX"
                  />
                </div>

                <div className="field">
                  <label className="lbl">License Plan</label>
                  <select className="sel" name="license_plan" value={step2.license_plan} onChange={handleStep2Change}>
                    {LICENSE_PLANS.map((p) => <option key={p}>{p}</option>)}
                  </select>
                </div>

                <div className="field">
                  <label className="lbl">Field Worker Seats</label>
                  <input
                    className="inp" type="number" name="seats"
                    value={step2.seats} onChange={handleStep2Change}
                    placeholder="10" min={1}
                  />
                </div>

                <div className="field span2">
                  <label className="lbl">Notes</label>
                  <textarea
                    className="inp" rows={2} name="notes"
                    value={step2.notes} onChange={handleStep2Change}
                    placeholder="Any additional notes…" style={{ resize: 'none' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '20px' }}>
                <button
                  className="btn btn-ghost"
                  onClick={() => { setStep(1); setError(null); }}
                  disabled={saving}
                  style={{ marginRight: 'auto' }}
                >
                  ← Back to Step 1
                </button>
                <button className="btn btn-ghost" onClick={handleClose} disabled={saving}>
                  Save & Finish Later
                </button>
                <button className="btn btn-red" onClick={handleStep2Submit} disabled={saving}>
                  {saving ? 'Registering…' : 'Register Facility & Send Onboarding Email'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
