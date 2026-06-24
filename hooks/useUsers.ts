'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  listUsers,
  updateUserStatus,
  registerUser,
} from '@/services/users.service';
import { getAccessToken } from '@/services/authService';
import type { UserResponse } from '@/types/api';

export interface UseUsersReturn {
  users: UserResponse[];
  loading: boolean;
  error: string | null;
  updateStatus: (id: string, isActive: boolean) => Promise<void>;
  /** @deprecated Use updateStatus(id, false) */
  deactivate: (id: string) => Promise<void>;
  /** @deprecated Use updateStatus(id, true) */
  reactivate: (id: string) => Promise<void>;
  register: (body: { name: string; email: string; role: string; facility_id: string }) => Promise<UserResponse>;
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
      // Fetch users and audit log in parallel
      const [usersData, auditData] = await Promise.allSettled([
        listUsers(),
        import('@/services/users.service').then(({ listActivityLogs }) => listActivityLogs()),
      ]);

      const rawUsers = usersData.status === 'fulfilled' ? usersData.value : [];
      const auditEntries = auditData.status === 'fulfilled' ? auditData.value : [];

      // Build a map of agent_name/email → most recent login timestamp from audit log.
      // The audit log login events tell us exactly when each user last signed in.
      const lastLoginByName  = new Map<string, string>(); // lowercased full_name → ISO timestamp
      const lastLoginByEmail = new Map<string, string>(); // lowercased email → ISO timestamp

      for (const entry of auditEntries) {
        const action = (entry.action ?? '').toLowerCase();
        const isLogin =
          action.includes('login') ||
          action.includes('logged in') ||
          action.includes('sign in') ||
          action === 'login';

        if (!isLogin || !entry.timestamp) continue;

        // Match by agent_name
        if (entry.agent_name) {
          const name = entry.agent_name.trim().toLowerCase();
          const existing = lastLoginByName.get(name);
          if (!existing || entry.timestamp > existing) {
            lastLoginByName.set(name, entry.timestamp);
          }
        }

        // Also check details field — some entries store email there
        const details = (entry.details ?? '').toLowerCase();
        const emailMatch = details.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
        if (emailMatch) {
          const email = emailMatch[0];
          const existing = lastLoginByEmail.get(email);
          if (!existing || entry.timestamp > existing) {
            lastLoginByEmail.set(email, entry.timestamp);
          }
        }
      }

      // Enrich users: fill last_login from audit if users endpoint doesn't provide it
      const enriched = rawUsers.map((u) => {
        const existingLogin =
          u.last_login ??
          (u as Record<string, unknown>).last_login_at as string ?? null;

        if (existingLogin) return u;

        // Try email match first (most precise)
        const emailLogin = lastLoginByEmail.get(u.email.trim().toLowerCase()) ?? null;
        if (emailLogin) {
          console.log(`[Users] last_login from audit (email) for "${u.full_name}": ${emailLogin}`);
          return { ...u, last_login: emailLogin };
        }

        // Fall back to full_name match
        const nameLogin = lastLoginByName.get(u.full_name.trim().toLowerCase()) ?? null;
        if (nameLogin) {
          console.log(`[Users] last_login from audit (name) for "${u.full_name}": ${nameLogin}`);
          return { ...u, last_login: nameLogin };
        }

        return u;
      });

      setUsers(enriched);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (getAccessToken()) fetchAll();
  }, [fetchAll]);

  const doUpdateStatus = useCallback(async (id: string, isActive: boolean) => {
    await updateUserStatus(id, isActive);
    await fetchAll();
  }, [fetchAll]);

  const register = useCallback(
    async (body: { name: string; email: string; role: string; facility_id: string }) => {
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
