'use client';

/**
 * Step 3 — Confirm Organisation
 * Shows the institution details from the verified session.
 * No API call needed — just a confirmation screen before the final step.
 * On "Confirm": navigates to /onboarding/done
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

export default function ConfirmOrgPage() {
  const router = useRouter();
  const [session, setSession] = useState<OnboardingSession | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('afya_onboarding');
    if (!raw) {
      router.replace('/onboarding');
      return;
    }
    setSession(JSON.parse(raw) as OnboardingSession);
  }, [router]);

  if (!session) return null;

  const rows = [
    { label: 'Organisation',  value: session.facility_name },
    { label: 'Region',        value: session.region || '—' },
    { label: 'Login Email',   value: session.email },
    { label: 'Your Name',     value: session.full_name },
    { label: 'Role',          value: session.role },
    { label: 'Licence Plan',  value: session.license_plan || '—' },
  ];

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
            <div key={s} className={`ob-step${i === 2 ? ' ob-step-active' : i < 2 ? ' ob-step-done' : ''}`}>
              <div className="ob-step-num">{i < 2 ? '✓' : i + 1}</div>
              <div className="ob-step-lbl">{s}</div>
            </div>
          ))}
        </div>

        <div className="ob-body">
          <div className="ob-title">Confirm your organisation</div>
          <p className="ob-sub">
            Please verify that the details below match your organisation. If anything looks
            wrong, contact{' '}
            <a href="mailto:support@afya.health" style={{ color: 'var(--color-primary)' }}>
              support@afya.health
            </a>{' '}
            before continuing.
          </p>

          {/* Org detail box */}
          <div className="ob-org-box">
            <div className="ob-org-name">{session.facility_name}</div>
            {rows.map((r) => (
              <div key={r.label} className="ob-org-row">
                <span className="ob-org-lbl">{r.label}</span>
                <span className="ob-org-val">{r.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-ghost"
              style={{ flex: 1 }}
              onClick={() => window.open('mailto:support@afya.health?subject=Onboarding+issue', '_blank')}
            >
              Something is wrong
            </button>
            <button
              className="btn btn-red"
              style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center' }}
              onClick={() => router.push('/onboarding/done')}
            >
              Yes, this is my organisation →
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .ob-root { min-height:100vh; background:var(--off); display:flex; align-items:center; justify-content:center; padding:32px 16px; font-family:'Outfit',sans-serif; }
        .ob-card { background:var(--color-primary-light); border:1px solid var(--blue-border); border-radius:6px; width:100%; max-width:460px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,.07); }
        .ob-brand { background:var(--ink); padding:20px 28px; display:flex; align-items:center; gap:14px; }
        .ob-logo { font-family:'Cormorant Garamond',serif; font-size:1.6rem; font-weight:700; color:white; display:flex; align-items:center; gap:8px; }
        .ob-logo-dot { width:7px; height:7px; border-radius:50%; background:var(--color-primary); animation:blink 2s infinite; }
        .ob-brand-sub { font-size:.72rem; color:rgba(255,255,255,.35); font-family:'JetBrains Mono',monospace; letter-spacing:.04em; }
        .ob-steps { display:flex; border-bottom:1px solid var(--blue-border); background:var(--color-primary-light); }
        .ob-step { flex:1; display:flex; flex-direction:column; align-items:center; padding:10px 4px; gap:4px; border-right:1px solid var(--gray-lt); opacity:.4; }
        .ob-step:last-child { border-right:none; }
        .ob-step.ob-step-active { opacity:1; }
        .ob-step.ob-step-done { opacity:.7; }
        .ob-step-num { width:20px; height:20px; border-radius:50%; background:var(--gray-lt); color:var(--gray); font-size:.65rem; font-weight:700; display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono',monospace; }
        .ob-step-active .ob-step-num { background:var(--color-primary); color:white; }
        .ob-step-done .ob-step-num { background:var(--green); color:white; font-size:.6rem; }
        .ob-step-lbl { font-size:.63rem; color:var(--gray); font-family:'JetBrains Mono',monospace; letter-spacing:.03em; white-space:nowrap; }
        .ob-step-active .ob-step-lbl { color:var(--ink); font-weight:500; }
        .ob-body { padding:28px; }
        .ob-title { font-size:1.1rem; font-weight:600; color:var(--ink); margin-bottom:8px; }
        .ob-sub { font-size:.81rem; color:var(--gray); line-height:1.6; margin-bottom:20px; }
        .ob-org-box { background:var(--color-primary-light); border:1px solid var(--blue-border); border-radius:4px; padding:16px 18px; margin-bottom:22px; }
        .ob-org-name { font-size:1rem; font-weight:600; color:var(--ink); margin-bottom:10px; }
        .ob-org-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid var(--gray-lt); font-size:.8rem; }
        .ob-org-row:last-child { border-bottom:none; }
        .ob-org-lbl { color:var(--gray); }
        .ob-org-val { color:var(--ink); font-weight:500; text-align:right; max-width:60%; word-break:break-word; }
        @keyframes blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
      `}</style>
    </div>
  );
}
