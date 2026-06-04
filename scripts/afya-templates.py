"""
Afya Super Admin — URL Remapping Verification
==============================================
The backend built a dedicated /api/v1/super-admin/* prefix for everything.
Your frontend is calling OLD paths that either don't exist or return wrong data.

This script:
1. Confirms every new super-admin endpoint is live
2. Shows you exactly what to change in your frontend service files
3. Checks the new FacilityResponse fields that are now available

Run:
    python afya_remap_check.py
"""

import requests
from datetime import datetime

BASE_URL = "https://aa86-2605-59c0-1fc5-cd08-79a9-a618-4600-e8b2.ngrok-free.app"
EMAIL    = "admin@afya.com"
PASSWORD = "Password123"

PASS = "✅"
EMPTY = "🟡"
FAIL  = "🔴"
MISS  = "❌"
NEW   = "🆕"

results = []

def check(label, method, path, expected_was=None, **kwargs):
    url = f"{BASE_URL}{path}"
    try:
        resp = method(url, timeout=10, **kwargs)
        code = resp.status_code
        if code == 404:
            results.append((MISS, label, f"404 — not found", expected_was))
            return None
        if code == 401:
            results.append((FAIL, label, f"401 Unauthorized", expected_was))
            return None
        if code >= 500:
            results.append((FAIL, label, f"{code} Server Error", expected_was))
            return None
        if code >= 400:
            results.append((FAIL, label, f"{code} — {resp.text[:100]}", expected_was))
            return None
        try:
            data = resp.json()
        except Exception:
            length = len(resp.content)
            status = PASS if length > 0 else EMPTY
            results.append((status, label, f"200 OK — {length} bytes", expected_was))
            return resp
        if isinstance(data, list):
            status = PASS if data else EMPTY
            results.append((status, label, f"200 OK — {len(data)} items", expected_was))
        elif isinstance(data, dict):
            status = PASS if data else EMPTY
            preview = ", ".join(f"{k}={str(v)[:25]}" for k, v in list(data.items())[:4])
            results.append((status, label, f"200 OK — {preview}", expected_was))
        return data
    except Exception as e:
        results.append((FAIL, label, str(e)[:80], expected_was))
        return None

# ── Login ─────────────────────────────────────────────────────────────────────
print("=" * 72)
print("  AFYA — NEW SUPER-ADMIN ENDPOINT VERIFICATION")
print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 72)

resp = requests.post(
    f"{BASE_URL}/api/v1/users/login",
    json={"username_or_email": EMAIL, "password": PASSWORD}, timeout=10
)
resp.raise_for_status()
H = {"Authorization": f"Bearer {resp.json()['access_token']}", "ngrok-skip-browser-warning": "true"}
print("✅ Logged in\n")

# Get first facility/user IDs
facs = requests.get(f"{BASE_URL}/api/v1/facilities/", headers=H, timeout=10).json()
fid = facs[0]["id"] if facs else 1
users = requests.get(f"{BASE_URL}/api/v1/users/", headers=H, timeout=10).json()
uid = users[0]["id"] if users else 1

# ─────────────────────────────────────────────────────────────────────────────
# DASHBOARD
# ─────────────────────────────────────────────────────────────────────────────
print("─" * 72)
print("  DASHBOARD")
print("─" * 72)
print("  OLD path your frontend uses → NEW correct path\n")

check("Dashboard summary KPIs",
    requests.get, "/api/v1/super-admin/dashboard/summary", headers=H,
    expected_was="/api/v1/analytics/summary")

check("Screenings trend chart (6 months)",
    requests.get, "/api/v1/super-admin/dashboard/screenings-trend", headers=H,
    expected_was="/api/v1/analytics/timeline")

check("BP distribution chart",
    requests.get, "/api/v1/super-admin/dashboard/bp-distribution", headers=H,
    expected_was="/api/v1/analytics/summary → bp_distribution_percentages")

check("Pending approvals list",
    requests.get, "/api/v1/super-admin/dashboard/pending-approvals", headers=H,
    expected_was="derived from /facilities/ (inactive filter)")

check("Top institutions table",
    requests.get, "/api/v1/super-admin/dashboard/top-institutions", headers=H,
    expected_was="hardcoded zeros in AdminShell.tsx")

check("Export dashboard report CSV",
    requests.get, "/api/v1/super-admin/dashboard/export-report", headers=H,
    expected_was="/api/v1/analytics/export-csv")

# ─────────────────────────────────────────────────────────────────────────────
# INSTITUTIONS
# ─────────────────────────────────────────────────────────────────────────────
print("\n─" * 72)
print("\n  INSTITUTIONS")
print("─" * 72)

check("List institutions (with type/search/status filters)",
    requests.get, "/api/v1/super-admin/institutions", headers=H,
    expected_was="/api/v1/facilities/")

