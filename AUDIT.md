# Afya Super Admin — Implementation Audit
> Generated: June 2026 | Reflects actual codebase state after all frontend work
> Backend: `https://afya-backend-production.up.railway.app`

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | **Done** — fully wired to real API, no stubs |
| 🟡 | **Partial** — wired but missing data fields from backend response |
| 🟠 | **Frontend done, backend pending** — service/hook/UI is built, but endpoint doesn't exist yet |
| 🔴 | **Not done** — backend endpoint missing AND frontend shows stub/empty |
| ⬛ | **Not applicable** — intentionally static or no API needed |

---

## PART 1 — Services (API Call Layer)

### `services/facilities.service.ts`

| Function | Endpoint | Status |
|----------|----------|--------|
| `listFacilities()` | `GET /api/v1/facilities/` | ✅ |
| `getFacility(id)` | `GET /api/v1/facilities/{id}` | ✅ |
| `createFacility(payload)` | `POST /api/v1/facilities/` | ✅ |
| `suspendFacility(id, active)` | `PATCH /api/v1/facilities/{id}/suspend` | ✅ |
| `updateFacility(id, body)` | `PATCH /api/v1/facilities/{id}` | 🟠 Backend endpoint needed |
| `rejectFacility(id)` | `PATCH /api/v1/facilities/{id}/reject` | 🟠 Backend endpoint needed |
| `renewLicense(id, body)` | `POST /api/v1/facilities/{id}/renew` | 🟠 Backend endpoint needed |
| `sendRenewalReminder(id)` | `POST /api/v1/facilities/{id}/send-renewal-email` | 🟠 Backend endpoint needed |

---

### `services/users.service.ts`

| Function | Endpoint | Status |
|----------|----------|--------|
| `listUsers()` | `GET /api/v1/users/` | ✅ |
| `deactivateUser(id)` | `PATCH /api/v1/users/{id}/deactivate` | ✅ |
| `reactivateUser(id)` | `PATCH /api/v1/users/{id}/activate` | 🟠 Backend endpoint needed |
| `registerUser(body)` | `POST /api/v1/users/register` | ✅ (endpoint exists in Swagger) |
| `listActivityLogs(skip, limit)` | `GET /api/v1/users/activity-logs` | ✅ |
| `exportAuditLogCsv()` | `GET /api/v1/users/activity-logs/export-csv` | 🟠 Backend endpoint needed |

---

### `services/analytics.service.ts`

| Function | Endpoint | Status |
|----------|----------|--------|
| `getDashboardSummary()` | `GET /api/v1/analytics/summary` | ✅ |
| `getScreeningTimeline(period)` | `GET /api/v1/analytics/timeline` | ✅ |
| `getAdherenceStats()` | `GET /api/v1/analytics/adherence` | ✅ |
| `getReferralStats()` | `GET /api/v1/analytics/referrals` | ✅ |
| `exportAnalyticsCsv()` | `GET /api/v1/analytics/export-csv` | ✅ |
| `getAdherenceByFacility()` | `GET /api/v1/analytics/adherence/by-facility` | 🟠 Backend endpoint needed |

---

### `services/billing.service.ts`

| Function | Endpoint | Status |
|----------|----------|--------|
| `getBillingMonthlySummary()` | `GET /api/v1/billing/monthly-summary` | 🔴 Endpoint not built |
| `getBillingTimeline()` | `GET /api/v1/billing/revenue-timeline` | 🔴 Endpoint not built |
| `getBillingTransactions()` | `GET /api/v1/billing/transactions` | 🔴 Endpoint not built |
| `exportBillingCsv()` | `GET /api/v1/billing/export-csv` | 🔴 Endpoint not built |

> ⚠️ The billing service is fully written and imported — it will work the moment the backend ships these endpoints.

---

## PART 2 — Pages & Views

### Dashboard (`components/dashboard/DashboardView.tsx`)

