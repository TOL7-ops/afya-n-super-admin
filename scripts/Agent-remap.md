# Afya Super Admin — Complete API Remapping Prompt
# Give this entire file to your agent

---

## CONTEXT

The backend has deployed a new `/api/v1/super-admin/*` API.
All 26 endpoints are confirmed live and tested.
Your job is to update every service file, hook, and component
to call the new paths instead of the old ones.

The new base URL for now is the ngrok tunnel:
`https://aa86-2605-59c0-1fc5-cd08-79a9-a618-4600-e8b2.ngrok-free.app`

Store this in your existing API base URL config/env variable so it's
one change when it moves to production.

Every request to the ngrok URL MUST include this header:
`"ngrok-skip-browser-warning": "true"`
Add it to your axios default headers or interceptor — not per-call.

---

## CONFIRMED WORKING ENDPOINTS (26/26 tested)

### DASHBOARD
```
GET /api/v1/super-admin/dashboard/summary
  Returns: { active_institutions, institutions_increment, total_screened, on_active_treatment }
  Replaces: GET /api/v1/analytics/summary (for dashboard KPIs)

GET /api/v1/super-admin/dashboard/screenings-trend
  Returns: { months: [...], screenings: [...] }
  Replaces: GET /api/v1/analytics/timeline

GET /api/v1/super-admin/dashboard/bp-distribution
  Returns: { normal_pct, elevated_pct, stage_1_2_pct, crisis_pct }
  Replaces: bp_distribution_percentages from analytics/summary

GET /api/v1/super-admin/dashboard/pending-approvals
  Returns: array of pending institutions
  Replaces: filtering inactive facilities client-side

GET /api/v1/super-admin/dashboard/top-institutions
  Returns: array with field_workers, screened, on_treatment, adherence per institution
  Replaces: the hardcoded zeros in AdminShell.tsx (THIS FIXES THE ALL-ZEROS BUG)

GET /api/v1/super-admin/dashboard/export-report
  Returns: CSV bytes
  Replaces: GET /api/v1/analytics/export-csv
```

### INSTITUTIONS
```
GET /api/v1/super-admin/institutions?q=&type=&status=&page=1&page_size=20
  Returns: paginated institutions with type field included
  Replaces: GET /api/v1/facilities/

POST /api/v1/super-admin/institutions
  Body: { name, type, region, contact_name, email, phone, license_plan, seats, notes }
  Replaces: POST /api/v1/facilities/
  NOTE: body schema has changed — update CreateInstitutionModal payload

PUT /api/v1/super-admin/institutions/{id}
  Body: { name, type, region, contact_name, email, license_plan, seats }
  Replaces: PATCH /api/v1/facilities/{id} (which was returning 405)
  NOTE: this UNBLOCKS the EditInstitutionModal — wire it now

PATCH /api/v1/super-admin/institutions/{id}/status
  Body: { "is_active": true }  or  { "is_active": false }
  Replaces: PATCH /api/v1/facilities/{id}/suspend?active=true/false
  NOTE: body is now JSON, not a query param

POST /api/v1/super-admin/institutions/{id}/action
  Body: { "action": "approve" }  or  { "action": "reject" }
  Replaces: approve used /suspend, reject was 404
  NOTE: both approve and reject now use this single endpoint

POST /api/v1/super-admin/institutions/{id}/extend-trial
  Body: { "days": 30 }
  Was: missing — now wire the Extend button

POST /api/v1/super-admin/institutions/{id}/resend-onboarding
  Body: none
  Was: missing — wire if you have a resend button
```