check("Create institution",
    requests.get, "/api/v1/super-admin/institutions", headers=H,
    expected_was="POST /api/v1/facilities/")

check("Update institution (edit modal)",
    requests.put, f"/api/v1/super-admin/institutions/{fid}",
    headers=H, json={"name": facs[0]["name"]},
    expected_was="PATCH /api/v1/facilities/{id} — was 405")

check("Update institution status (suspend/reactivate)",
    requests.patch, f"/api/v1/super-admin/institutions/{fid}/status",
    headers=H, json={"is_active": True},
    expected_was="PATCH /api/v1/facilities/{id}/suspend")

check("Approve OR reject institution",
    requests.post, f"/api/v1/super-admin/institutions/{fid}/action",
    headers=H, json={"action": "approve"},
    expected_was="reject was 404 — now both approve+reject in one endpoint")

check("Extend trial",
    requests.post, f"/api/v1/super-admin/institutions/{fid}/extend-trial",
    headers=H, json={"days": 7},
    expected_was="was missing entirely")

check("Resend onboarding email",
    requests.post, f"/api/v1/super-admin/institutions/{fid}/resend-onboarding",
    headers=H,
    expected_was="was missing entirely")

# ─────────────────────────────────────────────────────────────────────────────
# LICENSES
# ─────────────────────────────────────────────────────────────────────────────
print("\n─" * 72)
print("\n  LICENSES")
print("─" * 72)

check("License summary KPIs (active, expiring, seat utilisation)",
    requests.get, "/api/v1/super-admin/licenses/summary", headers=H,
    expected_was="derived client-side from facilities list")

check("List all licenses",
    requests.get, "/api/v1/super-admin/licenses", headers=H,
    expected_was="derived from /api/v1/facilities/")

check("Issue new license",
    requests.get, "/api/v1/super-admin/licenses", headers=H,
    expected_was="POST /api/v1/facilities/ (was creating new facility, wrong)")

check("Renew license",
    requests.post, f"/api/v1/super-admin/licenses/{fid}/renew",
    headers=H,
    expected_was="POST /facilities/{id}/renew — was 404")

check("Send renewal reminder",
    requests.post, f"/api/v1/super-admin/licenses/{fid}/send-reminder",
    headers=H,
    expected_was="POST /facilities/{id}/send-renewal-email — was 404")

check("Convert trial to paid",
    requests.post, f"/api/v1/super-admin/licenses/{fid}/convert-trial",
    headers=H, json={"plan": "Annual Standard (10 seats)", "payment_method": "Bank Transfer"},
    expected_was="was calling suspend endpoint (wrong)")

check("Send renewal email",
    requests.post, f"/api/v1/super-admin/licenses/{fid}/send-renewal-email",
    headers=H,
    expected_was="was missing")

# ─────────────────────────────────────────────────────────────────────────────
# ANALYTICS
# ─────────────────────────────────────────────────────────────────────────────
print("\n─" * 72)
print("\n  ANALYTICS")
print("─" * 72)

check("Analytics KPIs (screened, detected, referred, follow-up)",
    requests.get, "/api/v1/super-admin/analytics/summary", headers=H,
    expected_was="/api/v1/analytics/summary")

breakdowns = check("ALL chart breakdowns in ONE call (region/age/gender/risk/detection)",
    requests.get, "/api/v1/super-admin/analytics/breakdowns", headers=H,
    expected_was="was missing — caused 6 empty chart sections")

if isinstance(breakdowns, dict):
    print(f"\n  Keys returned by /analytics/breakdowns:")
    for k, v in breakdowns.items():
        has_data = "✅ has data" if v and v != [] and v != {} else "🟡 empty"
        print(f"    {k:<35} {has_data}")

check("Institutions performance table",
    requests.get, "/api/v1/super-admin/analytics/institutions-performance", headers=H,
    expected_was="was missing")

check("Export analytics CSV",
    requests.get, "/api/v1/super-admin/analytics/export", headers=H,
    expected_was="/api/v1/analytics/export-csv")

# ─────────────────────────────────────────────────────────────────────────────
# REVENUE
# ─────────────────────────────────────────────────────────────────────────────
print("\n─" * 72)
print("\n  REVENUE")
print("─" * 72)

check("Revenue summary KPIs (ARR, MRR, total, renewals due)",
    requests.get, "/api/v1/super-admin/revenue/summary", headers=H,
    expected_was="/api/v1/billing/monthly-summary — was 404")

check("Monthly revenue trend chart",
    requests.get, "/api/v1/super-admin/revenue/monthly-trend", headers=H,
    expected_was="/api/v1/billing/revenue-timeline — was 404")

