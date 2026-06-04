import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In — Afya Super Admin',
  description: 'Sign in to the Afya Platform Super Admin Console',
};

/**
 * Auth route group layout.
 * Auth pages (login, etc.) render without the main app shell.
 * The root layout in app/layout.tsx still wraps this for html/body/globals.css.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
