/**
 * Sort an array of objects by `created_at` descending (newest first).
 * Items missing `created_at` fall to the bottom (treated as epoch 0).
 * Always returns a new array — never mutates the input.
 */
export function sortByNewest<T extends { created_at?: string | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
}
