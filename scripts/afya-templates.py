#!/usr/bin/env python3
"""
diagnose_dashboard_500.py

Static diagnostic for the error:

    [Dashboard] Error: "Request failed with status code 500" "HTTP:" 500
        at useDashboardAnalytics.useCallback[fetch] (hooks/useAnalytics.ts:108:15)

This script does NOT call your API. It cannot see your external backend's logs
or fix a bug on that server. What it CAN do is statically scan your Next.js
project to find every plausible client-side reason the request to your
external backend would come back as / be reported as a 500, rank them by
likelihood, and tell you exactly what to check next (including what to look
for in the external backend's own logs, since that is the most likely place
the real root cause lives).

USAGE
-----
    cp diagnose_dashboard_500.py <your-project-root>/
    cd <your-project-root>
    python3 diagnose_dashboard_500.py

    # Or point it at a project elsewhere:
    python3 diagnose_dashboard_500.py /path/to/project

No third-party packages required (stdlib only).
"""

from __future__ import annotations

import os
import re
import sys
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional


# ──────────────────────────────────────────────────────────────────────────
# Data model
# ──────────────────────────────────────────────────────────────────────────

@dataclass
class Finding:
    severity: str          # "HIGH" | "MEDIUM" | "LOW" | "INFO"
    title: str
    detail: str
    location: Optional[str] = None   # "path:line"
    next_step: str = ""

    def sort_key(self):
        order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "INFO": 3}
        return order.get(self.severity, 4)


@dataclass
class Report:
    findings: list = field(default_factory=list)

    def add(self, *args, **kwargs):
        self.findings.append(Finding(*args, **kwargs))


# ──────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────

SEARCH_DIRS_SKIP = {
    "node_modules", ".next", ".git", "dist", "build", ".turbo", "coverage",
}

CODE_EXTS = {".ts", ".tsx", ".js", ".jsx"}


def iter_source_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SEARCH_DIRS_SKIP and not d.startswith(".")]
        for fn in filenames:
            p = Path(dirpath) / fn
            if p.suffix in CODE_EXTS:
                yield p


def read_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return ""


def find_file_by_name(root: Path, name_fragment: str) -> list[Path]:
    """Find files whose name contains name_fragment (case-insensitive)."""
    matches = []
    for f in iter_source_files(root):
        if name_fragment.lower() in f.name.lower():
            matches.append(f)
    return matches


def line_of_match(text: str, match_start: int) -> int:
    return text.count("\n", 0, match_start) + 1


def rel(root: Path, p: Path) -> str:
    try:
        return str(p.relative_to(root))
    except ValueError:
        return str(p)


# ──────────────────────────────────────────────────────────────────────────
# Checks
# ──────────────────────────────────────────────────────────────────────────

def check_analytics_service(root: Path, report: Report) -> Optional[Path]:
    """Find the service file that getDashboard() lives in."""
    candidates = find_file_by_name(root, "analytics.service")
    if not candidates:
        report.add(
            severity="HIGH",
            title="Could not find analytics.service.ts/js",
            detail=(
                "useAnalytics.ts imports getDashboard() from '@/services/analytics.service', "
                "but no matching file was found under this project root. This is the file that "
                "actually builds the URL, sets headers, and calls axios/fetch for the dashboard "
                "endpoint -- it's the single most important file for this bug and it's missing "
                "or located somewhere this scan didn't search."
            ),
            next_step=(
                "Confirm the file exists (check for path alias issues -- does '@/services' "
                "actually resolve to where you think? check tsconfig.json 'paths'), then run "
                "this script again from a directory that includes it, or move it under this "
                "project root before scanning."
            ),
        )
        return None

    for f in candidates:
        report.add(
            severity="INFO",
            title="Found analytics service file",
            detail="This is the file that builds the request to your external backend.",
            location=rel(root, f),
        )
    return candidates[0]


