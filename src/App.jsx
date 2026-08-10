import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import RutaProtegida from './components/RutaProtegida'
import { AuthProvider } from './context/AuthContext'
import AdminLayout from './pages/admin/AdminLayout'
import Estacionamientos from './pages/admin/Estacionamientos'
import Guardias from './pages/admin/Guardias'
import Ingresos from './pages/admin/Ingresos'
import PropietariosAdmin from './pages/admin/Propietarios'
import Solicitudes from './pages/admin/Solicitudes'
import Guardia from './pages/Guardia'
import Login from './pages/Login'
import Propietario from './pages/Propietario'

export default function App() {
  return <AuthProvider><Router><Toaster position="top-right" /><Routes><Route path="/login" element={<Login />} /><Route path="/propietario" element={<RutaProtegida rol="propietario"><Propietario /></RutaProtegida>} /><Route path="/guardia" element={<RutaProtegida rol="guardia"><Guardia /></RutaProtegida>} /><Route path="/admin" element={<RutaProtegida rol="admin"><AdminLayout /></RutaProtegida>}><Route index element={<Navigate to="solicitudes" replace />} /><Route path="solicitudes" element={<Solicitudes />} /><Route path="ingresos" element={<Ingresos />} /><Route path="propietarios" element={<PropietariosAdmin />} /><Route path="estacionamientos" element={<Estacionamientos />} /><Route path="guardias" element={<Guardias />} /></Route><Route path="*" element={<Navigate to="/login" replace />} /></Routes></Router></AuthProvider>
}