| Feature | Status | Notes |
|---------|--------|-------|
| Active Institutions KPI | ✅ | From `facilities.length` (active) |
| Total Screened KPI | ✅ | From `GET /api/v1/analytics/summary` → `total_screened` |
| On Active Treatment KPI | ✅ | From `GET /api/v1/analytics/adherence` → `enrolled_patients` |
| Pending Approval KPI + count | ✅ | Derived from inactive facilities |
| Screening Volume chart | ✅ | From `GET /api/v1/analytics/timeline` → grouped by month |
| BP Category Distribution chart | ✅ | From `GET /api/v1/analytics/summary` → `bp_distribution_percentages` |
| Pending Approvals table | ✅ | From facilities list (inactive), always visible |
| ✓ Approve button | ✅ | Calls `PATCH /api/v1/facilities/{id}/suspend?active=true` |
| ✕ Reject button | 🟠 | Wired to `rejectFacility()` — backend endpoint needed |
| Top Institutions table — name/type/license | ✅ | From facilities list |
| Top Institutions — Field Workers column | 🟡 | Shows `—`; `field_worker_count` missing from `FacilityResponse` |
| Top Institutions — Screened column | 🟡 | Shows `—`; `total_screened` missing from `FacilityResponse` |
| Top Institutions — On Treatment column | 🟡 | Shows `—`; `on_treatment_count` missing from `FacilityResponse` |
| Top Institutions — Adherence column | 🟡 | Shows `—`; `adherence_rate` missing from `FacilityResponse` |
| Export Report button | ✅ | Calls `GET /api/v1/analytics/export-csv` |
| Institution Type badges | 🟡 | Name-heuristic fallback; `type` field missing from `FacilityResponse` |

---

### Institution Management (`components/institutions/InstitutionsView.tsx`)

| Feature | Status | Notes |
|---------|--------|-------|
| Institutions table | ✅ | Live from `GET /api/v1/facilities/` |
| Search by name/region | ✅ | Client-side filter |
| All Types dropdown filter | ✅ | Client-side filter (heuristic type detection) |
| All Statuses dropdown filter | ✅ | Client-side filter |
| Type column badge | 🟡 | Name-based heuristic — `type` field missing from `FacilityResponse` |
| Field Workers column | 🟡 | Shows `—`; `field_worker_count` missing from `FacilityResponse` |
| Total Screened column | 🟡 | Shows `—`; `total_screened` missing from `FacilityResponse` |
| License Expires column | ✅ | From `license_expires_at` |
| Status badges | ✅ | Derived from `is_active` + `license_plan` + `license_expires_at` |
| Edit button | 🟠 | Modal opens, `PATCH /api/v1/facilities/{id}` endpoint needed |
| Suspend button | ✅ | Calls `PATCH /api/v1/facilities/{id}/suspend?active=false` |
| Reactivate button | ✅ | Calls `PATCH /api/v1/facilities/{id}/suspend?active=true` |
| ✓ Approve button (Pending) | ✅ | Calls suspend endpoint with `active=true` |
| ✓ Approve button (Trial) | ✅ | Calls suspend endpoint with `active=true` |
| Extend button (Trial) | ⬛ | Shows toast — no backend endpoint for trial extension |
| + Add Institution button | ✅ | Opens CreateInstitutionModal |

---

### License Management (`components/licenses/LicensesView.tsx`)

| Feature | Status | Notes |
|---------|--------|-------|
| License Registry table | ✅ | Derived from `GET /api/v1/facilities/` |
| Plan column | ✅ | From `license_plan` |
| Field Workers (seats) column | 🟡 | Parsed from plan name string; `seats` field missing from `FacilityResponse` |
| Start Date column | 🟡 | Uses `created_at` as proxy; `license_starts_at` missing |
| Expiry column | ✅ | From `license_expires_at` |
| Amount (GHS) column | 🟡 | Derived from plan name lookup; `license_amount` missing |
| Status badges | ✅ | Derived logic (Active/Expiring/Trial/Suspended/Pending) |
| Active Licenses KPI | ✅ | Counted from derived statuses |
| Expiring in 30 Days KPI | ✅ | Counted from derived statuses |
| Seat Utilisation KPI | 🟡 | Shows `—`; `seats`/`seats_used` missing from `FacilityResponse` |
| Renew button (Active) | 🟠 | Modal built and wired; `POST /api/v1/facilities/{id}/renew` needed |
| Remind button (Expiring) | 🟠 | Wired; `POST /api/v1/facilities/{id}/send-renewal-email` needed |
| View button (Active/Expiring) | ✅ | Opens `LicenseViewModal` — no API call needed |
| Convert to Paid button (Trial) | 🟠 | Calls `updateFacility(id, {license_plan})` — `PATCH /facilities/{id}` needed |
| Issue License button | 🟠 | Modal uses facility dropdown; `PATCH /facilities/{id}` needed |