def check_base_url_construction(root: Path, service_file: Optional[Path], report: Report):
    files_to_scan = [service_file] if service_file else []
    # also scan for a shared axios instance / api client
    files_to_scan += find_file_by_name(root, "axios")
    files_to_scan += find_file_by_name(root, "apiClient")
    files_to_scan += find_file_by_name(root, "api-client")
    files_to_scan = [f for f in files_to_scan if f]

    if not files_to_scan:
        return

    env_var_pattern = re.compile(r"process\.env\.([A-Z0-9_]+)")
    base_url_pattern = re.compile(r"(baseURL|BASE_URL|baseUrl)\s*[:=]\s*([^\n,;]+)", re.IGNORECASE)

    seen_vars = set()
    for f in set(files_to_scan):
        text = read_text(f)
        if not text:
            continue

        for m in base_url_pattern.finditer(text):
            line = line_of_match(text, m.start())
            report.add(
                severity="INFO",
                title="Base URL construction found",
                detail=f"Expression: {m.group(0).strip()}",
                location=f"{rel(root, f)}:{line}",
            )

        for m in env_var_pattern.finditer(text):
            var = m.group(1)
            if var in seen_vars:
                continue
            seen_vars.add(var)
            line = line_of_match(text, m.start())

            # Is there a fallback if missing? e.g. `|| 'http://localhost'`
            snippet_start = max(0, m.start() - 5)
            snippet_end = min(len(text), m.end() + 60)
            snippet = text[snippet_start:snippet_end]
            has_fallback = "||" in snippet or "??" in snippet

            severity = "LOW" if has_fallback else "HIGH"
            report.add(
                severity=severity,
                title=f"Env var used in request config: {var}",
                detail=(
                    f"{'Has a fallback value, lower risk.' if has_fallback else 'No fallback detected -- if this var is unset at runtime, the request URL or header built from it will silently contain the literal string \"undefined\".'}"
                ),
                location=f"{rel(root, f)}:{line}",
                next_step=(
                    f"Check that {var} is actually set in the environment Next.js runs in "
                    f"(.env.local for dev, your hosting platform's env settings for prod). "
                    f"A request to a URL like 'undefined/api/dashboard' or 'https://undefined.example.com' "
                    f"will fail, and depending on your backend/proxy/DNS setup this can surface as a 500."
                ) if severity == "HIGH" else "",
            )

    if not seen_vars:
        report.add(
            severity="MEDIUM",
            title="No process.env usage found in API client files",
            detail=(
                "Either the base URL is hardcoded (fine, but check it's correct for this "
                "environment) or env vars are referenced somewhere this scan didn't check "
                "(e.g. a config file using import.meta.env, or a non-standard naming pattern)."
            ),
        )


def check_env_files(root: Path, report: Report):
    env_files = sorted(root.glob(".env*"))
    if not env_files:
        report.add(
            severity="MEDIUM",
            title="No .env files found at project root",
            detail=(
                "If your API base URL or auth config depends on environment variables, and "
                "there's no .env.local / .env.development here, Next.js may be running with "
                "those vars completely unset."
            ),
            next_step="Verify where your env vars actually come from (shell export, .env.local, hosting platform).",
        )
        return

    defined_keys = set()
    for ef in env_files:
        text = read_text(ef)
        for line in text.splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip()
            defined_keys.add(key)
            if key and not value:
                report.add(
                    severity="HIGH",
                    title=f"Env var defined but EMPTY: {key}",
                    detail=f"Found in {ef.name} with no value after '='.",
                    location=ef.name,
                    next_step="Set a real value, or remove the line if unused.",
                )

    report.add(
        severity="INFO",
        title="Env files found",
        detail=f"Keys defined: {', '.join(sorted(defined_keys)) if defined_keys else '(none parsed)'}",
        location=", ".join(f.name for f in env_files),
    )


