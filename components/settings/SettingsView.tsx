'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ToastType } from '@/types';
import {
  getWhatsAppSettings,
  updateWhatsAppSettings,
  getComplianceSettings,
  updateComplianceSettings,
  getPermissions,
} from '@/services/settings.service';
import type {
  WhatsAppSettingsResponse,
  ComplianceSettingsResponse,
  PermissionRoleItem,
} from '@/types/api';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

interface SettingsViewProps {
  onToast: (msg: string, type?: ToastType) => void;
}

// TODO: Replace with API call once backend implements:
// GET /api/v1/super-admin/settings/bp-thresholds
// PUT /api/v1/super-admin/settings/bp-thresholds
// Until then these values are intentionally static (WHO/AHA standard).
const BP_THRESHOLDS = [
  { label: 'Normal',  value: '< 120/80',        color: 'var(--green)' },
  { label: 'Elevated',value: '120–129 / <80',   color: 'var(--amber)' },
  { label: 'Stage 1', value: '130–139 / 80–89', color: 'var(--red)'   },
  { label: 'Stage 2', value: '≥ 140 / ≥ 90',    color: 'var(--red)'   },
  { label: 'Crisis',  value: '> 180 / > 120',   color: 'var(--red)'   },
];

function retentionDaysToLabel(days: number): string {
  if (days >= 2555) return '7 years (clinical standard)';
  if (days >= 1825) return '5 years';
  if (days >= 1095) return '3 years';
  return `${days} days`;
}

function labelToRetentionDays(label: string): number {
  if (label.includes('7 years')) return 2555;
  if (label.includes('5 years')) return 1825;
  if (label.includes('3 years')) return 1095;
  return 2555;
}

