'use client';

import { useEffect } from 'react';
import Badge, { institutionTypeVariant } from '@/components/shared/Badge';
import SeatsCell from '@/components/shared/SeatsCell';
import type { FacilityResponse } from '@/types/api';
import { deriveLicenseStatus, statusToVariant } from '@/utils/licenseStatus';

interface OrgDetailsPanelProps {
  org: FacilityResponse | null;
  onClose: () => void;
  onSuspend: (org: FacilityResponse) => void;
  onReactivate: (org: FacilityResponse) => void;
}

function fmtExpiry(f: FacilityResponse, status: string): string {
  const iso = f.license_expiry ?? f.license_expires_at;
  if (!iso) return status === 'Trial' ? 'Trial' : '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        fontSize: '.66rem', fontWeight: 600, color: 'var(--gray)',
        marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '.08em',
        fontFamily: "'JetBrains Mono',monospace",
      }}>
        {title}
      </div>
      <div style={{ border: '1px solid var(--gray-lt)', borderRadius: '6px', padding: '4px 12px' }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '8px 0', fontSize: '.82rem',
      borderBottom: '1px solid var(--gray-xlt)',
    }}>
      <span style={{ color: 'var(--gray)', flexShrink: 0, marginRight: '12px' }}>{label}</span>
      <span style={{
        color: accent ? 'var(--color-primary)' : 'var(--ink)',
        fontWeight: 500, textAlign: 'right', wordBreak: 'break-all',
      }}>
        {value}
      </span>
    </div>
  );
}

export default function OrgDetailsPanel({
  org, onClose, onSuspend, onReactivate,
}: OrgDetailsPanelProps) {
  // Close on Escape
  useEffect(() => {
    if (!org) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [org, onClose]);

  if (!org) return null;

  const isFacility  = org._entity_type === 'facility' || !org._entity_type;
  const status      = deriveLicenseStatus(org);
  const variant     = statusToVariant(status);
  const seatsUsed   = org.field_workers_count ?? 0;
  const seatsLimit  = org.seats ?? org.max_seats ?? null;
  const raw         = org as unknown as Record<string, unknown>;
  const city        = raw['city'] as string | null ?? null;
  const region      = org.region ?? (raw['state_region'] as string | null) ?? null;
  const contactName = (raw['contact_name'] as string | null) ?? org.contact_name ?? null;

  // Plan — check every known field name the APIs use
  const plan =
    org.license_plan ??
    org.plan ??
    (raw['subscription_plan'] as string | null) ??
    (raw['license_type'] as string | null) ??
    null;

  // Expiry — check every known field name
  const expiryIso =
    org.license_expiry ??
    org.license_expires_at ??
    (raw['expires_at'] as string | null) ??
    (raw['subscription_expiry'] as string | null) ??
    (raw['expiry_date'] as string | null) ??
    null;

  function fmtDate(iso: string | null): string {
    if (!iso) return status === 'Trial' ? 'Trial' : '—';
    try {
      return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
      });
    } catch { return '—'; }
  }

  return (
    /* Overlay */
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 300,
        display: 'flex', justifyContent: 'flex-end',
        background: 'rgba(0,0,0,.4)',
      }}
      onClick={onClose}
    >
      {/* Panel */}
      <div
        style={{
          width: '420px', maxWidth: '92vw', height: '100%',
          background: 'var(--color-primary-light)',
          padding: '24px', boxSizing: 'border-box',
          overflowY: 'auto',
          boxShadow: '-8px 0 32px rgba(0,0,0,.18)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', minWidth: 0 }}>
            <div style={{
              width: '38px', height: '38px', borderRadius: '8px', flexShrink: 0,
              background: 'var(--gray-xlt)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
            }}>
              {isFacility ? '🏥' : '🏛'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {org.name}
              </div>
              <div style={{ fontSize: '.76rem', color: 'var(--gray)', marginTop: '2px' }}>
                {isFacility ? (org.type ?? 'Clinical Facility') : 'Institution / NGO'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close panel"
            style={{
              width: '28px', height: '28px', padding: 0, border: 'none',
              background: 'transparent', cursor: 'pointer',
              fontSize: '1.2rem', color: 'var(--gray)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginLeft: '8px',
            }}
          >
            ×
          </button>
        </div>

        {/* Status + plan badges */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <Badge variant={variant}>{status}</Badge>
          {plan && (
            <span style={{
              fontSize: '.67rem', fontWeight: 600,
              padding: '2px 8px', borderRadius: '3px',
              background: 'var(--gray-xlt)', color: 'var(--ink-mid)',
              fontFamily: "'JetBrains Mono',monospace",
            }}>
              {plan}
            </span>
          )}
        </div>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          <div style={{ background: 'var(--gray-xlt)', borderRadius: '6px', padding: '12px' }}>
            <div style={{ fontSize: '.68rem', color: 'var(--gray)', marginBottom: '4px' }}>Field workers / seats</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>
              <SeatsCell seatsUsed={seatsUsed} seatsLimit={seatsLimit} />
            </div>
          </div>
          <div style={{ background: 'var(--gray-xlt)', borderRadius: '6px', padding: '12px' }}>
            <div style={{ fontSize: '.68rem', color: 'var(--gray)', marginBottom: '4px' }}>Total screened</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--ink)' }}>
              {(org.total_screened ?? 0).toLocaleString()}
            </div>
          </div>
        </div>

        {/* Location */}
        {(city || region) && (
          <Section title="Location">
            {city   && <Row label="City"   value={city} />}
            {region && <Row label="Region" value={region} />}
          </Section>
        )}

        {/* Contact */}
        <Section title="Contact">
          <Row label="Name"  value={contactName && contactName !== 'N/A' ? contactName : '—'} />
          <Row label="Email" value={org.email && org.email !== 'N/A' ? org.email : '—'}
            accent={!!(org.email && org.email !== 'N/A')} />
        </Section>

        {/* Subscription */}
        <Section title="Subscription">
          <Row label="Plan"    value={plan ?? '—'} />
          <Row label="Expires" value={fmtDate(expiryIso)} />
        </Section>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
          {status === 'Suspended' ? (
            <button
              className="btn-icon"
              style={{ flex: 1, justifyContent: 'center', color: 'var(--green)', borderColor: 'var(--green-border)' }}
              onClick={() => onReactivate(org)}
            >
              Reactivate
            </button>
          ) : (
            <button
              className="btn-icon"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => onSuspend(org)}
            >
              Suspend org
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
