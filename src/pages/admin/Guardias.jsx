import { ShieldPlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api, { getApiErrorMessage, normalizeListResponse } from '../../api'
import Table from '../../components/Table'

const emptyPage = { results: [], count: 0, next: null, previous: null, loading: true, error: '' }
export default function Guardias() {
  const [guardias, setGuardias] = useState(emptyPage)
  const [nuevoGuardia, setNuevoGuardia] = useState({ username: '', first_name: '', last_name: '', password: '' })
  const [guardandoGuardia, setGuardandoGuardia] = useState(false)
  const fetchList = useCallback(async (url = '/guardias/') => {
    setGuardias(current => ({ ...current, loading: true, error: '' }))
    try { const response = await api.get(url); setGuardias({ ...normalizeListResponse(response.data), loading: false, error: '' }) }
    catch (error) { setGuardias(current => ({ ...current, loading: false, error: getApiErrorMessage(error, 'No se pudieron cargar los registros') })) }
  }, [])
  useEffect(() => { fetchList() }, [fetchList])
  const crearGuardia = async event => {
    event.preventDefault()
    if (!nuevoGuardia.username.trim()) return toast.error('Ingresa el nombre de usuario')
    if (!nuevoGuardia.first_name.trim()) return toast.error('Ingresa el nombre')
    if (nuevoGuardia.password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres')
    setGuardandoGuardia(true)
    try { await api.post('/guardias/', { username: nuevoGuardia.username.trim(), first_name: nuevoGuardia.first_name.trim(), last_name: nuevoGuardia.last_name.trim(), password: nuevoGuardia.password }); toast.success('Guardia registrado'); setNuevoGuardia({ username: '', first_name: '', last_name: '', password: '' }); await fetchList() }
    catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo registrar el guardia')) }
    finally { setGuardandoGuardia(false) }
  }
  const columns = useMemo(() => [{ header: 'Usuario', accessorKey: 'username' }, { header: 'Nombre', accessorFn: guardia => `${guardia.first_name ?? ''} ${guardia.last_name ?? ''}`.trim() || '—' }], [])
  return <section className="card"><h1 className="section-title"><ShieldPlus/> Guardias</h1>
    <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={crearGuardia}>
      <div><label className="block text-sm" htmlFor="guardia-username">Usuario</label><input id="guardia-username" className="input" required value={nuevoGuardia.username} onChange={event => setNuevoGuardia(current => ({ ...current, username: event.target.value }))}/></div>
      <div><label className="block text-sm" htmlFor="guardia-nombre">Nombre</label><input id="guardia-nombre" className="input" required value={nuevoGuardia.first_name} onChange={event => setNuevoGuardia(current => ({ ...current, first_name: event.target.value }))}/></div>
      <div><label className="block text-sm" htmlFor="guardia-apellido">Apellido (opcional)</label><input id="guardia-apellido" className="input" value={nuevoGuardia.last_name} onChange={event => setNuevoGuardia(current => ({ ...current, last_name: event.target.value }))}/></div>
      <div><label className="block text-sm" htmlFor="guardia-password">Contraseña</label><input id="guardia-password" className="input" type="password" minLength={8} required value={nuevoGuardia.password} onChange={event => setNuevoGuardia(current => ({ ...current, password: event.target.value }))}/></div>
      <button className="btn-ok" disabled={guardandoGuardia}><ShieldPlus size={16}/> {guardandoGuardia ? 'Registrando...' : 'Registrar guardia'}</button>
    </form><Table {...guardias} data={guardias.results} columns={columns} emptyMessage="No hay guardias registrados." onPrevious={() => fetchList(guardias.previous)} onNext={() => fetchList(guardias.next)}/></section>
}
