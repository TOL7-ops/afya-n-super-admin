'use client';

import type { ViewId } from '@/types';

export interface SidebarStats {
  totalFacilities: number;
  totalInstitutions: number;
  activeLicenses: number;
  totalScreened: number;
  onTreatment: number;
  pendingApproval: number;
}

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  pendingCount: number;
  stats: SidebarStats;
  /** Mobile: whether the drawer is open */
  isOpen?: boolean;
  /** Mobile: callback to close the drawer */
  onClose?: () => void;
}

interface NavItem {
  id: ViewId;
  icon: string;
  label: string;
  badge?: boolean;
}

const PLATFORM_NAV: NavItem[] = [
  { id: 'dashboard',     icon: '⊞', label: 'Dashboard' },
  { id: 'institutions',  icon: '🏛', label: 'Organisations', badge: true },
  { id: 'demo-requests', icon: '📥', label: 'Demo Requests' },
  { id: 'licenses',      icon: '🔑', label: 'Licenses' },
  { id: 'analytics',     icon: '📈', label: 'Platform Analytics' },
  { id: 'revenue',       icon: '💰', label: 'Revenue' },
];

const OPS_NAV: NavItem[] = [
  { id: 'users',    icon: '👥', label: 'All Users' },
  { id: 'audit',    icon: '📋', label: 'Audit Log' },
  // { id: 'settings', icon: '⚙',  label: 'System Settings' },  // commented out
];

export default function Sidebar({
  activeView,
  onNavigate,
  pendingCount,
  stats,
  isOpen = false,
}: SidebarProps) {
  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      <div className="sb-header">
        <div className="sb-title">Super Admin Console</div>
        <div className="sb-sub">Afya Platform · Global View</div>
      </div>

      <div className="sb-sec">Platform</div>
      {PLATFORM_NAV.map((item) => (
        <div
          key={item.id}
          className={`nav-item${activeView === item.id ? ' active' : ''}`}
          onClick={() => onNavigate(item.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.id)}
          title={item.label}
          aria-label={item.label}
        >
          <span className="ico">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
          {item.badge && pendingCount > 0 && (
            <span className="nav-badge" id="pending-badge">
              {pendingCount}
            </span>
          )}
        </div>
      ))}

      <div className="sb-sec">Operations</div>
      {OPS_NAV.map((item) => (
        <div
          key={item.id}
          className={`nav-item${activeView === item.id ? ' active' : ''}`}
          onClick={() => onNavigate(item.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onNavigate(item.id)}
          title={item.label}
          aria-label={item.label}
        >
          <span className="ico">{item.icon}</span>
          <span className="nav-label">{item.label}</span>
        </div>
      ))}

      {/* ── Platform Stats — commented out, kept for recovery ──────────────────
      <div className="sb-div" />
      <div className="sb-sec">Platform Stats</div>
      <div className="sb-stats">
        <div className="sb-sr">
          <span className="sb-sl">Facilities</span>
          <span className="sb-sv">{stats.totalFacilities}</span>
        </div>
        <div className="sb-sr">
          <span className="sb-sl">Institutions</span>
          <span className="sb-sv">{stats.totalInstitutions}</span>
        </div>
        <div className="sb-sr">
          <span className="sb-sl">Total Orgs</span>
          <span className="sb-sv">{stats.totalFacilities + stats.totalInstitutions}</span>
        </div>
        <div className="sb-sr">
          <span className="sb-sl">Active Licenses</span>
          <span className="sb-sv ok">{stats.activeLicenses}</span>
        </div>
        <div className="sb-sr">
          <span className="sb-sl">Total Screened</span>
          <span className="sb-sv">{stats.totalScreened.toLocaleString()}</span>
        </div>
        <div className="sb-sr">
          <span className="sb-sl">On Treatment</span>
          <span className="sb-sv ok">{stats.onTreatment}</span>
        </div>
        <div className="sb-sr">
          <span className="sb-sl">Pending Approval</span>
          <span className="sb-sv warn">{pendingCount}</span>
        </div>
      </div>
      ── End Platform Stats ── */}
    </aside>
  );
}