### LICENSES
```
GET /api/v1/super-admin/licenses/summary
  Returns: { active_licenses, expiring_licenses, seat_utilization_pct, seats_active }
  Replaces: client-side KPI calculation
  NOTE: THIS FIXES the Seat Utilisation KPI showing "—"

GET /api/v1/super-admin/licenses
  Returns: array of license objects
  Replaces: using /facilities/ as a proxy

POST /api/v1/super-admin/licenses
  Body: { institution_name, plan, start_date, seats, payment_method, notes }
  Replaces: IssueLicenseModal was calling POST /facilities/ (wrong)

POST /api/v1/super-admin/licenses/{id}/renew
  Body: none
  Replaces: POST /api/v1/facilities/{id}/renew (was 404)

POST /api/v1/super-admin/licenses/{id}/send-reminder
  Body: none
  Replaces: the Remind button toast

POST /api/v1/super-admin/licenses/{id}/convert-trial
  Body: { "plan": "Annual Standard (10 seats)", "payment_method": "Bank Transfer" }
  Replaces: ConvertTrialModal was calling suspend endpoint (wrong)

POST /api/v1/super-admin/licenses/{id}/send-renewal-email
  Body: none
  Was: missing
```

### ANALYTICS
```
GET /api/v1/super-admin/analytics/summary
  Returns: { total_screened, high_bp_detections, referrals, follow_up_completions }
  Replaces: GET /api/v1/analytics/summary (for analytics page KPIs)

GET /api/v1/super-admin/analytics/breakdowns
  Returns single object with ALL chart data:
    { region_breakdown, age_distribution, gender_stats,
      monthly_risk_breakdown, detection_rate_trend, ... }
  THIS IS THE KEY ENDPOINT — one call restores all 6 missing chart sections:
    - Hypertension by Region
    - Age Distribution
    - BP Risk by Gender
    - Risk Level Trend
    - Detection Rate Trend
    - (check response keys for exact names)

GET /api/v1/super-admin/analytics/institutions-performance
  Returns: array of per-institution performance stats
  Replaces: the removed per-facility adherence table

GET /api/v1/super-admin/analytics/export
  Returns: CSV bytes
  Replaces: GET /api/v1/analytics/export-csv
```

### REVENUE (entire page was broken — now all working)
```
GET /api/v1/super-admin/revenue/summary
  Returns: { ARR, MRR, renewals_due_30_days, total_revenue }
  Replaces: GET /api/v1/billing/monthly-summary (was 404)

GET /api/v1/super-admin/revenue/monthly-trend
  Returns: { months: [...], revenue: [...] }
  Replaces: GET /api/v1/billing/revenue-timeline (was 404)

GET /api/v1/super-admin/revenue/by-type
  Returns: { Government, NGO, Hospital, Pharmacy, Employer }
  Replaces: the plan-tier proxy chart

GET /api/v1/super-admin/revenue/transactions
  Returns: array of transaction objects (currently empty — no paid transactions yet)
  Replaces: GET /api/v1/billing/transactions (was 404)

GET /api/v1/super-admin/revenue/export
  Returns: CSV bytes
  Replaces: GET /api/v1/billing/export-csv (was 404)
```

### USERS
```
GET /api/v1/super-admin/users
  Returns: array with last_login AND facility name already resolved
  Replaces: GET /api/v1/users/ (which was missing last_login + showing raw facility_id)
  NOTE: no more client-side facility lookup needed — name comes in the response

GET /api/v1/super-admin/users/{id}
  Returns: full user object
  Was: missing

PATCH /api/v1/super-admin/users/{id}/status
  Body: { "is_active": true }   ← reactivate
  Body: { "is_active": false }  ← suspend
  Replaces: PATCH /users/{id}/deactivate for suspend
            PATCH /users/{id}/activate was 404 for reactivate
  NOTE: both actions now use the SAME endpoint — remove the two separate functions,
        replace with one: updateUserStatus(id, isActive: boolean)
```

### AUDIT LOG
```
GET /api/v1/super-admin/audit-logs
  Returns: 8 log entries with agent names resolved
  Replaces: GET /api/v1/users/activity-logs (was empty + missing agent_name)

GET /api/v1/super-admin/audit-logs/export
  Returns: CSV bytes (655 bytes confirmed)
  Replaces: the export button that was 404
```

