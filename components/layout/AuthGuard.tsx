'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Wraps any page that requires authentication.
 * - If loading: shows nothing (avoids flash of protected content).
 * - If not authenticated: redirects to /login.
 * - If authenticated: renders children.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log('[AuthGuard] Not authenticated — redirecting to /login');
      router.replace('/login');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          background: 'var(--color-primary-light)',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '28px',
            height: '28px',
            border: '2px solid var(--gray-xlt)',
            borderTopColor: 'var(--color-primary)',
            borderRadius: '50%',
            animation: 'spin 0.65s linear infinite',
          }}
        />
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '.72rem',
            color: 'var(--gray)',
          }}
        >
          Verifying session…
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Router.replace is async — render nothing while redirect happens
    return null;
  }

  return <>{children}</>;
}
