import { useEffect, useState } from 'react'
import { apiRequest } from '@/lib/api'

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    apiRequest('/api/admin/users')
      .then(({ users: registeredUsers }) => {
        if (active) setUsers(registeredUsers)
      })
      .catch((requestError) => {
        if (active) setError(requestError.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <section className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-widest text-primary">
        Administration
      </p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight">Admin Dashboard</h2>
      <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
        View registered accounts. Administrative access is verified by the API.
      </p>

      <div className="mt-8 overflow-hidden rounded-xl border bg-card">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h3 className="font-medium">User Management</h3>
          {!loading && !error && (
            <span className="text-sm text-muted-foreground">{users.length} accounts</span>
          )}
        </div>

        {loading ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">Loading accounts...</p>
        ) : error ? (
          <p className="px-5 py-6 text-sm text-destructive" role="alert">{error}</p>
        ) : users.length === 0 ? (
          <p className="px-5 py-6 text-sm text-muted-foreground">No accounts found.</p>
        ) : (
          <ul className="divide-y">
            {users.map((registeredUser) => (
              <li
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                key={registeredUser.id}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{registeredUser.name}</p>
                  <p className="truncate text-sm text-muted-foreground">{registeredUser.email}</p>
                </div>
                <span className="rounded-full bg-muted px-3 py-1 text-xs capitalize">
                  {registeredUser.role}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
