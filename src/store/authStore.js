import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      tenant: 'atmt',
      user: null,
      roles: [],
      tenantProfile: null,

      login: (token, refreshToken, user, roles) =>
        set({ token, refreshToken, user, roles }),

      setTokens: (token, refreshToken) =>
        set({ token, refreshToken }),

      setTenant: (tenant) => set({ tenant }),

      setTenantProfile: (profile) => set({ tenantProfile: profile }),

      logout: () =>
        set({ token: null, refreshToken: null, user: null, roles: [], tenantProfile: null }),
    }),
    { name: 'nexaerp-auth', partialize: (s) => ({ token: s.token, refreshToken: s.refreshToken, tenant: s.tenant, user: s.user, roles: s.roles, tenantProfile: s.tenantProfile }) }
  )
);
