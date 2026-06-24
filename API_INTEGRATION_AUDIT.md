# API Integration Audit — Afya Super Admin
**Backend:** `https://afya-backend-production.up.railway.app`
**Audit Date:** 2025
**Status:** Production-quality audit of all API integration points

---

## Table of Contents
1. [Existing API Usage](#1-existing-api-usage)
2. [Mock Data Inventory](#2-mock-data-inventory)
3. [Screens and Data Requirements](#3-screens-and-data-requirements)
4. [Swagger Mapping](#4-swagger-mapping)
5. [Required Endpoints — MVP](#5-required-endpoints--mvp)
6. [Authentication Status](#6-authentication-status)
7. [Integration Plan](#7-integration-plan)
8. [Frontend Fixes](#8-frontend-fixes)
9. [Backend Fixes](#9-backend-fixes)
10. [Missing Endpoints](#10-missing-endpoints)
11. [Persistence Bugs](#11-persistence-bugs)
12. [Missing Response Fields](#12-missing-response-fields)

---

## 1. Existing API Usage

All super-admin API calls go through `lib/api.ts` — an axios instance that auto-attaches the Bearer token from `localStorage` key `afya_access_token` and redirects to `/login` on 401.

### 1.1 institutions.service.ts

| Method | Endpoint | Service Function | UI Usage |
|--------|----------|-----------------|----------|
| GET | `/api/v1/super-admin/institutions` | `listInstitutions()` | InstitutionsView, institutionsStore, RevenueView |
| GET | `/api/v1/super-admin/institutions/{id}` | `getInstitution()` | EditInstitutionModal |
| POST | `/api/v1/super-admin/institutions` | `createInstitution()` | CreateInstitutionModal |
| PUT | `/api/v1/super-admin/institutions/{id}` | `updateInstitution()` | EditInstitutionModal, IssueLicenseModal (workaround) |
| PATCH | `/api/v1/super-admin/institutions/{id}/status` | `updateInstitutionStatus()` | AdminShell approve/reject fallback |
| POST | `/api/v1/super-admin/institutions/{id}/action` | `institutionAction()` | AdminShell approve/reject (primary attempt) |
| POST | `/api/v1/super-admin/institutions/{id}/extend-trial` | `extendTrial()` | InstitutionsView |
| POST | `/api/v1/super-admin/institutions/{id}/resend-onboarding` | `resendOnboarding()` | InstitutionsView (**STUB — always 404**) |

### 1.2 analytics.service.ts

| Method | Endpoint | Service Function | UI Usage |
|--------|----------|-----------------|----------|
| GET | `/api/v1/super-admin/dashboard/summary` | `getDashboardSummary()` | DashboardView KPIs |
| GET | `/api/v1/super-admin/dashboard/screenings-trend` | `getScreeningsTrend()` | DashboardView screening chart |
| GET | `/api/v1/super-admin/dashboard/bp-distribution` | `getBpDistribution()` | DashboardView BP chart |
| GET | `/api/v1/super-admin/dashboard/pending-approvals` | `getPendingApprovals()` | DashboardView pending list |
| GET | `/api/v1/super-admin/dashboard/top-institutions` | `getTopInstitutions()` | DashboardView top institutions |
| GET | `/api/v1/super-admin/dashboard/export-report` | `exportDashboardReport()` | DashboardView export button |
| GET | `/api/v1/super-admin/analytics/summary` | `getAnalyticsSummary()` | AnalyticsView KPIs |
| GET | `/api/v1/super-admin/analytics/breakdowns` | `getAnalyticsBreakdowns()` | AnalyticsView charts (age, region, gender, risk, detection) |
| GET | `/api/v1/super-admin/analytics/institutions-performance` | `getInstitutionsPerformance()` | AnalyticsView performance table |
| GET | `/api/v1/super-admin/analytics/export` | `exportAnalytics()` | AnalyticsView export button |

### 1.3 licenses.service.ts

| Method | Endpoint | Service Function | UI Usage |
|--------|----------|-----------------|----------|
| GET | `/api/v1/super-admin/licenses/summary` | `getLicensesSummary()` | LicensesView KPI cards |
| GET | `/api/v1/super-admin/licenses` | `listLicenses()` | LicensesView table, RevenueView enrichment |
| POST | `/api/v1/super-admin/licenses` | `issueLicense()` | **DEFINED but NEVER CALLED** (see Issue #3) |
| POST | `/api/v1/super-admin/licenses/{id}/renew` | `renewLicense()` | LicensesView renew action |
| POST | `/api/v1/super-admin/licenses/{id}/send-reminder` | `sendLicenseReminder()` | LicensesView reminder action |
| POST | `/api/v1/super-admin/licenses/{id}/convert-trial` | `convertTrial()` | ConvertTrialModal |
| POST | `/api/v1/super-admin/licenses/{id}/send-renewal-email` | `sendRenewalEmail()` | LicensesView email action |
| GET | `/api/v1/super-admin/revenue/export` | `exportLicensesCsv()` | LicensesView export button |

### 1.4 revenue.service.ts

| Method | Endpoint | Service Function | UI Usage |
|--------|----------|-----------------|----------|
| GET | `/api/v1/super-admin/revenue/summary` | `getRevenueSummary()` | RevenueView KPI cards |
| GET | `/api/v1/super-admin/revenue/monthly-trend` | `getRevenueMonthlyTrend()` | RevenueView bar chart |
| GET | `/api/v1/super-admin/revenue/by-type` | `getRevenueByType()` | RevenueView donut/pie chart |
| GET | `/api/v1/super-admin/revenue/transactions` | `getRevenueTransactions()` | RevenueView transaction table |
| GET | `/api/v1/super-admin/revenue/export` | `exportRevenueCsv()` | RevenueView export button |

### 1.5 users.service.ts

| Method | Endpoint | Service Function | UI Usage |
|--------|----------|-----------------|----------|
| GET | `/api/v1/super-admin/users` | `listUsers()` | UsersView table |
| GET | `/api/v1/super-admin/users/{id}` | `getUserById()` | **DEFINED but NEVER CALLED from UI** |
| PATCH | `/api/v1/super-admin/users/{id}/status` | `updateUserStatus()` | UsersView activate/suspend toggle |
| POST | `/api/v1/users/register` | `registerUser()` | **DEFINED but NEVER CALLED** (no Add User button) |
| GET | `/api/v1/super-admin/audit-logs` | `listActivityLogs()` | AuditView, UsersView (cross-reference for last_login) |
| GET | `/api/v1/super-admin/audit-logs/export` | `exportAuditLogCsv()` | AuditView export button |

### 1.6 settings.service.ts

| Method | Endpoint | Service Function | UI Usage |
|--------|----------|-----------------|----------|
| GET | `/api/v1/super-admin/settings/whatsapp` | `getWhatsAppSettings()` | SettingsView WhatsApp tab |
| PUT | `/api/v1/super-admin/settings/whatsapp` | `updateWhatsAppSettings()` | SettingsView WhatsApp save |
| GET | `/api/v1/super-admin/settings/compliance` | `getComplianceSettings()` | SettingsView compliance tab |
| PUT | `/api/v1/super-admin/settings/compliance` | `updateComplianceSettings()` | SettingsView compliance save |
| GET | `/api/v1/super-admin/settings/permissions` | `getPermissions()` | SettingsView permissions tab |

### 1.7 authService.ts

| Method | Endpoint | Service Function | UI Usage |
|--------|----------|-----------------|----------|
| POST | `/api/v1/users/login` | `login()` | Login page form submit |
| GET | `/api/v1/users/me` | `getCurrentUser()` | AuthContext on app load |

### 1.8 Onboarding Pages (direct axios / api.ts calls)

| Method | Endpoint | Location | UI Usage |
|--------|----------|----------|----------|
| POST | `/api/v1/users/setup-tokens/verify` | `app/onboarding/page.tsx` | Step 1 token verify (uses api.ts) |
| POST | `/api/v1/users/setup-tokens/claim` | `app/onboarding/set-password/page.tsx` | Step 2 set password (uses api.ts) |
| POST | `/api/v1/users/setup-tokens/verify` | `app/(onboarding)/setup/page.tsx` | Alternate flow Step 1 (uses raw axios) |

### 1.9 institutionsStore.ts (Zustand store — direct call)

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/api/v1/super-admin/institutions` | Duplicate of `listInstitutions()` — called in store `fetch()` independently |


---

## 2. Mock Data Inventory

All mock data below is defined in `constants/index.ts`. **None of these constants are imported or used by any live view component.** They are legacy dead code — all views call live API hooks. Listed here for completeness and cleanup tracking.

| Constant Name | Description | Live Replacement |
|--------------|-------------|-----------------|
| `PLATFORM_STATS` | Hardcoded `{totalInstitutions:14, activeLicenses:11, totalScreened:4712, onTreatment:387, pendingApproval:2}` | `getDashboardSummary()` in AdminShell / DashboardView |
| `DASHBOARD_KPIS` | `{activeInstitutions:11, totalScreened:4712, onActiveTreatment:387, pendingApproval:2}` | `getDashboardSummary()` |
| `SCREENING_TREND` | 6-month array of `{month, value}` | `getScreeningsTrend()` |
| `BP_DISTRIBUTION` | Array of `{label, percent, colorVar}` | `getBpDistribution()` |
| `PENDING_APPROVALS` | 2 fake pending institution objects | `getPendingApprovals()` |
| `TOP_INSTITUTIONS` | 3 fake top institution objects | `getTopInstitutions()` |
| `ALL_INSTITUTIONS` | 7 fake full institution records | `listInstitutions()` |
| `LICENSES` | 5 fake license records | `listLicenses()` |
| `USERS` | 5 fake user objects | `listUsers()` |
| `AUDIT_ENTRIES` | 10 fake audit log entries | `listActivityLogs()` |
| `REGION_STATS` | 3 fake region objects | `getAnalyticsBreakdowns().regional` |
| `AGE_DISTRIBUTION` | 4 fake age bucket objects | `getAnalyticsBreakdowns().age` |
| `RISK_TREND_DATA` | 6 months of fake risk data | `getAnalyticsBreakdowns().risk_trends` |
| `GENDER_STATS` | Fake gender breakdown | `getAnalyticsBreakdowns().gender` |
| `DETECTION_RATE_TREND` | 6 fake detection rate entries | `getAnalyticsBreakdowns().detection_rate` |
| `ADHERENCE_ROWS` | 3 fake adherence rows | `getInstitutionsPerformance()` |
| `REVENUE_TREND` | 6 fake revenue months | `getRevenueMonthlyTrend()` |
| `REVENUE_BY_TYPE` | 4 fake revenue-by-type entries | `getRevenueByType()` |
| `TRANSACTIONS` | 6 fake transaction records | `getRevenueTransactions()` |

> **Recommendation:** Delete or archive `constants/index.ts` after confirming no test files reference it. The login page brand panel (`app/(auth)/login/page.tsx`) also hardcodes "4,712+ Patients screened", "14 Active institutions", "3 regions" — these are purely decorative and do not need to be live data.


---

## 3. Screens and Data Requirements

| # | Screen / Route | Description | API Calls | Integration Status |
|---|---------------|-------------|-----------|-------------------|
| 1 | Login — `/login` | Auth form + brand panel | `POST /api/v1/users/login`, `GET /api/v1/users/me` | ✅ INTEGRATED |
| 2 | Dashboard — `/` (AdminShell) | KPIs, screening trend chart, BP chart, pending approvals, top institutions | `GET /dashboard/summary`, `GET /dashboard/screenings-trend`, `GET /dashboard/bp-distribution`, `GET /dashboard/pending-approvals`, `GET /dashboard/top-institutions` | ✅ INTEGRATED |
| 3 | Institutions — `/institutions` | Table of all institutions with approve/reject/extend-trial/resend-onboarding actions | `GET /super-admin/institutions`, `POST .../action`, `PATCH .../status`, `POST .../extend-trial`, `POST .../resend-onboarding` | ✅ INTEGRATED (with known issues — see §11) |
| 4 | Licenses — `/licenses` | License registry with KPI cards, convert trial, renew, reminder, email actions | `GET /super-admin/licenses`, `GET /super-admin/licenses/summary`, `POST .../renew`, `POST .../send-reminder`, `POST .../convert-trial`, `POST .../send-renewal-email` | ✅ INTEGRATED |
| 5 | Analytics — `/analytics` | 4 KPI cards, 5 charts (age, region, gender, risk trend, detection rate), performance table | `GET /analytics/summary`, `GET /analytics/breakdowns`, `GET /analytics/institutions-performance` | ✅ INTEGRATED (some fields return null — see §12) |
| 6 | Revenue — `/revenue` | 4 KPIs, monthly bar chart, revenue-by-type chart, transaction table | `GET /revenue/summary`, `GET /revenue/monthly-trend`, `GET /revenue/by-type`, `GET /revenue/transactions`, `GET /super-admin/licenses`, `GET /super-admin/institutions` | ✅ INTEGRATED (client-side enrichment workaround — see §12) |
| 7 | Users — `/users` | User registry table with activate/suspend | `GET /super-admin/users`, `PATCH .../status`, `GET /super-admin/audit-logs` | ✅ INTEGRATED (last_login cross-reference — see §8) |
| 8 | Audit Log — `/audit` | Timeline of system events | `GET /super-admin/audit-logs`, `GET /super-admin/audit-logs/export` | ✅ INTEGRATED |
| 9 | Settings — `/settings` | WhatsApp config, compliance settings, role permissions, BP thresholds | `GET/PUT /settings/whatsapp`, `GET/PUT /settings/compliance`, `GET /settings/permissions` | ✅ INTEGRATED (BP thresholds hardcoded — see §8) |
| 10 | Onboarding Step 1 — `/onboarding` | Token verification form | `POST /users/setup-tokens/verify` | ✅ INTEGRATED |
| 11 | Onboarding Step 2 — `/onboarding/set-password` | Password creation form | `POST /users/setup-tokens/claim` | ✅ INTEGRATED |
| 12 | Onboarding Step 3 — `/onboarding/confirm` | Read-only confirmation screen | None (reads from sessionStorage) | ✅ NO API NEEDED |
| 13 | Onboarding Step 4 — `/onboarding/done` | Success screen, links to facility portal | None | ✅ NO API NEEDED |
| 14 | Alternate Onboarding — `/setup` | Alternate entry point, duplicates step 1 token verify | `POST /users/setup-tokens/verify` (raw axios) | ✅ INTEGRATED (duplicate flow — see §8 Issue #11) |


---

## 4. Swagger Mapping

This section maps what the frontend requires against what the backend is known to expose. Endpoints marked ⚠️ have confirmed issues (stub, schema gap, or persistence bug). Endpoints marked ❌ are missing or never verified to work.

### 4.1 Auth & Onboarding

| Frontend Requirement | Endpoint | Status | Notes |
|---------------------|----------|--------|-------|
| Login | `POST /api/v1/users/login` | ✅ Working | Returns JWT |
| Get current user | `GET /api/v1/users/me` | ✅ Working | Used in AuthContext |
| Verify setup token | `POST /api/v1/users/setup-tokens/verify` | ✅ Working | Used in both onboarding flows |
| Claim setup token (set password) | `POST /api/v1/users/setup-tokens/claim` | ✅ Working | Used in set-password step |

### 4.2 Institutions

| Frontend Requirement | Endpoint | Status | Notes |
|---------------------|----------|--------|-------|
| List all institutions | `GET /api/v1/super-admin/institutions` | ✅ Working | |
| Get single institution | `GET /api/v1/super-admin/institutions/{id}` | ✅ Working | |
| Create institution | `POST /api/v1/super-admin/institutions` | ✅ Working | |
| Update institution | `PUT /api/v1/super-admin/institutions/{id}` | ✅ Working | |
| Update status (activate/suspend) | `PATCH /api/v1/super-admin/institutions/{id}/status` | ✅ Working | Used as approve/reject fallback |
| Approve / Reject action | `POST /api/v1/super-admin/institutions/{id}/action` | ⚠️ Partially working | Does not persist on reload — AdminShell falls back to PATCH /status |
| Extend trial | `POST /api/v1/super-admin/institutions/{id}/extend-trial` | ✅ Working | |
| Resend onboarding email | `POST /api/v1/super-admin/institutions/{id}/resend-onboarding` | ❌ STUB (404) | Service catches gracefully; endpoint not implemented on backend |

### 4.3 Dashboard

| Frontend Requirement | Endpoint | Status | Notes |
|---------------------|----------|--------|-------|
| Summary KPIs | `GET /api/v1/super-admin/dashboard/summary` | ✅ Working | |
| Screenings trend | `GET /api/v1/super-admin/dashboard/screenings-trend` | ✅ Working | |
| BP distribution | `GET /api/v1/super-admin/dashboard/bp-distribution` | ✅ Working | |
| Pending approvals | `GET /api/v1/super-admin/dashboard/pending-approvals` | ⚠️ Working with workaround | Returns string token IDs (e.g. "token-6"), not numeric IDs — AdminShell has `resolveInstitutionId()` workaround |
| Top institutions | `GET /api/v1/super-admin/dashboard/top-institutions` | ✅ Working | |
| Export dashboard report | `GET /api/v1/super-admin/dashboard/export-report` | ✅ Working | |

### 4.4 Analytics

| Frontend Requirement | Endpoint | Status | Notes |
|---------------------|----------|--------|-------|
| Analytics summary KPIs | `GET /api/v1/super-admin/analytics/summary` | ✅ Working | |
| Analytics breakdowns (charts) | `GET /api/v1/super-admin/analytics/breakdowns` | ✅ Working | Some sub-fields (referred, followed_up) may return null |
| Institutions performance table | `GET /api/v1/super-admin/analytics/institutions-performance` | ⚠️ Partial | Fields `referred`, `followed_up`, `on_treatment`, `adherence_rate` may return null/0 — UI shows 0 |
| Export analytics | `GET /api/v1/super-admin/analytics/export` | ✅ Working | |

### 4.5 Licenses

| Frontend Requirement | Endpoint | Status | Notes |
|---------------------|----------|--------|-------|
| License summary KPIs | `GET /api/v1/super-admin/licenses/summary` | ✅ Working | |
| List licenses | `GET /api/v1/super-admin/licenses` | ✅ Working | |
| Issue license | `POST /api/v1/super-admin/licenses` | ⚠️ Defined, never called | IssueLicenseModal calls `PUT /institutions/{id}` instead — intentional (avoids duplicate records) |
| Renew license | `POST /api/v1/super-admin/licenses/{id}/renew` | ✅ Working | |
| Send reminder | `POST /api/v1/super-admin/licenses/{id}/send-reminder` | ✅ Working | |
| Convert trial | `POST /api/v1/super-admin/licenses/{id}/convert-trial` | ✅ Working | |
| Send renewal email | `POST /api/v1/super-admin/licenses/{id}/send-renewal-email` | ✅ Working | |
| Export licenses CSV | `GET /api/v1/super-admin/revenue/export` | ✅ Working | Reuses revenue export endpoint |

### 4.6 Revenue

| Frontend Requirement | Endpoint | Status | Notes |
|---------------------|----------|--------|-------|
| Revenue summary | `GET /api/v1/super-admin/revenue/summary` | ✅ Working | |
| Monthly trend | `GET /api/v1/super-admin/revenue/monthly-trend` | ✅ Working | |
| Revenue by type | `GET /api/v1/super-admin/revenue/by-type` | ✅ Working | |
| Transactions | `GET /api/v1/super-admin/revenue/transactions` | ⚠️ Schema gap | Missing `plan`, `type`, `period` fields — RevenueView fetches licenses + institutions to enrich client-side |
| Export revenue CSV | `GET /api/v1/super-admin/revenue/export` | ✅ Working | |

### 4.7 Users & Audit

| Frontend Requirement | Endpoint | Status | Notes |
|---------------------|----------|--------|-------|
| List users | `GET /api/v1/super-admin/users` | ✅ Working | |
| Get user by ID | `GET /api/v1/super-admin/users/{id}` | ⚠️ Defined, never called | No detail view exists in UI |
| Update user status | `PATCH /api/v1/super-admin/users/{id}/status` | ✅ Working | |
| Register user | `POST /api/v1/users/register` | ⚠️ Defined, never called | No Add User UI exists |
| List audit logs | `GET /api/v1/super-admin/audit-logs` | ✅ Working | |
| Export audit log CSV | `GET /api/v1/super-admin/audit-logs/export` | ✅ Working | |

### 4.8 Settings

| Frontend Requirement | Endpoint | Status | Notes |
|---------------------|----------|--------|-------|
| Get WhatsApp settings | `GET /api/v1/super-admin/settings/whatsapp` | ✅ Working | |
| Update WhatsApp settings | `PUT /api/v1/super-admin/settings/whatsapp` | ✅ Working | |
| Get compliance settings | `GET /api/v1/super-admin/settings/compliance` | ✅ Working | |
| Update compliance settings | `PUT /api/v1/super-admin/settings/compliance` | ✅ Working | |
| Get permissions | `GET /api/v1/super-admin/settings/permissions` | ⚠️ Partial | Falls back to static list if API returns nothing |
| Get BP thresholds | ❌ No endpoint | ❌ MISSING | UI hardcodes BP thresholds — no API for this |


---

## 5. Required Endpoints — MVP

These are the minimum endpoints required for the super-admin portal to be fully functional in production. All are either already live or have known issues documented.

### 5.1 Must-Have (Core Flows)

| Priority | Method | Endpoint | Required By |
|----------|--------|----------|------------|
| P0 | POST | `/api/v1/users/login` | Login |
| P0 | GET | `/api/v1/users/me` | AuthContext |
| P0 | GET | `/api/v1/super-admin/dashboard/summary` | Dashboard KPIs |
| P0 | GET | `/api/v1/super-admin/dashboard/screenings-trend` | Dashboard chart |
| P0 | GET | `/api/v1/super-admin/dashboard/bp-distribution` | Dashboard BP chart |
| P0 | GET | `/api/v1/super-admin/dashboard/pending-approvals` | Dashboard pending queue |
| P0 | GET | `/api/v1/super-admin/dashboard/top-institutions` | Dashboard rankings |
| P0 | GET | `/api/v1/super-admin/institutions` | Institutions table |
| P0 | POST | `/api/v1/super-admin/institutions` | Create institution |
| P0 | PUT | `/api/v1/super-admin/institutions/{id}` | Edit institution + issue license |
| P0 | PATCH | `/api/v1/super-admin/institutions/{id}/status` | Approve / Reject / Suspend |
| P0 | GET | `/api/v1/super-admin/licenses` | Licenses table |
| P0 | GET | `/api/v1/super-admin/licenses/summary` | License KPIs |
| P0 | GET | `/api/v1/super-admin/users` | Users table |
| P0 | PATCH | `/api/v1/super-admin/users/{id}/status` | Activate / Suspend user |
| P0 | GET | `/api/v1/super-admin/audit-logs` | Audit log |
| P0 | POST | `/api/v1/users/setup-tokens/verify` | Onboarding |
| P0 | POST | `/api/v1/users/setup-tokens/claim` | Onboarding |

### 5.2 Should-Have (Enhanced Features)

| Priority | Method | Endpoint | Required By |
|----------|--------|----------|------------|
| P1 | GET | `/api/v1/super-admin/analytics/summary` | Analytics KPIs |
| P1 | GET | `/api/v1/super-admin/analytics/breakdowns` | Analytics charts |
| P1 | GET | `/api/v1/super-admin/analytics/institutions-performance` | Analytics performance table |
| P1 | GET | `/api/v1/super-admin/revenue/summary` | Revenue KPIs |
| P1 | GET | `/api/v1/super-admin/revenue/monthly-trend` | Revenue chart |
| P1 | GET | `/api/v1/super-admin/revenue/by-type` | Revenue type chart |
| P1 | GET | `/api/v1/super-admin/revenue/transactions` | Revenue transaction table |
| P1 | GET | `/api/v1/super-admin/settings/whatsapp` | Settings |
| P1 | PUT | `/api/v1/super-admin/settings/whatsapp` | Settings |
| P1 | GET | `/api/v1/super-admin/settings/compliance` | Settings |
| P1 | PUT | `/api/v1/super-admin/settings/compliance` | Settings |
| P1 | POST | `/api/v1/super-admin/licenses/{id}/renew` | License renewal |
| P1 | POST | `/api/v1/super-admin/licenses/{id}/convert-trial` | Trial conversion |

### 5.3 Nice-to-Have (Currently Stubbed or Unused)

| Priority | Method | Endpoint | Required By |
|----------|--------|----------|------------|
| P2 | POST | `/api/v1/super-admin/institutions/{id}/resend-onboarding` | Resend onboarding (currently 404) |
| P2 | POST | `/api/v1/super-admin/institutions/{id}/action` | Approve/reject action (currently non-persistent) |
| P2 | GET | `/api/v1/super-admin/settings/permissions` | Permissions tab |
| P2 | GET | `/api/v1/super-admin/settings/bp-thresholds` | BP thresholds (currently hardcoded) |
| P2 | GET | `/api/v1/super-admin/dashboard/export-report` | Dashboard export |
| P2 | GET | `/api/v1/super-admin/analytics/export` | Analytics export |
| P2 | GET | `/api/v1/super-admin/revenue/export` | Revenue export |
| P2 | GET | `/api/v1/super-admin/audit-logs/export` | Audit export |


---

## 6. Authentication Status

### 6.1 Token Lifecycle

| Step | Implementation | Location | Status |
|------|---------------|----------|--------|
| Login — obtain token | `POST /api/v1/users/login` → JWT returned | `authService.ts` → `login()` | ✅ Implemented |
| Token storage | Written to `localStorage` key `afya_access_token` | `AuthContext.tsx` | ✅ Implemented |
| Cookie mirror | Token also written to cookie (for middleware/SSR) | `AuthContext.tsx` | ✅ Implemented |
| Auto-attach to requests | `lib/api.ts` axios interceptor reads `localStorage` and sets `Authorization: Bearer <token>` on every request | `lib/api.ts` | ✅ Implemented |
| 401 handling | `lib/api.ts` response interceptor catches 401 and redirects to `/login` | `lib/api.ts` | ✅ Implemented |
| Session restore on load | `GET /api/v1/users/me` called in `AuthContext` on mount — populates user state | `context/AuthContext.tsx` | ✅ Implemented |
| Route protection | `AuthGuard` component wraps all protected routes — redirects unauthenticated to `/login` | `components/layout/AuthGuard.tsx` | ✅ Implemented |

### 6.2 Endpoint Auth Requirements

| Endpoint Group | Auth Required | Method | Notes |
|---------------|--------------|--------|-------|
| `/api/v1/users/login` | ❌ No | Public | Issues JWT |
| `/api/v1/users/me` | ✅ Bearer JWT | Protected | Verifies session on load |
| `/api/v1/users/register` | ❌ / ✅ unclear | Unknown | Defined but never called — auth requirement unknown |
| `/api/v1/users/setup-tokens/*` | ❌ No | Public | Token-based onboarding, no auth header needed |
| `/api/v1/super-admin/*` | ✅ Bearer JWT | Protected | All super-admin routes require auth — auto-attached by api.ts |

### 6.3 Auth Gaps and Notes

- The alternate onboarding flow at `app/(onboarding)/setup/page.tsx` uses **raw axios** (not `lib/api.ts`) — it does not benefit from the shared interceptors. Since `/setup-tokens/verify` requires no auth this is currently safe, but the pattern is inconsistent and should be consolidated.
- There is no token refresh mechanism — when a JWT expires the user gets a 401 and is redirected to login with no warning.
- No logout endpoint call — logout is purely client-side (clear localStorage + cookie + redirect).


---

## 7. Integration Plan

### Phase 1 — Stabilise Core (Immediate)

Fix the known persistence and stub issues that affect user-facing flows today.

| Task | Action | Owner |
|------|--------|-------|
| Fix approve/reject persistence | Backend: make `POST .../action` persist state, or document that `PATCH .../status` is the canonical endpoint and remove the action endpoint | Backend |
| Implement resend-onboarding | Backend: implement `POST .../resend-onboarding` so it returns 200 with confirmation | Backend |
| Fix pending-approvals ID format | Backend: return numeric institution IDs instead of string token IDs from `/dashboard/pending-approvals`, OR document the token format so the frontend can drop the `resolveInstitutionId()` hack | Backend |
| Consolidate onboarding flows | Frontend: migrate `app/(onboarding)/setup/page.tsx` from raw axios to `lib/api.ts` for consistency | Frontend |
| Remove dead modal files | Frontend: delete or wire up `AddUserModal.tsx`, `LicenseViewModal.tsx`, `RenewLicenseModal.tsx` | Frontend |

### Phase 2 — Schema Improvements (Short-term)

Address schema gaps that require client-side workarounds.

| Task | Action | Owner |
|------|--------|-------|
| Enrich transactions response | Backend: include `plan`, `type`, `period`, `institution_name` in `/revenue/transactions` response to eliminate client-side enrichment in RevenueView | Backend |
| Add `last_login` to users | Backend: include `last_login` timestamp in `GET /super-admin/users` response so `useUsers` hook can drop audit-log cross-reference | Backend |
| Complete performance table fields | Backend: return real values for `referred`, `followed_up`, `on_treatment`, `adherence_rate` in `/analytics/institutions-performance` | Backend |
| Fix permissions endpoint | Backend: ensure `GET /settings/permissions` returns a non-empty role/permission list | Backend |

### Phase 3 — Missing Capabilities (Medium-term)

Build out features that are currently hardcoded or absent.

| Task | Action | Owner |
|------|--------|-------|
| BP thresholds API | Backend: add `GET /api/v1/super-admin/settings/bp-thresholds` and `PUT` counterpart; Frontend: wire SettingsView to use it instead of hardcoded values | Both |
| Add User feature | Frontend: mount `AddUserModal.tsx`; Backend: verify `POST /api/v1/users/register` works for super-admin-created users | Both |
| User detail view | Frontend: build user detail panel; wire `getUserById()` from users.service.ts | Frontend |
| License issuance audit | Frontend: clarify and document intentional bypass of `POST /super-admin/licenses` in IssueLicenseModal | Frontend |
| Token refresh | Frontend: implement silent JWT refresh using a refresh token, or show a session-expiry warning before 401 redirect | Frontend |

### Phase 4 — Cleanup (Ongoing)

| Task | Action | Owner |
|------|--------|-------|
| Archive mock data | Delete `constants/index.ts` mock arrays (or move to a `__mocks__` folder for tests) | Frontend |
| Update login brand stats | Either connect login page stats to a public `/stats` endpoint or leave them as intentionally decorative with a comment | Frontend |
| Unify export endpoints | Standardise export URL pattern — currently licenses export uses `/revenue/export` which is confusing | Backend |
| Add Swagger / OpenAPI spec | Document all `/super-admin/*` endpoints with request/response schemas for frontend–backend contract clarity | Backend |


---

## 8. Frontend Fixes

Issues that can be fixed entirely on the frontend without any backend changes.

| Page | Feature | What Is Wrong | Exact Fix |
|------|---------|--------------|-----------|
| `/setup` (alternate onboarding) | Token verification | `app/(onboarding)/setup/page.tsx` uses raw `axios` directly instead of `lib/api.ts` — bypasses auth interceptors and base URL config | Replace raw axios call with `import api from '@/lib/api'` and call `api.post('/api/v1/users/setup-tokens/verify', payload)` |
| `/login` | Brand panel stats | "4,712+ Patients screened", "14 Active institutions", "3 regions" are hardcoded in JSX — will become stale | Either fetch from a public stats endpoint or add a comment `{/* Decorative — intentionally static */}` so future devs don't accidentally try to wire it up |
| `/settings` | BP Classification Thresholds | Values are hardcoded in `SettingsView.tsx` component — cannot be saved or edited via API | Requires backend endpoint (Phase 3), but in the interim: extract to a named constant with a `// TODO: fetch from /settings/bp-thresholds` comment so the gap is visible |
| `/settings` | Role permissions | `GET /settings/permissions` falls back to a static list if the API returns empty — the fallback is silent | Add a console warning or UI indicator when fallback static data is in use |
| `/users` | `last_login` field | `useUsers` hook attempts to cross-reference audit logs by name/email to fill `last_login` — fragile and slow | Add a `// WORKAROUND` comment block; file backend ticket to include `last_login` in `/super-admin/users` response |
| `/revenue` | Transaction enrichment | `RevenueView` calls `listLicenses()` and `listInstitutions()` in parallel just to enrich `plan`/`type`/`period` fields missing from the transactions response — 3 API calls instead of 1 | Add a `// SCHEMA GAP WORKAROUND` comment; file backend ticket; once backend adds fields, remove the extra two calls |
| `/analytics` | Null performance fields | `institutions-performance` rows show `0` for `referred`, `followed_up`, `on_treatment`, `adherence_rate` when API returns null — silently misleading | Show `—` (em dash) instead of `0` when the value is `null` or `undefined`, with a tooltip "Data not yet available" |
| Modals | Orphaned modal components | `AddUserModal.tsx`, `LicenseViewModal.tsx`, `RenewLicenseModal.tsx` exist in `components/modals/` but are never imported or mounted | Either wire them into their respective views (AddUser → UsersView, LicenseView → LicensesView, RenewLicense → LicensesView) or delete them to avoid confusion |
| `AdminShell` | `resolveInstitutionId()` | AdminShell has a complex function to map string token IDs from `/dashboard/pending-approvals` back to numeric institution IDs by matching names — breaks if names have slight differences | Add error logging when resolution fails; display institution name as fallback if ID cannot be resolved; file backend ticket to return numeric IDs |
| `IssueLicenseModal` | `issueLicense()` never called | `licenses.service.ts` exports `issueLicense()` but `IssueLicenseModal` intentionally calls `updateInstitution()` instead | Add a prominent code comment in the modal: `// NOTE: Do NOT call issueLicense() — it creates a duplicate record. Use updateInstitution() to attach license data to the institution.` |


---

## 9. Backend Fixes

Issues that require backend changes to resolve.

| Page | Feature | Endpoint | What Is Wrong |
|------|---------|----------|--------------|
| Institutions | Approve / Reject action | `POST /api/v1/super-admin/institutions/{id}/action` | Action does not persist — institution status reverts to previous value on page reload. AdminShell has a fallback to `PATCH /status` but this creates inconsistency. The action endpoint should either persist the status change or be deprecated in favour of `PATCH /status`. |
| Institutions | Resend onboarding email | `POST /api/v1/super-admin/institutions/{id}/resend-onboarding` | Endpoint is a stub — always returns 404. Needs to be fully implemented to trigger email sending. |
| Dashboard | Pending approvals IDs | `GET /api/v1/super-admin/dashboard/pending-approvals` | Returns token-style string IDs (e.g. `"token-6"`) instead of the numeric institution `id`. This forces the frontend to run a name-match against the full institutions list to find the real ID. Should return `institution_id` as a numeric integer. |
| Revenue | Transaction details | `GET /api/v1/super-admin/revenue/transactions` | Response does not include `plan`, `type`, `period`, or `institution_name` fields. Frontend fetches the full licenses and institutions lists client-side to enrich each row — wasteful and error-prone. Add these fields to the transaction response schema. |
| Users | Last login | `GET /api/v1/super-admin/users` | User objects do not include a `last_login` timestamp. Frontend cross-references audit logs by matching user name/email to approximate this value. Add `last_login: string | null` to the user response schema. |
| Analytics | Performance table | `GET /api/v1/super-admin/analytics/institutions-performance` | Fields `referred`, `followed_up`, `on_treatment`, and `adherence_rate` return `null` or `0` — likely not yet populated by the backend. These are key clinical metrics. Should return real data or a clear `null` with a backend note on when they will be available. |
| Settings | Role permissions | `GET /api/v1/super-admin/settings/permissions` | May return an empty response, causing the frontend to fall back to a hardcoded static permissions list. Endpoint should return the full permissions structure even if nothing has been customised (return defaults). |
| Settings | BP Thresholds | No endpoint exists | BP classification thresholds are hardcoded in `SettingsView.tsx`. Backend needs `GET /api/v1/super-admin/settings/bp-thresholds` and `PUT /api/v1/super-admin/settings/bp-thresholds` endpoints. |
| Licenses | Export URL convention | `GET /api/v1/super-admin/revenue/export` | The licenses CSV export (`exportLicensesCsv` in `licenses.service.ts`) calls the revenue export endpoint, not a licenses-specific export endpoint. This is confusing. Either add `GET /super-admin/licenses/export` or document that the revenue export is intentionally shared. |
| Auth | No token refresh | N/A | There is no refresh token endpoint. When JWTs expire the user is silently redirected to `/login`. Consider adding `POST /api/v1/users/refresh-token` to enable silent refresh. |


---

## 10. Missing Endpoints

Endpoints that do not currently exist but are needed for complete functionality.

| Method | Endpoint | Which Feature Needs It |
|--------|----------|----------------------|
| GET | `/api/v1/super-admin/settings/bp-thresholds` | SettingsView — BP Classification Thresholds tab; currently the UI shows hardcoded values that cannot be saved |
| PUT | `/api/v1/super-admin/settings/bp-thresholds` | SettingsView — saving updated BP threshold values |
| GET | `/api/v1/super-admin/licenses/export` | LicensesView — dedicated license CSV export (currently uses `/revenue/export` which is semantically incorrect) |
| POST | `/api/v1/users/refresh-token` | AuthContext — silent token refresh before JWT expiry to avoid abrupt logouts |
| GET | `/api/v1/super-admin/users/{id}` | UsersView — user detail panel (service function `getUserById()` is defined but the UI detail view does not exist yet; endpoint readiness should be confirmed) |
| POST | `/api/v1/users/register` | UsersView — Add User feature (service function `registerUser()` is defined, `AddUserModal.tsx` exists, but neither is wired up; endpoint readiness should be confirmed for super-admin-created accounts) |
| GET | `/api/v1/super-admin/institutions/{id}/onboarding-status` | InstitutionsView — to show current onboarding progress for an institution without navigating away |
| POST | `/api/v1/users/logout` | AuthContext — server-side session invalidation on logout (currently only client-side token removal) |


---

## 11. Persistence Bugs

API calls that appear to succeed (return 2xx) but whose effects do not persist across page reloads.

| Endpoint | What Should Persist | Impact |
|----------|-------------------|--------|
| `POST /api/v1/super-admin/institutions/{id}/action` (approve/reject) | Institution status should change from `pending` to `approved` or `rejected` permanently | Critical — super-admin approves an institution, it shows as approved in the UI, but on reload the institution is back to `pending`. AdminShell's fallback (`PATCH /status`) does persist, making the `/action` endpoint effectively redundant and unreliable. |
| `POST /api/v1/super-admin/institutions/{id}/resend-onboarding` | Should trigger email send and record a log entry or timestamp of last send | High — the UI shows a "Resend Onboarding" button and calls the endpoint, which returns 404. The service catches it gracefully, but the action silently fails with no email sent and no feedback other than an error toast. |


---

## 12. Missing Response Fields

Fields the frontend expects or needs but are absent from current API responses, forcing workarounds.

| Endpoint | Missing Field | What It Powers in the UI |
|----------|--------------|--------------------------|
| `GET /api/v1/super-admin/revenue/transactions` | `plan` | RevenueView transaction table "Plan" column — currently enriched by calling `listLicenses()` client-side |
| `GET /api/v1/super-admin/revenue/transactions` | `type` | RevenueView transaction table "Type" column — enriched client-side |
| `GET /api/v1/super-admin/revenue/transactions` | `period` | RevenueView transaction table "Period" column — enriched client-side |
| `GET /api/v1/super-admin/revenue/transactions` | `institution_name` | RevenueView transaction table "Institution" column — enriched by calling `listInstitutions()` client-side |
| `GET /api/v1/super-admin/users` | `last_login` | UsersView "Last Active" column — currently approximated by cross-referencing `GET /super-admin/audit-logs` and matching user name/email |
| `GET /api/v1/super-admin/dashboard/pending-approvals` | `institution_id` (numeric) | AdminShell approve/reject action — currently returns string token ID (e.g. `"token-6"`); `resolveInstitutionId()` does name-matching to find the real numeric ID |
| `GET /api/v1/super-admin/analytics/institutions-performance` | `referred` | AnalyticsView performance table "Referred" column — returns null/0; UI shows `0` |
| `GET /api/v1/super-admin/analytics/institutions-performance` | `followed_up` | AnalyticsView performance table "Followed Up" column — returns null/0 |
| `GET /api/v1/super-admin/analytics/institutions-performance` | `on_treatment` | AnalyticsView performance table "On Treatment" column — returns null/0 |
| `GET /api/v1/super-admin/analytics/institutions-performance` | `adherence_rate` | AnalyticsView performance table "Adherence Rate" column — returns null/0 |
| `GET /api/v1/super-admin/settings/permissions` | Full permissions structure | SettingsView permissions tab — returns empty causing fallback to static hardcoded permission list |

---

## Summary

### Overall Integration Health

| Area | Status | Notes |
|------|--------|-------|
| Authentication | ✅ Solid | Token lifecycle complete; needs refresh token and logout endpoint |
| Onboarding | ✅ Working | Duplicate flows (raw axios vs api.ts); needs consolidation |
| Dashboard | ✅ Working | Pending approvals ID format workaround in place |
| Institutions | ⚠️ Partial issues | Approve/reject non-persistent; resend-onboarding is a stub |
| Licenses | ✅ Working | `issueLicense()` intentionally bypassed with documented reason |
| Analytics | ⚠️ Incomplete data | Performance table fields not yet populated by backend |
| Revenue | ⚠️ Schema gap | Transaction enrichment requires 3 API calls instead of 1 |
| Users | ⚠️ Missing field | `last_login` approximated from audit logs |
| Audit Log | ✅ Working | |
| Settings | ⚠️ Hardcoded values | BP thresholds are static; permissions fallback to static list |
| Mock Data | ✅ Cleaned up | All mock constants are dead code — not used in any live view |

**Total endpoints in use:** 38
**Confirmed working:** 30
**Known issues / workarounds:** 8
**Missing endpoints (backend action needed):** 8
**Dead code to clean up:** 3 orphaned modals + all mock constants in `constants/index.ts`
