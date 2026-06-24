/**
 * Authenticated Axios instance for the Afya Platform API.
 * Automatically attaches Authorization: Bearer <token> on every request.
 *
 * NEW (June 2026): Token refresh support.
 * On 401, attempts a silent refresh using the stored refresh_token.
 * If refresh succeeds, retries the original request with the new token.
 * If refresh fails (expired/missing), clears storage and redirects to /login.
 */
import axios from 'axios';
import { getAccessToken } from '@/services/authService';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://afya-backend-production.up.railway.app';

/**
 * In the browser, use relative URLs (/api/v1/...) so requests go through
 * the Next.js dev-server rewrite proxy — this avoids CORS completely.
 * On the server (SSR / middleware), use the full backend URL directly.
 */
const API_BASE =
  typeof window !== 'undefined'
    ? ''       // browser: relative → proxied by next.config.ts rewrites
    : BASE_URL; // server: direct to backend

const REFRESH_KEY = 'afya_refresh_token';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
  timeout: 30000,
});

// ── Request interceptor: attach JWT ──────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor: refresh token on 401 ───────────────────────────────
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

function processQueue(newToken: string) {
  refreshQueue.forEach((resolve) => resolve(newToken));
  refreshQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status !== 401 || typeof window === 'undefined') {
      return Promise.reject(err);
    }

    // Avoid redirect loop on the login page itself
    if (window.location.pathname.startsWith('/login')) {
      return Promise.reject(err);
    }

    const refreshToken = localStorage.getItem(REFRESH_KEY);

    if (!refreshToken) {
      console.warn('[Auth] 401 and no refresh token — redirecting to /login');
      localStorage.clear();
      window.location.href = '/login';
      return Promise.reject(err);
    }

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshQueue.push((token: string) => {
          err.config.headers.Authorization = `Bearer ${token}`;
          resolve(api.request(err.config));
        });
      });
    }

    isRefreshing = true;
    try {
      // Use the relative path so the refresh call also goes through the Next.js proxy
      const refreshBase = typeof window !== 'undefined' ? '' : BASE_URL;
      const res = await axios.post<{ access_token: string; refresh_token: string }>(
        `${refreshBase}/api/v1/users/refresh-token`,
        { refresh_token: refreshToken },
        { headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' } },
      );

      const { access_token, refresh_token: newRefresh } = res.data;

      // Persist new tokens
      localStorage.setItem('afya_access_token', access_token);
      localStorage.setItem(REFRESH_KEY, newRefresh);
      // Mirror access token into cookie for middleware
      document.cookie = `afya_access_token=${access_token}; path=/; SameSite=Strict`;

      console.log('[Auth] Token refreshed successfully');
      processQueue(access_token);

      // Retry the original request with the new token
      err.config.headers.Authorization = `Bearer ${access_token}`;
      return api.request(err.config);
    } catch (refreshErr) {
      console.warn('[Auth] Token refresh failed — redirecting to /login');
      localStorage.clear();
      document.cookie = 'afya_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Strict';
      window.location.href = '/login';
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
