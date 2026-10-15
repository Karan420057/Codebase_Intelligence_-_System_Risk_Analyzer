
import './App.css'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import AdminDashboard from './components/layout/AdminDashboard'
import DashboardLayout from './components/layout/Dashboard'
import RepositoryWorkspace from './components/RepositoryWorkspace'
import { useAuth } from './lib/use-auth'

function App() {
  const { user, loading, error, refresh, signOut } = useAuth()
  const [signOutError, setSignOutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background px-4">
        <p className="text-sm text-muted-foreground">Checking your session...</p>
      </main>
    )
  }

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <p className="max-w-md text-sm text-destructive" role="alert">{error}</p>
        <Button type="button" onClick={refresh}>Try again</Button>
      </main>
    )
  }

  if (!user) {
    return window.location.pathname === '/signup' ? <SignupPage /> : <LoginPage />
  }

  async function handleSignOut() {
    if (signingOut) return

    try {
      setSigningOut(true)
      setSignOutError('')
      await signOut()
      window.history.replaceState(null, '', '/login')
    } catch (requestError) {
      setSignOutError(requestError.message)
      setSigningOut(false)
    }
  }

  return (
    <DashboardLayout
      role={user.role}
      user={user}
      onSignOut={handleSignOut}
      signingOut={signingOut}
    >
      {signOutError && (
        <p className="px-4 pt-4 text-sm text-destructive sm:px-8" role="alert">
          {signOutError}
        </p>
      )}
      {user.role === 'user' ? (
        <RepositoryWorkspace />
      ) : (
        <AdminDashboard />
      )}
    </DashboardLayout>
  )
}

export default App
