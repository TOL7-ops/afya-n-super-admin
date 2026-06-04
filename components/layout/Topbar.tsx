'use client';

import { useAuth } from '@/hooks/useAuth';

/** Returns initials from a full name, e.g. "Ama Osei" → "AO" */
function initials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function Topbar() {
  const { user, logout } = useAuth();

  const displayName = user?.full_name ?? 'Platform Admin';
  const displayRole = user?.role ?? 'Super Admin';
  const ava = user ? initials(user.full_name) : 'SA';

  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="logo">
          <div className="logo-dot" />
          Afya
        </div>
        <div className="sep" />
        <span className="admin-badge">{displayRole}</span>
      </div>
      <div className="topbar-right">
        <div className="user-pill">
          <div className="user-ava">{ava}</div>
          {displayName}
        </div>
        <div className="sep" />
        <button
          className="btn-back"
          onClick={logout}
          title="Sign out"
          style={{ cursor: 'pointer' }}
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