---

### Platform Analytics (`components/analytics/AnalyticsView.tsx`)

| Feature | Status | Notes |
|---------|--------|-------|
| Total Screened KPI | ✅ | From `GET /api/v1/analytics/summary` → `total_screened` |
| Hypertension Detected KPI | ✅ | Computed from `bp_distribution_counts` |
| Referred to Facility KPI | ✅ | From `GET /api/v1/analytics/referrals` → `total_referred` |
| Follow-up Completed KPI | ✅ | From `referrals` → `converted_to_intake` |
| Hypertension by Region section | 🔴 | UI built; `region_breakdown` not in `GET /api/v1/analytics/summary` yet |
| Age Distribution section | 🔴 | UI built; `age_distribution` not in summary yet |
| Risk Level Trend chart | 🔴 | UI built; `monthly_risk_breakdown` not in summary yet |
| BP Risk by Gender section | 🔴 | UI built; `gender_stats` not in summary yet |
| Detection Rate Trend chart | 🔴 | UI built; `detection_rate_trend` not in summary yet |
| Follow-up & Adherence table | 🔴 | UI built; `facility_adherence` not in summary yet |
| Export Report button | ✅ | Calls `GET /api/v1/analytics/export-csv` |

---

### Revenue (`components/revenue/RevenueView.tsx`)

| Feature | Status | Notes |
|---------|--------|-------|
| Total Revenue KPI | 🟡 | Derived from plan name lookup — no real payment data |
| Revenue This Month KPI | 🔴 | Shows `—`; `GET /api/v1/billing/monthly-summary` not built |
| Renewals Due KPI | 🟡 | Derived from expiring facilities — no real payment amounts |
| Annual Run Rate KPI | 🟡 | Same as total revenue — derived from plan names |
| Monthly Revenue chart | 🔴 | Shows empty state; `GET /api/v1/billing/revenue-timeline` not built |
| Revenue by Institution Type chart | 🟡 | Groups by plan tier (Enterprise/Standard) — no real `type` field |
| Transaction History table | 🟡 | Shows facilities proxy — no real payment dates/methods |
| Export Report button | 🟠 | Calls `exportBillingCsv()`; `GET /api/v1/billing/export-csv` not built |

---

### Users (`components/users/UsersView.tsx`)

| Feature | Status | Notes |
|---------|--------|-------|
| User Registry table | ✅ | From `GET /api/v1/users/` |
| Search by name/email | ✅ | Client-side filter |
| Role filter dropdown | ✅ | Client-side filter |
| Name column | ✅ | From `full_name` |
| Role column | ✅ | From `role` |
| Institution column | ✅ | Resolved via `facility_id` → facilities list lookup |
| Email column | ✅ | From `email` |
| Last Login column | 🔴 | Column absent; `last_login` field missing from `UserResponse` |
| Status badge | ✅ | From `is_active` |
| Suspend button | ✅ | Calls `PATCH /api/v1/users/{id}/deactivate` |
| Reactivate button | 🟠 | Wired; `PATCH /api/v1/users/{id}/activate` endpoint needed |
| + Add User button | ✅ | Opens `AddUserModal` → `POST /api/v1/users/register` |

---

### Audit Log (`components/audit/AuditView.tsx`)

