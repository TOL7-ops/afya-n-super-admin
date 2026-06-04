'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listUsers,
  updateUserStatus,
  registerUser,
} from '@/services/users.service';
import type { UserResponse } from '@/types/api';

export interface UseUsersReturn {
  users: UserResponse[];
  loading: boolean;
  error: string | null;
  /** Suspend or reactivate — single unified action */
  updateStatus: (id: number, isActive: boolean) => Promise<void>;
  /** @deprecated Use updateStatus(id, false) */
  deactivate: (id: number) => Promise<void>;
  /** @deprecated Use updateStatus(id, true) */
  reactivate: (id: number) => Promise<void>;
  register: (body: { name: string; email: string; role: string; facility_id: number }) => Promise<UserResponse>;
  refetch: () => void;
}

export function useUsers(): UseUsersReturn {
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const doUpdateStatus = useCallback(async (id: number, isActive: boolean) => {
    const updated = await updateUserStatus(id, isActive);
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
  }, []);

  const register = useCallback(
    async (body: { name: string; email: string; role: string; facility_id: number }) => {
      const created = await registerUser(body);
      setUsers((prev) => [created, ...prev]);
      return created;
    },
    [],
  );

  return {
    users,
    loading,
    error,
    updateStatus: doUpdateStatus,
    deactivate: (id) => doUpdateStatus(id, false),
    reactivate: (id) => doUpdateStatus(id, true),
    register,
    refetch: fetchAll,
  };
}
