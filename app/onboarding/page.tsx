'use client';

/**
 * Step 1 — Token Verification
 * Institution admin enters their email + one-time setup token.
 * Calls POST /api/v1/users/setup-tokens/verify
 * On success: stores verified data in sessionStorage, navigates to /onboarding/set-password
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import api from '@/lib/api';

interface VerifyResponse {
  token: string;
  email: string;
  full_name: string;
  role: string;
  facility_id: number;
  facility_name: string;
  region: string;
  license_plan: string;
}

function VerifyForm() {
  const router = useRouter();
  const params = useSearchParams();

  // Token may be pre-filled from the email link (?token=AFYA-XXXX-XXXX-XXXX)
  const [email, setEmail]   = useState('');
  const [token, setToken]   = useState(params.get('token') ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Clear any stale onboarding session on mount
  useEffect(() => {
    sessionStorage.removeItem('afya_onboarding');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) { setError('Please enter your email address.'); return; }
    if (!token.trim()) { setError('Please enter your setup token.'); return; }

    setLoading(true);
    try {
      const res = await api.post<VerifyResponse>(
        '/api/v1/users/setup-tokens/verify',
        { token: token.trim(), email: email.trim() },
      );
      // Persist verified payload for subsequent steps
      sessionStorage.setItem('afya_onboarding', JSON.stringify(res.data));
      router.push('/onboarding/set-password');
    } catch (err: unknown) {
      const axErr = err as { response?: { data?: { detail?: string }; status?: number } };
      const detail = axErr.response?.data?.detail;
      const status = axErr.response?.status;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (status === 404) {
        setError('Token not found. Check the token and email, then try again.');
      } else if (status === 400) {
        setError('Invalid or already-used token. Contact support if you need a new one.');
      } else {
        setError('Unable to verify token. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ob-root">
      <div className="ob-card">
        {/* Brand strip */}
        <div className="ob-brand">
          <div className="ob-logo">
            <div className="ob-logo-dot" />
            Afya
          </div>
          <div className="ob-brand-sub">Hypertension Platform</div>
        </div>

        {/* Step indicator */}
        <div className="ob-steps">
          {['Verify Token', 'Set Password', 'Confirm Org', 'Done'].map((s, i) => (
            <div key={s} className={`ob-step${i === 0 ? ' ob-step-active' : ''}`}>
              <div className="ob-step-num">{i + 1}</div>
              <div className="ob-step-lbl">{s}</div>
            </div>
          ))}
        </div>

        <div className="ob-body">
          <div className="ob-title">Verify your identity</div>
          <p className="ob-sub">
            Enter the email address your account was created with, and paste the
            one-time setup token from your onboarding email.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="ob-error" role="alert">{error}</div>
            )}

            <div className="field" style={{ marginBottom: '14px' }}>
              <label className="lbl" htmlFor="ob-email">
                Email address <span className="req">*</span>
              </label>
              <input
                id="ob-email"
                className="inp"
                type="email"
                autoComplete="email"
                placeholder="admin@institution.gh"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                disabled={loading}
                required
              />
            </div>

            <div className="field" style={{ marginBottom: '22px' }}>
              <label className="lbl" htmlFor="ob-token">
                Setup token <span className="req">*</span>
              </label>
              <input
                id="ob-token"
                className="inp ob-token-input"
                type="text"
                autoComplete="off"
                placeholder="AFYA-XXXX-XXXX-XXXX"
                value={token}
                onChange={(e) => { setToken(e.target.value.toUpperCase()); setError(null); }}
                disabled={loading}
                spellCheck={false}
                required
              />
              <span style={{ fontSize: '.7rem', color: 'var(--gray)', marginTop: '3px' }}>
                Found in your onboarding email from onboarding@afya.health
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-red"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {loading ? <><span className="ob-spinner" /> Verifying…</> : 'Verify & Continue →'}
            </button>
          </form>

          <div className="ob-help">
            Token expired or not received?{' '}
            <a href="mailto:support@afya.health" style={{ color: 'var(--red)' }}>
              Contact support
            </a>
          </div>
        </div>
      </div>

      <OnboardingStyles />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}

