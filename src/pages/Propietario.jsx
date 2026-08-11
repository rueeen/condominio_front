import { Car, UserCircle, UserPlus } from 'lucide-react'
import { useState } from 'react'
import Layout from '../components/Layout'
import PerfilPanel from '../features/propietario/PerfilPanel'
import VisitasPanel from '../features/propietario/VisitasPanel'
import VisitanteQrModal from '../features/propietario/VisitanteQrModal'
import VehiculosPanel from '../features/propietario/VehiculosPanel'
import usePerfil from '../features/propietario/hooks/usePerfil'
import useVehiculos from '../features/propietario/hooks/useVehiculos'
import useVisitantes from '../features/propietario/hooks/useVisitantes'
export default function Propietario() {
  const [activeTab, setActiveTab] = useState('visitas'); const [reminderDismissed, setReminderDismissed] = useState(false); const visitas = useVisitantes(); const vehiculos = useVehiculos(); const perfil = usePerfil(); const showReminder = !perfil.loading && !perfil.error && perfil.profile && !perfil.profile.email?.trim() && !perfil.profile.telefono?.trim() && !reminderDismissed
  const tabs = [{ id: 'visitas', label: 'Visitas', Icon: UserPlus }, { id: 'vehiculos', label: 'Vehículos', Icon: Car }, { id: 'perfil', label: 'Mi Perfil', Icon: UserCircle }]
  return <Layout><div className="mx-auto max-w-5xl"><div className="mb-5 grid grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm" role="tablist" aria-label="Gestión de propietario">{tabs.map(({ id, label, Icon }) => <button key={id} type="button" id={`tab-${id}`} role="tab" aria-selected={activeTab === id} aria-controls={`panel-${id}`} onClick={() => setActiveTab(id)} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-md px-3 font-bold transition ${activeTab === id ? 'bg-[#4696e5] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Icon size={21}/><span>{label}</span></button>)}</div>{activeTab === 'visitas' ? <VisitasPanel visitas={visitas} showReminder={showReminder} dismissReminder={() => setReminderDismissed(true)} openProfile={() => setActiveTab('perfil')}/> : activeTab === 'vehiculos' ? <VehiculosPanel vehiculos={vehiculos}/> : <PerfilPanel perfil={perfil}/>}<VisitanteQrModal visitante={visitas.qrVisitor} onClose={() => visitas.setQrVisitor(null)}/></div></Layout>
}
