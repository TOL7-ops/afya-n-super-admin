'use client';

import { useState, useCallback, useMemo } from 'react';
import Sidebar, { type SidebarStats } from './Sidebar';
import Toast from '@/components/shared/Toast';
import DashboardView from '@/components/dashboard/DashboardView';
import InstitutionsView from '@/components/institutions/InstitutionsView';
import LicensesView from '@/components/licenses/LicensesView';
import AnalyticsView from '@/components/analytics/AnalyticsView';
import RevenueView from '@/components/revenue/RevenueView';
import UsersView from '@/components/users/UsersView';
import AuditView from '@/components/audit/AuditView';
import SettingsView from '@/components/settings/SettingsView';
import CreateInstitutionModal from '@/components/modals/CreateInstitutionModal';
import EmailPreviewModal from '@/components/modals/EmailPreviewModal';
import ConvertTrialModal from '@/components/modals/ConvertTrialModal';
import IssueLicenseModal from '@/components/modals/IssueLicenseModal';
import EditInstitutionModal from '@/components/modals/EditInstitutionModal';

import { useToast } from '@/hooks/useToast';
import { useModal } from '@/hooks/useModal';
import { useFacilities } from '@/hooks/useFacilities';
import { useDashboardAnalytics } from '@/hooks/useAnalytics';
import { exportDashboardReport } from '@/services/analytics.service';
import { convertTrial } from '@/services/licenses.service';

import type {
  ViewId,
  PendingInstitution,
  CreateInstitutionForm,
  IssueLicenseForm,
  EditInstitutionForm,
  EmailPreviewData,
  PendingInstitutionData,
} from '@/types';
import type {
  FacilityResponse,
  InstitutionCreatePayload,
  PendingApprovalItem,
  TopInstitutionItem,
} from '@/types/api';

/**
 * Resolve a numeric institution ID from a pending-approval token.
 * The token number (e.g. "token-3" → 3) does NOT match the institution ID.
 * Primary strategy: match by name against the loaded institutions list.
 * Fallback: parse the token number directly (only if name match fails).
 */
function resolveInstitutionId(
  tokenId: string,
  name: string,
  facilities: FacilityResponse[],
): number | null {
  // Normalize: lowercase, collapse all whitespace to single space, trim
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
  const needle = norm(name);

  console.log(`[resolveInstitutionId] Looking for "${needle}" among:`, facilities.map(f => `${f.id}:"${norm(f.name)}"`));

  // Strategy 1: exact normalized match
  const exactMatch = facilities.find((f) => norm(f.name) === needle);
  if (exactMatch) {
    console.log(`[resolveInstitutionId] Exact match → id=${exactMatch.id}`);
    return exactMatch.id;
  }

  // Strategy 2: one starts with the other (handles "Ho Municipal" vs "Ho Municipal Hospital")
  const startsMatch = facilities.find(
    (f) => norm(f.name).startsWith(needle) || needle.startsWith(norm(f.name)),
  );
  if (startsMatch) {
    console.log(`[resolveInstitutionId] StartsWith match "${name}" → "${startsMatch.name}" id=${startsMatch.id}`);
    return startsMatch.id;
  }

  // Strategy 3: contains match
  const containsMatch = facilities.find(
    (f) => norm(f.name).includes(needle) || needle.includes(norm(f.name)),
  );
  if (containsMatch) {
    console.log(`[resolveInstitutionId] Contains match "${name}" → "${containsMatch.name}" id=${containsMatch.id}`);
    return containsMatch.id;
  }

  // Strategy 4: first-word match (e.g. "Ho" matches "Ho Municipal Hospital")
  const firstWord = needle.split(' ')[0];
  if (firstWord && firstWord.length > 2) {
    const wordMatch = facilities.find((f) => norm(f.name).startsWith(firstWord));
    if (wordMatch) {
      console.log(`[resolveInstitutionId] First-word match "${firstWord}" → "${wordMatch.name}" id=${wordMatch.id}`);
      return wordMatch.id;
    }
  }

  // Strategy 5: parse numeric from token as absolute last resort
  const tokenMatch = String(tokenId).match(/(\d+)$/);
  if (tokenMatch) {
    const n = parseInt(tokenMatch[1], 10);
    if (!isNaN(n) && n > 0) {
      console.warn(`[resolveInstitutionId] No name match — token fallback ${n}`);
      return n;
    }
  }

  console.error(`[resolveInstitutionId] FAILED for token="${tokenId}" name="${name}"`);
  return null;
}

