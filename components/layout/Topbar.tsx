'use client';

import { useAuth } from '@/hooks/useAuth';

interface TopbarProps {
  onMenuToggle: () => void;
}

/** Returns initials from a full name, e.g. "Ama Osei" → "AO" */
function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  const { user, logout } = useAuth();

  const displayName = user?.full_name ?? 'Platform Admin';
  const displayRole = user?.role ?? 'Super Admin';
  const ava = user ? initials(user.full_name) : 'SA';

  return (
    <div className="topbar">
      <div className="topbar-left">
        {/* Hamburger — visible on mobile only via CSS */}
        <button
          className="hamburger"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
        >
          ☰
        </button>

        <div className="logo">
          <div className="logo-dot" />
          Afya
        </div>
        {/* Sep + badge hidden on mobile via CSS */}
        <div className="sep sep-topbar-mid" />
        <span className="admin-badge">{displayRole}</span>
      </div>

      <div className="topbar-right">
        <div className="user-pill">
          <div className="user-ava">{ava}</div>
          {/* Name hidden on mobile via CSS */}
          <span className="user-pill-name">{displayName}</span>
        </div>
        <div className="sep" />
        <button
          className="btn-back"
          onClick={logout}
          title="Sign out"
          aria-label="Sign out"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
