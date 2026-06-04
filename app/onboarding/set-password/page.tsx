'use client';

/**
 * Step 2 — Set Password
 * Reads verified data from sessionStorage (set by step 1).
 * Calls POST /api/v1/users/setup-tokens/claim with token + email + password.
 * On success: saves claimed data, navigates to /onboarding/confirm.
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

interface OnboardingSession {
  token: string;
  email: string;
  full_name: string;
  role: string;
  facility_id: number;
  facility_name: string;
  region: string;
  license_plan: string;
}

export default function SetPasswordPage() {
  const router = useRouter();
  const [session, setSession] = useState<OnboardingSession | null>(null);

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [whatsapp, setWhatsapp]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [showConf, setShowConf]   = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('afya_onboarding');
    if (!raw) {
      // Guard: if they land here without verifying, send them back
      router.replace('/onboarding');
      return;
    }
    setSession(JSON.parse(raw) as OnboardingSession);
  }, [router]);

  const strength = (pwd: string): { label: string; color: string; pct: number } => {
    if (!pwd) return { label: '', color: 'var(--gray-lt)', pct: 0 };
    const checks = [pwd.length >= 8, /[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[^A-Za-z0-9]/.test(pwd)];
    const score = checks.filter(Boolean).length;
    if (score <= 1) return { label: 'Weak', color: 'var(--red)', pct: 25 };
    if (score === 2) return { label: 'Fair', color: 'var(--amber)', pct: 50 };
    if (score === 3) return { label: 'Good', color: '#5A9E60', pct: 75 };
    return { label: 'Strong', color: 'var(--green)', pct: 100 };
  };

  const pwdStrength = strength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!session) return;

    setLoading(true);
    try {
      await api.post('/api/v1/users/setup-tokens/claim', {
        token:            session.token,
        email:            session.email,
        password,
        whatsapp_number:  whatsapp.trim() || undefined,
      });
      router.push('/onboarding/confirm');
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { detail?: string }; status?: number } };
      const detail = axErr.response?.data?.detail;
      const status = axErr.response?.status;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (status === 400) {
        setError('Token already used or expired. Contact support for a new invitation.');
      } else {
        setError('Failed to set password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null;

  return (
    <div className="ob-root">
      <div className="ob-card">
        <div className="ob-brand">
          <div className="ob-logo">
            <div className="ob-logo-dot" />
            Afya
          </div>
          <div className="ob-brand-sub">Hypertension Platform</div>
        </div>

        <div className="ob-steps">
          {['Verify Token', 'Set Password', 'Confirm Org', 'Done'].map((s, i) => (
            <div key={s} className={`ob-step${i === 1 ? ' ob-step-active' : i < 1 ? ' ob-step-done' : ''}`}>
              <div className="ob-step-num">{i < 1 ? '✓' : i + 1}</div>
              <div className="ob-step-lbl">{s}</div>
            </div>
          ))}
        </div>

        <div className="ob-body">
          <div className="ob-title">Set your password</div>
          <p className="ob-sub">
            Setting up account for <strong style={{ color: 'var(--ink)' }}>{session.full_name}</strong>
            {' '}at <strong style={{ color: 'var(--ink)' }}>{session.facility_name}</strong>.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {error && <div className="ob-error" role="alert">{error}</div>}

            <div className="field" style={{ marginBottom: '14px' }}>
              <label className="lbl" htmlFor="ob-pwd">
                New password <span className="req">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="ob-pwd"
                  className="inp"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  disabled={loading}
                  required
                  style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                />
                <button type="button" className="ob-eye" onClick={() => setShowPwd(v => !v)} aria-label="Toggle password">
                  {showPwd ? '🙈' : '👁'}
                </button>
              </div>
              {/* Strength bar */}
              {password && (
                <div style={{ marginTop: '6px' }}>
                  <div style={{ height: '3px', background: 'var(--gray-lt)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pwdStrength.pct}%`, background: pwdStrength.color, borderRadius: '2px', transition: 'width .3s, background .3s' }} />
                  </div>
                  <span style={{ fontSize: '.68rem', color: pwdStrength.color, marginTop: '3px', display: 'block' }}>{pwdStrength.label}</span>
                </div>
              )}
            </div>

            <div className="field" style={{ marginBottom: '14px' }}>
              <label className="lbl" htmlFor="ob-conf">
                Confirm password <span className="req">*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="ob-conf"
                  className="inp"
                  type={showConf ? 'text' : 'password'}
                  placeholder="Repeat your password"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setError(null); }}
                  disabled={loading}
                  required
                  style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                />
                <button type="button" className="ob-eye" onClick={() => setShowConf(v => !v)} aria-label="Toggle confirm">
                  {showConf ? '🙈' : '👁'}
                </button>
              </div>
              {confirm && password !== confirm && (
                <span style={{ fontSize: '.7rem', color: 'var(--red)', marginTop: '3px', display: 'block' }}>Passwords do not match</span>
              )}
            </div>

            <div className="field" style={{ marginBottom: '22px' }}>
              <label className="lbl" htmlFor="ob-wa">WhatsApp number (optional)</label>
              <input
                id="ob-wa"
                className="inp"
                type="tel"
                placeholder="+233 XX XXXX XXXX"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                disabled={loading}
              />
              <span style={{ fontSize: '.7rem', color: 'var(--gray)', marginTop: '3px' }}>
                Used for WhatsApp notifications from the platform
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-red"
              disabled={loading || !password || password !== confirm}
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {loading ? <><span className="ob-spinner" /> Setting password…</> : 'Set Password & Continue →'}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .ob-root { min-height:100vh; background:var(--off); display:flex; align-items:center; justify-content:center; padding:32px 16px; font-family:'Outfit',sans-serif; }
        .ob-card { background:var(--white); border:1px solid var(--gray-lt); border-radius:6px; width:100%; max-width:460px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.07); }
        .ob-brand { background:var(--ink); padding:20px 28px; display:flex; align-items:center; gap:14px; }
        .ob-logo { font-family:'Cormorant Garamond',serif; font-size:1.6rem; font-weight:700; color:white; display:flex; align-items:center; gap:8px; }
        .ob-logo-dot { width:7px; height:7px; border-radius:50%; background:var(--red); animation:blink 2s infinite; }
        .ob-brand-sub { font-size:.72rem; color:rgba(255,255,255,.35); font-family:'JetBrains Mono',monospace; letter-spacing:.04em; }
        .ob-steps { display:flex; border-bottom:1px solid var(--gray-lt); background:var(--gray-xlt); }
        .ob-step { flex:1; display:flex; flex-direction:column; align-items:center; padding:10px 4px; gap:4px; border-right:1px solid var(--gray-lt); opacity:.4; }
        .ob-step:last-child { border-right:none; }
        .ob-step.ob-step-active { opacity:1; }
        .ob-step.ob-step-done { opacity:.7; }
        .ob-step-num { width:20px; height:20px; border-radius:50%; background:var(--gray-lt); color:var(--gray); font-size:.65rem; font-weight:700; display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono',monospace; }
        .ob-step-active .ob-step-num { background:var(--red); color:white; }
        .ob-step-done .ob-step-num { background:var(--green); color:white; font-size:.6rem; }
        .ob-step-lbl { font-size:.63rem; color:var(--gray); font-family:'JetBrains Mono',monospace; letter-spacing:.03em; white-space:nowrap; }
        .ob-step-active .ob-step-lbl { color:var(--ink); font-weight:500; }
        .ob-body { padding:28px; }
        .ob-title { font-size:1.1rem; font-weight:600; color:var(--ink); margin-bottom:8px; }
        .ob-sub { font-size:.81rem; color:var(--gray); line-height:1.6; margin-bottom:22px; }
        .ob-error { background:var(--red-pale); border:1px solid var(--red-mist); color:var(--red); font-size:.8rem; padding:10px 13px; border-radius:3px; margin-bottom:14px; line-height:1.45; }
        .ob-eye { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:.9rem; color:var(--gray); line-height:1; }
        .ob-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,.35); border-top-color:white; border-radius:50%; animation:spin .65s linear infinite; flex-shrink:0; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
      `}</style>
    </div>
  );
}
