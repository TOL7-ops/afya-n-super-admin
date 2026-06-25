'use client';

/**
 * Global institutions store — single source of truth.
 *
 * All pages (Institutions, Licenses, Dashboard) read from this store.
 * All status changes write through this store.
 * Only one fetch happens on app load — subsequent page switches hit cached state.
 *
 * Persisted to sessionStorage so a page refresh re-hydrates instantly
 * while a background refetch confirms with fresh server data.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api from '@/lib/api';
import type { FacilityResponse } from '@/types/api';

interface InstitutionsState {
  institutions: FacilityResponse[];
  loading: boolean;
  lastFetched: number | null;
  error: string | null;

  /** Fetch the full list from the API and populate the store */
  fetch: () => Promise<void>;
  /** Optimistic: flip is_active for one institution immediately */
  setStatus: (id: string, is_active: boolean) => void;
  /** Remove an institution from the list (after reject) */
  removeById: (id: string) => void;
  /** Merge a single updated institution into the list */
  upsert: (institution: FacilityResponse) => void;
}

export const useInstitutionsStore = create<InstitutionsState>()(
  persist(
    (set) => ({
      institutions: [],
      loading: false,
      lastFetched: null,
      error: null,

      fetch: async () => {
        set({ loading: true, error: null });
        try {
          // Fetch institutions (NGOs/programmes) AND facilities (clinical) in parallel.
          // Combine into one list so every table and KPI on the platform sees both.
          const [instRes, facRes] = await Promise.allSettled([
            api.get<unknown>('/api/v1/super-admin/institutions', {
              params: { page: 1, page_size: 200 },
            }),
            api.get<unknown>('/api/v1/super-admin/facilities', {
              params: { page: 1, page_size: 200 },
            }),
          ]);

          const unwrap = (res: typeof instRes, label: string): FacilityResponse[] => {
            if (res.status === 'rejected') {
              console.warn(`[Store] ${label} fetch failed:`, res.reason);
              return [];
            }
            const raw = res.value.data;
            console.log(`[Store] ${label} raw type:`, typeof raw, Array.isArray(raw) ? `array(${(raw as unknown[]).length})` : raw && typeof raw === 'object' ? `object keys: ${Object.keys(raw as object).join(', ')}` : raw);
            if (Array.isArray(raw)) return raw as FacilityResponse[];
            if (raw && typeof raw === 'object') {
              const d = raw as Record<string, unknown>;
              // Log the full raw object to see exactly what the API returns
              console.log(`[Store] ${label} raw object:`, JSON.stringify(raw).slice(0, 400));
              const found = (
                Array.isArray(d['data'])          ? d['data'] :
                Array.isArray(d['institutions'])  ? d['institutions'] :
                Array.isArray(d['facilities'])    ? d['facilities'] :
                Array.isArray(d['items'])         ? d['items'] :
                Array.isArray(d['results'])       ? d['results'] :
                Array.isArray(d['records'])       ? d['records'] :
                null
              );
              if (found) {
                console.log(`[Store] ${label} unwrapped, count:`, (found as unknown[]).length);
                return found as FacilityResponse[];
              }
              console.warn(`[Store] ${label} no array key found. Keys:`, Object.keys(d));
            }
            return [];
          };

          const normalise = (items: FacilityResponse[], entityType: 'institution' | 'facility') =>
            items.map((inst) => {
              const r = inst as unknown as Record<string, unknown>;
              const rawActive = r['is_active'] ?? r['active'];
              const apiStatus = ((r['status'] as string) ?? '').toLowerCase().trim();

              // If the API returns status:"Suspended" explicitly, honour it
              // even when is_active is missing from the response.
              const isActive =
                apiStatus === 'suspended'
                  ? false
                  : rawActive === undefined || rawActive === null
                  ? true
                  : rawActive === true || rawActive === 'true' || rawActive === 1;

              return { ...inst, is_active: isActive, _entity_type: entityType };
            });

          const institutions = normalise(unwrap(instRes, 'Institutions'), 'institution');
          const facilities   = normalise(unwrap(facRes,  'Facilities'),   'facility');
          const combined     = [...institutions, ...facilities];

          console.log('[Store] Institutions fetched:', institutions.length, '| Facilities fetched:', facilities.length, '| Combined:', combined.length);
          set({ institutions: combined, lastFetched: Date.now() });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Failed to load institutions + facilities';
          console.error('[Store] Fetch failed:', msg);
          set({ error: msg });
        } finally {
          set({ loading: false });
        }
      },

      setStatus: (id, is_active) => {
        set((s) => ({
          institutions: s.institutions.map((inst) =>
            inst.id === id ? { ...inst, is_active } : inst,
          ),
        }));
      },

      removeById: (id) => {
        set((s) => ({
          institutions: s.institutions.filter((inst) => inst.id !== id),
        }));
      },

      upsert: (institution) => {
        set((s) => {
          const exists = s.institutions.some((i) => i.id === institution.id);
          if (exists) {
            return {
              institutions: s.institutions.map((i) =>
                i.id === institution.id ? { ...i, ...institution } : i,
              ),
            };
          }
          return { institutions: [institution, ...s.institutions] };
        });
      },
    }),
    {
      name: 'afya-institutions',
      storage: createJSONStorage(() =>
        typeof window !== 'undefined' ? sessionStorage : {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        },
      ),
      // Only persist data, not loading/error state
      partialize: (s) => ({
        institutions: s.institutions,
        lastFetched: s.lastFetched,
      }),
      // If we rehydrate with an empty list, treat as never-fetched so a fresh fetch fires
      onRehydrateStorage: () => (state) => {
        if (state && state.institutions.length === 0 && state.lastFetched !== null) {
          state.lastFetched = null;
          console.log('[Store] Rehydrated empty list — resetting lastFetched to force refetch');
        }
      },
    },
  ),
);
