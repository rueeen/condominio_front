import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function RutaProtegida({ rol, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (rol && user.rol !== rol) return <Navigate to="/login" replace />
  return children
}
