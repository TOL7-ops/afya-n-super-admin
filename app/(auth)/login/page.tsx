'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import type { LoginPayload } from '@/services/authService';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, loading: authLoading } = useAuth();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [showPwd, setShowPwd]   = useState(false);

  // If already authenticated, skip straight to dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      console.log('[Login] Already authenticated — redirecting to dashboard');
      router.replace('/');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    const payload: LoginPayload = {
      username_or_email: email.trim(),
      password,
    };

    console.log('[Login] Submitting login request…');
    setLoading(true);

    try {
      await login(payload);
      console.log('[Login] Success — redirecting to dashboard');
      router.replace('/');
    } catch (err: unknown) {
      console.error('[Login] Failed:', err);
      // FastAPI returns { detail: string } for auth errors
      const axErr = err as {
        response?: {
          data?: { detail?: string | Array<{ msg: string }> };
          status?: number;
        };
      };
      const detail = axErr.response?.data?.detail;
      const status = axErr.response?.status;

      if (typeof detail === 'string') {
        // e.g. "Incorrect email or password"
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(', '));
      } else if (status === 400 || status === 401) {
        setError('Invalid email or password.');
      } else if (status === 422) {
        setError('Invalid request — check your email and password.');
      } else if (status === 0 || !status) {
        setError('Cannot reach the server. Check your connection.');
      } else {
        setError(`Login failed (${status ?? 'unknown error'}). Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Don't flash the login form while checking stored auth
  if (authLoading) return null;

  return (
    <div className="login-root">
      {/* ── Left brand panel ── */}
      <div className="login-brand">
        <div className="login-brand-inner">
          <div className="login-logo">
            <div className="logo-dot" />
            Afya
          </div>
          <div className="login-brand-tagline">
            Hypertension Screening &amp;<br />Medication Adherence Platform
          </div>
          <div className="login-brand-divider" />
          <div className="login-brand-stat">
            <span className="login-stat-val">4,712+</span>
            <span className="login-stat-lbl">Patients screened</span>
          </div>
          <div className="login-brand-stat">
            <span className="login-stat-val">14</span>
            <span className="login-stat-lbl">Active institutions</span>
          </div>
          <div className="login-brand-stat">
            <span className="login-stat-val">3 regions</span>
            <span className="login-stat-lbl">Covered across Ghana</span>
          </div>
          <div className="login-brand-footer">
            Node Eight · Ho, Volta Region, Ghana
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="login-panel">
        <div className="login-form-wrap">
          {/* Header */}
          <div className="login-form-header">
            <div className="admin-badge" style={{ marginBottom: '16px', alignSelf: 'flex-start' }}>
              Super Admin
            </div>
            <div className="login-form-title">Welcome back</div>
            <div className="login-form-sub">
              Sign in to the Afya Platform Admin Console
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Error banner */}
            {error && (
              <div className="login-error-banner" role="alert">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Email */}
            <div className="field" style={{ marginBottom: '14px' }}>
              <label className="lbl" htmlFor="login-email">
                Email address
              </label>
              <input
                id="login-email"
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

            {/* Password */}
            <div className="field" style={{ marginBottom: '22px' }}>
              <label className="lbl" htmlFor="login-password">
                Password
              </label>
              <div style={{ position: 'relative', display: 'block' }}>
                <input
                  id="login-password"
                  className="inp"
                  type={showPwd ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  disabled={loading}
                  required
                  style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0',
                    color: 'var(--gray)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {showPwd ? (
                    /* eye-off */
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    /* eye */
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-red"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              {loading ? (
                <>
                  <span className="login-spinner" />
                  Signing in…
                </>
              ) : (
                'Sign In to Admin Console'
              )}
            </button>
          </form>

          <div className="login-form-footer">
            Afya Platform v1.0 · Node Eight
          </div>
        </div>
      </div>

      <style>{`
        .login-root {
          display: flex;
          height: 100vh;
          overflow: hidden;
          background: var(--color-primary-light);
          font-family: 'Outfit', sans-serif;
        }

        /* ── Brand panel ── */
        .login-brand {
          width: 400px;
          flex-shrink: 0;
          background: linear-gradient(135deg, #2179FF 0%, #0066FF 100%);
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px 44px;
          position: relative;
          overflow: hidden;
        }
        .login-brand::before {
          content: '';
          position: absolute;
          top: -80px;
          right: -80px;
          width: 300px;
          height: 300px;
          border-radius: 50%;
          background: rgba(255,255,255,.08);
          pointer-events: none;
        }
        .login-brand::after {
          content: '';
          position: absolute;
          bottom: -60px;
          left: -60px;
          width: 220px;
          height: 220px;
          border-radius: 50%;
          background: rgba(0,102,255,.2);
          pointer-events: none;
        }
        .login-brand-inner { position: relative; z-index: 1; }

        .login-logo {
          font-family: 'Cormorant Garamond', serif;
          font-size: 2.2rem;
          font-weight: 700;
          color: white;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
        .login-brand-tagline {
          font-size: .9rem;
          color: rgba(255,255,255,.85);
          line-height: 1.6;
          margin-bottom: 32px;
        }
        .login-brand-divider {
          height: 1px;
          background: rgba(255,255,255,.08);
          margin-bottom: 28px;
        }
        .login-brand-stat {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: 18px;
        }
        .login-stat-val {
          font-family: 'Cormorant Garamond', serif;
          font-size: 1.9rem;
          font-weight: 700;
          color: white;
          line-height: 1;
        }
        .login-stat-lbl {
          font-size: .72rem;
          color: rgba(255,255,255,.75);
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: .04em;
        }
        .login-brand-footer {
          margin-top: 36px;
          font-size: .68rem;
          color: rgba(255,255,255,.55);
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        /* ── Form panel ── */
        .login-panel {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 48px 32px;
          overflow-y: auto;
        }
        .login-form-wrap {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
        }
        .login-form-header {
          display: flex;
          flex-direction: column;
          margin-bottom: 28px;
        }
        .login-form-title {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: 6px;
        }
        .login-form-sub {
          font-size: .82rem;
          color: var(--gray);
        }

        /* Error banner */
        .login-error-banner {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 11px 13px;
          background: var(--red-pale);
          border: 1px solid var(--red-mist);
          border-radius: 3px;
          font-size: .8rem;
          color: var(--red);
          margin-bottom: 16px;
          line-height: 1.45;
        }

        /* Spinner */
        .login-spinner {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,.35);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.65s linear infinite;
          flex-shrink: 0;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .login-form-footer {
          margin-top: 32px;
          font-size: .68rem;
          color: var(--gray);
          text-align: center;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: .04em;
          opacity: .6;
        }

        /* Responsive — collapse brand panel on small screens */
        @media (max-width: 700px) {
          .login-brand { display: none; }
        }
      `}</style>
    </div>
  );
}
