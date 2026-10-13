
import './App.css'
import DashboardLayout from './components/layout/Dashboard'
import RepositoryWorkspace from './components/RepositoryWorkspace'

function App() {
  const role =
    import.meta.env.VITE_DASHBOARD_ROLE === 'admin' ? 'admin' : 'user'

  return (
    <DashboardLayout role={role}>
      {role === 'user' ? (
        <RepositoryWorkspace />
      ) : (
        <section className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">
            Administration
          </p>

          <h2 className="mt-3 text-3xl font-semibold tracking-tight">
            Admin Dashboard
          </h2>

          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Manage users, monitor analysis jobs and configure platform
            settings. Administrative controls will be connected to the
            backend in a later milestone.
          </p>
        </section>
      )}
    </DashboardLayout>
  )
}

export default App