### SETTINGS
```
GET /api/v1/super-admin/settings/whatsapp
  Returns: { provider, api_key, webhook_url, status }
  Confirmed: provider="Twilio WhatsApp Business", status="connected"
  Replaces: hardcoded static strings

PUT /api/v1/super-admin/settings/whatsapp
  Body: { provider, api_key, webhook_url }
  Wire the "Configure BSP" button to this

GET /api/v1/super-admin/settings/compliance
  Returns: { consent_required, data_retention_days, compliance_standard }
  Confirmed: compliance_standard="Ghana Data Protection Act"
  Replaces: static display

PUT /api/v1/super-admin/settings/compliance
  Body: { consent_required, data_retention_days }
  Wire the save button

GET /api/v1/super-admin/settings/permissions
  Returns: 3 role permission objects
  Replaces: hardcoded static array
```

---

## WHAT IS STILL MISSING (only 1)

```
POST /api/v1/super-admin/institutions/{id}/resend-onboarding
  → Returns 404 — backend hasn't built this yet
  → Keep the existing toast for the resend button for now
```

---

## FACILITYRESPONSE NEW FIELDS (confirmed in response)

The FacilityResponse from `/api/v1/facilities/{id}` now includes:
```
type                    = "Hospital"  (fixes all "NGO" hardcodes)
max_seats               = 10
active_seats            = 1
seat_utilization_percent = 10.0
```

Update anywhere you read from a facility object to use these fields.

---

## COMPLETE TASK LIST FOR THE AGENT

Work in this exact order:

### 1. Update API base URL + add ngrok header
- Change BASE_URL in your axios config / .env to the ngrok URL
- Add `"ngrok-skip-browser-warning": "true"` to axios default headers

### 2. Update service files — replace every old path

**facilities.service.ts / institutions.service.ts:**
- listFacilities()         → GET /api/v1/super-admin/institutions
- createFacility()         → POST /api/v1/super-admin/institutions (update body schema)
- updateFacility()         → PUT /api/v1/super-admin/institutions/{id}
- updateStatus()           → PATCH /api/v1/super-admin/institutions/{id}/status  body: {is_active}
- approveInstitution()     → POST /api/v1/super-admin/institutions/{id}/action  body: {action:"approve"}
- rejectInstitution()      → POST /api/v1/super-admin/institutions/{id}/action  body: {action:"reject"}
- extendTrial()            → POST /api/v1/super-admin/institutions/{id}/extend-trial  body: {days}
- Delete suspendFacility() and reactivateFacility() — replaced by updateStatus()

**licenses.service.ts:**
- getLicensesSummary()     → GET /api/v1/super-admin/licenses/summary
- listLicenses()           → GET /api/v1/super-admin/licenses
- issueLicense()           → POST /api/v1/super-admin/licenses
- renewLicense()           → POST /api/v1/super-admin/licenses/{id}/renew
- sendReminder()           → POST /api/v1/super-admin/licenses/{id}/send-reminder
- convertTrial()           → POST /api/v1/super-admin/licenses/{id}/convert-trial
- sendRenewalEmail()       → POST /api/v1/super-admin/licenses/{id}/send-renewal-email

**analytics.service.ts:**
- getDashboardSummary()    → GET /api/v1/super-admin/dashboard/summary
- getScreeningsTrend()     → GET /api/v1/super-admin/dashboard/screenings-trend
- getBpDistribution()      → GET /api/v1/super-admin/dashboard/bp-distribution
- getPendingApprovals()    → GET /api/v1/super-admin/dashboard/pending-approvals
- getTopInstitutions()     → GET /api/v1/super-admin/dashboard/top-institutions
- getAnalyticsSummary()    → GET /api/v1/super-admin/analytics/summary
- getAnalyticsBreakdowns() → GET /api/v1/super-admin/analytics/breakdowns  ← NEW
- getInstitutionsPerformance() → GET /api/v1/super-admin/analytics/institutions-performance
- exportAnalytics()        → GET /api/v1/super-admin/analytics/export
- exportDashboard()        → GET /api/v1/super-admin/dashboard/export-report

