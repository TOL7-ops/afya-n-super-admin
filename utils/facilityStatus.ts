/**
 * Single source of truth for facility status derivation.
 *
 * The API only returns `is_active`, `license_plan`, `license_expires_at`.
 * There is no explicit `status` or `is_pending` field.
 *
 * Rules (in priority order):
 *  1. is_active = false                                    → Suspended
 *  2. is_active = true, plan includes "trial"              → Trial
 *  3. is_active = true, no plan at all                     → Pending  (just created, nothing assigned)
 *  4. is_active = true, has a real plan, expiry ≤ 30 days  → Expiring
 *  5. is_active = true, has a real plan, expiry in future  → Active
 *  6. is_active = true, has a real plan, no expiry date    → Active   (approved, expiry not set yet)
 */

import type { FacilityResponse } from '@/types/api';

export type FacilityStatus = 'Active' | 'Pending' | 'Trial' | 'Expiring' | 'Suspended';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function getFacilityStatus(f: FacilityResponse): FacilityStatus {
  // If the API returns a status string directly, trust it first
  if (f.status) {
    const s = f.status.toLowerCase();
    if (s === 'suspended') return 'Suspended';
    if (s === 'pending')   return 'Pending';
    if (s === 'trial')     return 'Trial';
    // For Active, still check expiry to decide Active vs Expiring
    if (s === 'active') {
      const expiryIso = f.license_expiry ?? f.license_expires_at;
      if (expiryIso) {
        const expiryMs = new Date(expiryIso).getTime();
        const now = Date.now();
        if (expiryMs <= now)                   return 'Suspended';
        if (expiryMs - now <= THIRTY_DAYS_MS)  return 'Expiring';
      }
      return 'Active';
    }
  }

  // Fallback: derive from is_active + license_plan + expiry
  if (!f.is_active) return 'Suspended';

  const plan = ((f.license_plan ?? f.plan) ?? '').toLowerCase().trim();

  if (plan.includes('trial')) return 'Trial';
  if (!plan) return 'Pending';

  const expiryIso = f.license_expiry ?? f.license_expires_at;
  if (!expiryIso) return 'Active';

  const expiryMs = new Date(expiryIso).getTime();
  const now = Date.now();

  if (expiryMs <= now)                   return 'Suspended';
  if (expiryMs - now <= THIRTY_DAYS_MS)  return 'Expiring';

  return 'Active';
}

/**
 * Returns true for facilities that need super-admin action —
 * only truly Pending (no plan) or Trial.
 */
export function isPendingAction(f: FacilityResponse): boolean {
  const status = getFacilityStatus(f);
  return status === 'Pending' || status === 'Trial';
}
/**
 * Returns true for genuinely active licensed institutions.
 */
export function isActiveInstitution(f: FacilityResponse): boolean {
  const status = getFacilityStatus(f);
  return status === 'Active' || status === 'Expiring';
}
