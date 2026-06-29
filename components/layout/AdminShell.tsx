'use client';

import { useState, useCallback, useMemo } from 'react';
import Sidebar, { type SidebarStats } from './Sidebar';
import Topbar from './Topbar';
import Toast from '@/components/shared/Toast';
import DashboardView from '@/components/dashboard/DashboardView';
import InstitutionsView from '@/components/organisations/OrganisationsView';
import DemoRequestsView from '@/components/demo/DemoRequestsView';
import LicensesView from '@/components/licenses/LicensesView';
import AnalyticsView from '@/components/analytics/AnalyticsView';
import RevenueView from '@/components/revenue/RevenueView';
import UsersView from '@/components/users/UsersView';
import AuditView from '@/components/audit/AuditView';
import SettingsView from '@/components/settings/SettingsView';
import AddFacilityModal from '@/components/modals/AddFacilityModal';
import AddInstitutionModal from '@/components/modals/AddInstitutionModal';
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
  EditInstitutionForm,
} from '@/types';
import type {
  FacilityResponse,
  TopInstitutionItem,
} from '@/types/api';

export default function AdminShell() {
  const [activeView, setActiveView] = useState<ViewId>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { toast, showToast } = useToast();

  // ─── Live API data ────────────────────────────────────────────────────────
  const {
    facilities,
    loading: facilitiesLoading,
    suspend,
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
  const addFacilityModal    = useModal();
  const addInstitutionModal = useModal();
  const convertModal        = useModal();
  const issueLicenseModal   = useModal();

  const [convertInstName, setConvertInstName]   = useState('');
  const [convertInstId, setConvertInstId]       = useState('');
  const [editingFacility, setEditingFacility]   = useState<FacilityResponse | null>(null);
  // Increment to force LicensesView to reload after issuing a license
  const [licenseRefreshKey, setLicenseRefreshKey] = useState(0);

  const topInstitutions = useMemo<TopInstitutionItem[]>(
    () => dashboardData?.topInstitutions ?? [],
    [dashboardData],
  );

  // ─── Sidebar stats ────────────────────────────────────────────────────────
  const sidebarStats: SidebarStats = useMemo(() => ({
    totalFacilities:   facilities.filter((f) => f._entity_type === 'facility' || !f._entity_type).length,
    totalInstitutions: facilities.filter((f) => f._entity_type === 'institution').length,
    activeLicenses:    dashboardData?.activeInstitutions ?? 0,
    // Use the dashboard API summary — it counts ALL screened patients across the
    // entire platform, not just the total_screened field stored on each facility
    // record (which can be 0 for organisations that screen via events/field workers).
    totalScreened:     dashboardData?.totalScreened ?? 0,
    onTreatment:       dashboardData?.onActiveTreatment ?? 0,
    pendingApproval:   0,
  }), [facilities, dashboardData]);

  // ─── Navigation ───────────────────────────────────────────────────────────
  const handleNavigate = useCallback((view: ViewId) => {
    setActiveView(view);
    setSidebarOpen(false);
  }, []);

  // ─── Suspend / reactivate ─────────────────────────────────────────────────
  const handleSuspend = useCallback(
    async (id: string, isActive: boolean, name: string) => {
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
    async (id: string, name: string) => {
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
      console.log('Editing institution id:', editingFacility?.id);
      if (!editingFacility) return;
      try {
        await update(editingFacility.id, {
          name:         data.name || undefined,
          type:         data.type || undefined,
          region:       data.region || undefined,
          contact_name: data.contact || undefined,
          email:        data.email || undefined,
          license_plan: data.plan || undefined,
          seats:        data.seats ? Number(data.seats) : undefined,
        });
        showToast(`${data.name} updated`, 'success');
        await refetchFacilities();
        setEditingFacility(null);
      } catch {
        showToast('Failed to save changes — try again', 'warn');
      }
    },
    [editingFacility, update, showToast, refetchFacilities],
  );

  // ─── Create institution ───────────────────────────────────────────────────
  // ─── Create institution — two-step modal now handles API calls internally ──
  // CreateInstitutionModal calls registerInstitution() + registerFacility() directly.
  // AdminShell only needs to refresh lists when the modal reports success.
  const handleOrgComplete = useCallback(() => {
    refetchFacilities();
    refetchDashboard();
  }, [refetchFacilities, refetchDashboard]);

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

  // ─── Issue license — PUT /super-admin/institutions/{id} ──────────────────
  // NEVER use POST /super-admin/licenses here — that creates a duplicate record.
  const handleIssueLicense = useCallback(
    async (data: { facilityId: string; plan: string; seats: number | null; startDate: string; paymentMethod: string; notes: string }) => {
      if (!data.facilityId || !data.plan) {
        showToast('Please select an institution and plan', 'warn');
        return;
      }
      try {
        const facility = facilities.find((f) => f.id === data.facilityId);
        const name = facility?.name ?? `Institution #${data.facilityId}`;

        // Update the existing institution's license plan and seat count
        await update(data.facilityId, {
          license_plan: data.plan,
          ...(data.seats != null ? { seats: data.seats } : {}),
        });

        console.log('[IssueLicense] Updated', name, '— plan:', data.plan, 'seats:', data.seats, 'start:', data.startDate, 'method:', data.paymentMethod, 'notes:', data.notes);
        showToast(`✓ License updated for ${name}`, 'success');
        refetchFacilities();
        setLicenseRefreshKey((k) => k + 1);
      } catch (err: unknown) {
        const status = (err as { response?: { status?: number } }).response?.status;
        console.error('[IssueLicense] Failed:', status, err);
        throw err; // re-throw so the modal can show its own error state
      }
    },
    [facilities, update, showToast, refetchFacilities],
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
      <Topbar onMenuToggle={() => setSidebarOpen(v => !v)} />
      <div className="app-body">
        {/* Mobile backdrop */}
        <div
          className={`sidebar-backdrop${sidebarOpen ? ' open' : ''}`}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
        <Sidebar
          activeView={activeView}
          onNavigate={handleNavigate}
          pendingCount={0}
          stats={sidebarStats}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="main">
          {/* Dashboard */}
          <div className={`view${activeView === 'dashboard' ? ' active' : ''}`}>
            <DashboardView
              onViewAllInstitutions={() => handleNavigate('institutions')}
              onViewDemoRequests={() => handleNavigate('demo-requests')}
              onToast={showToast}
              onExportReport={handleDashboardExport}
              topInstitutions={topInstitutions}
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

          {/* Organisations (Facilities + Institutions) */}
          <div className={`view${activeView === 'institutions' ? ' active' : ''}`}>
            <InstitutionsView
              facilities={facilities}
              loading={facilitiesLoading}
              onAddFacility={addFacilityModal.open}
              onAddInstitution={addInstitutionModal.open}
              onToast={showToast}
              onRefresh={refetchFacilities}
            />
          </div>

          {/* Demo Requests — self-contained, uses own hook */}
          <div className={`view${activeView === 'demo-requests' ? ' active' : ''}`}>
            <DemoRequestsView onToast={showToast} />
          </div>

          {/* Licenses — self-contained, uses own API calls */}
          <div className={`view${activeView === 'licenses' ? ' active' : ''}`}>
            <LicensesView
              onToast={showToast}
              refreshKey={licenseRefreshKey}
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
      <AddFacilityModal
        isOpen={addFacilityModal.isOpen}
        onClose={addFacilityModal.close}
        onComplete={handleOrgComplete}
        onToast={showToast}
      />

      <AddInstitutionModal
        isOpen={addInstitutionModal.isOpen}
        onClose={addInstitutionModal.close}
        onComplete={handleOrgComplete}
        onToast={showToast}
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
            plan:    editingFacility.license_plan ?? editingFacility.plan ?? '',
            seats:   (editingFacility.seats ?? editingFacility.max_seats) != null
                       ? String(editingFacility.seats ?? editingFacility.max_seats)
                       : '',
          }}
          onSave={handleEditSave}
        />
      )}

      <Toast toast={toast} />
    </>
  );
}