def check_auth_service(root: Path, report: Report):
    candidates = find_file_by_name(root, "authService")
    if not candidates:
        report.add(
            severity="MEDIUM",
            title="Could not find authService.ts/js",
            detail=(
                "useAnalytics.ts gates its fetch on getAccessToken() and presumably the service "
                "layer attaches this token as an Authorization header. Couldn't locate this file "
                "to check whether the token can be stale/expired/malformed without the app noticing."
            ),
        )
        return

    for f in candidates:
        text = read_text(f)
        loc = rel(root, f)

        if "localStorage" in text or "sessionStorage" in text:
            report.add(
                severity="MEDIUM",
                title="Access token read from browser storage",
                detail=(
                    "Token is stored client-side. If it's expired, malformed, or was cleared "
                    "inconsistently (e.g. cleared from one tab but not memory state in another), "
                    "a stale/invalid token gets sent on every request. Many backends correctly "
                    "return 401 for bad auth, but some implementations throw an unhandled "
                    "exception while *decoding* a malformed/expired token and return 500 instead "
                    "of 401 -- this is a very common cause of '500 that's really an auth problem'."
                ),
                location=loc,
                next_step=(
                    "On the backend, check logs for a stack trace from JWT decode/verify around "
                    "the time of the error. If found, the fix is on the backend (return 401 on "
                    "decode failure) and/or on the frontend (proactively check token expiry "
                    "before firing the request, or refresh-and-retry on 401)."
                ),
            )

        if not re.search(r"exp(iry|ires)?", text, re.IGNORECASE):
            report.add(
                severity="LOW",
                title="No expiry check found in authService",
                detail="No reference to token expiry/exp found -- token may be sent even when expired.",
                location=loc,
            )


def check_swallowed_errors(root: Path, report: Report):
    """Specifically check useAnalytics.ts (and similar hooks) for the pattern
    where the real backend error body is discarded before logging."""
    candidates = find_file_by_name(root, "useAnalytics")
    for f in candidates:
        text = read_text(f)
        loc = rel(root, f)

        # err.response?.status captured, but err.response?.data is not
        if re.search(r"response\?\.status", text) and not re.search(r"response\?\.data", text):
            m = re.search(r"console\.error\(['\"]\[\w+\] Error:?['\"]", text)
            line = line_of_match(text, m.start()) if m else None
            report.add(
                severity="HIGH",
                title="Backend error response body is discarded",
                detail=(
                    "The catch block reads err.response?.status but never reads "
                    "err.response?.data. Most backends (Express, FastAPI, Django, etc.) put the "
                    "real error message/code in the response body on a 500 -- right now that "
                    "message is thrown away before it ever reaches your console.error, which is "
                    "exactly why you're only seeing a bare status code and nothing actionable."
                ),
                location=f"{loc}:{line}" if line else loc,
                next_step=(
                    "Temporarily add `(err as any).response?.data` to the console.error call "
                    "(or log it separately) and reproduce the error. That will surface the "
                    "backend's actual error message/code without needing backend log access."
                ),
            )

        if "axios" not in text and ("getDashboard" in text):
            report.add(
                severity="INFO",
                title="useAnalytics.ts does not import axios directly",
                detail="Confirms the actual HTTP call is delegated to the service layer (analytics.service.ts).",
                location=loc,
            )


def check_axios_global_config(root: Path, report: Report):
    """Look for axios interceptors / instance config that might rewrite errors,
    set timeouts, or strip data in a way that hides the real cause."""
    pkg = root / "package.json"
    if pkg.exists():
        pkg_data = json.loads(read_text(pkg) or "{}")
        deps = {**pkg_data.get("dependencies", {}), **pkg_data.get("devDependencies", {})}
        if "axios" in deps:
            report.add(
                severity="INFO",
                title=f"axios version: {deps['axios']}",
                detail="Confirmed in package.json.",
            )

    interceptor_files = []
    for f in iter_source_files(root):
        text = read_text(f)
        if "interceptors.response" in text or "interceptors.request" in text:
            interceptor_files.append((f, text))

    if not interceptor_files:
        report.add(
            severity="LOW",
            title="No axios interceptors found",
            detail="If you intended global error/auth handling (e.g. auto-refresh on 401), it doesn't exist yet, or lives outside this scan.",
        )
        return

    for f, text in interceptor_files:
        loc = rel(root, f)
        report.add(
            severity="INFO",
            title="Axios interceptor found",
            detail="Worth checking this doesn't rewrite/suppress the original error before it reaches useAnalytics.ts's catch block.",
            location=loc,
        )
        if re.search(r"return\s+Promise\.reject\(\s*\{", text):
            report.add(
                severity="MEDIUM",
                title="Interceptor rejects with a custom object (not the original error)",
                detail=(
                    "If the response interceptor catches errors and rejects with a new plain "
                    "object instead of re-throwing the original AxiosError, then "
                    "`err.response?.status` and `err.response?.data` in useAnalytics.ts may not "
                    "exist on that custom object -- which would explain a status of `undefined` "
                    "even on a real 500."
                ),
                location=loc,
                next_step="Confirm the rejected value still has a `.response` property matching the original AxiosError shape.",
            )


