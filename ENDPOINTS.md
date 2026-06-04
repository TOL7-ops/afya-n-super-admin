# ENDPOINTS.md — Afya Super Admin

> **Single source of truth** for frontend-to-backend integration.
> Backend: `https://afya-backend-production.up.railway.app`
> Swagger: `https://afya-backend-production.up.railway.app/docs`
> OpenAPI JSON: `https://afya-backend-production.up.railway.app/api/v1/openapi.json`
> Auth scheme: **Bearer token** (`Authorization: Bearer <access_token>`)

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Super Admin Session](#2-super-admin-session)
3. [Institution Management (Facilities)](#3-institution-management-facilities)
4. [User Management](#4-user-management)
5. [License Management](#5-license-management)
6. [Platform Analytics](#6-platform-analytics)
7. [Audit Log](#7-audit-log)
8. [WhatsApp / Message Templates (Settings)](#8-whatsapp--message-templates-settings)
9. [Onboarding Flow](#9-onboarding-flow)
10. [Endpoints NOT Used by This App](#10-endpoints-not-used-by-this-app)
11. [API Coverage Summary](#11-api-coverage-summary)
12. [Recommended Integration Order](#12-recommended-integration-order)

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | **Implemented** — wired to real API |
| 🔴 | **Needed** — feature exists in UI, mock data only |
| 🔵 | **Future** — not yet in UI, but will be needed |
| ➖ | **Unused** — exists in Swagger, not relevant here |

---

## 1. Authentication

### 1.1 — Login

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/users/login` |
| **Purpose** | Authenticate the Super Admin and receive a JWT access token |
| **Auth Required** | No |
| **Status** | 🔴 Needed |
| **Frontend Page** | Login page (not yet built — currently no auth gate) |

**Request Body**
```json
{
  "username_or_email": "admin@afya.health",
  "password": "superSecure123"
}
```

**Response**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer"
}
```

---

### 1.2 — Get Current User Profile

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/users/me` |
| **Purpose** | Fetch the logged-in Super Admin's profile to populate the topbar user pill (`SA / Platform Admin`) and verify role |
| **Auth Required** | Yes |
| **Status** | 🔴 Needed |
| **Frontend Page** | All pages — topbar `Topbar.tsx` |

**Response**
```json
{
  "id": 1,
  "email": "admin@afya.health",
  "full_name": "Platform Admin",
  "role": "Super Admin",
  "is_active": true,
  "facility_id": null,
  "created_at": "2026-01-01T00:00:00Z"
}
```

**Notes:** The `role` field should be `"Super Admin"` for this application. Redirect to login if token is invalid or expired.

---

## 2. Super Admin Session

> There is no dedicated "super admin" resource in the API. The Super Admin is a user with `role: "Super Admin"`. Authentication is via the Users endpoints.

### 2.1 — Register Super Admin (First-time setup only)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/users/register` |
| **Purpose** | Create the initial Super Admin account. Only the first user can register without auth. Subsequent registrations require Super Admin credentials. |
| **Auth Required** | No (first user) / Yes (Super Admin creating new users) |
| **Status** | 🔵 Future |
| **Frontend Page** | Initial setup (not built) |

**Request Body**
```json
{
  "email": "admin@afya.health",
  "full_name": "Platform Admin",
  "role": "Super Admin",
  "password": "superSecure123",
  "is_active": true
}
```

**Response** → `UserResponse` (see §4)

---

## 3. Institution Management (Facilities)

> In the backend, "Institutions" are called **Facilities**. Every institution card, table row, approve/suspend action, and "Add Institution" modal in this app maps to the `/api/v1/facilities/` resource.

### 3.1 — List All Institutions

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/facilities/` |
| **Purpose** | Populate the Institution Management table, Dashboard top-performing table, and Dashboard pending approvals table |
| **Auth Required** | Yes |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `InstitutionsView.tsx`, `DashboardView.tsx`, `Sidebar.tsx` (pending count) |

**Query Parameters** — None (filter client-side from full list)

**Response**
```json
[
  {
    "id": 1,
    "name": "Ho Municipal Health Directorate",
    "region": "Volta Region",
    "address": "Ho, Ghana",
    "contact_number": "+233 20 000 0001",
    "license_plan": "Annual Enterprise",
    "license_expires_at": "2026-12-31T00:00:00Z",
    "is_active": true,
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

**Frontend Mapping**

| API Field | UI Column |
|-----------|-----------|
| `name` | Institution |
| `region` | Region |
| `license_plan` | License Expires (plan label) |
| `license_expires_at` | License Expires (date) |
| `is_active` | Status (`true` → Active, `false` → Suspended) |

**Notes:** The API does not return `type` (Government/NGO/Hospital). This must be added to the backend schema or stored client-side. The UI also shows `fieldWorkers` and `totalScreened` — these come from analytics, not the facility object directly.

---

### 3.2 — Create Institution (Add Institution Modal)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/facilities/` |
| **Purpose** | Create a new institution AND its admin user, triggering the onboarding email flow |
| **Auth Required** | Yes (Super Admin) |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `CreateInstitutionModal.tsx`, `EmailPreviewModal.tsx` |

**Request Body — Option A: With immediate admin account** (`FacilityCreate`)
```json
{
  "name": "Hearts of Gold Health Foundation",
  "region": "Greater Accra",
  "address": "Accra, Ghana",
  "contact_number": "+233 24 000 0002",
  "license_plan": "30-day Free Trial",
  "license_expires_at": null,
  "is_active": true,
  "admin": {
    "email": "ama@heartsofgold.org",
    "full_name": "Ama Dankwah",
    "password": null
  }
}
```

**Request Body — Option B: Without password (sends setup token email)** (`FacilityCreateWithoutUser`)
```json
{
  "name": "Hearts of Gold Health Foundation",
  "region": "Greater Accra",
  "admin_email": "ama@heartsofgold.org",
  "admin_name": "Ama Dankwah",
  "license_plan": "30-day Free Trial"
}
```

> ⚠️ **Use Option B** — this matches the UI flow where the admin sets their own password via the onboarding email link.

**Response** → `FacilityResponse`

**Frontend Mapping**

| Form Field | API Field |
|-----------|-----------|
| Institution Name | `name` |
| Region | `region` |
| Admin Contact Name | `admin_name` |
| Admin Email | `admin_email` |
| License Plan | `license_plan` |

**Notes:** After a successful `POST`, the backend generates the onboarding token and dispatches the email. The `EmailPreviewModal` send animation should call this endpoint when the user clicks "Send Onboarding Email →". The generated token shown in the email preview (`AFYA-XXXX-XXXX-XXXX`) is currently generated client-side — it should come from the API response once integrated.

---

### 3.3 — Get Single Institution

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/facilities/{facility_id}` |
| **Purpose** | Fetch full details of one institution for the Edit Institution modal |
| **Auth Required** | Yes |
| **Path Parameters** | `facility_id` (integer) |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `EditInstitutionModal.tsx` |

**Response** → `FacilityResponse`

---

### 3.4 — Suspend / Reactivate Institution

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **URL** | `/api/v1/facilities/{facility_id}/suspend` |
| **Purpose** | Suspend an active institution (Institutions table → "Suspend" button) or reactivate a suspended one |
| **Auth Required** | Yes (Super Admin) |
| **Path Parameters** | `facility_id` (integer) |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `InstitutionsView.tsx`, `DashboardView.tsx` |

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `active` | boolean | `false` | `false` = suspend, `true` = reactivate |

**Response** → `FacilityResponse`

**Frontend Mapping**

| UI Action | API Call |
|-----------|---------|
| "Suspend" button | `PATCH /facilities/{id}/suspend?active=false` |
| "Reactivate" button | `PATCH /facilities/{id}/suspend?active=true` |
| "✓ Approve" button (Pending → Active) | `PATCH /facilities/{id}/suspend?active=true` |

---

### 3.5 — Edit Institution

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **URL** | `/api/v1/facilities/{facility_id}/suspend` |
| **Purpose** | There is **no dedicated PATCH update endpoint** in the current API for editing facility fields like name, region, contact. The suspend endpoint only toggles `is_active`. |
| **Auth Required** | Yes |
| **Status** | 🔵 Future — requires a new backend endpoint (`PATCH /api/v1/facilities/{facility_id}`) |
| **Frontend Pages** | `EditInstitutionModal.tsx` |

**Notes:** The "Save Changes" action in `EditInstitutionModal` currently only updates state locally. A general `PATCH /facilities/{id}` endpoint accepting `FacilityUpdate` fields (`name`, `region`, `address`, `contact_number`, `license_plan`) needs to be added to the backend.

---

## 4. User Management

### 4.1 — List All Users

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/users/` |
| **Purpose** | Populate the "All Users" registry table |
| **Auth Required** | Yes (Super Admin or Admin) |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `UsersView.tsx` |

**Response**
```json
[
  {
    "id": 1,
    "email": "ama.osei@ho.health.gov.gh",
    "full_name": "Ama Osei",
    "role": "Admin",
    "is_active": true,
    "facility_id": 1,
    "created_at": "2026-01-01T00:00:00Z"
  }
]
```

**Frontend Mapping**

| API Field | UI Column |
|-----------|-----------|
| `full_name` | Name |
| `role` | Role |
| `facility_id` | Institution (must be resolved to a name via facilities list) |
| `email` | Email |
| `is_active` | Status (`true` → Active, `false` → Suspended) |

**Notes:** The `lastLogin` field shown in the UI is not returned by this endpoint. It is not currently available in the API.

---

### 4.2 — Suspend (Deactivate) User

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **URL** | `/api/v1/users/{user_id}/deactivate` |
| **Purpose** | Suspend a user account — maps to "Suspend" button in Users table |
| **Auth Required** | Yes (Super Admin or Admin) |
| **Path Parameters** | `user_id` (integer) |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `UsersView.tsx` |

**Response** → `UserResponse` with `is_active: false`

**Notes:** There is no reactivate endpoint in the current API. The "Reactivate" button in the UI has no backend equivalent yet — this is a **Future** endpoint gap.

---

### 4.3 — Create User (Register New Staff)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/users/register` |
| **Purpose** | Create new institutional admin or field worker accounts |
| **Auth Required** | Yes (Super Admin) |
| **Status** | 🔵 Future |
| **Frontend Pages** | Not yet built (no "Add User" UI exists) |

**Request Body**
```json
{
  "email": "kofi@institution.gh",
  "full_name": "Kofi Darko",
  "role": "CHW/Operator",
  "is_active": true
}
```

---

## 5. License Management

> The backend does not have a dedicated `/licenses/` resource. License data is embedded in the `FacilityResponse` object (`license_plan`, `license_expires_at`, `is_active`). All license management actions map to Facility endpoints.

### 5.1 — Get License Details (License Registry)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/facilities/` |
| **Purpose** | Populate the License Registry table — extract license fields from each facility |
| **Auth Required** | Yes |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `LicensesView.tsx` |

**Frontend Mapping**

| API Field | UI Column |
|-----------|-----------|
| `name` | Institution |
| `license_plan` | Plan |
| `license_expires_at` | Expiry |
| `is_active` | Status |

**Notes:** Seat count, amount (GHS), start date, and payment method are **not** returned by the API. These require a dedicated license/billing model on the backend (Future).

---

### 5.2 — Issue New License (Create Facility with License Plan)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/facilities/` |
| **Purpose** | The "Issue License" modal creates a facility with the specified `license_plan` and `license_expires_at` |
| **Auth Required** | Yes (Super Admin) |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `IssueLicenseModal.tsx` |

**Notes:** Issuing a license to an *existing* facility requires a backend update endpoint. Currently `POST /facilities/` always creates a new facility.

---

### 5.3 — Convert Trial to Paid

| Field | Value |
|-------|-------|
| **Method** | `PATCH` |
| **URL** | `/api/v1/facilities/{facility_id}/suspend` |
| **Purpose** | Reactivating a trial facility with a new plan. **No dedicated convert endpoint exists** — workaround is to call suspend with `active=true` and separately update the license plan. |
| **Auth Required** | Yes (Super Admin) |
| **Status** | 🔵 Future — requires `PATCH /api/v1/facilities/{facility_id}` with `license_plan` support |
| **Frontend Pages** | `ConvertTrialModal.tsx`, `LicensesView.tsx` |

---

### 5.4 — Renew License / Send Renewal Reminder

| Field | Value |
|-------|-------|
| **Method** | N/A |
| **URL** | N/A |
| **Purpose** | "Renew" and "Remind" buttons in License Registry |
| **Status** | 🔵 Future — no backend endpoint exists |
| **Frontend Pages** | `LicensesView.tsx`, `LicenseViewModal.tsx` |

**Notes:** A `POST /api/v1/facilities/{facility_id}/renew` or similar endpoint is needed. For the renewal reminder email, a `POST /api/v1/facilities/{facility_id}/send-renewal-email` would be required.

---

## 6. Platform Analytics

### 6.1 — Dashboard Summary (KPIs)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/analytics/summary` |
| **Purpose** | Power all four KPI cards on the Dashboard: Active Institutions, Total Screened, On Active Treatment, Pending Approval |
| **Auth Required** | Yes |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `DashboardView.tsx`, `AnalyticsView.tsx`, `Sidebar.tsx` (platform stats) |

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `facility_id` | integer | null | Filter by facility; omit for platform-wide totals |

**Response**
```json
{
  "total_screened": 4712,
  "bp_distribution": {
    "Normal": 54,
    "Elevated": 21,
    "Stage 1": 15,
    "Stage 2": 6,
    "Crisis": 4
  },
  "referral_rate": 83.6,
  "adherence_rate": 78.0
}
```

**Frontend Mapping**

| API Field | UI Element |
|-----------|-----------|
| `total_screened` | "Total Screened" KPI + Sidebar stat |
| `bp_distribution` | BP Category Distribution chart |
| (pending facilities count) | "Pending Approval" KPI — from `GET /facilities/` |

---

### 6.2 — Screening Timeline (Screening Volume Chart)

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/analytics/timeline` |
| **Purpose** | Power the "Screening Volume — Last 6 Months" bar chart on the Dashboard |
| **Auth Required** | Yes |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `DashboardView.tsx` → `ScreeningTrendChart.tsx` |

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `period` | string | `"30d"` | `"7d"`, `"30d"`, or `"90d"` — use `"90d"` for 6-month view (or request `180d` from backend) |

**Response**
```json
{
  "period": "90d",
  "data": [
    { "date": "2025-12-01", "count": 312 },
    { "date": "2026-01-01", "count": 448 }
  ]
}
```

**Notes:** The UI groups by month. The frontend should aggregate daily counts into monthly totals. If a 180d option is needed, the backend period options may need extending.

---

### 6.3 — Adherence Statistics

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/analytics/adherence` |
| **Purpose** | "On Active Treatment" KPI, Adherence by Institution table, and the Analytics page adherence section |
| **Auth Required** | Yes |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `DashboardView.tsx`, `AnalyticsView.tsx` |

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `facility_id` | integer | null | Filter by facility for per-institution adherence |

**Response**
```json
{
  "overall_adherence_rate": 78.0,
  "total_enrolled": 387,
  "active_logs_this_week": 301,
  "daily_breakdown": [45, 52, 48, 60, 55, 43, 50]
}
```

---

### 6.4 — Referral Statistics

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/analytics/referrals` |
| **Purpose** | Analytics page — "Referred to Facility" KPI and referral pipeline metrics |
| **Auth Required** | Yes |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `AnalyticsView.tsx` |

**Response**
```json
{
  "total_referred": 987,
  "completed_intake": 571,
  "lost_to_followup": 416,
  "referral_rate": 83.6
}
```

---

### 6.5 — Export Analytics CSV

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/analytics/export-csv` |
| **Purpose** | "Export Report ↓" button on Analytics page and Dashboard |
| **Auth Required** | Yes (Super Admin or Admin) |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `AnalyticsView.tsx`, `DashboardView.tsx` |

**Response** → `text/plain` CSV file download

**Notes:** Trigger a file download using a `<a href="...">` with `Authorization` header via fetch + `URL.createObjectURL()`.

---

## 7. Audit Log

### 7.1 — List Activity Logs

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/users/activity-logs` |
| **Purpose** | Populate the Audit Log timeline with real system events |
| **Auth Required** | Yes (Super Admin or Admin) |
| **Status** | 🔴 Needed |
| **Frontend Pages** | `AuditView.tsx` |

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `skip` | integer | `0` | Pagination offset |
| `limit` | integer | `100` | Number of records per page |

**Response**
```json
[
  {
    "id": 1,
    "agent_id": 3,
    "action": "Patient registered",
    "patient_id": 47,
    "details": "Kwame Ofori (AF-047) — BP: 178/106 — Crisis",
    "timestamp": "2026-05-19T08:52:00Z"
  }
]
```

**Frontend Mapping**

| API Field | UI Element |
|-----------|-----------|
| `action` + `details` | Audit entry text |
| `timestamp` | Audit entry time |
| `action` type | Dot color (login → amber, create → green, update → blue, suspend → red) |

**Notes:** The `Load More Events` button should increment `skip` by `limit` and append results. The "Export Log ↓" button currently shows a toast — it should call `GET /api/v1/analytics/export-csv` or a future dedicated audit export endpoint.

---

## 8. WhatsApp / Message Templates (Settings)

### 8.1 — List Message Templates

| Field | Value |
|-------|-------|
| **Method** | `GET` |
| **URL** | `/api/v1/templates/` |
| **Purpose** | Display WhatsApp message templates in System Settings — WhatsApp Configuration section |
| **Auth Required** | Yes (Super Admin or Admin) |
| **Status** | 🔵 Future |
| **Frontend Pages** | `SettingsView.tsx` (Configure BSP section) |

**Response**
```json
[
  {
    "id": 1,
    "template_type": "medication_reminder",
    "content": "Hi {name}, this is your daily reminder to take {medication_name}.",
    "is_active": true,
    "version": 3,
    "updated_at": "2026-05-01T10:00:00Z"
  }
]
```

---

### 8.2 — Update Message Template

| Field | Value |
|-------|-------|
| **Method** | `PUT` |
| **URL** | `/api/v1/templates/{template_id}` |
| **Purpose** | Edit a WhatsApp message template from System Settings |
| **Auth Required** | Yes (Super Admin or Admin) |
| **Path Parameters** | `template_id` (integer) |
| **Status** | 🔵 Future |
| **Frontend Pages** | `SettingsView.tsx` |

**Request Body**
```json
{
  "template_type": "medication_reminder",
  "content": "Hi {name}, time to take your {medication_name}. Reply TAKEN to confirm.",
  "is_active": true
}
```

**Response** → `MessageTemplateResponse`

---

### 8.3 — Create Message Template

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/templates/` |
| **Purpose** | Create a custom WhatsApp template |
| **Auth Required** | Yes (Super Admin or Admin) |
| **Status** | 🔵 Future |
| **Frontend Pages** | `SettingsView.tsx` |

---

## 9. Onboarding Flow

> This flow is triggered when a new institution is created. The backend generates a setup token and sends the onboarding email automatically on `POST /facilities/`. The following endpoints support the **institutional admin's** onboarding experience (not the super admin UI itself), but the super admin must understand them to debug issues.

### 9.1 — Verify Setup Token

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/users/setup-tokens/verify` |
| **Purpose** | Validate the `AFYA-XXXX-XXXX-XXXX` token shown in the onboarding email. Called when the institutional admin clicks "Set Up Your Account →" |
| **Auth Required** | No |
| **Status** | 🔵 Future (onboarding page not built in this repo) |
| **Frontend Pages** | Onboarding page (separate app / future) |

**Request Body**
```json
{
  "token": "AFYA-AB12-CD34-EF56",
  "email": "ama@heartsofgold.org"
}
```

**Response**
```json
{
  "token": "AFYA-AB12-CD34-EF56",
  "email": "ama@heartsofgold.org",
  "full_name": "Ama Dankwah",
  "role": "Admin",
  "facility_id": 6,
  "facility_name": "Hearts of Gold Health Foundation",
  "region": "Greater Accra",
  "license_plan": "30-day Free Trial"
}
```

---

### 9.2 — Claim Setup Token (Set Password)

| Field | Value |
|-------|-------|
| **Method** | `POST` |
| **URL** | `/api/v1/users/setup-tokens/claim` |
| **Purpose** | Activate the admin account and set their password. Called after the token is verified. |
| **Auth Required** | No |
| **Status** | 🔵 Future |
| **Frontend Pages** | Onboarding page (separate app / future) |

**Request Body**
```json
{
  "token": "AFYA-AB12-CD34-EF56",
  "email": "ama@heartsofgold.org",
  "password": "newSecurePassword123",
  "whatsapp_number": "+233201234567"
}
```

**Response** → `UserResponse` with `is_active: true`

---

## 10. Endpoints NOT Used by This App

These endpoints exist in the Swagger spec but are **not relevant** to the Super Admin console. They belong to the Field Worker PWA, Facility Clinician Portal, or patient-facing systems.

| Endpoint | Reason Excluded |
|----------|----------------|
| `POST /api/v1/screening/register` | Field worker PWA only |
| `GET /api/v1/screening/patients` | Field worker / clinician portal |
| `GET /api/v1/screening/patients/{id}` | Clinician portal |
| `PATCH /api/v1/screening/patients/{id}` | Clinician portal |
| `DELETE /api/v1/screening/patients/{id}` | Super Admin deactivation (possible future use) |
| `POST /api/v1/screening/patients/{id}/bp-readings` | Field worker PWA |
| `GET /api/v1/screening/patients/{id}/bp-readings` | Clinician portal |
| `POST /api/v1/screening/sync-offline` | Field worker PWA offline sync |
| `POST /api/v1/screening/intake/{id}` | Clinician portal |
| `GET /api/v1/screening/patients/{id}/adherence` | Clinician portal |
| `POST /api/v1/screening/patients/{id}/treatment/start` | Clinician portal |
| `GET /api/v1/screening/patients/{id}/messages` | Clinician portal |
| `GET /api/v1/screening/patients/check-number` | Field worker PWA |
| `GET /api/v1/events/` | Field worker PWA |
| `POST /api/v1/events/` | Field worker PWA |
| `PUT /api/v1/events/{id}/close` | Field worker PWA |
| `GET /api/v1/events/{id}` | Field worker PWA |
| `GET /api/v1/events/{id}/patients` | Field worker PWA |
| `GET /api/v1/events/{id}/summary` | Possibly future Analytics |
| `GET /api/v1/analytics/needs-outreach` | Field worker / CHW queue |
| `POST /api/v1/ingestion/bulk-upload` | Offline data import (possibly future) |
| `POST /api/v1/webhook/twilio` | Server-to-server webhook, not called from frontend |
| `PATCH /api/v1/users/me/facility` | Field worker / clinician |
| `GET /` | Health check |

---

## 11. API Coverage Summary

| Category | Total Required | Implemented (✅) | Needed (🔴) | Future (🔵) | Unused (➖) |
|----------|---------------|-----------------|------------|------------|------------|
| Authentication | 2 | 0 | 2 | 0 | 0 |
| Institution Mgmt | 5 | 0 | 3 | 2 | 0 |
| User Management | 3 | 0 | 2 | 1 | 0 |
| License Mgmt | 4 | 0 | 2 | 2 | 0 |
| Platform Analytics | 5 | 0 | 5 | 0 | 0 |
| Audit Log | 1 | 0 | 1 | 0 | 0 |
| WA / Templates | 3 | 0 | 0 | 3 | 0 |
| Onboarding Flow | 2 | 0 | 0 | 2 | 0 |
| Not applicable | 21 | — | — | — | 21 |
| **TOTAL** | **25** | **0** | **15** | **10** | **21** |

### Gaps requiring backend work

The following features in the UI **cannot be implemented** without new backend endpoints:

| Feature | Missing Endpoint |
|---------|----------------|
| Edit institution details | `PATCH /api/v1/facilities/{id}` with editable fields |
| Reactivate user | `PATCH /api/v1/users/{id}/activate` or `reactivate` |
| Convert trial to paid plan | `PATCH /api/v1/facilities/{id}` with `license_plan` field |
| License renewal | `POST /api/v1/facilities/{id}/renew` |
| Send renewal reminder email | `POST /api/v1/facilities/{id}/send-renewal-email` |
| Revenue / billing history | Entire billing/payment resource (no equivalent in API) |
| Institution type field | `FacilityResponse` missing `type` field (Government/NGO/Hospital/etc.) |
| User last login | `UserResponse` missing `last_login` field |
| Seat utilisation | No seats/billing resource in API |

---

## 12. Recommended Integration Order

Integrate in this order to unlock the most UI value with each step and ensure dependencies are met.

### Phase 1 — Foundation (No UI visible without these)

| # | Endpoint | Why First |
|---|----------|-----------|
| 1 | `POST /api/v1/users/login` | Nothing works without auth |
| 2 | `GET /api/v1/users/me` | Topbar user pill, role guard |

### Phase 2 — Core Data (Replaces all mock data)

| # | Endpoint | UI Unlocked |
|---|----------|-------------|
| 3 | `GET /api/v1/facilities/` | Institutions table, sidebar stats, pending approvals, license registry |
| 4 | `GET /api/v1/analytics/summary` | Dashboard KPIs, BP distribution chart |
| 5 | `GET /api/v1/analytics/timeline` | Screening volume chart |
| 6 | `GET /api/v1/analytics/adherence` | On treatment KPI, adherence table |
| 7 | `GET /api/v1/analytics/referrals` | Analytics page referral stats |
| 8 | `GET /api/v1/users/` | Users registry table |
| 9 | `GET /api/v1/users/activity-logs` | Audit log timeline |

### Phase 3 — Write Operations (Enables all actions)

| # | Endpoint | UI Unlocked |
|---|----------|-------------|
| 10 | `POST /api/v1/facilities/` (Option B) | "Add Institution" modal → "Send Onboarding Email →" |
| 11 | `PATCH /api/v1/facilities/{id}/suspend` | Suspend / Reactivate / Approve institution |
| 12 | `PATCH /api/v1/users/{id}/deactivate` | Suspend user in Users table |
| 13 | `GET /api/v1/analytics/export-csv` | "Export Report" and "Export Log" buttons |

### Phase 4 — Advanced Features (Needs backend additions)

| # | Endpoint (to be built) | UI Feature |
|---|----------------------|------------|
| 14 | `PATCH /api/v1/facilities/{id}` | Edit institution modal |
| 15 | `PATCH /api/v1/users/{id}/activate` | Reactivate user |
| 16 | `PATCH /api/v1/facilities/{id}` with `license_plan` | Convert trial to paid |
| 17 | `POST /api/v1/facilities/{id}/renew` | Renew license |
| 18 | `GET/PUT /api/v1/templates/` | Settings → WhatsApp templates |

### Phase 5 — Nice-to-Have

| # | Endpoint | UI Feature |
|---|----------|------------|
| 19 | `POST /api/v1/users/setup-tokens/verify` | Debug onboarding token status |
| 20 | `GET /api/v1/events/{id}/summary` | Per-event analytics in Analytics view |

---

## Notes on Authentication Implementation

All authenticated requests must include:
```
Authorization: Bearer <access_token>
```

**Recommended implementation:**
- Store the JWT in `httpOnly` cookie or `sessionStorage` (not `localStorage` for security)
- Create `lib/api.ts` with an axios instance that attaches the header via an interceptor
- On 401 responses, redirect to the login page and clear the stored token
- The Super Admin role check (`role === "Super Admin"`) should happen after `GET /users/me` on every app load

---

*Last updated: June 2026 | App version: v1.0 | API version: 0.1.0*
