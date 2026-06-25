'use client';

/**
 * Step 1 — Verify token
 * URL: /setup  (or /setup?token=AFYA-XXXX-XXXX-XXXX&email=ama@org.gh from the email link)
 *
 * Calls POST /api/v1/users/setup-tokens/verify
 * On success → stores result in sessionStorage, navigates to /setup/password
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

function SetupVerifyInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail]   = useState('');
  const [token, setToken]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Pre-fill from query params if the email link included them
  useEffect(() => {
    const qToken = searchParams.get('token') ?? '';
    const qEmail = searchParams.get('email') ?? '';
    if (qToken) setToken(qToken);
    if (qEmail) setEmail(qEmail);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !token.trim()) {
      setError('Both your email address and setup token are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<VerifyResponse>(
        '/api/v1/users/setup-tokens/verify',
        { token: token.trim(), email: email.trim() },
      );

      // Store verified data for the next steps
      sessionStorage.setItem('afya_onboarding', JSON.stringify(res.data));
      router.push('/setup/password');
    } catch (err: unknown) {
      const axErr = err as { response?: { status?: number; data?: { detail?: string } } };
      const status = axErr.response?.status;
      const detail = axErr.response?.data?.detail;

      if (status === 400 || status === 404) {
        setError('Token not found or already used. Check your email and token, then try again.');
      } else if (status === 410) {
        setError('This setup token has expired. Please contact support@afya.health for a new one.');
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Something went wrong. Please try again or contact support.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingShell step={1}>
      <div className="ob-card">
        <div className="ob-card-icon">🔐</div>
        <h1 className="ob-card-title">Verify your identity</h1>
        <p className="ob-card-sub">
          Enter the email address your account was registered under and the one-time setup token
          from the onboarding email we sent you.
        </p>

        {error && <div className="ob-error">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="ob-field">
            <label className="ob-lbl" htmlFor="ob-email">
              Email address <span className="ob-req">*</span>
            </label>
            <input
              id="ob-email"
              className="ob-inp"
              type="email"
              autoComplete="email"
              placeholder="ama@yourorganisation.gh"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(null); }}
              disabled={loading}
              required
            />
          </div>

          <div className="ob-field">
            <label className="ob-lbl" htmlFor="ob-token">
              Setup token <span className="ob-req">*</span>
            </label>
            <input
              id="ob-token"
              className="ob-inp ob-mono"
              type="text"
              placeholder="AFYA-XXXX-XXXX-XXXX"
              value={token}
              onChange={(e) => { setToken(e.target.value.toUpperCase()); setError(null); }}
              disabled={loading}
              required
              spellCheck={false}
              autoCapitalize="characters"
            />
            <span className="ob-hint">
              Found in the onboarding email from onboarding@afya.health
            </span>
          </div>

          <button className="ob-btn" type="submit" disabled={loading}>
            {loading ? <><span className="ob-spinner" /> Verifying…</> : 'Verify Token →'}
          </button>
        </form>

        <div className="ob-support">
          Token expired or missing?{' '}
          <a href="mailto:support@afya.health">Contact support@afya.health</a>
        </div>
      </div>
    </OnboardingShell>
  );
}

export default function SetupVerifyPage() {
  return (
    <Suspense>
      <SetupVerifyInner />
    </Suspense>
  );
}

/* ─── Shared shell ──────────────────────────────────────────────────────────── */
function OnboardingShell({ children, step }: { children: React.ReactNode; step: 1 | 2 | 3 }) {
  return (
    <div className="ob-root">
      {/* Header */}
      <div className="ob-header">
        <div className="ob-logo">
          <div className="ob-logo-dot" />
          Afya
        </div>
        <div className="ob-header-badge">Account Setup</div>
      </div>

      {/* Progress */}
      <div className="ob-progress">
        {(['Verify token', 'Set password', 'Confirm & go'] as const).map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3;
          const done    = n < step;
          const current = n === step;
          return (
            <div key={label} className="ob-step-wrap">
              <div className={`ob-step-dot${done ? ' done' : current ? ' current' : ''}`}>
                {done ? '✓' : n}
              </div>
              <span className={`ob-step-lbl${current ? ' current' : ''}`}>{label}</span>
              {i < 2 && <div className={`ob-step-line${done ? ' done' : ''}`} />}
            </div>
          );
        })}
      </div>

      {/* Content */}
      <div className="ob-content">{children}</div>

      {/* Footer */}
      <div className="ob-footer">
        Afya Platform · Node Eight · Ho, Volta Region, Ghana
      </div>

      <style>{obStyles}</style>
    </div>
  );
}

