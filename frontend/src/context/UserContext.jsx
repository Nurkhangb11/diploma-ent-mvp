import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    if (!token) return null

    const response = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.user
  }, [token])

  useEffect(() => {
    let mounted = true

    const run = async () => {
      try {
        if (!token) {
          if (mounted) setUser(null)
          return
        }
        const me = await fetchMe()
        if (mounted) setUser(me)
      } catch (e) {
        // ignore
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
    localStorage.setItem('token', nextToken)
    if (nextUser) setUser(nextUser)
  }

  const logout = () => {
    setToken(null)
    setUser(null)
    localStorage.removeItem('token')
  }

  return (
    <UserContext.Provider
      value={{
        token,
        user,
        userId: user?.id ?? null,
        userName: user?.name ?? null,
        avatar: user?.avatar ?? null,
        targetScore: user?.target_score ?? null,
        authLoading,
        login,
        logout,
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



