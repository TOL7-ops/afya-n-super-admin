/**
 * Authentication service
 * Endpoints used:
 *   POST /api/v1/users/login  → { access_token, token_type }
 *   GET  /api/v1/users/me     → UserResponse
 *
 * Token storage: localStorage key "afya_access_token"
 * User storage:  localStorage key "afya_user"
 *
 * Login payload uses field name "username_or_email" (not "email").
 * Password is case-sensitive on the backend.
 */
import axios from 'axios';
import type { UserResponse } from '@/types/api';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://afya-backend-production.up.railway.app';

const TOKEN_KEY = 'afya_access_token';
const USER_KEY  = 'afya_user';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface LoginPayload {
  username_or_email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

// ─── Storage helpers (safe in SSR — guard with typeof window) ─────────────────
function setToken(token: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    // Mirror into cookie so Next.js middleware can read it server-side.
    // SameSite=Strict, no HttpOnly (must be readable by JS for removal).
    document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Strict`;
    console.log('[Auth] Token stored in localStorage + cookie');
  }
}

function setStoredUser(user: UserResponse): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Returns the stored JWT or null */
export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

/** Returns true if a token is present */
export function isAuthenticated(): boolean {
  return Boolean(getAccessToken());
}

/** Returns the cached user object or null */
export function getStoredUser(): UserResponse | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserResponse;
  } catch {
    return null;
  }
}

/**
 * POST /api/v1/users/login
 * Stores the returned token, then fetches and stores the user profile.
 * Returns the full UserResponse.
 */
export async function login(payload: LoginPayload): Promise<UserResponse> {
  console.log('[Auth] Login request →', payload.username_or_email);

  const tokenRes = await axios.post<TokenResponse>(
    `${BASE_URL}/api/v1/users/login`,
    payload,
    { headers: { 'Content-Type': 'application/json' } },
  );

  const { access_token } = tokenRes.data;
  console.log('[Auth] Login success — token received');
  setToken(access_token);

  // Fetch user profile immediately after login
  const user = await getCurrentUser(access_token);
  setStoredUser(user);
  console.log('[Auth] User profile stored →', user.email, '| role:', user.role);

  return user;
}

/**
 * GET /api/v1/users/me
 * Uses provided token or falls back to stored token.
 */
export async function getCurrentUser(token?: string): Promise<UserResponse> {
  const jwt = token ?? getAccessToken();
  if (!jwt) throw new Error('No access token available');

  const res = await axios.get<UserResponse>(`${BASE_URL}/api/v1/users/me`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });

  return res.data;
}

/**
 * Clear all auth state and redirect to login.
 */
export function logout(): void {
  if (typeof window === 'undefined') return;
  console.log('[Auth] Logging out — clearing token and user');
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  // Clear the middleware cookie
  document.cookie = `${TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict`;
  window.location.href = '/login';
}
