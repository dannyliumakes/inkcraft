// Implicit flow with silent refresh via prompt:none
// On 401, clear token and prompt re-login
import { useEffect, useRef, useCallback } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../stores/authStore'

const SCOPE = 'https://www.googleapis.com/auth/drive.appdata'
// Refresh 5 minutes before expiry
const REFRESH_BUFFER_MS = 5 * 60 * 1000

export function LoginButton() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)

  const login = useGoogleLogin({
    flow: 'implicit',
    scope: SCOPE,
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token, tokenResponse.expires_in)
    },
    onError: (error) => {
      console.error('Google login error:', error)
    },
  })

  return (
    <button
      onClick={() => login()}
      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
    >
      Sign in with Google
    </button>
  )
}

// Attempts silent token refresh using existing Google session (no UI popup)
function useSilentRefresh() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)
  const clearAccessToken = useAuthStore((s) => s.clearAccessToken)
  const tokenExpiresAt = useAuthStore((s) => s.tokenExpiresAt)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const silentLogin = useGoogleLogin({
    flow: 'implicit',
    scope: SCOPE,
    prompt: 'none',
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token, tokenResponse.expires_in)
    },
    onError: () => {
      // Google session expired or user revoked — require manual login
      clearAccessToken()
    },
  })

  const scheduleRefresh = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!tokenExpiresAt) return

    const msUntilRefresh = tokenExpiresAt - Date.now() - REFRESH_BUFFER_MS
    if (msUntilRefresh <= 0) {
      silentLogin()
      return
    }

    timerRef.current = setTimeout(() => silentLogin(), msUntilRefresh)
  }, [tokenExpiresAt, silentLogin])

  useEffect(() => {
    scheduleRefresh()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [scheduleRefresh])
}

interface RequireAuthProps {
  children: React.ReactNode
}

export function useRequireAuth() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return { isAuthenticated: !!accessToken }
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated } = useRequireAuth()
  useSilentRefresh()

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="page-title">Power Write</h1>
        <p className="text-gray-500">Sign in to access your novels</p>
        <LoginButton />
      </div>
    )
  }

  return <>{children}</>
}
