/**
 * Subscription state helper.
 *
 * Derives a canonical subscription state from a subscription record
 * (LicenseItem shape from GET /super-admin/subscriptions) or from
 * the license fields on a FacilityResponse.
 *
 * States:
 *   ACTIVE      — is_active, not expired, not a trial, > EXPIRING_DAYS remaining
 *   TRIAL       — plan contains "trial" (case-insensitive), not expired
 *   EXPIRING    — active, <= EXPIRING_DAYS remaining
 *   EXPIRED     — expires_at is in the past, or is_active is false
 *   NONE        — no subscription record at all
 */

export type SubscriptionState = 'ACTIVE' | 'TRIAL' | 'EXPIRING' | 'EXPIRED' | 'NONE';

/** Subscriptions expiring within this many days are treated as EXPIRING */
export const EXPIRING_DAYS = 30;

export interface SubscriptionInfo {
  state:       SubscriptionState;
  plan:        string | null;
  expiresAt:   string | null;   // ISO string
  daysLeft:    number | null;   // null if no expiry date
  daysOverdue: number | null;   // positive if expired, else null
  seatsLimit:  number | null;
  seatsUsed:   number | null;
  subId:       string | null;   // subscription record id for action calls
}

/** Input shape — accepts both LicenseItem fields and FacilityResponse license fields */
interface SubInput {
  id?:           string | null;
  plan?:         string | null;
  license_plan?: string | null;
  expires_at?:   string | null;
  license_expiry?: string | null;
  license_expires_at?: string | null;
  is_active?:    boolean | null;
  seats_limit?:  number | null;
  seats?:        number | null;
  max_seats?:    number | null;
  seats_used?:   number | null;
  field_workers_count?: number | null;
  [key: string]: unknown;
}

export function getSubscriptionState(sub: SubInput | null | undefined): SubscriptionInfo {
  if (!sub) {
    return { state: 'NONE', plan: null, expiresAt: null, daysLeft: null, daysOverdue: null, seatsLimit: null, seatsUsed: null, subId: null };
  }

  const plan        = sub.plan ?? sub.license_plan ?? null;
  const expiresAt   = sub.expires_at ?? sub.license_expiry ?? sub.license_expires_at ?? null;
  const isActive    = sub.is_active !== false; // default true if not set
  const seatsLimit  = sub.seats_limit ?? sub.seats ?? sub.max_seats ?? null;
  const seatsUsed   = sub.seats_used ?? sub.field_workers_count ?? null;
  const subId       = sub.id ? String(sub.id) : null;

  const now         = Date.now();
  let daysLeft:     number | null = null;
  let daysOverdue:  number | null = null;

  if (expiresAt) {
    const expMs  = new Date(expiresAt).getTime();
    const diffMs = expMs - now;
    if (diffMs >= 0) {
      daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    } else {
      daysOverdue = Math.floor(Math.abs(diffMs) / (1000 * 60 * 60 * 24));
    }
  }

  // Determine state
  let state: SubscriptionState;

  if (!isActive || daysOverdue !== null) {
    state = 'EXPIRED';
  } else if (plan && plan.toLowerCase().includes('trial')) {
    state = 'TRIAL';
  } else if (daysLeft !== null && daysLeft <= EXPIRING_DAYS) {
    state = 'EXPIRING';
  } else {
    state = 'ACTIVE';
  }

  return { state, plan, expiresAt, daysLeft, daysOverdue, seatsLimit, seatsUsed, subId };
}

/** Badge colour tokens per state */
export const STATE_COLORS: Record<SubscriptionState, { bg: string; color: string; border: string; label: string }> = {
  ACTIVE:   { bg: 'var(--green-bg)',          color: 'var(--green)',         border: 'var(--green-border)',  label: 'Active'        },
  TRIAL:    { bg: 'var(--color-primary-light)', color: 'var(--color-primary)', border: 'var(--blue-border)',  label: 'Trial'         },
  EXPIRING: { bg: 'var(--amber-bg)',            color: 'var(--amber)',         border: 'var(--amber-border)', label: 'Expiring Soon' },
  EXPIRED:  { bg: 'var(--red-pale)',            color: 'var(--red)',           border: 'var(--red-mist)',     label: 'Expired'       },
  NONE:     { bg: 'var(--gray-xlt)',            color: 'var(--gray)',          border: 'var(--gray-lt)',      label: 'No Subscription' },
};