export default function SettingsView({ onToast }: SettingsViewProps) {
  const [whatsapp, setWhatsapp]               = useState<WhatsAppSettingsResponse | null>(null);
  const [compliance, setCompliance]           = useState<ComplianceSettingsResponse | null>(null);
  const [permissions, setPermissions]         = useState<PermissionRoleItem[]>([]);
  const [permissionsFallback, setPermissionsFallback] = useState(false);
  const [loading, setLoading]                 = useState(true);

  // Edit state for WhatsApp
  const [wpProvider, setWpProvider]     = useState('');
  const [wpApiKey, setWpApiKey]         = useState('');
  const [wpWebhook, setWpWebhook]       = useState('');

  // Edit state for Compliance
  const [retentionLabel, setRetentionLabel] = useState('7 years (clinical standard)');
  const [consentRequired, setConsentRequired] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [wp, comp, perms] = await Promise.all([
        getWhatsAppSettings().catch(() => null),
        getComplianceSettings().catch(() => null),
        getPermissions().catch(() => []),
      ]);

      if (wp) {
        setWhatsapp(wp);
        setWpProvider(wp.provider ?? '');
        setWpApiKey(wp.api_key ?? '');
        setWpWebhook(wp.webhook_url ?? '');
      }
      if (comp) {
        setCompliance(comp);
        setRetentionLabel(retentionDaysToLabel(comp.data_retention_days));
        setConsentRequired(comp.consent_required);
      }
      setPermissions(perms);
      // Track whether the permissions API returned useful data or we fell back to the static list
      setPermissionsFallback(perms.length === 0);

      console.log('[Settings] WhatsApp:', wp);
      console.log('[Settings] Compliance:', comp);
      console.log('[Settings] Permissions:', perms);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load settings';
      onToast(`Settings error: ${msg}`, 'warn');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleSaveWhatsApp = async () => {
    try {
      const updated = await updateWhatsAppSettings({
        provider: wpProvider,
        api_key: wpApiKey,
        webhook_url: wpWebhook,
      });
      setWhatsapp(updated);
      onToast('✓ WhatsApp settings saved', 'success');
    } catch {
      onToast('Failed to save WhatsApp settings — try again', 'warn');
    }
  };

  const handleSaveCompliance = async () => {
    try {
      const updated = await updateComplianceSettings({
        consent_required: consentRequired,
        data_retention_days: labelToRetentionDays(retentionLabel),
      });
      setCompliance(updated);
      onToast('✓ Compliance settings saved', 'success');
    } catch {
      onToast('Failed to save compliance settings — try again', 'warn');
    }
  };

  if (loading) {
    return (
      <div>
        <div className="pg-hdr">
          <div>
            <div className="pg-title">System Settings</div>
            <div className="pg-sub">Platform-wide configuration, permissions, and compliance</div>
          </div>
        </div>
        <LoadingSpinner message="Loading settings…" />
      </div>
    );
  }

  return (
    <div>
      <div className="pg-hdr">
        <div>
          <div className="pg-title">System Settings</div>
          <div className="pg-sub">Platform-wide configuration, permissions, and compliance</div>
        </div>
      </div>

      <div className="grid-2col" style={{ alignItems: 'start' }}>

        {/* WhatsApp Configuration */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">WhatsApp Configuration</div>
            <div className="card-sub" style={{ color: whatsapp?.status === 'connected' ? 'var(--green)' : 'var(--amber)' }}>
              {whatsapp?.status ?? 'unknown'}
            </div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="field">
                <label className="lbl">WhatsApp Provider</label>
                <input
                  className="inp"
                  value={wpProvider}
                  onChange={(e) => setWpProvider(e.target.value)}
                  placeholder="e.g. Twilio WhatsApp Business"
                />
              </div>
              <div className="field">
                <label className="lbl">API Key</label>
                <input
                  className="inp"
                  type="password"
                  value={wpApiKey}
                  onChange={(e) => setWpApiKey(e.target.value)}
                  placeholder="••••••••••••"
                />
              </div>
              <div className="field">
                <label className="lbl">Webhook URL</label>
                <input
                  className="inp"
                  value={wpWebhook}
                  onChange={(e) => setWpWebhook(e.target.value)}
                  placeholder="https://…"
                />
              </div>
              <button className="btn btn-ghost" onClick={handleSaveWhatsApp}>
                Configure BSP
              </button>
            </div>
          </div>
        </div>

        {/* Compliance & Data Privacy */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Compliance &amp; Data Privacy</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="field">
                <label className="lbl">Data Protection Framework</label>
                <input
                  className="inp"
                  value={compliance?.compliance_standard ?? 'Ghana Data Protection Act'}
                  readOnly
                  style={{ background: 'var(--color-primary-light)' }}
                />
              </div>
              <div className="field">
                <label className="lbl">Data Retention Policy</label>
                <select
                  className="sel"
                  value={retentionLabel}
                  onChange={(e) => setRetentionLabel(e.target.value)}
                >
                  <option>7 years (clinical standard)</option>
                  <option>5 years</option>
                  <option>3 years</option>
                </select>
              </div>
              <div className="field">
                <label className="lbl">Consent Required</label>
                <select
                  className="sel"
                  value={consentRequired ? 'yes' : 'no'}
                  onChange={(e) => setConsentRequired(e.target.value === 'yes')}
                >
                  <option value="yes">Yes — Opt-in at screening</option>
                  <option value="no">No — Implied consent</option>
                </select>
              </div>
              <button className="btn btn-ghost" onClick={handleSaveCompliance}>
                Save Compliance Settings
              </button>
            </div>
          </div>
        </div>

        {/* Role Permissions — loaded from API */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">Role Permissions</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {permissionsFallback && (
                <div style={{
                  fontSize: '.72rem',
                  color: '#92400e',
                  background: '#fffbeb',
                  border: '1px solid #fcd34d',
                  borderRadius: '3px',
                  padding: '8px 12px',
                  marginBottom: '4px',
                }}>
                  Showing default permissions — live data unavailable
                </div>
              )}
              {permissions.length === 0 ? (
                // Fallback static list if API returns nothing
                [
                  'Super Admin — full access',
                  'Institutional Admin — own institution only',
                  'Field Worker — screen & register only',
                  'Clinician — own patients only',
                ].map((label, i, arr) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid var(--gray-xlt)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '.83rem', color: 'var(--ink-mid)' }}>{label}</span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '.65rem', color: 'var(--green)' }}>
                      ✓ Enabled
                    </span>
                  </div>
                ))
              ) : (
                permissions.map((perm, i) => (
                  <div
                    key={perm.role}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: i < permissions.length - 1 ? '1px solid var(--gray-xlt)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: '.83rem', color: 'var(--ink-mid)' }}>
                      {perm.role}
                    </span>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '.65rem', color: 'var(--green)' }}>
                      {Array.isArray(perm.permissions)
                        ? `${perm.permissions.length} permissions`
                        : '✓ Enabled'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* BP Classification Thresholds */}
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-hdr">
            <div className="card-title">BP Classification Thresholds</div>
          </div>
          <div className="card-body">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {BP_THRESHOLDS.map((threshold, i) => (
                <div
                  key={threshold.label}
                  style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '7px 0',
                    borderBottom: i < BP_THRESHOLDS.length - 1 ? '1px solid var(--gray-xlt)' : 'none',
                    fontSize: '.82rem',
                  }}
                >
                  <span style={{ color: 'var(--ink-mid)' }}>{threshold.label}</span>
                  <span className="mono" style={{ color: threshold.color }}>{threshold.value}</span>
                </div>
              ))}
            </div>
            <button
              className="btn btn-ghost"
              style={{ marginTop: '12px' }}
              onClick={() => onToast('Thresholds are WHO/AHA standard — contact clinical team to update')}
            >
              Request Update
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
