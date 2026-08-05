/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

const AuthContext = createContext(null)

const readUser = () => {
  const token = localStorage.getItem('access')
  if (!token) return null
  try {
    const payload = jwtDecode(token)
    return { username: payload.username || payload.user || payload.sub, rol: payload.rol || payload.role, payload }
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser)

  const value = useMemo(() => ({
    user,
    login(access, refresh) {
      localStorage.setItem('access', access)
      localStorage.setItem('refresh', refresh)
      setUser(readUser())
    },
    logout() {
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
      setUser(null)
    },
  }), [user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
