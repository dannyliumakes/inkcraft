import { LoginButton, useRequireAuth } from '../../services/auth.tsx'

export default function ShelfPage() {
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

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">書架</h1>
      <p className="text-gray-500 mt-2">Shelf (placeholder)</p>
    </div>
  )
}
