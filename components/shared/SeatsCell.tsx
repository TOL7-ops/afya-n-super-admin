'use client';

/**
 * SeatsCell — renders the Seats column value for org tables.
 *
 * Unlimited plans (limit >= 999999):  "{used} / ∞ icon"
 * Capped plans:                       "{used} / {limit}"   (plain text)
 * No data:                            "—"
 */
import { isUnlimitedSeats } from '@/utils/seats';

interface SeatsCellProps {
  seatsUsed: number | null | undefined;
  seatsLimit: number | null | undefined;
}

export default function SeatsCell({ seatsUsed, seatsLimit }: SeatsCellProps) {
  const used = seatsUsed ?? 0;

  // No seats data at all
  if (seatsUsed == null && seatsLimit == null) {
    return <span style={{ color: 'var(--gray)' }}>—</span>;
  }

  // Unlimited — null OR >= 999999
  if (isUnlimitedSeats(seatsLimit)) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <span style={{ fontWeight: 500 }}>{used}</span>
        <span style={{ color: 'var(--gray)', fontSize: '13px', lineHeight: 1 }}>/</span>
        {/* Inline SVG infinity — no icon library needed */}
        <svg
          width="16" height="10" viewBox="0 0 24 14"
          fill="none" stroke="var(--color-primary)"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-label="Unlimited"
          style={{ flexShrink: 0, marginTop: '1px' }}
        >
          <path d="M12 7c-1.5-3.5-5.5-5-8-2.5S1.5 11 4 12s6.5-1 8-5 5.5-7.5 8-5S23.5 10 21 12s-6.5-1-8-5z" />
        </svg>
      </span>
    );
  }

  // Capped plan — plain "used / limit"
  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {used} / {seatsLimit}
    </span>
  );
}
