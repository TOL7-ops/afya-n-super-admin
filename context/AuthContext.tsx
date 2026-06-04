'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  login as apiLogin,
  logout as apiLogout,
  getCurrentUser,
  getStoredUser,
  isAuthenticated,
  type LoginPayload,
} from '@/services/authService';
import type { UserResponse } from '@/types/api';

interface AuthContextValue {
  user: UserResponse | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session from localStorage / verify token
  useEffect(() => {
    const restore = async () => {
      const cached = getStoredUser();
      if (cached) {
        setUser(cached);
        // Silently re-validate with the backend
        try {
          const fresh = await getCurrentUser();
          setUser(fresh);
        } catch {
          // Token expired or invalid — let the 401 interceptor handle redirect
        }
      }
      setLoading(false);
    };
    restore();
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    console.log('[AuthContext] login() called');
    const loggedInUser = await apiLogin(payload);
    setUser(loggedInUser);
    console.log('[AuthContext] State updated with user:', loggedInUser.email);
  }, []);

  const logout = useCallback(() => {
    console.log('[AuthContext] logout() called');
    setUser(null);
    apiLogout();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: isAuthenticated(),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used inside <AuthProvider>');
  return ctx;
}
