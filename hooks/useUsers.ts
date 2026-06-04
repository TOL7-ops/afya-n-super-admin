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
    // Optimistic update — flip is_active instantly
    setUsers((prev) =>
      prev.map((u) => (u.id === id ? { ...u, is_active: isActive } : u)),
    );
    try {
      const updated = await updateUserStatus(id, isActive);
      // Merge response onto existing — preserve display fields the PATCH may not return
      // (facility_name, last_login, role, email etc.)
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id !== id) return u;
          return {
            ...u,                              // existing display fields
            ...updated,                        // server truth
            // Re-pin fields the PATCH response may strip
            facility_name: u.facility_name   ?? updated.facility_name,
            last_login:    u.last_login       ?? updated.last_login,
            full_name:     u.full_name        || updated.full_name,
            email:         u.email            || updated.email,
            role:          u.role             || updated.role,
          };
        }),
      );
    } catch (err) {
      // Revert on failure
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, is_active: !isActive } : u)),
      );
      throw err;
    }
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