| Feature | Status | Notes |
|---------|--------|-------|
| Activity log entries | ✅ | From `GET /api/v1/users/activity-logs` with pagination |
| Action text + details | ✅ | Renders `action` + `details` fields |
| Dot color by action type | ✅ | Login/create/update/suspend/delete |
| Timestamp formatting | ✅ | Relative time (today/yesterday/date) |
| Load More pagination | ✅ | Increments `skip` by 50 |
| Agent name in entries | 🔴 | Shows `agent_id` (integer); `agent_name` missing from `AgentActivityLogResponse` |
| Export Log button | 🟠 | Calls `exportAuditLogCsv()`; `GET /api/v1/users/activity-logs/export-csv` needed |

---

### Settings (`components/settings/SettingsView.tsx`)

| Feature | Status | Notes |
|---------|--------|-------|
| WhatsApp BSP field | 🟡 | Tries `GET /api/v1/settings/whatsapp`; falls back to static "360dialog (Active)" |
| Business Number field | 🟡 | Same — shows real value if endpoint exists, static fallback otherwise |
| Message Delivery Rate field | 🟡 | Same fallback pattern |
| Configure BSP button | ⬛ | Shows toast — no endpoint |
| Compliance Report button | 🟠 | Calls `GET /api/v1/compliance/report`; endpoint not built |
| Data Retention Policy | ⬛ | Client-side state only — no API |
| Role Permissions | ⬛ | Static display — WHO/AHA standard |
| BP Thresholds | ⬛ | Static display — clinical standard |

---

## PART 3 — Modals

| Modal | Status | Notes |
|-------|--------|-------|
| `CreateInstitutionModal` | ✅ | Submits all fields; `POST /api/v1/facilities/` called on Send |
| `EmailPreviewModal` | ✅ | Animated send flow; calls real API; shows token from response |
| `EditInstitutionModal` | 🟠 | UI complete; `PATCH /api/v1/facilities/{id}` endpoint needed |
| `IssueLicenseModal` | 🟠 | Uses facility dropdown (correct); `PATCH /api/v1/facilities/{id}` needed |
| `ConvertTrialModal` | 🟠 | Selects plan; `PATCH /api/v1/facilities/{id}` with `license_plan` needed |
| `LicenseViewModal` | ✅ | Reads from facility data — no extra API call needed |
| `RenewLicenseModal` | 🟠 | UI complete; `POST /api/v1/facilities/{id}/renew` needed |
| `AddUserModal` | ✅ | `POST /api/v1/users/register` — endpoint exists |

---

## PART 4 — Data Types / Schema Gaps

These fields need to be added to existing API responses (no new endpoints — schema changes only):

| Field | Add To | Unlocks | Priority |
|-------|--------|---------|----------|
| `type` | `FacilityResponse` | Institution type badges everywhere | 🔴 HIGH |
| `field_worker_count` | `FacilityResponse` | Dashboard + Institutions table columns | 🔴 HIGH |
| `total_screened` | `FacilityResponse` | Dashboard + Institutions table columns | 🔴 HIGH |
| `last_login` | `UserResponse` | Users table Last Login column | 🔴 HIGH |
| `agent_name` | `AgentActivityLogResponse` | Audit log human-readable entries | 🔴 HIGH |
| `seats` | `FacilityResponse` | License seat utilisation KPI | 🟠 MEDIUM |
| `seats_used` | `FacilityResponse` | License seat utilisation KPI | 🟠 MEDIUM |
| `license_starts_at` | `FacilityResponse` | License Registry start date column | 🟠 MEDIUM |
| `license_amount` | `FacilityResponse` | License Registry amount column | 🟠 MEDIUM |
| `on_treatment_count` | `FacilityResponse` | Dashboard top institutions | 🟠 MEDIUM |
| `adherence_rate` | `FacilityResponse` | Dashboard top institutions | 🟠 MEDIUM |
| `setup_token` | `FacilityResponse` (POST) | Real token in onboarding email | 🟠 MEDIUM |
| `region_breakdown` | `AnalyticsSummaryResponse` | Analytics: Hypertension by Region | 🟠 MEDIUM |
| `age_distribution` | `AnalyticsSummaryResponse` | Analytics: Age Distribution | 🟠 MEDIUM |
| `gender_stats` | `AnalyticsSummaryResponse` | Analytics: BP Risk by Gender | 🟠 MEDIUM |
| `monthly_risk_breakdown` | `AnalyticsSummaryResponse` | Analytics: Risk Level Trend chart | 🟠 MEDIUM |
| `detection_rate_trend` | `AnalyticsSummaryResponse` | Analytics: Detection Rate chart | 🟠 MEDIUM |
| `facility_adherence` | `AnalyticsSummaryResponse` | Analytics: Adherence table | 🟠 MEDIUM |

