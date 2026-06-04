# Afya Super Admin — Complete Fix Script
> One document. Every gap. Exact code to paste.
> Order = priority (must-have → should-have → nice-to-have)

---

## HOW TO USE THIS

Each section tells you:
- **What file to open**
- **Exactly what to add/change**
- **The exact code to paste**

Work top-to-bottom. Sections marked `[BACKEND]` need a backend PR first — skip them and come back.
Sections marked `[FRONTEND]` are unblocked right now.

---

## PART 0 — API Service Layer (do this first, everything depends on it)

### 0.1 [FRONTEND] Add all missing service functions

**File:** `services/facilities.service.ts` (or wherever your API calls live)

Add these functions:

```ts
// ─── PATCH facility (edit + convert trial + issue license) ───────────────────
export async function updateFacility(
  facilityId: number,
  body: Partial<{
    name: string;
    region: string;
    address: string;
    contact_number: string;
    license_plan: string;
    type: string;
  }>
) {
  const res = await api.patch(`/api/v1/facilities/${facilityId}`, body);
  return res.data;
}

// ─── Reject pending institution ──────────────────────────────────────────────
export async function rejectFacility(facilityId: number) {
  // Try PATCH /reject first; fall back to DELETE if backend uses that
  const res = await api.patch(`/api/v1/facilities/${facilityId}/reject`);
  return res.data;
}

// ─── Renew license ───────────────────────────────────────────────────────────
export async function renewLicense(
  facilityId: number,
  body: { new_license_plan: string; new_expiry_date: string }
) {
  const res = await api.post(`/api/v1/facilities/${facilityId}/renew`, body);
  return res.data;
}

// ─── Send renewal reminder email ─────────────────────────────────────────────
export async function sendRenewalReminder(facilityId: number) {
  const res = await api.post(`/api/v1/facilities/${facilityId}/send-renewal-email`);
  return res.data;
}
```

**File:** `services/users.service.ts`

```ts
// ─── Reactivate suspended user ───────────────────────────────────────────────
export async function reactivateUser(userId: number) {
  const res = await api.patch(`/api/v1/users/${userId}/activate`);
  return res.data;
}

// ─── Register new user ───────────────────────────────────────────────────────
export async function registerUser(body: {
  name: string;
  email: string;
  role: string;
  facility_id: number;
}) {
  const res = await api.post(`/api/v1/users/register`, body);
  return res.data;
}
```