def check_timeout_config(root: Path, report: Report):
    found = []
    for f in iter_source_files(root):
        text = read_text(f)
        for m in re.finditer(r"timeout\s*:\s*(\d+)", text):
            found.append((f, m, int(m.group(1))))

    for f, m, ms in found:
        loc = rel(root, f)
        line = line_of_match(read_text(f), m.start())
        if ms < 5000:
            report.add(
                severity="LOW",
                title=f"Short axios timeout: {ms}ms",
                detail=(
                    "A short timeout against a slow external backend can produce a client-side "
                    "error that *looks* like a 500 if error handling normalizes timeouts and "
                    "real server errors the same way. Worth ruling out if the backend is slow "
                    "under load."
                ),
                location=f"{loc}:{line}",
            )


def check_cors_proxy_pattern(root: Path, report: Report):
    """If calling an external backend directly from the client (not via a Next.js
    API route), CORS preflight failures or mixed content can sometimes be
    misreported. Check next.config for rewrites/proxy."""
    next_config_candidates = list(root.glob("next.config.*"))
    has_rewrite_proxy = False
    for f in next_config_candidates:
        text = read_text(f)
        if "rewrites" in text:
            has_rewrite_proxy = True
            report.add(
                severity="INFO",
                title="next.config has rewrites()",
                detail="Some requests may be proxied through Next.js rather than hitting the external backend directly from the browser.",
                location=rel(root, f),
            )

    if not has_rewrite_proxy:
        report.add(
            severity="INFO",
            title="No Next.js rewrite proxy detected",
            detail=(
                "The dashboard call likely goes straight from the browser to the external "
                "backend's domain. This means: (1) CORS must be configured correctly on that "
                "backend for your frontend's origin, and (2) the 500 you're seeing is almost "
                "certainly generated by that backend itself, not by Next.js -- so the real stack "
                "trace lives in the EXTERNAL BACKEND's logs, not in the `next dev` terminal."
            ),
        )


# ──────────────────────────────────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────────────────────────────────

def main():
    root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path.cwd()

    if not root.exists():
        print(f"Path does not exist: {root}")
        sys.exit(1)

    print(f"Scanning project at: {root}\n")

    report = Report()

    service_file = check_analytics_service(root, report)
    check_base_url_construction(root, service_file, report)
    check_env_files(root, report)
    check_auth_service(root, report)
    check_swallowed_errors(root, report)
    check_axios_global_config(root, report)
    check_timeout_config(root, report)
    check_cors_proxy_pattern(root, report)

    # ── Print report ────────────────────────────────────────────────────
    findings = sorted(report.findings, key=lambda f: f.sort_key())

    severity_icon = {"HIGH": "🔴", "MEDIUM": "🟡", "LOW": "🔵", "INFO": "⚪"}

    print("=" * 78)
    print("DIAGNOSTIC REPORT: Dashboard 500 error (useAnalytics.ts:108)")
    print("=" * 78)

    if not findings:
        print("No findings -- this likely means the script couldn't locate enough "
              "of the relevant files. Run it from your project root.")
        return

    for severity in ("HIGH", "MEDIUM", "LOW", "INFO"):
        bucket = [f for f in findings if f.severity == severity]
        if not bucket:
            continue
        print(f"\n--- {severity_icon[severity]} {severity} ---")
        for f in bucket:
            print(f"\n[{f.title}]")
            if f.location:
                print(f"  Location: {f.location}")
            print(f"  {f.detail}")
            if f.next_step:
                print(f"  → Next step: {f.next_step}")

    print("\n" + "=" * 78)
    print("REMINDER: this script only analyzes your code statically. Since your")
    print("dashboard data comes from an EXTERNAL backend, the actual 500 is being")
    print("generated over there. The fastest real diagnosis is almost always:")
    print("  1. Apply the 'log err.response?.data' fix above (if flagged) and")
    print("     reproduce the error to see the backend's real error message.")
    print("  2. Check that external backend's own server logs for the matching")
    print("     timestamp/request -- that's where the actual stack trace is.")
    print("=" * 78)


if __name__ == "__main__":
    main()