'use client';

import { useState, useEffect, useCallback } from 'react';
import { listActivityLogs } from '@/services/users.service';
import type { AgentActivityLogResponse } from '@/types/api';

export interface UseAuditLogReturn {
  entries: AgentActivityLogResponse[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

export function useAuditLog(): UseAuditLogReturn {
  const [entries, setEntries] = useState<AgentActivityLogResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // super-admin endpoint returns all logs in one call — no pagination needed
  const [hasMore] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listActivityLogs();
      setEntries(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load audit log');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const loadMore = useCallback(() => {
    // No pagination on super-admin audit-logs endpoint
  }, []);

  return { entries, loading, error, hasMore, loadMore, refetch: fetchAll };
}
