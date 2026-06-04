'use client';

import { useState } from 'react';
import type { EmailPreviewData, PendingInstitutionData } from '@/types';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailData: EmailPreviewData | null;
  pendingData: PendingInstitutionData | null;
  /** Called when the user clicks Send — can be async and may throw on API error */
  onSent: (data: PendingInstitutionData) => Promise<void> | void;
}

interface ProgressStep {
  id: string;
  label: string;
  pct: number;
  delay: number;
}

const STEPS: ProgressStep[] = [
  { id: 'ps-1', label: 'Creating account',  pct: 20,  delay: 0    },
  { id: 'ps-2', label: 'Generating token',  pct: 40,  delay: 600  },
  { id: 'ps-3', label: 'Building email',    pct: 65,  delay: 1100 },
  { id: 'ps-4', label: 'Sending',           pct: 85,  delay: 1600 },
  { id: 'ps-5', label: 'Delivered ✓',       pct: 100, delay: 2200 },
];

type StepState = 'idle' | 'active' | 'done';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function EmailPreviewModal({
  isOpen,
  onClose,
  emailData,
  pendingData,
  onSent,
}: EmailPreviewModalProps) {
  const [sending, setSending] = useState(false);
  const [fillPct, setFillPct] = useState(0);
  const [stepStates, setStepStates] = useState<Record<string, StepState>>({});
  const [delivered, setDelivered] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).classList.contains('email-modal-overlay')) onClose();
  };

  const handleSend = async () => {
    if (!pendingData) return;
    setSending(true);
    setFillPct(0);
    setStepStates({});
    setDelivered(false);
    setSendError(null);

    // Animate steps 1–4 while the API call runs in parallel
    const animateUntilSend = async () => {
      for (let i = 0; i < STEPS.length - 1; i++) {
        await delay(i === 0 ? 0 : STEPS[i].delay - STEPS[i - 1].delay);
        if (i > 0) {
          setStepStates((prev) => ({ ...prev, [STEPS[i - 1].id]: 'done' }));
        }
        setStepStates((prev) => ({ ...prev, [STEPS[i].id]: 'active' }));
        setFillPct(STEPS[i].pct);
      }
    };

    try {
      await Promise.all([
        animateUntilSend(),
        onSent(pendingData), // real API call
      ]);

      // All done — mark final step
      setStepStates((prev) => ({
        ...prev,
        'ps-4': 'done',
        'ps-5': 'active',
      }));
      setFillPct(100);
      await delay(300);
      setStepStates((prev) => ({ ...prev, 'ps-5': 'done' }));
      setDelivered(true);

      await delay(2000);
      setSending(false);
      setDelivered(false);
      setFillPct(0);
      setStepStates({});
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setSendError(msg);
      setSending(false);
      setFillPct(0);
      setStepStates({});
    }
  };

  const handleReset = () => {
    setSendError(null);
    setFillPct(0);
    setStepStates({});
    setDelivered(false);
  };

  if (!emailData) return null;

  return (
    <div
      className={`email-modal-overlay${isOpen ? ' open' : ''}`}
      onClick={handleOverlayClick}
    >
      <div className="email-modal">
        {/* Header */}
        <div className="email-modal-top">
          <div>
            <div className="email-modal-title">Onboarding Email Preview</div>
            <div style={{ fontSize: '.72rem', color: 'var(--gray)', marginTop: '2px' }}>
              This is exactly what the institutional admin will receive in their inbox
            </div>
          </div>
          <button className="email-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Email client chrome */}
        <div className="email-client-chrome">
          <div className="email-header-row">
            <span className="email-header-lbl">From</span>
            <span className="email-header-val">Afya Platform &lt;onboarding@afya.health&gt;</span>
          </div>
          <div className="email-header-row">
            <span className="email-header-lbl">To</span>
            <span className="email-header-val">{emailData.toField}</span>
          </div>
          <div className="email-header-row">
            <span className="email-header-lbl">Date</span>
            <span className="email-header-val">{emailData.dateField}</span>
          </div>
        </div>
        <div className="email-subject-big">{emailData.subject}</div>

        {/* Rendered email body */}
        <div className="email-body-scroll">
          <div className="email-rendered">
            <div className="er-header">
              <div className="er-logo-dot" />
              <div className="er-logo">Afya</div>
              <div className="er-header-sub">Hypertension Platform</div>
            </div>
            <div className="er-body">
              <div className="er-greeting">
                Hi <strong>{emailData.contactName}</strong>,<br />
                Welcome to <strong>Afya</strong>.
              </div>
              <p className="er-text">
                Your organisation, <strong>{emailData.orgName}</strong>, has been set up on the
                Afya hypertension screening platform. You can now access your dashboard, create
                field worker accounts, and begin conducting community screenings.
              </p>
              <div className="er-cta-wrap">
                <a className="er-cta" href="#">Set Up Your Account →</a>
              </div>
              <p className="er-text" style={{ fontSize: '.78rem', color: '#888', textAlign: 'center', marginTop: '-8px' }}>
                This link expires in <strong>72 hours</strong>. If it expires, contact{' '}
                <a href="mailto:support@afya.health" style={{ color: 'var(--red)' }}>support@afya.health</a>.
              </p>
              <div className="er-divider" />
              <div className="er-steps-title">Your next 3 steps after logging in:</div>
              {[
                { n: 1, title: 'Set your password',               desc: "— choose a secure password to protect your patients' data." },
                { n: 2, title: 'Create field worker accounts',    desc: '— add the nurses, CHWs, and outreach officers who will conduct screenings.' },
                { n: 3, title: 'Set up your first screening event', desc: "— name it, assign your team, and you're ready to screen." },
              ].map((step) => (
                <div key={step.n} className="er-step">
                  <div className="er-step-num">{step.n}</div>
                  <div className="er-step-text"><strong>{step.title}</strong> {step.desc}</div>
                </div>
              ))}
              <div className="er-divider" />
              <div className="er-steps-title">Your account details:</div>
              <div className="er-info-box">
                {[
                  { label: 'Organisation',      value: emailData.infoOrg    },
                  { label: 'Type',              value: emailData.infoType   },
                  { label: 'Region',            value: emailData.infoRegion },
                  { label: 'Login Email',       value: emailData.infoEmail  },
                  { label: 'Licence Plan',      value: emailData.infoPlan   },
                  { label: 'Field Worker Seats', value: emailData.infoSeats },
                  { label: 'Licence Expires',   value: emailData.infoExpiry },
                ].map((row) => (
                  <div key={row.label} className="er-info-row">
                    <span className="er-info-lbl">{row.label}</span>
                    <span className="er-info-val">{row.value}</span>
                  </div>
                ))}
              </div>
              <div className="er-steps-title" style={{ marginTop: '20px' }}>Your one-time setup token:</div>
              <div className="er-token-box">
                <div className="er-token">{emailData.token}</div>
                <div className="er-token-note">Keep this private. Used only for initial account setup.</div>
              </div>
              <p className="er-text" style={{ marginTop: '16px' }}>
                If you have any questions, reply to this email or reach us on WhatsApp:{' '}
                <strong>+233 XX XXXX XXXX</strong>.
              </p>
              <p className="er-text">We look forward to supporting your hypertension programme. 🙏</p>
              <p className="er-text" style={{ marginTop: '8px' }}>
                — The Afya Team<br />
                <span style={{ fontSize: '.78rem', color: '#888' }}>Node Eight · Ho, Volta Region, Ghana</span>
              </p>
            </div>
            <div className="er-footer">
              <div className="er-footer-brand">Afya</div>
              <div className="er-footer-text">
                You received this because an Afya Super Admin created an account for your organisation.<br />
                If this was a mistake, contact{' '}
                <a href="mailto:support@afya.health" style={{ color: 'var(--red)' }}>support@afya.health</a>.<br /><br />
                Node Eight · Ho, Volta Region, Ghana ·{' '}
                <a href="#" style={{ color: '#999' }}>Unsubscribe</a>
              </div>
            </div>
          </div>
        </div>

        {/* Send bar */}
        <div className="email-send-bar">
          {sendError ? (
            /* Error state */
            <>
              <div className="send-bar-note" style={{ color: 'var(--red)' }}>
                ✕ {sendError}
              </div>
              <div className="send-bar-actions">
                <button className="btn btn-ghost" onClick={handleReset}>Try Again</button>
                <button className="btn btn-ghost" onClick={onClose}>Close</button>
              </div>
            </>
          ) : !sending ? (
            /* Default state */
            <>
              <div className="send-bar-note">
                Looks good? Clicking Send will create the institution account and dispatch this email.
              </div>
              <div className="send-bar-actions">
                <button className="btn btn-ghost" onClick={onClose}>Edit Details</button>
                <button className="btn btn-red" onClick={handleSend}>
                  Send Onboarding Email →
                </button>
              </div>
            </>
          ) : (
            /* Sending / delivered state */
            <div className="send-progress active" style={{ width: '100%' }}>
              <div className="send-bar-note" style={{ marginBottom: '8px' }}>
                {delivered
                  ? `✓ Email delivered to ${pendingData?.email} — account is live.`
                  : 'Sending…'}
              </div>
              <div className="progress-bar-wrap">
                <div className="progress-bar-fill" style={{ width: `${fillPct}%` }} />
              </div>
              <div className="progress-steps">
                {STEPS.map((step) => {
                  const state = stepStates[step.id] ?? 'idle';
                  return (
                    <div
                      key={step.id}
                      className={`progress-step${state === 'done' ? ' done' : state === 'active' ? ' active-step' : ''}`}
                    >
                      {step.label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
