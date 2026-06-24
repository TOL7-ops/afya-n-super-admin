/**
 * Single source of truth for deriving a human-readable status from
 * any object that carries is_active + plan + expiry + status fields.
 *
 * Works for both LicenseItem (from /super-admin/licenses)
 * and FacilityResponse (from /super-admin/institutions or /super-admin/facilities).
 *
 * Priority order:
 *  1. API status field === "Suspended"  → Suspended  (trust the backend directly)
 *  2. is_active === false               → Suspended
 *  3. expires_at < now                  → Expired
 *  4. expires_at within 30 days         → Expiring
 *  5. plan includes "trial"             → Trial
 *  6. no plan at all                    → Pending
 *  7. otherwise                         → Active
 */

export type DerivedStatus =
  | 'Active'
  | 'Suspended'
  | 'Expiring'
  | 'Expired'
  | 'Trial'
  | 'Pending';

export interface StatusInput {
  /** API may return a string status directly */
  status?: string | null;
  is_active?: boolean | null;
  active?: boolean | null;
  plan?: string | null;
  license_plan?: string | null;
  expires_at?: string | null;
  license_expires_at?: string | null;
  license_expiry?: string | null;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export function deriveLicenseStatus(item: StatusInput): DerivedStatus {
  // 1. Trust the API's status field first — it's the most reliable signal now
  const apiStatus = (item.status ?? '').toLowerCase().trim();
  if (apiStatus === 'suspended') return 'Suspended';
  if (apiStatus === 'expired')   return 'Expired';

  // 2. Fall back to is_active boolean
  const rawActive = item.is_active ?? (item as unknown as Record<string, unknown>).active;
  const isActive =
    rawActive === undefined || rawActive === null
      ? true   // missing → assume active (unless API status says otherwise above)
      : rawActive === true || rawActive === 'true' || rawActive === 1;

  const plan    = (item.plan ?? item.license_plan ?? '').toLowerCase().trim();
  const expires =
    item.expires_at ??
    item.license_expires_at ??
    item.license_expiry ??
    null;

  if (!isActive) return 'Suspended';

  if (expires) {
    const daysLeft = Math.ceil(
      (new Date(expires).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );
    if (daysLeft < 0)   return 'Expired';
    if (daysLeft <= 30) return 'Expiring';
  }

  if (apiStatus === 'trial' || plan.includes('trial')) return 'Trial';
  if (apiStatus === 'pending' || !plan)                 return 'Pending';
  return 'Active';
}

/**
 * Maps a DerivedStatus to the Badge variant used across the app.
 */
export function statusToVariant(
  status: DerivedStatus,
): 'active' | 'expiring' | 'trial' | 'suspended' | 'pending' {
  switch (status) {
    case 'Active':    return 'active';
    case 'Expiring':  return 'expiring';
    case 'Trial':     return 'trial';
    case 'Suspended':
    case 'Expired':   return 'suspended';
    case 'Pending':
    default:          return 'pending';
  }
}
