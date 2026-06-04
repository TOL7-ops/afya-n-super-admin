/**
 * Authenticated Axios instance for the Afya Platform API.
 * Automatically attaches Authorization: Bearer <token> on every request.
 * Redirects to /login on 401.
 *
 * The ngrok-skip-browser-warning header is required for all requests to the
 * ngrok tunnel URL. It is safe to send to production Railway as well (ignored).
 */
import axios from 'axios';
import { getAccessToken } from '@/services/authService';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://afya-backend-production.up.railway.app';

const api = axios.create({
  baseURL: BASE_URL,
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

// ── Response interceptor: redirect on 401 ────────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      console.warn('[Auth] 401 received — redirecting to /login');
      // Avoid redirect loop if already on login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);

export default api;