function formatDate(d: Date): string {
  return (
    d.toLocaleDateString('en-GB', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    }) +
    ' at ' +
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
}

// Map API PendingApprovalItem → UI PendingInstitution shape
function mapPendingApproval(item: PendingApprovalItem): PendingInstitution {
  const dateIso = item.requested_date ?? item.created_at ?? null;
  return {
    id: String(item.id),
    name: item.name,
    type: (item.type ?? 'NGO') as PendingInstitution['type'],
    region: item.region ?? '—',
    contact: item.contact_person ?? item.contact_name ?? '—',
    requestedDate: dateIso
      ? new Date(dateIso).toLocaleDateString('en-GB', {
          day: 'numeric', month: 'short', year: 'numeric',
        })
      : '—',
    plan: item.requested_plan ?? item.license_plan ?? '—',
  };
}

export default function AdminShell() {
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const { toast, showToast } = useToast();

  // ─── Live API data ────────────────────────────────────────────────────────
  const {
    facilities,
    loading: facilitiesLoading,
    suspend,
    approve,
    reject,
    create: createFacility,
    update,
    extendTrial: doExtendTrial,
    refetch: refetchFacilities,
  } = useFacilities();

  const {
    data: dashboardData,
    loading: dashboardLoading,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useDashboardAnalytics();

  // ─── Modals ───────────────────────────────────────────────────────────────
  const createModal      = useModal();
  const emailModal       = useModal();
  const convertModal     = useModal();
  const issueLicenseModal = useModal();

  const [emailPreviewData, setEmailPreviewData] = useState<EmailPreviewData | null>(null);
  const [pendingInstData, setPendingInstData]   = useState<PendingInstitutionData | null>(null);
  const [convertInstName, setConvertInstName]   = useState('');
  const [convertInstId, setConvertInstId]       = useState('');
  const [editingFacility, setEditingFacility]   = useState<FacilityResponse | null>(null);
  // Track approved/rejected token IDs so we can remove them instantly from the list
  const [dismissedTokens, setDismissedTokens]   = useState<Set<string>>(new Set());

  // ─── Derived UI data from dashboard API ──────────────────────────────────
  const pendingApprovals = useMemo<PendingInstitution[]>(
    () =>
      (dashboardData?.pendingApprovals ?? [])
        .map(mapPendingApproval)
        .filter((p) => !dismissedTokens.has(p.id)),
    [dashboardData, dismissedTokens],
  );

  const topInstitutions = useMemo<TopInstitutionItem[]>(
    () => dashboardData?.topInstitutions ?? [],
    [dashboardData],
  );

  // ─── Sidebar stats ────────────────────────────────────────────────────────
  const sidebarStats: SidebarStats = useMemo(() => ({
    totalInstitutions: facilities.length,
    activeLicenses:    dashboardData?.activeInstitutions ?? 0,
    totalScreened:     dashboardData?.totalScreened ?? 0,
    onTreatment:       dashboardData?.onActiveTreatment ?? 0,
    pendingApproval:   pendingApprovals.length,
  }), [facilities, dashboardData, pendingApprovals]);

  // ─── Navigation ───────────────────────────────────────────────────────────
  const handleNavigate = useCallback((view: ViewId) => setActiveView(view), []);

  const handleApprove = useCallback(
    async (tokenId: string, name: string) => {
      try {
        // If institutions haven't loaded yet, refetch first
        let facilityList = facilities;
        if (facilityList.length === 0) {
          await refetchFacilities();
          // Give state time to update — use a fresh fetch instead
          const { listInstitutions } = await import('@/services/institutions.service');
          facilityList = await listInstitutions();
        }

        const numericId = resolveInstitutionId(tokenId, name, facilityList);
        if (numericId === null) {
          showToast(`Cannot find institution "${name}" — refresh and try again`, 'warn');
          return;
        }

        console.log(`[Approve] Resolved id=${numericId} for token="${tokenId}" name="${name}"`);

        // 1. Call the action endpoint
        try { await approve(numericId); } catch { /* continue to status update */ }

        // 2. Also PATCH status to ensure activation is persisted — the action endpoint
        //    may not be writing to DB correctly on the backend side
        try {
          const { updateInstitutionStatus } = await import('@/services/institutions.service');
          await updateInstitutionStatus(numericId, true);
          console.log(`[Approve] PATCH /status active=true → id=${numericId} ✓`);
        } catch (e) {
          console.warn('[Approve] Status patch failed:', e);
        }

        setDismissedTokens((prev) => new Set(prev).add(tokenId));
        showToast(`✓ ${name} approved and activated`, 'success');
        refetchDashboard();
        refetchFacilities();
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: unknown } };
        const status = axiosErr.response?.status;
        const detail = axiosErr.response?.data
          ? JSON.stringify(axiosErr.response.data)
          : 'no detail';
        console.error(`[Approve] Failed for "${name}":`, status, detail);
        showToast(`Approve failed for ${name} (HTTP ${status ?? 'no response'}) — ${detail}`, 'warn');
      }
    },
    [approve, facilities, showToast, refetchDashboard, refetchFacilities],
  );

  const handleReject = useCallback(
    async (tokenId: string, name: string) => {
      try {
        let facilityList = facilities;
        if (facilityList.length === 0) {
          const { listInstitutions } = await import('@/services/institutions.service');
          facilityList = await listInstitutions();
        }

        const numericId = resolveInstitutionId(tokenId, name, facilityList);
        if (numericId === null) {
          showToast(`Cannot find institution "${name}" — refresh and try again`, 'warn');
          return;
        }
        await reject(numericId);
        setDismissedTokens((prev) => new Set(prev).add(tokenId));
        showToast(`${name} has been rejected`, 'warn');
        refetchDashboard();
        refetchFacilities();
      } catch (err: unknown) {
        const axiosErr = err as { response?: { status?: number; data?: unknown } };
        console.error(`[Reject] Failed for "${name}":`, axiosErr.response?.status, axiosErr.response?.data);
        showToast(`Failed to reject ${name} — try again`, 'warn');
      }
    },
    [reject, facilities, showToast, refetchDashboard, refetchFacilities],
  );

  // ─── Suspend / reactivate ─────────────────────────────────────────────────
  const handleSuspend = useCallback(
    async (id: number, isActive: boolean, name: string) => {
      try {
        await suspend(id, isActive);
        showToast(
          isActive ? `✓ ${name} reactivated` : `${name} suspended`,
          isActive ? 'success' : 'warn',
        );
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response?.status;
        showToast(
          `${isActive ? 'Activate' : 'Suspend'} failed for ${name} (HTTP ${status ?? 'no response'})`,
          'warn',
        );
      }
    },
    [suspend, showToast],
  );

  // ─── Extend trial ─────────────────────────────────────────────────────────
  const handleExtendTrial = useCallback(
    async (id: number, name: string) => {
      try {
        await doExtendTrial(id, 30);
        showToast(`✓ Trial extended by 30 days for ${name}`, 'success');
      } catch {
        showToast(`Failed to extend trial for ${name} — try again`, 'warn');
      }
    },
    [doExtendTrial, showToast],
  );

  // ─── Edit institution ─────────────────────────────────────────────────────
  const handleEditSave = useCallback(
    async (data: EditInstitutionForm) => {
      if (!editingFacility) return;
      try {
        await update(editingFacility.id, {
          name:         data.name,
          type:         data.type || undefined,
          region:       data.region || undefined,
          contact_name: data.contact || undefined,
          email:        data.email || undefined,
          license_plan: data.plan || undefined,
          seats:        data.seats ? Number(data.seats) : undefined,
        });
        showToast(`✓ ${data.name} updated`, 'success');
        setEditingFacility(null);
        refetchFacilities();
      } catch {
        showToast('Failed to save changes — try again', 'warn');
      }
    },
    [editingFacility, update, showToast, refetchFacilities],
  );

  // ─── Create institution ───────────────────────────────────────────────────
  const handleCreateSubmit = useCallback(
    (data: CreateInstitutionForm) => {
      if (!data.name.trim() || !data.email.trim()) {
        showToast('Please fill in institution name and admin email');
        return;
      }

      const expiry = data.plan.includes('Trial') ? '30 days from activation' : '31 Dec 2026';
      const now = new Date();

      const preview: EmailPreviewData = {
        toField:      `${data.contact || 'Admin'} <${data.email}>`,
        dateField:    formatDate(now),
        subject:      `Your Afya account is ready — ${data.name}`,
        contactName:  data.contact || 'there',
        orgName:      data.name,
        infoOrg:      data.name,
        infoType:     data.type || '—',
        infoRegion:   data.region || '—',
        infoEmail:    data.email,
        infoPlan:     data.plan || '—',
        infoSeats:    `${data.seats || '—'} seats`,
        infoExpiry:   expiry,
        token:        'AFYA-XXXX-XXXX-XXXX',
      };

      const pending: PendingInstitutionData = {
        name:    data.name,
        email:   data.email,
        contact: data.contact,
        type:    data.type,
        region:  data.region,
        plan:    data.plan,
        seats:   data.seats || '—',
        token:   'AFYA-XXXX-XXXX-XXXX',
        phone:   data.phone,
        notes:   data.notes,
      };

      setEmailPreviewData(preview);
      setPendingInstData(pending);
      createModal.close();
      emailModal.open();
    },
    [createModal, emailModal, showToast],
  );

  // ─── Send onboarding email — calls POST /super-admin/institutions ─────────
  const handleEmailSent = useCallback(
    async (data: PendingInstitutionData) => {
      try {
        const payload: InstitutionCreatePayload = {
          name:         data.name,
          email:        data.email,
          contact_name: data.contact || data.name,
          region:       data.region || undefined,
          license_plan: data.plan || '30-day Free Trial',
          phone:        data.phone || undefined,
          type:         data.type || undefined,
          seats:        data.seats && data.seats !== '—' ? Number(data.seats) : undefined,
          notes:        data.notes || undefined,
        };
        await createFacility(payload);
        showToast(`✓ ${data.name} created — onboarding email sent to ${data.email}`, 'success');
        refetchFacilities();
        refetchDashboard();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Failed to create institution';
        showToast(`Error: ${msg}`, 'warn');
        throw err;
      }
    },
    [createFacility, showToast, refetchFacilities, refetchDashboard],
  );

  // ─── Convert trial — calls POST /super-admin/licenses/{id}/convert-trial ──
  const handleConvertTrial = useCallback(
    (id: string, name: string) => {
      setConvertInstId(id);
      setConvertInstName(name);
      convertModal.open();
    },
    [convertModal],
  );

  const handleConvertConfirm = useCallback(
    async (plan: string) => {
      try {
        await convertTrial(Number(convertInstId), {
          plan,
          payment_method: 'Bank Transfer',
        });
        showToast(`✓ ${convertInstName} converted to ${plan}`, 'success');
        refetchFacilities();
      } catch {
        showToast('Failed to convert trial — try again', 'warn');
      }
    },
    [convertInstId, convertInstName, showToast, refetchFacilities],
  );

  // ─── Issue license — handled by LicensesView itself now ──────────────────
  const handleIssueLicense = useCallback(
    async (data: IssueLicenseForm) => {
      if (!data.facilityId || !data.plan) {
        showToast('Please select an institution and plan', 'warn');
        return;
      }
      try {
        await update(data.facilityId, { license_plan: data.plan });
        showToast(`✓ License issued for ${data.institution}`, 'success');
        refetchFacilities();
      } catch {
        showToast('Failed to issue license — try again', 'warn');
      }
    },
    [update, showToast, refetchFacilities],
  );

  // ─── Dashboard export ─────────────────────────────────────────────────────
  const handleDashboardExport = useCallback(async () => {
    try {
      showToast('Generating report…');
      await exportDashboardReport();
      showToast('Report downloaded', 'success');
    } catch {
      showToast('Export failed — try again', 'warn');
    }
  }, [showToast]);

  return (
    <>
      <div className="app-body">
        <Sidebar
          activeView={activeView}
          onNavigate={handleNavigate}
          pendingCount={pendingApprovals.length}
          stats={sidebarStats}
        />

        <main className="main">
          {/* Dashboard */}
          <div className={`view${activeView === 'dashboard' ? ' active' : ''}`}>
            <DashboardView
              onAddInstitution={createModal.open}
              onViewAllInstitutions={() => handleNavigate('institutions')}
              onToast={showToast}
              onExportReport={handleDashboardExport}
              pendingApprovals={pendingApprovals}
              topInstitutions={topInstitutions}
              onApprove={handleApprove}
              onReject={handleReject}
              activeInstitutions={dashboardData?.activeInstitutions ?? 0}
              totalInstitutions={facilities.length}
              totalScreened={dashboardData?.totalScreened ?? 0}
              onActiveTreatment={dashboardData?.onActiveTreatment ?? 0}
              screeningTrend={dashboardData?.screeningTrend ?? []}
              bpDistribution={dashboardData?.bpDistribution ?? []}
              analyticsLoading={dashboardLoading}
              analyticsError={dashboardError}
            />
          </div>

          {/* Institutions */}
          <div className={`view${activeView === 'institutions' ? ' active' : ''}`}>
            <InstitutionsView
              facilities={facilities}
              loading={facilitiesLoading}
              onAddInstitution={createModal.open}
              onEdit={(facility) => setEditingFacility(facility)}
              onSuspend={handleSuspend}
              onExtendTrial={handleExtendTrial}
              onToast={showToast}
            />
          </div>

          {/* Licenses — self-contained, uses own API calls */}
          <div className={`view${activeView === 'licenses' ? ' active' : ''}`}>
            <LicensesView
              onIssueLicense={issueLicenseModal.open}
              onConvertTrial={handleConvertTrial}
              onToast={showToast}
            />
          </div>

          {/* Analytics */}
          <div className={`view${activeView === 'analytics' ? ' active' : ''}`}>
            <AnalyticsView onToast={showToast} />
          </div>

          {/* Revenue — self-contained, uses own API calls */}
          <div className={`view${activeView === 'revenue' ? ' active' : ''}`}>
            <RevenueView onToast={showToast} />
          </div>

          {/* Users — self-contained, facility_name resolved server-side */}
          <div className={`view${activeView === 'users' ? ' active' : ''}`}>
            <UsersView onToast={showToast} />
          </div>

          {/* Audit */}
          <div className={`view${activeView === 'audit' ? ' active' : ''}`}>
            <AuditView onToast={showToast} />
          </div>

          {/* Settings */}
          <div className={`view${activeView === 'settings' ? ' active' : ''}`}>
            <SettingsView onToast={showToast} />
          </div>
        </main>
      </div>

      {/* ── Modals ── */}
      <CreateInstitutionModal
        isOpen={createModal.isOpen}
        onClose={createModal.close}
        onSubmit={handleCreateSubmit}
      />

      <EmailPreviewModal
        isOpen={emailModal.isOpen}
        onClose={emailModal.close}
        emailData={emailPreviewData}
        pendingData={pendingInstData}
        onSent={handleEmailSent}
      />

      <ConvertTrialModal
        isOpen={convertModal.isOpen}
        onClose={convertModal.close}
        institutionName={convertInstName}
        onConfirm={handleConvertConfirm}
      />

      <IssueLicenseModal
        isOpen={issueLicenseModal.isOpen}
        onClose={issueLicenseModal.close}
        onIssue={handleIssueLicense}
        facilities={facilities}
      />

      {/* EditInstitutionModal — was built but never mounted, now wired */}
      {editingFacility && (
        <EditInstitutionModal
          isOpen={true}
          onClose={() => setEditingFacility(null)}
          initialData={{
            name:    editingFacility.name,
            type:    editingFacility.type ?? '',
            region:  editingFacility.region ?? '',
            contact: editingFacility.contact_name ?? '',
            email:   editingFacility.email ?? '',
            plan:    editingFacility.license_plan ?? '',
            seats:   editingFacility.max_seats != null ? String(editingFacility.max_seats) : '',
          }}
          onSave={handleEditSave}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}
