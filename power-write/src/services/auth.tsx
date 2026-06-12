// Uses GIS implicit flow — no refresh token available
// On 401, clear token and prompt re-login
import { useGoogleLogin } from '@react-oauth/google'
import { useAuthStore } from '../stores/authStore'

export function LoginButton() {
  const setAccessToken = useAuthStore((s) => s.setAccessToken)

  const login = useGoogleLogin({
    flow: 'implicit',
    scope: 'https://www.googleapis.com/auth/drive.appdata',
    onSuccess: (tokenResponse) => {
      setAccessToken(tokenResponse.access_token)
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

interface RequireAuthProps {
  children: React.ReactNode
}

export function useRequireAuth() {
  const accessToken = useAuthStore((s) => s.accessToken)
  return { isAuthenticated: !!accessToken }
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { isAuthenticated } = useRequireAuth()

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Power Write</h1>
        <p className="text-gray-500">Sign in to access your novels</p>
        <LoginButton />
      </div>
    )
  }

  return <>{children}</>
}
