import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  accessToken: string | null;
  tokenExpiresAt: number | null; // unix ms
  setAccessToken: (token: string, expiresInSeconds?: number) => void;
  clearAccessToken: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      tokenExpiresAt: null,
      setAccessToken: (token, expiresInSeconds = 3600) =>
        set({ accessToken: token, tokenExpiresAt: Date.now() + expiresInSeconds * 1000 }),
      clearAccessToken: () => set({ accessToken: null, tokenExpiresAt: null }),
    }),
    { name: 'pw-auth' },
  ),
)

export function getAccessToken(): string | null {
  return useAuthStore.getState().accessToken
}