**File:** `services/billing.service.ts` (create if doesn't exist)

```ts
export async function getBillingMonthlySummary() {
  const res = await api.get(`/api/v1/billing/monthly-summary`);
  return res.data;
}

export async function getBillingTimeline() {
  const res = await api.get(`/api/v1/billing/revenue-timeline`);
  return res.data;
}

export async function getBillingTransactions() {
  const res = await api.get(`/api/v1/billing/transactions`);
  return res.data;
}

export async function exportBillingCsv() {
  const res = await api.get(`/api/v1/billing/export-csv`, {
    responseType: 'blob',
  });
  triggerDownload(res.data, 'revenue-report.csv');
}
```

**File:** `services/analytics.service.ts` — add the missing functions:

```ts
// Add this if it doesn't already exist
export async function exportAnalyticsCsv() {
  const res = await api.get(`/api/v1/analytics/export-csv`, {
    responseType: 'blob',
  });
  triggerDownload(res.data, 'analytics-report.csv');
}

export async function getAdherenceByFacility() {
  const res = await api.get(`/api/v1/analytics/adherence/by-facility`);
  return res.data;
}

export async function exportAuditLogCsv() {
  const res = await api.get(`/api/v1/users/activity-logs/export-csv`, {
    responseType: 'blob',
  });
  triggerDownload(res.data, 'audit-log.csv');
}
```

**Add this helper** (put in `utils/download.ts` or at top of each service file):

```ts
export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

---

## PART 1 — Institution Management

### 1.1 [FRONTEND] Wire EditInstitutionModal into AdminShell

**File:** `AdminShell.tsx`

**Step 1 — Add import at top:**
```ts
import EditInstitutionModal from './components/modals/EditInstitutionModal';
```

**Step 2 — Add state near your other modal states:**
```ts
const [editingFacility, setEditingFacility] = useState<Facility | null>(null);
```

**Step 3 — Pass handler down to InstitutionsView:**
```tsx
<InstitutionsView
  facilities={facilities}
  onEdit={(facility) => setEditingFacility(facility)}   // ← add this
  // ...other existing props
/>
```

**Step 4 — Mount the modal (in your JSX, near other modals):**
```tsx
{editingFacility && (
  <EditInstitutionModal
    facility={editingFacility}
    onClose={() => setEditingFacility(null)}
    onSave={async (updates) => {
      await updateFacility(editingFacility.id, updates);
      await refreshFacilities(); // whatever your refetch is called
      setEditingFacility(null);
    }}
  />
)}
```

**File:** `InstitutionsView.tsx`

Find the Edit button and replace the toast with:
```tsx
// BEFORE:
onClick={() => toast(`Edit ${facility.name} — backend endpoint pending`)}

// AFTER:
onClick={() => onEdit(facility)}
```

---

### 1.2 [FRONTEND] Wire Reject button to real API call

**File:** `DashboardView.tsx`

Find the Reject button handler and replace:
```tsx
// BEFORE:
const handleReject = (facility: Facility) => {
  toast("Rejection sent");
};

// AFTER:
const handleReject = async (facility: Facility) => {
  try {
    await rejectFacility(facility.id);
    toast.success(`${facility.name} has been rejected`);
    await refreshFacilities();
  } catch (err) {
    toast.error("Failed to reject institution");
  }
};
```

---

### 1.3 [BACKEND] Add `type` to FacilityResponse

> ⛔ Needs backend work. Tell your backend: add `type: string` to the facility model and include it in every `FacilityResponse`. Valid values: `"Government" | "NGO" | "Hospital" | "Pharmacy" | "Employer"`.

**[FRONTEND] Once backend ships the field — remove all hardcoded "NGO" fallbacks:**

Search the codebase for:
```
"NGO"
```
Replace every hardcoded `"NGO"` fallback with:
```tsx
{facility.type ?? "—"}
```

---

### 1.4 [BACKEND] Add `field_worker_count` + `total_screened` to FacilityResponse

> ⛔ Needs backend work. These are per-facility aggregates.

**[FRONTEND] Update AdminShell once backend ships — find the TODO comment and replace:**
```ts
// BEFORE:
fieldWorkers: 0,  // TODO
screened: 0,      // TODO
onTreatment: 0,   // TODO
adherence: 0,     // TODO

// AFTER:
fieldWorkers: facility.field_worker_count ?? 0,
screened: facility.total_screened ?? 0,
onTreatment: facility.on_treatment_count ?? 0,
adherence: facility.adherence_rate ?? 0,
```

---

## PART 2 — License Management

### 2.1 [FRONTEND] Wire Renew button

**File:** `LicensesView.tsx`

```tsx
// BEFORE:
onClick={() => toast(`Renewal noted for ${facility.name} — backend endpoint pending`)}

// AFTER:
onClick={() => setRenewingFacility(facility)}
```

Add state:
```ts
const [renewingFacility, setRenewingFacility] = useState<Facility | null>(null);
```

Add a quick inline renewal modal (or a proper one if you have it):
```tsx
{renewingFacility && (
  <RenewLicenseModal
    facility={renewingFacility}
    onClose={() => setRenewingFacility(null)}
    onConfirm={async ({ plan, expiryDate }) => {
      await renewLicense(renewingFacility.id, {
        new_license_plan: plan,
        new_expiry_date: expiryDate,
      });
      toast.success(`License renewed for ${renewingFacility.name}`);
      setRenewingFacility(null);
      await refreshFacilities();
    }}
  />
)}
```

---

### 2.2 [FRONTEND] Wire Remind button

**File:** `LicensesView.tsx`

```tsx
// BEFORE:
onClick={() => toast(`Reminder queued for ${facility.name} — backend endpoint pending`)}

// AFTER:
const handleSendReminder = async (facility: Facility) => {
  try {
    await sendRenewalReminder(facility.id);
    toast.success(`Renewal reminder sent to ${facility.name}`);
  } catch {
    toast.error("Failed to send reminder");
  }
};
```

---

### 2.3 [FRONTEND] Fix ConvertTrialModal — stop calling the wrong endpoint

**File:** `ConvertTrialModal.tsx`

```tsx
// BEFORE (calling wrong endpoint):
await api.patch(`/api/v1/facilities/${facility.id}/suspend?active=true`);

// AFTER:
await updateFacility(facility.id, { license_plan: selectedPlan });
toast.success(`${facility.name} converted to ${selectedPlan}`);
```

---

### 2.4 [FRONTEND] Mount LicenseViewModal — zero backend work needed

**File:** `AdminShell.tsx`

**Step 1 — Import:**
```ts
import LicenseViewModal from './components/modals/LicenseViewModal';
```

**Step 2 — Add state:**
```ts
const [viewingLicense, setViewingLicense] = useState<Facility | null>(null);
```

**Step 3 — Pass down to LicensesView:**
```tsx
<LicensesView
  onViewLicense={(facility) => setViewingLicense(facility)}
  // ...rest
/>
```

**Step 4 — Mount modal:**
```tsx
{viewingLicense && (
  <LicenseViewModal
    facility={viewingLicense}
    onClose={() => setViewingLicense(null)}
  />
)}
```

**File:** `LicensesView.tsx` — wire the View button:
```tsx
// BEFORE:
onClick={() => toast(`${facility.name} license details`)}

// AFTER:
onClick={() => onViewLicense(facility)}
```

---

### 2.5 + 2.6 [BACKEND] Add seat/date/payment fields to FacilityResponse

> ⛔ Tell backend to add: `seats`, `seats_used`, `license_starts_at`, `license_amount`, `payment_method`

**[FRONTEND] Once shipped — update LicensesView KPI card:**
```tsx
// Seat Utilisation card:
const seatUtil = facilities.reduce((acc, f) => acc + (f.seats_used ?? 0), 0);
const seatTotal = facilities.reduce((acc, f) => acc + (f.seats ?? 0), 0);
const utilPct = seatTotal > 0 ? Math.round((seatUtil / seatTotal) * 100) : 0;

// Display:
<KpiCard label="Seat Utilisation" value={`${utilPct}%`} />
```

---

## PART 3 — Revenue (ALL currently broken)

### 3.1 [FRONTEND] Restore Revenue page from real billing API

**File:** `RevenueView.tsx`

Replace the placeholder billing section with:

```tsx
const [monthlySummary, setMonthlySummary] = useState<any>(null);
const [timeline, setTimeline] = useState<any[]>([]);
const [transactions, setTransactions] = useState<any[]>([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  async function loadBillingData() {
    try {
      const [summary, tl, txns] = await Promise.all([
        getBillingMonthlySummary(),
        getBillingTimeline(),
        getBillingTransactions(),
      ]);
      setMonthlySummary(summary);
      setTimeline(tl);
      setTransactions(txns);
    } catch (err) {
      // billing API not yet available — show empty state, not fake data
      console.warn('Billing API not available:', err);
    } finally {
      setLoading(false);
    }
  }
  loadBillingData();
}, []);
```

Replace placeholder bars with real chart data:
```tsx
// Revenue KPI:
<KpiCard
  label="Revenue This Month"
  value={monthlySummary ? `GHS ${monthlySummary.total?.toLocaleString()}` : '—'}
/>

// Timeline chart — pass `timeline` to your chart component instead of mock data:
<RevenueChart data={timeline} />

// Transaction table — render `transactions` array instead of facilities proxy:
{transactions.map((txn) => (
  <tr key={txn.id}>
    <td>{txn.institution_name}</td>
    <td>{txn.type}</td>
    <td>{txn.plan}</td>
    <td>GHS {txn.amount?.toLocaleString()}</td>
    <td>{formatDate(txn.payment_date)}</td>
    <td>{txn.payment_method}</td>
    <td>{txn.period}</td>
    <td><StatusBadge status={txn.status} /></td>
  </tr>
))}
```

### 3.3 [FRONTEND] Wire Revenue Export button

**File:** `RevenueView.tsx`

```tsx
// BEFORE:
onClick={() => toast("Revenue report exported")}

// AFTER:
onClick={async () => {
  try {
    await exportBillingCsv();
  } catch {
    toast.error("Export failed — billing API not yet available");
  }
}}
```

---

## PART 4 — Users

### 4.1 [FRONTEND] Enable Reactivate button

**File:** `UsersView.tsx`

```tsx
// BEFORE:
<button disabled title="Reactivate endpoint not yet available">Reactivate</button>

// AFTER:
<button
  onClick={async () => {
    await reactivateUser(user.id);
    toast.success(`${user.name} reactivated`);
    await refreshUsers();
  }}
>
  Reactivate
</button>
```

---

### 4.2 [FRONTEND] Add "Add User" button + modal

**File:** `UsersView.tsx`

Add button to the page header:
```tsx
<button onClick={() => setShowAddUser(true)} className="btn-primary">
  + Add User
</button>
```

Add state:
```ts
const [showAddUser, setShowAddUser] = useState(false);
```

Add modal (create `AddUserModal.tsx` if it doesn't exist):
```tsx
{showAddUser && (
  <AddUserModal
    facilities={facilities}
    onClose={() => setShowAddUser(false)}
    onSave={async (data) => {
      await registerUser(data);
      toast.success("User created");
      setShowAddUser(false);
      await refreshUsers();
    }}
  />
)}
```

**`AddUserModal.tsx`** — minimal implementation:
```tsx
export default function AddUserModal({ facilities, onClose, onSave }) {
  const [form, setForm] = useState({
    name: '', email: '', role: 'field_worker', facility_id: 0
  });

  return (
    <Modal title="Add New User" onClose={onClose}>
      <input placeholder="Full Name" value={form.name}
        onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
      <input placeholder="Email" type="email" value={form.email}
        onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
      <select value={form.role}
        onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
        <option value="field_worker">Field Worker</option>
        <option value="facility_admin">Facility Admin</option>
        <option value="super_admin">Super Admin</option>
      </select>
      <select value={form.facility_id}
        onChange={e => setForm(f => ({ ...f, facility_id: Number(e.target.value) }))}>
        <option value={0}>Select Institution</option>
        {facilities.map(f => (
          <option key={f.id} value={f.id}>{f.name}</option>
        ))}
      </select>
      <button onClick={() => onSave(form)}>Create User</button>
    </Modal>
  );
}
```

---

### 4.3 [FRONTEND] Resolve Institution name in Users table — zero backend work

**File:** `AdminShell.tsx` — pass facilities into UsersView:
```tsx
<UsersView
  users={users}
  facilities={facilities}   // ← add this prop
  // ...rest
/>
```

**File:** `UsersView.tsx` — accept prop and do lookup:
```tsx
// Add to props:
facilities: Facility[];

// In the Institution column, replace:
<td>#{user.facility_id}</td>

// With:
<td>{facilities.find(f => f.id === user.facility_id)?.name ?? `#${user.facility_id}`}</td>
```

---

### 4.4 [BACKEND] Add `last_login` to UserResponse

> ⛔ Backend needs to add `last_login: string | null` to `GET /api/v1/users/`

**[FRONTEND] Once shipped — re-add the column:**
```tsx
// In the Users table header, add:
<th>Last Login</th>

// In each user row, add:
<td>{user.last_login ? formatDate(user.last_login) : '—'}</td>
```

---

## PART 5 — Analytics (Restore Removed Sections)

These sections were **removed** when mocks were stripped. They need to come back, fed by real API data.

### 5.1 [FRONTEND] Restore Hypertension by Region section

**File:** `AnalyticsView.tsx`

The analytics summary endpoint should already return region data once backend adds it. Add this section back:

```tsx
{/* ── Hypertension by Region ──────────────────────────── */}
<section className="analytics-section">
  <h3>Hypertension by Region</h3>
  {analyticsData?.region_breakdown?.length ? (
    <div className="bar-group">
      {analyticsData.region_breakdown.map((region) => (
        <RegionBar
          key={region.region}
          label={region.region}
          screened={region.screened}
          highBp={region.high_bp}
        />
      ))}
    </div>
  ) : (
    <EmptyState message="Regional breakdown not yet available" />
  )}
</section>
```

> Tell backend to add `region_breakdown: Array<{region: string, screened: number, high_bp: number}>` to `GET /api/v1/analytics/summary`

---

### 5.2 [FRONTEND] Restore Age Distribution section

```tsx
{/* ── Age Distribution of High-BP Patients ───────────── */}
<section className="analytics-section">
  <h3>Age Distribution of High-BP Patients</h3>
  {analyticsData?.age_distribution ? (
    <AgeDistributionChart data={analyticsData.age_distribution} />
  ) : (
    <EmptyState message="Age distribution data not yet available" />
  )}
</section>
```

Expected shape from backend: `age_distribution: { "18-30": 120, "31-45": 340, "46-60": 210, "60+": 95 }`

---

### 5.3 [FRONTEND] Restore BP Risk by Gender section

```tsx
{/* ── BP Risk by Gender ───────────────────────────────── */}
<section className="analytics-section">
  <h3>BP Risk by Gender</h3>
  {analyticsData?.gender_stats ? (
    <GenderRiskChart data={analyticsData.gender_stats} />
  ) : (
    <EmptyState message="Gender breakdown not yet available" />
  )}
</section>
```

---

### 5.4 [FRONTEND] Fix Risk Level Trend — remove static fallback

**File:** `AnalyticsView.tsx` and/or `RiskTrendChart.tsx`

Find where `RISK_TREND_DATA` constant is used and remove the fake fallback:

```tsx
// BEFORE:
const riskData = bpDist?.length ? bpDist : RISK_TREND_DATA;

// AFTER:
const riskData = bpDist ?? [];
// Show empty state if empty — NEVER fall back to mock data
```

In `RiskTrendChart.tsx`:
```tsx
if (!data.length) {
  return <EmptyState message="Risk trend data not yet available from API" />;
}
```

---

### 5.5 [FRONTEND] Fix Detection Rate Trend — remove static fallback

**File:** `AnalyticsView.tsx`

```tsx
// BEFORE:
const detectionData = bpDist?.length ? computeDetection(bpDist) : DETECTION_RATE_TREND;

// AFTER:
const detectionData = bpDist?.length ? computeDetection(bpDist) : [];
```

---

### 5.6 [FRONTEND] Restore Per-Facility Adherence table

```tsx
{/* ── Follow-up & Adherence Rates by Institution ──────── */}
<section className="analytics-section">
  <h3>Follow-up & Adherence Rates by Institution</h3>
  {adherenceData?.length ? (
    <AdherenceTable rows={adherenceData} />
  ) : (
    <EmptyState message="Adherence data not yet available" />
  )}
</section>
```

Add to your `useEffect` data-loading:
```ts
const adherenceData = await getAdherenceByFacility().catch(() => []);
```

---

### 5.7 [FRONTEND] Wire "Export Report" on Dashboard — zero backend work

**File:** `DashboardView.tsx`

```tsx
// BEFORE:
onClick={() => toast("Report generating…")}

// AFTER:
onClick={async () => {
  try {
    await exportAnalyticsCsv();
  } catch {
    toast.error("Export failed");
  }
}}
```

---

## PART 6 — Audit Log

### 6.1 [FRONTEND] Fix Audit Export — currently downloads wrong file

**File:** `AuditView.tsx`

```tsx
// BEFORE (downloads screening CSV — wrong):
onClick={() => api.get('/api/v1/analytics/export-csv')}

// AFTER (downloads audit log CSV):
onClick={async () => {
  try {
    await exportAuditLogCsv();
  } catch {
    toast.error("Audit export failed");
  }
}}
```

---

### 6.2 [BACKEND] Add `agent_name` to AgentActivityLogResponse

> ⛔ Tell backend to add `agent_name: string` to every entry in `GET /api/v1/users/activity-logs/`

**[FRONTEND] Once shipped — update audit log rendering:**
```tsx
// BEFORE:
<td>{log.action} — {log.details}</td>

// AFTER:
<td>
  <span className="font-medium">{log.agent_name ?? `Agent #${log.agent_id}`}</span>
  {' '}{log.action}
</td>
```

---

## PART 7 — Modals

### 7.1 [FRONTEND] Fix IssueLicenseModal — stop creating new facility

**File:** `IssueLicenseModal.tsx`

The modal must show a dropdown of **existing** facilities, not a text field:

```tsx
// Replace the free-text institution input with:
<select
  value={selectedFacilityId}
  onChange={e => setSelectedFacilityId(Number(e.target.value))}
>
  <option value={0}>Select institution...</option>
  {facilities.map(f => (
    <option key={f.id} value={f.id}>{f.name}</option>
  ))}
</select>

// On confirm — PATCH the existing facility, don't POST a new one:
const handleConfirm = async () => {
  if (!selectedFacilityId || !selectedPlan) return;
  await updateFacility(selectedFacilityId, { license_plan: selectedPlan });
  toast.success("License issued");
  onClose();
  await refreshFacilities();
};
```

Remove the `POST /api/v1/facilities/` call entirely from this modal.

---

### 7.2 [FRONTEND] Fix CreateInstitutionModal — stop silently dropping 4 fields

**File:** `CreateInstitutionModal.tsx`

The form already collects these — just add them to the payload:

```tsx
// BEFORE (payload missing fields):
const payload: FacilityCreateWithoutUser = {
  name: form.name,
  region: form.region,
  email: form.email,
};

// AFTER:
const payload = {
  name: form.name,
  region: form.region,
  email: form.email,
  type: form.institutionType,           // ← add
  contact_number: form.adminPhone,      // ← add
  seats: Number(form.fieldWorkerSeats), // ← add
  notes: form.notes,                    // ← add
};
```

> ⚠️ Backend also needs to accept these fields in `POST /api/v1/facilities/` — tell them to update the schema.

---

### 7.3 [FRONTEND] Fix Onboarding Token — show real token after creation

**File:** `CreateInstitutionModal.tsx`

```tsx
// BEFORE:
const token = `AFYA-XXXX-XXXX-XXXX`; // generated client-side before API call

// AFTER — call the API first, then use the token from the response:
const handleCreate = async () => {
  const createdFacility = await createFacility(payload);
  const realToken = createdFacility.setup_token ?? 'TOKEN-PENDING';
  setEmailPreview({ ...emailPreview, token: realToken });
  // Now show the email preview modal
};
```

> Backend needs to add `setup_token: string` to `POST /api/v1/facilities/` response.

---

## PART 8 — Settings

### 8.1 [FRONTEND] Load WhatsApp config from API instead of hardcode

**File:** `SettingsView.tsx`

```tsx
const [whatsappConfig, setWhatsappConfig] = useState<any>(null);

useEffect(() => {
  api.get('/api/v1/settings/whatsapp')
    .then(res => setWhatsappConfig(res.data))
    .catch(() => {/* endpoint pending — keep current static display */});
}, []);

// Replace hardcoded strings:
// BEFORE:
<span>360dialog (Active)</span>
<span>+233 XX XXXX XXXX</span>
<span>99.1%</span>

// AFTER:
<span>{whatsappConfig?.bsp_name ?? '360dialog (Active)'}</span>
<span>{whatsappConfig?.business_number ?? '+233 XX XXXX XXXX'}</span>
<span>{whatsappConfig?.delivery_rate ?? '—'}</span>
```

---

### 8.2 [FRONTEND] Load WhatsApp templates from API

**File:** `SettingsView.tsx`

```tsx
const [templates, setTemplates] = useState<any[]>([]);

useEffect(() => {
  api.get('/api/v1/templates/')
    .then(res => setTemplates(res.data))
    .catch(() => {/* endpoint pending */});
}, []);

// Render templates:
{templates.map(t => (
  <div key={t.id} className="template-row">
    <span>{t.name}</span>
    <span>{t.content}</span>
    <button onClick={() => handleEditTemplate(t)}>Edit</button>
  </div>
))}

// Edit handler:
const handleEditTemplate = async (template: any) => {
  const updated = await promptUserForEdit(template); // your edit UI
  await api.put(`/api/v1/templates/${template.id}`, updated);
  toast.success("Template updated");
};
```

---

### 8.3 [FRONTEND] Wire Compliance Report button

**File:** `SettingsView.tsx`

```tsx
// BEFORE:
onClick={() => toast("Compliance report generated")}

// AFTER:
onClick={async () => {
  try {
    const res = await api.get('/api/v1/compliance/report', { responseType: 'blob' });
    triggerDownload(res.data, 'compliance-report.pdf');
  } catch {
    toast.error("Compliance report not yet available");
  }
}}
```

---

## PART 9 — Backend Ticket Summary

Hand this to your backend developer:

### 🔴 Tier 1 — Blocking (ship this sprint)

| # | Endpoint | What changes |
|---|----------|-------------|
| B1 | `PATCH /api/v1/facilities/{id}` | Accept `name, region, address, contact_number, license_plan, type` |
| B2 | `PATCH /api/v1/users/{id}/activate` | Reactivate suspended user |
| B3 | `PATCH /api/v1/facilities/{id}/reject` | Mark pending institution as rejected |
| B4 | Add `type: string` to `FacilityResponse` | All "NGO" hardcodes gone |
| B5 | Add `last_login: string\|null` to `UserResponse` | Users table column restored |
| B6 | Add `agent_name: string` to `AgentActivityLogResponse` | Audit log readable |
| B7 | Add `setup_token: string` to `POST /facilities/` response | Real token in onboarding |
| B8 | `POST /api/v1/facilities/` must accept `type, contact_number, seats, notes` | Stop dropping form fields |

### 🟠 Tier 2 — Should-have (next sprint)

| # | Endpoint | What it unlocks |
|---|----------|----------------|
| B9 | `POST /api/v1/facilities/{id}/renew` | Renew license button |
| B10 | `POST /api/v1/facilities/{id}/send-renewal-email` | Reminder button |
| B11 | `GET /api/v1/billing/monthly-summary` | Revenue This Month KPI |
| B12 | `GET /api/v1/billing/revenue-timeline` | Monthly revenue chart |
| B13 | `GET /api/v1/billing/transactions` | Transaction history table |
| B14 | `GET /api/v1/users/activity-logs/export-csv` | Audit export correct file |
| B15 | Add `field_worker_count, total_screened` to `FacilityResponse` | Dashboard all-zeros |
| B16 | Add `seats, seats_used` to `FacilityResponse` | Seat utilisation KPI |
| B17 | Add `region_breakdown, age_distribution, gender_stats` to analytics summary | 3 missing analytics sections |
| B18 | `GET /api/v1/analytics/adherence/by-facility` | Adherence table restored |

### 🔵 Tier 3 — Nice-to-have

| # | Endpoint |
|---|----------|
| B19 | `GET /api/v1/billing/export-csv` |
| B20 | `GET /api/v1/settings/whatsapp` |
| B21 | `GET /api/v1/compliance/report` |
| B22 | `GET /api/v1/analytics/detection-rate-trend` |

---

## QUICK WINS CHECKLIST (no backend needed, do today)

- [ ] **4.3** — Resolve institution name in Users table (pass `facilities` prop, do `.find()`)
- [ ] **2.4** — Mount `LicenseViewModal` — file already exists, just import it
- [ ] **9.1** — Mount `EditInstitutionModal` — file already exists, just import it
- [ ] **5.7 / 7.3** — Wire Dashboard Export button to `exportAnalyticsCsv()`
- [ ] **2.3** — Fix ConvertTrialModal to call `PATCH /facilities/{id}` not suspend endpoint
- [ ] **7.1** — Fix IssueLicenseModal to use dropdown + PATCH instead of POST new facility
- [ ] **7.2** — Add the 4 dropped fields to CreateInstitutionModal payload
- [ ] **5.4 / 5.5** — Remove `RISK_TREND_DATA` and `DETECTION_RATE_TREND` static fallbacks
- [ ] **6.1** — Fix Audit export to call `/users/activity-logs/export-csv` not analytics CSV

---

*Generated from full audit of MISSING_ENDPOINTS.md — June 2026*