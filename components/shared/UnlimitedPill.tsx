'use client';

/**
 * UnlimitedPill — renders an "Unlimited" pill badge.
 * Used when a seats_limit is null (subscriptions endpoint) meaning no cap.
 *
 * For a real numeric limit just render the number inline — no component needed.
 */
import { isUnlimitedSeats } from '@/utils/seats';

interface UnlimitedPillProps {
  seatsLimit: number | null | undefined;
}

export default function UnlimitedPill({ seatsLimit }: UnlimitedPillProps) {
  if (isUnlimitedSeats(seatsLimit)) {
    return (
      <span style={{
        display: 'inline-block',
        background: 'var(--green-bg)',
        color: 'var(--green)',
        border: '1px solid var(--green-border)',
        fontSize: '11px',
        fontWeight: 600,
        padding: '2px 8px',
        borderRadius: '999px',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '.02em',
        whiteSpace: 'nowrap',
      }}>
        Unlimited
      </span>
    );
  }

  // Real numeric limit — plain number, no pill
  return (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '.8rem' }}>
      {seatsLimit}
    </span>
  );
}
