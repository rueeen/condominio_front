import { Building2, ClipboardList, History, ParkingSquare, ShieldPlus } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'
import Layout from '../../components/Layout'

const links = [
  { to: 'solicitudes', label: 'Solicitudes', icon: ClipboardList },
  { to: 'ingresos', label: 'Historial', icon: History },
  { to: 'propietarios', label: 'Propietarios', icon: Building2 },
  { to: 'estacionamientos', label: 'Estacionamientos', icon: ParkingSquare },
  { to: 'guardias', label: 'Guardias', icon: ShieldPlus },
]

export default function AdminLayout() {
  return <Layout>
    <nav className="mb-6 flex gap-2 overflow-x-auto rounded-xl border border-slate-200 bg-white p-2 shadow-sm" aria-label="Secciones de administración">
      {links.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md px-4 font-bold transition ${isActive ? 'bg-[#4696e5] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={19}/><span>{label}</span></NavLink>)}
    </nav>
    <Outlet/>
  </Layout>
}
