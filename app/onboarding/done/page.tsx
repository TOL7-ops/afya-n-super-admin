'use client';

/**
 * Step 4 — Done
 * Account is fully set up. Clears the onboarding session from sessionStorage.
 * Shows a success confirmation and a single CTA button to go to the Facility Portal.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const PORTAL_URL = 'https://afya-portal.vercel.app/facility';

interface OnboardingSession {
  email: string;
  full_name: string;
  facility_name: string;
}

export default function DonePage() {
  const router = useRouter();
  const [session, setSession] = useState<OnboardingSession | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('afya_onboarding');
    if (!raw) {
      // No session — they may have already completed setup or landed here directly
      // Still show the done page with a portal button, just without personalisation
      return;
    }
    setSession(JSON.parse(raw) as OnboardingSession);
    // Clear the onboarding session — it's single-use
    sessionStorage.removeItem('afya_onboarding');
  }, []);

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
            <div key={s} className={`ob-step${i === 3 ? ' ob-step-active' : ' ob-step-done'}`}>
              <div className="ob-step-num">{i < 3 ? '✓' : '🎉'}</div>
              <div className="ob-step-lbl">{s}</div>
            </div>
          ))}
        </div>

        <div className="ob-body" style={{ textAlign: 'center' }}>
          {/* Success icon */}
          <div className="ob-done-icon">✅</div>

          <div className="ob-title">
            {session ? `Welcome, ${session.full_name.split(' ')[0]}!` : 'Account ready!'}
          </div>

          <p className="ob-sub" style={{ marginBottom: '8px' }}>
            {session
              ? `Your account for ${session.facility_name} is fully set up.`
              : 'Your account is fully set up.'}
          </p>
          <p className="ob-sub" style={{ marginBottom: '28px' }}>
            Use the button below to log in to the Facility Portal with your email and the
            password you just created.
          </p>

          {/* Primary CTA — portal login */}
          <a
            href={PORTAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="ob-portal-btn"
          >
            Go to Facility Portal →
          </a>

          {session && (
            <div style={{ marginTop: '14px', fontSize: '.75rem', color: 'var(--gray)', fontFamily: "'JetBrains Mono', monospace" }}>
              Log in with: {session.email}
            </div>
          )}

          <div style={{ marginTop: '28px', fontSize: '.76rem', color: 'var(--gray)', lineHeight: '1.6' }}>
            Need help?{' '}
            <a href="mailto:support@afya.health" style={{ color: 'var(--red)' }}>
              support@afya.health
            </a>
            <br />
            <span style={{ opacity: .7 }}>Node Eight · Ho, Volta Region, Ghana</span>
          </div>
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
        .ob-step { flex:1; display:flex; flex-direction:column; align-items:center; padding:10px 4px; gap:4px; border-right:1px solid var(--gray-lt); opacity:.7; }
        .ob-step:last-child { border-right:none; }
        .ob-step.ob-step-active { opacity:1; }
        .ob-step.ob-step-done { opacity:.7; }
        .ob-step-num { width:20px; height:20px; border-radius:50%; background:var(--green); color:white; font-size:.65rem; font-weight:700; display:flex; align-items:center; justify-content:center; font-family:'JetBrains Mono',monospace; }
        .ob-step-active .ob-step-num { background:var(--green); color:white; font-size:.75rem; }
        .ob-step-lbl { font-size:.63rem; color:var(--gray); font-family:'JetBrains Mono',monospace; letter-spacing:.03em; white-space:nowrap; }
        .ob-step-active .ob-step-lbl { color:var(--ink); font-weight:500; }
        .ob-body { padding:36px 28px; }
        .ob-done-icon { width:56px; height:56px; border-radius:50%; background:var(--green-bg); border:2px solid var(--green-border); display:flex; align-items:center; justify-content:center; font-size:1.5rem; margin:0 auto 18px; }
        .ob-title { font-size:1.2rem; font-weight:600; color:var(--ink); margin-bottom:10px; }
        .ob-sub { font-size:.82rem; color:var(--gray); line-height:1.6; }
        .ob-portal-btn { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:14px 24px; background:#1a1a2e; color:white; border:none; border-radius:3px; font-size:.92rem; font-weight:600; font-family:'Outfit',sans-serif; cursor:pointer; text-decoration:none; transition:opacity .2s; }
        .ob-portal-btn:hover { opacity:.88; }
        @keyframes blink { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.4)} }
      `}</style>
    </div>
  );
}
