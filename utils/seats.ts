/**
 * Seat display utilities.
 *
 * Two different "unlimited" sentinels exist across endpoints:
 *   - Institutions/Facilities API:   seats = 999999  (numeric sentinel)
 *   - Subscriptions API:             seats_limit = null
 *
 * isUnlimitedSeats() handles BOTH — use this everywhere instead of
 * the old isUnlimitedPlan() which only caught the 999999 case.
 */
export const UNLIMITED_SEAT_THRESHOLD = 999999;

/**
 * Returns true when the limit means "no cap" — handles both:
 *   - null / undefined (subscriptions endpoint)
 *   - >= 999999        (institutions/facilities endpoint)
 */
export function isUnlimitedSeats(seatsLimit: number | null | undefined): boolean {
  if (seatsLimit === null || seatsLimit === undefined) return true;
  return seatsLimit >= UNLIMITED_SEAT_THRESHOLD;
}

/** @deprecated Use isUnlimitedSeats() — kept for backward compatibility */
export const isUnlimitedPlan = isUnlimitedSeats;

/**
 * Plain-text format — use in non-JSX contexts (toasts, aria labels, etc.)
 *
 *   formatSeats(4, null)    → "4 / ∞"
 *   formatSeats(4, 999999)  → "4 / ∞"
 *   formatSeats(4, 10)      → "4 / 10"
 *   formatSeats(null, null) → "—"
 */
export function formatSeats(
  seatsUsed: number | null | undefined,
  seatsLimit: number | null | undefined,
): string {
  if (seatsUsed == null && seatsLimit == null) return '—';
  const used = seatsUsed ?? 0;
  if (isUnlimitedSeats(seatsLimit)) return `${used} / ∞`;
  return `${used} / ${seatsLimit}`;
}