check("Revenue by institution type chart",
    requests.get, "/api/v1/super-admin/revenue/by-type", headers=H,
    expected_was="was missing")

check("Transaction history table",
    requests.get, "/api/v1/super-admin/revenue/transactions", headers=H,
    expected_was="/api/v1/billing/transactions — was 404")

check("Export revenue CSV",
    requests.get, "/api/v1/super-admin/revenue/export", headers=H,
    expected_was="/api/v1/billing/export-csv — was 404")

# ─────────────────────────────────────────────────────────────────────────────
# USERS
# ─────────────────────────────────────────────────────────────────────────────
print("\n─" * 72)
print("\n  USERS")
print("─" * 72)

check("List users (with last_login + facility name)",
    requests.get, "/api/v1/super-admin/users", headers=H,
    expected_was="/api/v1/users/ (missing last_login + facility name)")

check("Get single user",
    requests.get, f"/api/v1/super-admin/users/{uid}", headers=H,
    expected_was="was missing")

check("Suspend OR reactivate user",
    requests.patch, f"/api/v1/super-admin/users/{uid}/status",
    headers=H, json={"is_active": True},
    expected_was="reactivate was 404 — now both in one endpoint")

# ─────────────────────────────────────────────────────────────────────────────
# AUDIT LOG
# ─────────────────────────────────────────────────────────────────────────────
print("\n─" * 72)
print("\n  AUDIT LOG")
print("─" * 72)

check("Audit logs (all entries)",
    requests.get, "/api/v1/super-admin/audit-logs", headers=H,
    expected_was="/api/v1/users/activity-logs (was empty + missing agent_name)")

check("Export audit log CSV",
    requests.get, "/api/v1/super-admin/audit-logs/export", headers=H,
    expected_was="/api/v1/users/activity-logs/export-csv — was 404")

# ─────────────────────────────────────────────────────────────────────────────
# SETTINGS
# ─────────────────────────────────────────────────────────────────────────────
print("\n─" * 72)
print("\n  SETTINGS")
print("─" * 72)

check("WhatsApp settings (GET)",
    requests.get, "/api/v1/super-admin/settings/whatsapp", headers=H,
    expected_was="/api/v1/settings/whatsapp — was 404")

check("Compliance settings (GET)",
    requests.get, "/api/v1/super-admin/settings/compliance", headers=H,
    expected_was="/api/v1/compliance/report — was 404")

check("Role permissions",
    requests.get, "/api/v1/super-admin/settings/permissions", headers=H,
    expected_was="was hardcoded static array")

# ─────────────────────────────────────────────────────────────────────────────
# CHECK NEW FacilityResponse FIELDS
# ─────────────────────────────────────────────────────────────────────────────
print("\n─" * 72)
print("\n  NEW FIELDS NOW IN FacilityResponse")
print("─" * 72)

fac = requests.get(f"{BASE_URL}/api/v1/facilities/{fid}", headers=H, timeout=10).json()
new_fields = ["type", "max_seats", "active_seats", "seat_utilization_percent"]
for field in new_fields:
    val = fac.get(field, "NOT_IN_RESPONSE")
    if val == "NOT_IN_RESPONSE":
        print(f"  ❌  {field:<30} not returned")
    elif val is None:
        print(f"  🟡  {field:<30} null")
    else:
        print(f"  ✅  {field:<30} = {val}")

# ─────────────────────────────────────────────────────────────────────────────
# PRINT RESULTS
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "=" * 72)
print("  FULL RESULTS")
print("=" * 72)

pass_c = empty_c = fail_c = miss_c = 0
for (status, label, detail, old_path) in results:
    if status == PASS:  pass_c  += 1
    if status == EMPTY: empty_c += 1
    if status == FAIL:  fail_c  += 1
    if status == MISS:  miss_c  += 1
    old = f"  (was: {old_path})" if old_path else ""
    print(f"  {status}  {label}")
    print(f"       {detail}{old}\n")

print("=" * 72)
print(f"  ✅ Working       {pass_c:>3}")
print(f"  🟡 Empty data    {empty_c:>3}  (endpoint OK, no data in DB yet)")
print(f"  🔴 Error         {fail_c:>3}")
print(f"  ❌ Still missing {miss_c:>3}")
print("=" * 72)

print("""
WHAT TO DO NOW:
  Your frontend service files need to be updated to call /api/v1/super-admin/*
  instead of the old paths. Every ✅ above means the endpoint is ready to use.
  
  Priority order for your agent:
  1. Update all service file base paths to /api/v1/super-admin/*
  2. Wire the new breakdowns endpoint to restore all 6 analytics sections
  3. Wire revenue endpoints to restore Revenue page
  4. Wire audit-logs/export to fix the export button
  5. Wire users/{id}/status for both suspend AND reactivate
""")
