"""
Afya — 500 Error Diagnostic
=============================
Diagnoses 500 Internal Server Errors on:
  1. GET /api/v1/super-admin/subscriptions          (Licenses page)
  2. GET /api/v1/super-admin/analytics/institutions-performance

A 500 means the backend is throwing an UNHANDLED EXCEPTION server-side —
this is not a "wrong data" issue like the KPI bug, it's a crash.
This script calls each endpoint directly, prints the raw status code,
raw response body (often contains a stack trace or error detail in
FastAPI's default error responses), and timing, so the backend dev
can see exactly what's failing without digging through Railway logs.

Run:
    python afya_500_diagnose.py
"""

import requests
import json
import time

BASE_URL = "https://afya-backend-production.up.railway.app"
EMAIL    = "admin@afya.com"
PASSWORD = "Password123"

H = {"ngrok-skip-browser-warning": "true"}

SEP = "─" * 70


def login():
    print(SEP)
    print("  LOGIN")
    print(SEP)
    resp = requests.post(
        f"{BASE_URL}/api/v1/users/login",
        json={"username_or_email": EMAIL, "password": PASSWORD},
        headers=H, timeout=15
    )
    resp.raise_for_status()
    H["Authorization"] = f"Bearer {resp.json()['access_token']}"
    print("✅ Logged in\n")


def diagnose_endpoint(name, method, path, params=None, timeout=90):
    print(SEP)
    print(f"  {name}")
    print(f"  {method} {path}")
    print(SEP)

    url = f"{BASE_URL}{path}"
    start = time.time()
    try:
        if method == "GET":
            r = requests.get(url, headers=H, params=params, timeout=timeout)
        else:
            r = requests.request(method, url, headers=H, params=params, timeout=timeout)
        elapsed = time.time() - start

        print(f"  Status code:  {r.status_code}")
        print(f"  Time taken:   {elapsed:.2f}s")
        print(f"  Content-Type: {r.headers.get('content-type', 'unknown')}")
        print()

        if r.status_code == 500:
            print("  ⚠️  CONFIRMED 500 — backend threw an unhandled exception.")
            print("  Raw response body (this is what the backend dev needs):")
            print()
            try:
                body = r.json()
                print(json.dumps(body, indent=2))
            except ValueError:
                # Not JSON — print raw text (could be an HTML traceback page,
                # or plain text error from the ASGI server)
                print(r.text[:3000])
            print()
            print("  → If body contains a 'detail' field with a Python traceback")
            print("    or exception name, send that directly to backend dev.")
            print("  → If body is empty/HTML, the error is being swallowed before")
            print("    it reaches the response — check Railway deploy logs instead:")
            print("    railway logs (or via Railway dashboard → Deployments → Logs)")

        elif r.status_code == 200:
            print("  ✅ Endpoint returned 200 OK")
            try:
                body = r.json()
                preview = json.dumps(body, indent=2)
                print(preview[:1500])
                if len(preview) > 1500:
                    print("  ... (truncated)")
            except ValueError:
                print(r.text[:500])

        else:
            print(f"  ℹ️  Unexpected status {r.status_code} (not 200, not 500)")
            print(r.text[:1500])

    except requests.exceptions.Timeout:
        elapsed = time.time() - start
        print(f"  ⚠️  TIMEOUT after {elapsed:.2f}s — endpoint did not respond in time.")
        print("  → This could mean the query is hanging (e.g. missing index causing")
        print("    a full table scan, or an infinite loop / deadlock), NOT necessarily")
        print("    the same root cause as a 500. Check slow query logs.")
    except requests.exceptions.RequestException as e:
        print(f"  ⚠️  REQUEST FAILED before getting a response: {e}")

    print()


def main():
    login()

    diagnose_endpoint(
        name="LICENSES — /super-admin/subscriptions",
        method="GET",
        path="/api/v1/super-admin/subscriptions",
    )

    diagnose_endpoint(
        name="ANALYTICS — institutions-performance",
        method="GET",
        path="/api/v1/super-admin/analytics/institutions-performance",
        timeout=90,  # matches the 90s timeout the frontend already sets
    )

    print(SEP)
    print("  NEXT STEPS")
    print(SEP)
    print("""
  1. Send the raw response body printed above (under each "CONFIRMED 500")
     directly to your backend dev — it usually contains the exception
     type and message even if the traceback itself is hidden.

  2. If both bodies are empty or HTML (no JSON detail), ask backend dev
     to pull the Railway deploy logs for the exact timestamp this script
     ran, since that's where the real Python traceback will be printed
     server-side even if it's hidden from the API response.

  3. For institutions-performance specifically: this is the SAME endpoint
     we already flagged needing to support both institutions AND facilities
     (27 orgs total, not institutions-only). A 500 here likely means the
     code was already changed to try querying facilities too, but is
     hitting something like:
       - a missing column/relationship on the Facility model
       - a None/null field being accessed without a null-check
       - a mismatched join key between institutions and facilities tables
     This is a code bug introduced while adding facility support, not a
     data problem — ask backend dev to check error logs for an
     AttributeError, KeyError, or similar around this endpoint's handler.
    """)


if __name__ == "__main__":
    main()