---

## PART 5 — Missing Backend Endpoints

Complete list of endpoints the frontend is ready to use but backend has not built:

### 🔴 Tier 1 — Blocking (breaks visible UI features)

| Method | Endpoint | Unblocks | File |
|--------|----------|----------|------|
| `PATCH` | `/api/v1/facilities/{id}` | Edit modal, Convert Trial, Issue License | `facilities.service.ts` |
| `PATCH` | `/api/v1/users/{id}/activate` | Reactivate user button | `users.service.ts` |
| `PATCH` | `/api/v1/facilities/{id}/reject` | Reject pending institution button | `facilities.service.ts` |

### 🟠 Tier 2 — Should-have (show "not available" empty states)

| Method | Endpoint | Unblocks | File |
|--------|----------|----------|------|
| `POST` | `/api/v1/facilities/{id}/renew` | Renew License modal | `facilities.service.ts` |
| `POST` | `/api/v1/facilities/{id}/send-renewal-email` | Remind button | `facilities.service.ts` |
| `GET` | `/api/v1/users/activity-logs/export-csv` | Audit Log export | `users.service.ts` |
| `GET` | `/api/v1/analytics/adherence/by-facility` | Analytics adherence table | `analytics.service.ts` |
| `GET` | `/api/v1/billing/monthly-summary` | Revenue This Month KPI | `billing.service.ts` |
| `GET` | `/api/v1/billing/revenue-timeline` | Monthly Revenue chart | `billing.service.ts` |
| `GET` | `/api/v1/billing/transactions` | Transaction History table | `billing.service.ts` |
| `GET` | `/api/v1/billing/export-csv` | Revenue Export button | `billing.service.ts` |

### 🔵 Tier 3 — Nice-to-have

| Method | Endpoint | Unblocks |
|--------|----------|----------|
| `GET` | `/api/v1/settings/whatsapp` | Live WhatsApp BSP config in Settings |
| `GET` | `/api/v1/compliance/report` | Generate Compliance Report button |

---

## PART 6 — Summary Scorecard

| Page | Fully Working | Partially Working | Needs Backend |
|------|:---:|:---:|:---:|
| Dashboard | KPIs, Charts, Pending table | Top Institutions stats | Reject, per-facility stats |
| Institutions | Table, filters, Suspend | Type/stats columns | Edit button, Reject |
| Licenses | Table, KPIs, View modal | Seats/Amount columns | Renew, Remind, Convert, Issue |
| Analytics | KPIs, Export | — | 6 sections (region/age/gender/risk/detection/adherence) |
| Revenue | KPI structure | All amounts derived | Monthly chart, Transactions, Export |
| Users | Full table, Suspend, Add User | Institution resolved | Reactivate, Last Login |
| Audit Log | Full log, pagination | — | Export, Agent name |
| Settings | Page structure | WhatsApp (fallback) | Compliance report |

**Overall: ~55% of features fully wired to live API. 45% waiting on backend endpoints or schema additions.**

---

## PART 7 — Quick Backend Checklist for Next Sprint

**Ship these 3 endpoints and ~8 features immediately unlock:**

```
PATCH /api/v1/facilities/{id}           ← Edit, Convert Trial, Issue License
PATCH /api/v1/users/{id}/activate       ← Reactivate user
PATCH /api/v1/facilities/{id}/reject    ← Reject pending institution
```

**Add these 5 fields to existing responses and dashboard fills out completely:**

```
FacilityResponse: type, field_worker_count, total_screened
UserResponse: last_login
AgentActivityLogResponse: agent_name
```

---

*Last updated: June 2026 | Frontend: Next.js 16 (Turbopack) | Backend: FastAPI on Railway*
