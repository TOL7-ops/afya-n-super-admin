import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Account Setup — Afya Platform',
  description: 'Set up your Afya institution account',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
