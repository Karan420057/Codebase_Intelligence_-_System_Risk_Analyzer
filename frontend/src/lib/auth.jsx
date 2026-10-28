import { useCallback, useEffect, useState, useRef } from 'react'
import { apiRequest } from './api'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const authRequestVersion = useRef(0)

  const fetchCurrentUser = useCallback(async () => {
    try {
      const { user: currentUser } = await apiRequest('/api/auth/me')
      return { user: currentUser, error: '' }
    } catch (requestError) {
      if (requestError.status === 401) {
        return { user: null, error: '' }
      }
      return { user: null, error: requestError.message }
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchCurrentUser()
      setUser(result.user)
      setError(result.error)
    } finally {
      setLoading(false)
    }
  }, [fetchCurrentUser])

  // useEffect(() => {
  //   let active = true

  //   fetchCurrentUser()
  //     .then((result) => {
  //       if (active) {
  //         setUser(result.user)
  //         setError(result.error)
  //       }
  //     })
  //     .finally(() => {
  //       if (active) setLoading(false)
  //     })

  //   return () => {
  //     active = false
  //   }
  // }, [fetchCurrentUser])

  useEffect(() => {
    let active = true
    const requestVersion = ++authRequestVersion.current

    fetchCurrentUser()
      .then((result) => {
        if (
          active &&
          authRequestVersion.current === requestVersion
        ) {
          setUser(result.user)
          setError(result.error)
        }
      })
      .finally(() => {
        if (
          active &&
          authRequestVersion.current === requestVersion
        ) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [fetchCurrentUser])

  // const authenticate = useCallback(async (action, credentials) => {
  //   const { user: authenticatedUser } = await apiRequest(`/api/auth/${action}`, {
  //     method: 'POST',
  //     body: JSON.stringify(credentials),
  //   })
  //   setUser(authenticatedUser)
  //   setError('')
  // }, [])

  const authenticate = useCallback(async (action, credentials) => {
    const requestVersion = ++authRequestVersion.current

    setError('')

    try {
      const { user: authenticatedUser } = await apiRequest(
        `/api/auth/${action}`,
        {
          method: 'POST',
          body: JSON.stringify(credentials),
        },
      )

      if (authRequestVersion.current === requestVersion) {
        setUser(authenticatedUser)
        setError('')
      }
    } catch (requestError) {
      if (authRequestVersion.current === requestVersion) {
        setError(requestError.message)
      }

      throw requestError
    }
  }, [])

  const signOut = useCallback(async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error, refresh, authenticate, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
