import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Setup — Afya',
  description: 'Set up your Afya facility account',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