**revenue.service.ts:**
- getRevenueSummary()      → GET /api/v1/super-admin/revenue/summary
- getRevenueMonthlyTrend() → GET /api/v1/super-admin/revenue/monthly-trend
- getRevenueByType()       → GET /api/v1/super-admin/revenue/by-type
- getTransactions()        → GET /api/v1/super-admin/revenue/transactions
- exportRevenue()          → GET /api/v1/super-admin/revenue/export

**users.service.ts:**
- listUsers()              → GET /api/v1/super-admin/users
- getUserById()            → GET /api/v1/super-admin/users/{id}
- updateUserStatus()       → PATCH /api/v1/super-admin/users/{id}/status  body: {is_active}
- Delete deactivateUser() and reactivateUser() — replace both with updateUserStatus(id, bool)

**audit.service.ts:**
- getAuditLogs()           → GET /api/v1/super-admin/audit-logs
- exportAuditLogs()        → GET /api/v1/super-admin/audit-logs/export

**settings.service.ts:**
- getWhatsappSettings()    → GET /api/v1/super-admin/settings/whatsapp
- updateWhatsappSettings() → PUT /api/v1/super-admin/settings/whatsapp
- getComplianceSettings()  → GET /api/v1/super-admin/settings/compliance
- updateComplianceSettings() → PUT /api/v1/super-admin/settings/compliance
- getPermissions()         → GET /api/v1/super-admin/settings/permissions

### 3. Wire AnalyticsView.tsx to breakdowns endpoint
Call GET /api/v1/super-admin/analytics/breakdowns once on mount.
Map each key in the response to the corresponding chart section:
- region_breakdown    → Hypertension by Region chart
- age_distribution    → Age Distribution chart
- gender_stats        → BP Risk by Gender chart
- monthly_risk_breakdown → Risk Level Trend chart
- detection_rate_trend   → Detection Rate chart
All 6 sections should render with real data instead of "not yet available"

### 4. Wire RevenueView.tsx
Replace all empty states and proxy data with real revenue endpoint calls.
The revenue summary returns ARR=6000, MRR=500 — real data is there.

### 5. Fix DashboardView.tsx top institutions table
Replace the hardcoded zeros with data from:
GET /api/v1/super-admin/dashboard/top-institutions
Map: field_workers, screened, on_treatment, adherence from response.

### 6. Fix InstitutionsView.tsx type column
FacilityResponse now returns `type` field directly.
Remove all name-heuristic fallback logic.
Replace with: facility.type ?? "—"

### 7. Fix UsersView.tsx
- Switch to /super-admin/users — facility name now comes in response, no lookup needed
- last_login field now exists in UserResponse — add the column back
- Suspend and Reactivate both call updateUserStatus(id, bool) now

### 8. Fix AuditView.tsx
- Switch to /super-admin/audit-logs — agent_name now resolved in response
- Wire export button to /super-admin/audit-logs/export

### 9. Fix SettingsView.tsx
- Load WhatsApp config from /super-admin/settings/whatsapp (replace static strings)
- Load compliance from /super-admin/settings/compliance
- Load permissions from /super-admin/settings/permissions (replace static array)

### 10. Wire EditInstitutionModal
The PUT /api/v1/super-admin/institutions/{id} endpoint now exists and works.
Import and mount EditInstitutionModal in AdminShell.tsx — it was built but never mounted.
Wire the Edit button in InstitutionsView to open it.

---

## RULES
- Do not touch /api/v1/templates/* — those paths stay the same
- Do not touch /api/v1/users/login or /api/v1/users/register — those stay the same
- Do not remove any UI sections — restore all of them with real data
- Never fall back to mock/static data — show empty state if API returns nothing
- The ngrok URL is temporary — use an environment variable for BASE_URL
  so it's one line to change when backend deploys to production Railway URL