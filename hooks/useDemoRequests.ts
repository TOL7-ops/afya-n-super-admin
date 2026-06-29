'use client';

/**
 * Shared hook for Demo Requests.
 * Used by both the dashboard widget and the full Demo Requests page.
 *
 * Fetches all requests once, exposes filtered views, and provides
 * the approve/reject handler so logic is never duplicated.
 */
import { useState, useCallback, useEffect } from 'react';
import { listDemoRequests, updateDemoRequestStatus } from '@/services/demoRequests.service';
import type { DemoRequest, DemoRequestStatus } from '@/types/api';

export interface ConfirmDemoAction {
  requestId: string;
  requesterName: string;
  requesterEmail: string | null;
  orgName: string;
  action: 'Approved' | 'Rejected';
}

export interface UseDemoRequestsReturn {
  /** All requests, sorted newest first */
  all: DemoRequest[];
  /** Only Pending */
  pending: DemoRequest[];
  loading: boolean;
  /** IDs currently in-flight (per-row loading) */
  actionInFlight: Set<string>;
  /** Confirmation modal state */
  confirmAction: ConfirmDemoAction | null;
  confirming: boolean;
  /** Open confirmation modal */
  initiateAction: (req: DemoRequest, action: 'Approved' | 'Rejected') => void;
  /** Cancel confirmation */
  cancelAction: () => void;
  /** Fire the confirmed action */
  executeAction: (onToast: (msg: string, type?: '' | 'success' | 'warn') => void) => Promise<void>;
  /** Manual refresh */
  refetch: () => Promise<void>;
}

export function useDemoRequests(): UseDemoRequestsReturn {
  const [requests, setRequests]         = useState<DemoRequest[]>([]);
  const [loading, setLoading]           = useState(true);
  const [actionInFlight, setInFlight]   = useState<Set<string>>(new Set());
  const [confirmAction, setConfirm]     = useState<ConfirmDemoAction | null>(null);
  const [confirming, setConfirming]     = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listDemoRequests();
      // Sort newest first
      const sorted = [...data].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setRequests(sorted);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const initiateAction = useCallback((req: DemoRequest, action: 'Approved' | 'Rejected') => {
    setConfirm({
      requestId:      req.id,
      requesterName:  req.name,
      requesterEmail: req.email,
      orgName:        req.organization_name,
      action,
    });
  }, []);

  const cancelAction = useCallback(() => setConfirm(null), []);

  const executeAction = useCallback(async (
    onToast: (msg: string, type?: '' | 'success' | 'warn') => void,
  ) => {
    if (!confirmAction) return;
    const { requestId, orgName, requesterEmail, action } = confirmAction;

    setConfirming(true);
    setInFlight((s) => new Set(s).add(requestId));

    try {
      const updated = await updateDemoRequestStatus(requestId, action);
      const newStatus = (updated.status ?? action) as DemoRequestStatus;

      // Optimistic update in place
      setRequests((prev) =>
        prev.map((r) => r.id === requestId ? { ...r, status: newStatus } : r),
      );

      const msg =
        action === 'Approved'
          ? `Demo request approved — confirmation email sent to ${requesterEmail ?? orgName}`
          : `Demo request from ${orgName} rejected`;
      onToast(msg, action === 'Approved' ? 'success' : 'warn');
      setConfirm(null);
    } catch {
      onToast(`Failed to ${action.toLowerCase()} demo request — try again`, 'warn');
    } finally {
      setConfirming(false);
      setInFlight((s) => { const n = new Set(s); n.delete(requestId); return n; });
    }
  }, [confirmAction]);

  const pending = requests.filter((r) => r.status === 'Pending');

  return {
    all: requests,
    pending,
    loading,
    actionInFlight,
    confirmAction,
    confirming,
    initiateAction,
    cancelAction,
    executeAction,
    refetch: fetchAll,
  };
}
