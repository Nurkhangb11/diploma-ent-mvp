import { createContext, useContext, useState, useEffect } from 'react'

const UserContext = createContext()

export function UserProvider({ children }) {
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState(null)

  useEffect(() => {
    // Загрузить user_id из localStorage при загрузке
    const savedUserId = localStorage.getItem('user_id')
    const savedUserName = localStorage.getItem('user_name')
    if (savedUserId) {
      setUserId(parseInt(savedUserId))
    }
    if (savedUserName) {
      setUserName(savedUserName)
    }
  }, [])

  const login = (id, name) => {
    setUserId(id)
    setUserName(name)
    localStorage.setItem('user_id', id.toString())
    localStorage.setItem('user_name', name)
  }

  const logout = () => {
    setUserId(null)
    setUserName(null)
    localStorage.removeItem('user_id')
    localStorage.removeItem('user_name')
  }

  return (
    <UserContext.Provider value={{ userId, userName, login, logout }}>
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


