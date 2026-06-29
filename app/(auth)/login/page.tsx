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
        setError(detail);
      } else if (Array.isArray(detail)) {
        setError(detail.map((d) => d.msg).join(', '));
      } else if (status === 400 || status === 401) {
        setError('Invalid email or password.');
      } else if (status === 422) {
        setError('Invalid request — check your email and password.');
      } else if (status === 500) {
        setError('The server is currently unavailable. Please wait a moment and try again.');
      } else if (status === 503 || status === 502 || status === 504) {
        setError('Server is starting up — please wait 30 seconds and try again.');
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
      {/* ── Centered form ── */}
      <div className="login-panel">
        <div className="login-form-wrap">
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '1.8rem', fontWeight: 700,
              color: 'var(--color-primary)',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <div className="logo-dot" style={{ background: 'var(--color-primary)' }} />
              Afya
            </div>
          </div>

          {/* Header */}
          <div className="login-form-header">
            <div className="login-form-title">Sign in</div>
            <div className="login-form-sub">
              Sign in to the Afya Platform Admin Console
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
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

            <div className="field" style={{ marginBottom: '14px' }}>
              <label className="lbl" htmlFor="login-email">Email address</label>
              <input
                id="login-email" className="inp" type="email" autoComplete="email"
                placeholder="admin@institution.gh"
                value={email} onChange={(e) => { setEmail(e.target.value); setError(null); }}
                disabled={loading} required
              />
            </div>

            <div className="field" style={{ marginBottom: '22px' }}>
              <label className="lbl" htmlFor="login-password">Password</label>
              <div style={{ position: 'relative', display: 'block' }}>
                <input
                  id="login-password" className="inp"
                  type={showPwd ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="Your password"
                  value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  disabled={loading} required
                  style={{ paddingRight: '40px', width: '100%', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)}
                  aria-label={showPwd ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--gray)', display: 'flex', alignItems: 'center' }}>
                  {showPwd ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-red" disabled={loading}
              style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {loading ? (
                <><span className="login-spinner" />Signing in…</>
              ) : 'Sign In to Admin Console'}
            </button>
          </form>
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
          max-width: 400px;
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
      `}</style>
    </div>
  );
}
