import { LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <nav className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 font-bold"><ShieldCheck className="text-[#4696e5]" /> <span className="hidden sm:inline">Condominio Seguro</span></div>
        <div className="flex items-center gap-3 text-sm"><span className="hidden text-slate-600 sm:inline">{user?.username} · <b className="capitalize text-slate-900">{user?.rol}</b></span><button onClick={logout} className="btn-secondary"><LogOut size={16} /> Salir</button></div>
      </div>
    </nav>
    <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
  </div>
}
