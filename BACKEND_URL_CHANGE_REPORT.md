# Backend URL Migration Report
**Date:** September 17, 2026  
**Status:** ✅ COMPLETED

## Summary
Successfully migrated the Afya Super Admin frontend from production backend to staging backend.

---

## URLs

### OLD BACKEND (Production):
```
https://afya-backend-production.up.railway.app
```

### NEW BACKEND (Staging):
```
https://afya-backend-staging.up.railway.app
```

---

## Changes Made

### ✅ 1. Environment Configuration
**File:** `.env.local`
- **Variable:** `NEXT_PUBLIC_API_URL`
- **Old Value:** `https://afya-backend-production.up.railway.app`
- **New Value:** `https://afya-backend-staging.up.railway.app`
- **Status:** ✅ Updated

### ✅ 2. Next.js Configuration
**File:** `next.config.ts`
- **Constant:** `BACKEND`
- **Purpose:** Hardcoded for build-time rewrites (proxies `/api/v1/*` to backend)
- **Old Value:** `https://afya-backend-production.up.railway.app`
- **New Value:** `https://afya-backend-staging.up.railway.app`
- **Status:** ✅ Updated

### ✅ 3. Primary API Client
**File:** `lib/api.ts`
- **Constant:** `BASE_URL` (fallback value)
- **Old Value:** `https://afya-backend-production.up.railway.app`
- **New Value:** `https://afya-backend-staging.up.railway.app`
- **Status:** ✅ Updated
- **Note:** All service files import from this centralized API instance

### ✅ 4. Authentication Service
**File:** `services/authService.ts`
- **Constant:** `BASE_URL` (fallback value)
- **Old Value:** `https://afya-backend-production.up.railway.app`
- **New Value:** `https://afya-backend-staging.up.railway.app`
- **Status:** ✅ Updated
- **Note:** Uses direct axios for login/getCurrentUser with same BASE_URL pattern

### ✅ 5. Documentation Files
Updated for consistency:
- `AUDIT.md`
- `API_INTEGRATION_AUDIT.md`
- `ENDPOINTS.md` (3 references: base URL, Swagger, OpenAPI JSON)
- `MISSING_ENDPOINTS.md`

### ✅ 6. Test/Debug Scripts
**File:** `scripts/afya-analtics-diagnose.py`
- **Variable:** `BASE_URL`
- **Status:** ✅ Updated

---

## Verification

### ✅ No Hardcoded URLs in API Calls
All services use the centralized `api` instance from `@/lib/api`:
- ✅ `analytics.service.ts`
- ✅ `institutions.service.ts`
- ✅ `licenses.service.ts`
- ✅ `revenue.service.ts`
- ✅ `settings.service.ts`
- ✅ `users.service.ts`
- ✅ `facilities.service.ts`
- ✅ `demoRequests.service.ts`
- ✅ `billing.service.ts`

### ✅ API Request Flow
```
Browser Request → Next.js Proxy (/api/v1/*) → Railway Staging Backend
     ↓
lib/api.ts (axios instance with baseURL from NEXT_PUBLIC_API_URL)
     ↓
All service files import and use this single API instance
```

### ✅ Environment Variable Precedence
1. **Primary:** `NEXT_PUBLIC_API_URL` from `.env.local`
2. **Fallback:** Hardcoded staging URL in `lib/api.ts` and `authService.ts`
3. **Build-time:** Hardcoded in `next.config.ts` for Vercel rewrites

### ✅ No Old URL References Remaining
Confirmed via search: Zero matches for `afya-backend-production.up.railway.app` in active configuration files.

---

## ⚠️ CRITICAL: Vercel Deployment Action Required

The local `.env.local` file is **gitignored** and does not deploy to Vercel.

### Vercel Environment Variable Update Required:
1. Log into Vercel dashboard
2. Navigate to Project Settings → Environment Variables
3. Update or create:
   - **Variable:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://afya-backend-staging.up.railway.app`
   - **Scope:** Production, Preview, Development (all)
4. **Redeploy** the application for changes to take effect

**Without this Vercel update, the production deployment will still use the old production backend URL.**

---

## API Configuration Summary

### Environment Variable Used:
```bash
NEXT_PUBLIC_API_URL=https://afya-backend-staging.up.railway.app
```

### Files Changed (Active Configuration):
1. `.env.local`
2. `next.config.ts`
3. `lib/api.ts`
4. `services/authService.ts`

### Files Changed (Documentation):
5. `AUDIT.md`
6. `API_INTEGRATION_AUDIT.md`
7. `ENDPOINTS.md`
8. `MISSING_ENDPOINTS.md`

### Files Changed (Scripts):
9. `scripts/afya-analtics-diagnose.py`

---

## Testing Checklist

### ✅ Local Development Testing Required:
1. ⬜ Start dev server: `npm run dev`
2. ⬜ Open browser: `http://localhost:3000`
3. ⬜ Login with test account
4. ⬜ Verify network requests go to: `https://afya-backend-staging.up.railway.app`
5. ⬜ Verify Dashboard loads
6. ⬜ Verify Analytics loads
7. ⬜ Verify Organisations loads
8. ⬜ Verify Institutions loads
9. ⬜ Verify Licenses loads
10. ⬜ Verify Revenue loads
11. ⬜ Test creating new organisation
12. ⬜ Test issuing license
13. ⬜ Verify audit/login history loads

### ⬜ Production Deployment Testing (After Vercel Update):
1. Update Vercel environment variable
2. Trigger new deployment
3. Verify production requests go to staging backend
4. Complete same testing checklist as local

---

## CORS Considerations

### Frontend Configuration:
✅ No changes needed - frontend domain remains unchanged

### Backend Configuration:
⚠️ **The staging backend CORS configuration must allow the production frontend domain:**
- If frontend is deployed at `https://afya-admin.vercel.app` (example)
- Staging backend must have this origin in its CORS allowed origins list
- **This cannot be verified or changed from the frontend repository**
- Contact backend team to confirm CORS configuration

---

## Authentication Flow

### Current Implementation (Unchanged):
1. User submits login credentials
2. Frontend POSTs to `/api/v1/users/login` (proxied via Next.js)
3. Backend returns `access_token` and `refresh_token`
4. Tokens stored in localStorage
5. Access token mirrored to cookie for SSR middleware
6. All subsequent requests include `Authorization: Bearer <token>` header
7. On 401, automatic token refresh attempted
8. On refresh failure, redirect to login

### After URL Change:
- All requests route to: `https://afya-backend-staging.up.railway.app`
- Token refresh endpoint: `https://afya-backend-staging.up.railway.app/api/v1/users/refresh-token`
- No code changes required for auth flow ✅

---

## Notes

### Build-Time vs Runtime Configuration
- `next.config.ts` rewrites are evaluated at **build time**
- Environment variables prefixed with `NEXT_PUBLIC_` are available at **runtime**
- Both have been updated for consistency

### No Breaking Changes
- No API endpoint paths were modified
- No request/response structure changes
- Only the base URL changed
- All existing functionality preserved

### Rollback Procedure
If rollback to production backend is needed:
1. Revert changes to: `.env.local`, `next.config.ts`, `lib/api.ts`, `services/authService.ts`
2. Change URL back to: `https://afya-backend-production.up.railway.app`
3. Update Vercel environment variable back to production URL
4. Redeploy

---

## Status: ✅ COMPLETE

All frontend configuration now points to the new staging backend:
```
https://afya-backend-staging.up.railway.app
```

**Next Step:** Update Vercel environment variable and test production deployment.
