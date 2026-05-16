import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const clearSession = useCallback(() => {
    setToken(null)
    setUser(null)
    try {
      localStorage.removeItem('token')
    } catch {
      /* ignore */
    }
  }, [])

  const fetchMe = useCallback(
    async (authToken) => {
      const tok = authToken ?? token
      if (!tok) return null

      const response = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${tok}`,
        },
      })

      if (response.status === 401) {
        clearSession()
        return null
      }
      if (!response.ok) return null
      const data = await response.json()
      return data.user
    },
    [token, clearSession]
  )

  useEffect(() => {
    let mounted = true

    const run = async () => {
      try {
        if (!token) {
          if (mounted) setUser(null)
          return
        }
        const me = await fetchMe(token)
        if (mounted) setUser(me)
      } catch {
        if (mounted) setUser(null)
      } finally {
        if (mounted) setAuthLoading(false)
      }
    }

    run()
    return () => {
      mounted = false
    }
  }, [token, fetchMe])

  const login = (nextToken, nextUser) => {
    setToken(nextToken)
    try {
      localStorage.setItem('token', nextToken)
    } catch {
      /* ignore */
    }
    if (nextUser) setUser(nextUser)
  }

  const logout = () => {
    clearSession()
  }

  const refreshUser = useCallback(async () => {
    const me = await fetchMe()
    setUser(me)
  }, [fetchMe])

  return (
    <UserContext.Provider
      value={{
        token,
        user,
        setUser,
        userId: user?.id ?? null,
        userName: user?.name ?? null,
        avatar: user?.avatar ?? null,
        targetScore: user?.target_score ?? null,
        authLoading,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within UserProvider')
  }
  return context
}
