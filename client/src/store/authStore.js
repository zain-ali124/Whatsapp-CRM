import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user:            null,
      token:           null,
      isAuthenticated: false,

      login: (user, token) => set({ user, token, isAuthenticated: true }),

      logout: () => set({ user: null, token: null, isAuthenticated: false }),

      updateUser: (data) =>
        set((state) => ({ user: { ...state.user, ...data } })),

      // ── Helpers ──────────────────────────────────────────
      isOwner: () => {
        const u = get().user;
        return u?.type === 'owner' || (!u?.type && !!u);  // backward compat
      },

      isAgent: () => get().user?.type === 'agent',

      // What the agent's parent business userId is
      ownerId: () => get().user?.ownerId || get().user?.id,
    }),
    { name: 'wa-crm-auth' }
  )
);