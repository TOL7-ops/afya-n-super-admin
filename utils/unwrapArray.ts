/**
 * Safely unwrap an API response that might be:
 *   - a plain array:          [item, item, ...]
 *   - a paginated wrapper:    { institutions: [...] }
 *                             { items: [...] }
 *                             { data: [...] }
 *                             { results: [...] }
 *                             { users: [...] }
 *                             { licenses: [...] }
 *                             { records: [...] }  etc.
 *
 * Logs the raw shape in dev so you can see what the API sent.
 */
const ARRAY_KEYS = [
  'institutions', 'facilities',
  'users',
  'licenses',
  'items', 'data', 'results', 'list', 'records', 'payload',
  'logs', 'entries', 'audit_logs',
  'performance', 'institutions_performance',
  'pending_approvals', 'top_institutions',
  'transactions',
  'permissions',
];

export function unwrapArray<T>(raw: unknown, label = 'API'): T[] {
  if (Array.isArray(raw)) return raw as T[];

  if (raw && typeof raw === 'object') {
    const d = raw as Record<string, unknown>;

    for (const key of ARRAY_KEYS) {
      if (Array.isArray(d[key])) {
        if (process.env.NODE_ENV !== 'production') {
          console.log(`[${label}] Unwrapped from key "${key}", count:`, (d[key] as unknown[]).length);
        }
        return d[key] as T[];
      }
    }

    // Single object that looks like a record — wrap it
    if ('id' in d) {
      console.log(`[${label}] Single object response — wrapping in array`);
      return [raw as T];
    }

    // Log keys so we know what came back
    console.warn(`[${label}] Unrecognised wrapper keys:`, Object.keys(d), '| raw:', JSON.stringify(raw).slice(0, 300));
  }

  return [];
}
