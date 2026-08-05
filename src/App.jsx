import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import RutaProtegida from './components/RutaProtegida'
import { AuthProvider } from './context/AuthContext'
import Admin from './pages/Admin'
import Guardia from './pages/Guardia'
import Login from './pages/Login'
import Propietario from './pages/Propietario'

export default function App() {
  return <AuthProvider><Router><Toaster position="top-right" /><Routes><Route path="/login" element={<Login />} /><Route path="/propietario" element={<RutaProtegida rol="propietario"><Propietario /></RutaProtegida>} /><Route path="/guardia" element={<RutaProtegida rol="guardia"><Guardia /></RutaProtegida>} /><Route path="/admin" element={<RutaProtegida rol="admin"><Admin /></RutaProtegida>} /><Route path="*" element={<Navigate to="/login" replace />} /></Routes></Router></AuthProvider>
}
