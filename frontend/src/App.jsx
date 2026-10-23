import './App.css'
import { Button } from '@/components/ui/button'
import { useCallback, useEffect, useState } from 'react'
import LoginPage from './components/LoginPage'
import SignupPage from './components/SignupPage'
import AdminDashboard from './components/layout/AdminDashboard'
import DashboardLayout from './components/layout/Dashboard'
import RepositoryWorkspace from './components/RepositoryWorkspace'
import { apiRequest } from './lib/api'
import { useAuth } from './lib/use-auth'
import Profile from './pages/Profile';
import Settings from './pages/Settings';

function App() {
  const { user, loading, error, refresh, signOut } = useAuth()
  const [signOutError, setSignOutError] = useState('')
  const [signingOut, setSigningOut] = useState(false)
  const [pathname, setPathname] = useState(window.location.pathname)
  const [repositoryState, setRepositoryState] = useState({
    userId: null,
    repositories: [],
    error: '',
  })
  const [repositoryJustAdded, setRepositoryJustAdded] = useState(false);

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  useEffect(() => {
    let active = true
    if (user?.role !== 'user') return undefined

    apiRequest('/api/repositories')
      .then(({ repositories: savedRepositories }) => {
        if (active) {
          setRepositoryState((current) => {
            const recentRepositories = current.userId === user.id ? current.repositories : []
            const mergedRepositories = [
              ...recentRepositories,
              ...savedRepositories.filter((saved) => !recentRepositories.some(
                (recent) => recent.fullName.toLowerCase() === saved.fullName.toLowerCase(),
              )),
            ]
            return { userId: user.id, repositories: mergedRepositories, error: '' }
          })
        }
      })
      .catch((requestError) => {
        if (active) {
          setRepositoryState((current) => ({
            userId: user.id,
            repositories: current.userId === user.id ? current.repositories : [],
            error: requestError.message,
          }))
        }
      })

    return () => {
      active = false
    }
  }, [user?.id, user?.role])

  const navigate = useCallback((path) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path)
    }
    setPathname(path)
  }, [])

  const currentUserId = user?.id
  const rememberRepository = useCallback((repository) => {
    if (!currentUserId) return;

    setRepositoryState((current) => {
      const previousRepositories =
        current.userId === currentUserId
          ? current.repositories
          : [];

      const alreadyExists = previousRepositories.some(
        (item) =>
          item.fullName.toLowerCase() ===
          repository.fullName.toLowerCase(),
      );

      if (!alreadyExists) {
        setRepositoryJustAdded(true);
      }

      return {
        userId: currentUserId,
        repositories: [
          repository,
          ...previousRepositories.filter(
            (item) =>
              item.fullName.toLowerCase() !==
              repository.fullName.toLowerCase(),
          ),
        ],
        error: '',
      };
    });
  }, [currentUserId]);

  const repositories = repositoryState.userId === user?.id
    ? repositoryState.repositories
    : []
  const repositoriesLoading = user?.role === 'user' && repositoryState.userId !== user.id
  const repositoriesError = repositoryState.userId === user?.id ? repositoryState.error : ''

  let repositoryRoute = null
  const routeParts = pathname.split('/').filter(Boolean)
  if (routeParts.length === 3 && routeParts[0] === 'repositories') {
    try {
      repositoryRoute = {
        owner: decodeURIComponent(routeParts[1]),
        repo: decodeURIComponent(routeParts[2]),
      }
    } catch {
      repositoryRoute = null
    }
  }

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
    if (signingOut) return;

    setSigningOut(true);
    setSignOutError('');

    try {
      await signOut();
      window.history.replaceState(null, '', '/login');
    } catch (requestError) {
      setSignOutError(requestError.message || 'Unable to sign out. Please try again.');
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <DashboardLayout
      role={user.role}
      user={user}
      onSignOut={handleSignOut}
      signingOut={signingOut}
      currentPath={pathname}
      repositories={user.role === 'user' ? repositories : []}
      onNavigate={navigate}
    >
      {signOutError && (
        <p className="px-4 pt-4 text-sm text-destructive sm:px-8" role="alert">
          {signOutError}
        </p>
      )}
      
      {pathname === '/profile' ? (
        <Profile />
      ) : pathname === '/settings' ? (
        <Settings role={user.role} />
      ) : pathname === '/login' || pathname === '/signup' ? (
        <RepositoryWorkspace
          repositoryRoute={repositoryRoute}
          showRepositoryList={pathname === '/repositories'}
          repositories={repositories}
          repositoriesLoading={repositoriesLoading}
          repositoriesError={repositoriesError}
          onRepositoryFetched={rememberRepository}
          onNavigate={navigate}
        />
      ) : user.role === 'user' ? (
        <RepositoryWorkspace
          repositoryRoute={repositoryRoute}
          showRepositoryList={pathname === '/repositories'}
          repositories={repositories}
          repositoriesLoading={repositoriesLoading}
          repositoriesError={repositoriesError}
          onRepositoryFetched={rememberRepository}
          onNavigate={navigate}
        />
      ) : (
        <AdminDashboard />
      )}
    </DashboardLayout>
  )
}

export default App