function OnboardingStyles() {
  return (
    <style>{`
      .ob-root {
        min-height: 100vh;
        background: var(--off);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px 16px;
        font-family: 'Outfit', sans-serif;
      }
      .ob-card {
        background: var(--white);
        border: 1px solid var(--gray-lt);
        border-radius: 6px;
        width: 100%;
        max-width: 460px;
        overflow: hidden;
        box-shadow: 0 4px 24px rgba(0,0,0,.07);
      }
      .ob-brand {
        background: var(--ink);
        padding: 20px 28px;
        display: flex;
        align-items: center;
        gap: 14px;
      }
      .ob-logo {
        font-family: 'Cormorant Garamond', serif;
        font-size: 1.6rem;
        font-weight: 700;
        color: white;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .ob-logo-dot {
        width: 7px; height: 7px;
        border-radius: 50%;
        background: var(--red);
        animation: blink 2s infinite;
      }
      .ob-brand-sub {
        font-size: .72rem;
        color: rgba(255,255,255,.35);
        font-family: 'JetBrains Mono', monospace;
        letter-spacing: .04em;
      }
      .ob-steps {
        display: flex;
        border-bottom: 1px solid var(--gray-lt);
        background: var(--gray-xlt);
      }
      .ob-step {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px 4px;
        gap: 4px;
        border-right: 1px solid var(--gray-lt);
        opacity: .4;
      }
      .ob-step:last-child { border-right: none; }
      .ob-step.ob-step-active { opacity: 1; }
      .ob-step.ob-step-done { opacity: .7; }
      .ob-step-num {
        width: 20px; height: 20px;
        border-radius: 50%;
        background: var(--gray-lt);
        color: var(--gray);
        font-size: .65rem;
        font-weight: 700;
        display: flex; align-items: center; justify-content: center;
        font-family: 'JetBrains Mono', monospace;
      }
      .ob-step-active .ob-step-num {
        background: var(--red);
        color: white;
      }
      .ob-step-done .ob-step-num {
        background: var(--green);
        color: white;
      }
      .ob-step-lbl {
        font-size: .63rem;
        color: var(--gray);
        font-family: 'JetBrains Mono', monospace;
        letter-spacing: .03em;
        white-space: nowrap;
      }
      .ob-step-active .ob-step-lbl { color: var(--ink); font-weight: 500; }
      .ob-body { padding: 28px; }
      .ob-title {
        font-size: 1.1rem;
        font-weight: 600;
        color: var(--ink);
        margin-bottom: 8px;
      }
      .ob-sub {
        font-size: .81rem;
        color: var(--gray);
        line-height: 1.6;
        margin-bottom: 22px;
      }
      .ob-error {
        background: var(--red-pale);
        border: 1px solid var(--red-mist);
        color: var(--red);
        font-size: .8rem;
        padding: 10px 13px;
        border-radius: 3px;
        margin-bottom: 14px;
        line-height: 1.45;
      }
      .ob-token-input {
        font-family: 'JetBrains Mono', monospace !important;
        letter-spacing: .06em;
        font-size: .9rem !important;
      }
      .ob-spinner {
        width: 14px; height: 14px;
        border: 2px solid rgba(255,255,255,.35);
        border-top-color: white;
        border-radius: 50%;
        animation: spin 0.65s linear infinite;
        flex-shrink: 0;
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      .ob-help {
        margin-top: 18px;
        font-size: .76rem;
        color: var(--gray);
        text-align: center;
      }
      /* Org confirm box */
      .ob-org-box {
        background: var(--gray-xlt);
        border: 1px solid var(--gray-lt);
        border-radius: 4px;
        padding: 16px 18px;
        margin-bottom: 22px;
      }
      .ob-org-name {
        font-size: 1rem;
        font-weight: 600;
        color: var(--ink);
        margin-bottom: 10px;
      }
      .ob-org-row {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
        border-bottom: 1px solid var(--gray-lt);
        font-size: .8rem;
      }
      .ob-org-row:last-child { border-bottom: none; }
      .ob-org-lbl { color: var(--gray); }
      .ob-org-val { color: var(--ink); font-weight: 500; }
      /* Done card */
      .ob-done-icon {
        width: 56px; height: 56px;
        border-radius: 50%;
        background: var(--green-bg);
        border: 2px solid var(--green-border);
        display: flex; align-items: center; justify-content: center;
        font-size: 1.6rem;
        margin: 0 auto 18px;
      }
      .ob-portal-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        padding: 12px 24px;
        background: #1a1a2e;
        color: white;
        border: none;
        border-radius: 3px;
        font-size: .9rem;
        font-weight: 600;
        font-family: 'Outfit', sans-serif;
        cursor: pointer;
        text-decoration: none;
        transition: opacity .2s;
        margin-top: 4px;
      }
      .ob-portal-btn:hover { opacity: .88; }
    `}</style>
  );
}