export { OnboardingShell };

/* ─── Styles ────────────────────────────────────────────────────────────────── */
const obStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&family=Cormorant+Garamond:ital,wght@0,700;1,700&display=swap');

  .ob-root {
    min-height: 100vh;
    background: #F7F7F8;
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: 'Outfit', sans-serif;
  }

  /* Header */
  .ob-header {
    width: 100%;
    background: var(--color-primary);
    padding: 14px 32px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .ob-logo {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.4rem;
    font-weight: 700;
    color: white;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ob-logo-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--color-primary);
    animation: ob-blink 2s infinite;
  }
  @keyframes ob-blink {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: .5; transform: scale(1.4); }
  }
  .ob-header-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: .6rem;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: var(--color-primary);
    background: rgba(33,121,255,.12);
    border: 1px solid rgba(33,121,255,.22);
    padding: 3px 9px;
    border-radius: 2px;
  }

  /* Progress bar */
  .ob-progress {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0;
    padding: 28px 32px 0;
    flex-wrap: nowrap;
  }
  .ob-step-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .ob-step-dot {
    width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'JetBrains Mono', monospace;
    font-size: .72rem; font-weight: 600;
    background: #E6E2E8; color: #7A717A;
    flex-shrink: 0; transition: all .25s;
  }
  .ob-step-dot.current { background: var(--color-primary); color: white; }
  .ob-step-dot.done    { background: #1A7A4A; color: white; }
  .ob-step-lbl {
    font-size: .74rem; color: #7A717A;
    white-space: nowrap;
  }
  .ob-step-lbl.current { color: var(--color-primary); font-weight: 500; }
  .ob-step-line {
    width: 48px; height: 2px;
    background: #E6E2E8; border-radius: 1px;
    margin: 0 8px; transition: background .25s;
    flex-shrink: 0;
  }
  .ob-step-line.done { background: #1A7A4A; }

  /* Card */
  .ob-content {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 32px 16px 48px;
    width: 100%;
  }
  .ob-card {
    background: var(--color-primary-light);
    border: 1px solid #E6E2E8;
    border-radius: 6px;
    padding: 36px 40px;
    width: 100%;
    max-width: 480px;
    box-shadow: 0 4px 24px rgba(0,0,0,.06);
  }
  .ob-card-icon {
    font-size: 2rem;
    margin-bottom: 12px;
  }
  .ob-card-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-primary);
    margin-bottom: 8px;
  }
  .ob-card-sub {
    font-size: .84rem;
    color: #7A717A;
    line-height: 1.6;
    margin-bottom: 24px;
  }

  /* Error */
  .ob-error {
    background: #FDF2F4;
    border: 1px solid #F5D5DB;
    border-radius: 3px;
    padding: 10px 13px;
    font-size: .8rem;
    color: #C41E3A;
    margin-bottom: 18px;
    line-height: 1.45;
  }

  /* Success */
  .ob-success {
    background: #EDF7F2;
    border: 1px solid #9DD0B8;
    border-radius: 3px;
    padding: 10px 13px;
    font-size: .8rem;
    color: #1A7A4A;
    margin-bottom: 18px;
    line-height: 1.45;
  }

  /* Fields */
  .ob-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    margin-bottom: 16px;
  }
  .ob-lbl {
    font-size: .71rem;
    font-weight: 500;
    letter-spacing: .02em;
    color: var(--color-primary);
  }
  .ob-req { color: var(--color-primary); margin-left: 2px; }
  .ob-inp {
    background: var(--color-primary-light);
    border: 1px solid var(--blue-border);
    border-radius: 3px;
    padding: 11px 13px;
    font-size: .88rem;
    color: var(--color-primary);
    font-family: 'Outfit', sans-serif;
    transition: border-color .2s;
    outline: none;
    width: 100%;
    box-sizing: border-box;
  }
  .ob-inp:focus { border-color: var(--color-primary); background: var(--color-primary-light); }
  .ob-inp::placeholder { color: #7A717A; opacity: .65; }
  .ob-inp:disabled { opacity: .6; cursor: not-allowed; }
  .ob-mono { font-family: 'JetBrains Mono', monospace !important; font-size: .85rem !important; letter-spacing: .04em; }
  .ob-hint { font-size: .7rem; color: #7A717A; }

  /* Password wrapper */
  .ob-pw-wrap { position: relative; }
  .ob-pw-wrap .ob-inp { padding-right: 42px; }
  .ob-pw-toggle {
    position: absolute;
    right: 12px; top: 50%;
    transform: translateY(-50%);
    background: none; border: none;
    cursor: pointer; color: #7A717A;
    padding: 0; display: flex; align-items: center;
  }
  .ob-pw-toggle:hover { color: var(--color-primary); }

  /* Strength bar */
  .ob-strength-wrap { display: flex; gap: 4px; margin-top: 6px; }
  .ob-strength-seg {
    flex: 1; height: 3px; border-radius: 2px;
    background: #E6E2E8; transition: background .3s;
  }
  .ob-strength-seg.weak   { background: #C41E3A; }
  .ob-strength-seg.medium { background: #916200; }
  .ob-strength-seg.strong { background: #1A7A4A; }
  .ob-strength-lbl { font-size: .68rem; color: #7A717A; margin-top: 3px; }

  /* Button */
  .ob-btn {
    width: 100%;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: 3px;
    padding: 12px 20px;
    font-family: 'Outfit', sans-serif;
    font-size: .88rem;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 8px;
    transition: background .2s;
  }
  .ob-btn:hover:not(:disabled) { background: var(--color-primary-hover); }
  .ob-btn:disabled { opacity: .6; cursor: not-allowed; }

  /* Dark button variant */
  .ob-btn-dark {
    background: var(--color-primary);
  }
  .ob-btn-dark:hover:not(:disabled) { background: var(--color-primary-hover); }

  /* Spinner */
  .ob-spinner {
    width: 14px; height: 14px;
    border: 2px solid rgba(255,255,255,.35);
    border-top-color: white;
    border-radius: 50%;
    animation: ob-spin .65s linear infinite;
    flex-shrink: 0;
  }
  @keyframes ob-spin { to { transform: rotate(360deg); } }

  /* Info box */
  .ob-info-box {
    background: #F7F8FC;
    border: 1px solid #D8E0F0;
    border-radius: 4px;
    padding: 16px 18px;
    margin-bottom: 20px;
  }
  .ob-info-title {
    font-size: .78rem;
    font-weight: 600;
    color: #1A4FA0;
    margin-bottom: 10px;
    letter-spacing: .02em;
  }
  .ob-info-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 6px 0;
    border-bottom: 1px solid #eee;
    gap: 12px;
  }
  .ob-info-row:last-child { border-bottom: none; }
  .ob-info-lbl { font-size: .76rem; color: #888; flex-shrink: 0; }
  .ob-info-val { font-size: .8rem; color: #222; font-weight: 500; text-align: right; }

  /* Support link */
  .ob-support {
    margin-top: 20px;
    font-size: .76rem;
    color: #7A717A;
    text-align: center;
  }
  .ob-support a { color: var(--color-primary); text-decoration: none; }
  .ob-support a:hover { text-decoration: underline; }

  /* Footer */
  .ob-footer {
    padding: 20px;
    font-family: 'JetBrains Mono', monospace;
    font-size: .62rem;
    color: #7A717A;
    letter-spacing: .06em;
    text-transform: uppercase;
    opacity: .5;
  }

  /* Divider */
  .ob-divider {
    height: 1px;
    background: #E6E2E8;
    margin: 20px 0;
  }
`;
