/**
 * Shared utility: extract GHS amount from a plan string.
 *
 * Examples:
 *   "Annual Standard (10 seats) — GHS 6,000"  → 6000
 *   "Annual Enterprise (unlimited) — GHS 12,000" → 12000
 *   "30-day Free Trial"                        → 0
 *   "Annual Standard(10 seats)"                → 6000 (uses fallback map)
 */

const PLAN_AMOUNT_MAP: Array<{ key: string; amount: number }> = [
  { key: 'enterprise',     amount: 12000 },
  { key: 'annual standard', amount: 6000  },
  { key: 'standard',       amount: 6000  },
  { key: 'trial',          amount: 0     },
];

export function extractAmountFromPlan(plan: string | null | undefined): number {
  if (!plan) return 0;

  // 1. Try to parse "GHS X,XXX" or "GHS XXXXX" directly from string
  const match = plan.match(/GHS\s*([\d,\s]+)/i);
  if (match) {
    const num = parseInt(match[1].replace(/[,\s]/g, ''), 10);
    if (!isNaN(num)) return num;
  }

  // 2. Fallback: match known plan tier keywords
  const lower = plan.toLowerCase();
  for (const { key, amount } of PLAN_AMOUNT_MAP) {
    if (lower.includes(key)) return amount;
  }

  return 0;
}

/**
 * Extract max seat limit from a plan string.
 * Returns null for unlimited plans (Enterprise).
 *
 * Examples:
 *   "Annual Standard (10 seats)"              → 10
 *   "Annual Standard (10 seats) — GHS 6,000"  → 10
 *   "Annual Enterprise (unlimited)"           → null
 *   "30-day Free Trial"                       → null
 */
export function extractMaxSeatsFromPlan(plan: string | null | undefined): number | null {
  if (!plan) return null;
  const lower = plan.toLowerCase();

  // Unlimited plans have no seat cap
  if (lower.includes('unlimited') || lower.includes('enterprise')) return null;

  // Parse "(10 seats)" or "(10 Seats)"
  const match = plan.match(/\(\s*(\d+)\s*seats?\s*\)/i);
  if (match) return parseInt(match[1], 10);

  return null;
}

/**
 * Strip the price suffix from a plan label for clean display.
 * "Annual Standard (10 seats) — GHS 6,000" → "Annual Standard (10 seats)"
 */
export function cleanPlanLabel(plan: string | null | undefined): string {
  if (!plan) return '—';
  return plan.replace(/\s*[—–-]\s*GHS[\d,\s]+/i, '').trim();
}
