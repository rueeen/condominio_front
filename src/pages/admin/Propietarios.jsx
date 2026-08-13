import { Building2, ParkingSquare, Pencil, Plus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api, { getApiErrorMessage, normalizeListResponse } from '../../api'
import Table from '../../components/Table'

const emptyPage = { results: [], count: 0, next: null, previous: null, loading: true, error: '' }
export default function Propietarios() {
  const [propietarios, setPropietarios] = useState(emptyPage)
  const [estacionamientos, setEstacionamientos] = useState(emptyPage)
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [numeroEstacionamientoRapido, setNumeroEstacionamientoRapido] = useState('')
  const [guardandoEstacionamiento, setGuardandoEstacionamiento] = useState(false)
  const [desvinculandoEstacionamiento, setDesvinculandoEstacionamiento] = useState(null)
  const [nuevoPropietario, setNuevoPropietario] = useState({ username: '', password: '', first_name: '', last_name: '', torre: '', departamento: '' })
  const [guardandoPropietario, setGuardandoPropietario] = useState(false)
  const editandoId = editando?.id
  const fetchList = useCallback(async (name, url = `/${name}/`) => {
    const setter = name === 'propietarios' ? setPropietarios : setEstacionamientos
    setter(current => ({ ...current, loading: true, error: '' }))
    try { const response = await api.get(url); setter({ ...normalizeListResponse(response.data), loading: false, error: '' }) }
    catch (error) { setter(current => ({ ...current, loading: false, error: getApiErrorMessage(error, 'No se pudieron cargar los registros') })) }
  }, [])
  useEffect(() => { fetchList('propietarios') }, [fetchList])
  useEffect(() => { if (editandoId) fetchList('estacionamientos', `/estacionamientos/?propietario=${editandoId}`) }, [editandoId, fetchList])
  const abrirEdicion = propietario => setEditando({ ...propietario, torre: String(propietario.torre), departamento: String(propietario.departamento) })
  const guardarPropietario = async event => {
    event.preventDefault(); const torre = Number(editando.torre), departamento = Number(editando.departamento)
    if (!Number.isInteger(torre) || torre < 1 || torre > 25) return toast.error('La torre debe ser un número entero entre 1 y 25')
    if (!Number.isInteger(departamento)) return toast.error('El departamento debe ser un número entero')
    setGuardando(true)
    try { await api.patch(`/propietarios/${editando.id}/`, { first_name: editando.first_name?.trim() ?? '', last_name: editando.last_name?.trim() ?? '', torre, departamento }); toast.success('Propietario actualizado'); setEditando(null); await fetchList('propietarios') }
    catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo actualizar el propietario')) }
    finally { setGuardando(false) }
  }
  const crearPropietario = async event => {
    event.preventDefault(); const torre = Number(nuevoPropietario.torre), departamento = Number(nuevoPropietario.departamento)
    if (!nuevoPropietario.username.trim()) return toast.error('Ingresa el nombre de usuario')
    if (!nuevoPropietario.first_name.trim()) return toast.error('Ingresa el nombre')
    if (nuevoPropietario.password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres')
    if (!Number.isInteger(torre) || torre < 1 || torre > 25) return toast.error('La torre debe ser un número entero entre 1 y 25')
    if (!Number.isInteger(departamento)) return toast.error('El departamento debe ser un número entero')
    setGuardandoPropietario(true)
    try { await api.post('/propietarios/', { username: nuevoPropietario.username.trim(), password: nuevoPropietario.password, first_name: nuevoPropietario.first_name.trim(), last_name: nuevoPropietario.last_name.trim(), torre, departamento }); toast.success('Propietario registrado'); setNuevoPropietario({ username: '', password: '', first_name: '', last_name: '', torre: '', departamento: '' }); await fetchList('propietarios') }
    catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo registrar el propietario')) }
    finally { setGuardandoPropietario(false) }
  }
  const agregarEstacionamientoAEditando = async event => {
    event.preventDefault(); if (!numeroEstacionamientoRapido.trim()) return toast.error('Ingresa el número de estacionamiento')
    setGuardandoEstacionamiento(true)
    try {
      const payload = { numero: numeroEstacionamientoRapido.trim(), propietario: editando.id }
      try { await api.post('/estacionamientos/asignar/', payload) }
      catch (error) {
        if (error.response?.status !== 409) throw error
        const actual = error.response.data?.propietario_actual || error.response.data?.propietario
        const unidad = actual ? `Torre ${actual.torre} · Depto ${actual.departamento}` : 'otro propietario'
        if (!window.confirm(`El estacionamiento ${payload.numero} ya pertenece a ${unidad}. ¿Quieres reasignarlo?`)) return
        await api.post('/estacionamientos/asignar/', { ...payload, reasignar: true })
      }
      toast.success('Estacionamiento asignado'); setNumeroEstacionamientoRapido(''); await Promise.all([fetchList('estacionamientos', `/estacionamientos/?propietario=${editando.id}`), fetchList('propietarios')])
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo asignar el estacionamiento')) }
    finally { setGuardandoEstacionamiento(false) }
  }
  const desvincularEstacionamiento = useCallback(async estacionamiento => {
    if (!window.confirm(`¿Quitar el estacionamiento ${estacionamiento.numero} de este propietario? El espacio quedará libre y el propietario perderá ese cupo de patentes.`)) return
    setDesvinculandoEstacionamiento(estacionamiento.id)
    try { await api.patch(`/estacionamientos/${estacionamiento.id}/`, { propietario: null }); toast.success('Estacionamiento desvinculado'); await Promise.all([fetchList('estacionamientos', `/estacionamientos/?propietario=${editando.id}`), fetchList('propietarios')]) }
    catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo desvincular el estacionamiento')) }
    finally { setDesvinculandoEstacionamiento(null) }
  }, [editando?.id, fetchList])
  const columns = useMemo(() => [
    { header: 'Usuario', accessorKey: 'username' }, { header: 'Nombre', accessorFn: propietario => `${propietario.first_name} ${propietario.last_name}`.trim() || '—' },
    { header: 'Unidad', cell: info => <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"><Building2 size={13}/> Torre {info.row.original.torre} · Depto {info.row.original.departamento}</span> },
    { header: 'Estacionamientos', cell: info => { const espacios = info.row.original.estacionamientos ?? []; return espacios.length ? <div className="flex flex-wrap gap-1.5">{espacios.map(numero => <span key={numero} className="inline-flex items-center gap-1 rounded-full bg-[#4696e5]/10 px-2.5 py-1 text-xs font-bold text-[#317fcf]"><ParkingSquare size={12}/> {numero}</span>)}</div> : <span className="badge-gray">Sin estacionamiento</span> } },
    { header: 'Acciones', cell: info => <button className="btn-secondary" onClick={() => abrirEdicion(info.row.original)}><Pencil size={15}/> Editar</button> },
  ], [])
  return <section className="card"><h1 className="mb-4 text-2xl font-bold">Propietarios</h1>
    <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={crearPropietario}>
      <div><label className="block text-sm" htmlFor="propietario-username">Usuario</label><input id="propietario-username" className="input" required value={nuevoPropietario.username} onChange={event => setNuevoPropietario(current => ({ ...current, username: event.target.value }))}/></div>
      <div><label className="block text-sm" htmlFor="propietario-password">Contraseña</label><input id="propietario-password" className="input" type="password" minLength={8} required value={nuevoPropietario.password} onChange={event => setNuevoPropietario(current => ({ ...current, password: event.target.value }))}/></div>
      <div><label className="block text-sm" htmlFor="propietario-nombre">Nombre</label><input id="propietario-nombre" className="input" required value={nuevoPropietario.first_name} onChange={event => setNuevoPropietario(current => ({ ...current, first_name: event.target.value }))}/></div>
      <div><label className="block text-sm" htmlFor="propietario-apellido">Apellido (opcional)</label><input id="propietario-apellido" className="input" value={nuevoPropietario.last_name} onChange={event => setNuevoPropietario(current => ({ ...current, last_name: event.target.value }))}/></div>
      <div><label className="block text-sm" htmlFor="propietario-torre">Torre</label><input id="propietario-torre" className="input" type="number" min="1" max="25" required value={nuevoPropietario.torre} onChange={event => setNuevoPropietario(current => ({ ...current, torre: event.target.value }))}/></div>
      <div><label className="block text-sm" htmlFor="propietario-departamento">Departamento</label><input id="propietario-departamento" className="input" type="number" required value={nuevoPropietario.departamento} onChange={event => setNuevoPropietario(current => ({ ...current, departamento: event.target.value }))}/></div>
      <button className="btn-ok" disabled={guardandoPropietario}><Building2 size={16}/> {guardandoPropietario ? 'Registrando...' : 'Registrar propietario'}</button>
    </form>
    {editando && <div className="mb-4 space-y-4 rounded-xl border border-[#4696e5]/30 bg-[#4696e5]/5 p-4"><form className="flex flex-wrap items-end gap-3" onSubmit={guardarPropietario}>
      <div><p className="mb-2 font-semibold">Editando a {editando.username}</p><label className="block text-sm" htmlFor="nombre">Nombre</label><input id="nombre" className="input" value={editando.first_name ?? ''} onChange={event => setEditando(current => ({ ...current, first_name: event.target.value }))}/></div>
      <div><label className="block text-sm" htmlFor="apellido">Apellido</label><input id="apellido" className="input" value={editando.last_name ?? ''} onChange={event => setEditando(current => ({ ...current, last_name: event.target.value }))}/></div>
      <div><label className="block text-sm" htmlFor="torre">Torre</label><input id="torre" className="input" type="number" min="1" max="25" required value={editando.torre} onChange={event => setEditando(current => ({ ...current, torre: event.target.value }))}/></div>
      <div><label className="block text-sm" htmlFor="departamento">Departamento</label><input id="departamento" className="input" type="number" required value={editando.departamento} onChange={event => setEditando(current => ({ ...current, departamento: event.target.value }))}/></div>
      <button className="btn-ok" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button><button className="btn-secondary" type="button" disabled={guardando} onClick={() => setEditando(null)}>Cancelar</button>
    </form><div className="border-t border-[#4696e5]/20 pt-4"><p className="mb-2 text-sm font-semibold">Estacionamientos de este propietario</p><div className="mb-3 flex flex-wrap gap-2">{estacionamientos.results.length === 0 ? <span className="badge-gray">Sin estacionamiento</span> : estacionamientos.results.map(item => <span key={item.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#4696e5]/10 py-1 pl-3 pr-1.5 text-xs font-bold text-[#317fcf]"><ParkingSquare size={12}/> {item.numero}<button type="button" disabled={desvinculandoEstacionamiento === item.id} className="rounded-full p-0.5 hover:bg-red-100 hover:text-red-600 disabled:opacity-50" aria-label={`Desvincular estacionamiento ${item.numero} de este propietario`} onClick={() => desvincularEstacionamiento(item)}><X size={13}/></button></span>)}</div>
      <form className="flex items-end gap-2" onSubmit={agregarEstacionamientoAEditando}><div><label className="block text-sm" htmlFor="estacionamiento-rapido">Número</label><input id="estacionamiento-rapido" className="input w-36" placeholder="228" value={numeroEstacionamientoRapido} onChange={event => setNumeroEstacionamientoRapido(event.target.value)}/></div><button className="btn-primary" disabled={guardandoEstacionamiento}><Plus size={16}/> {guardandoEstacionamiento ? 'Agregando...' : 'Agregar'}</button></form>
    </div></div>}
    <Table {...propietarios} data={propietarios.results} columns={columns} onPrevious={() => fetchList('propietarios', propietarios.previous)} onNext={() => fetchList('propietarios', propietarios.next)}/>
  </section>
}
