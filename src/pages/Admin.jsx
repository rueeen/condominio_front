import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Building2, Check, ParkingSquare, Pencil, Plus, ShieldPlus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api, { getApiErrorMessage, normalizeListResponse } from '../api'
import Layout from '../components/Layout'
import Table from '../components/Table'

const emptyPage = { results: [], count: 0, next: null, previous: null, loading: true, error: '' }

export default function Admin() {
  const [lists, setLists] = useState({
    vehiculos: { ...emptyPage }, vehiculosPendientes: { ...emptyPage }, ingresos: { ...emptyPage }, propietarios: { ...emptyPage }, estacionamientos: { ...emptyPage }, guardias: { ...emptyPage },
  })
  const [motivos, setMotivos] = useState({})
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [numeroEstacionamientoRapido, setNumeroEstacionamientoRapido] = useState('')
  const [guardandoEstacionamiento, setGuardandoEstacionamiento] = useState(false)
  const [nuevoGuardia, setNuevoGuardia] = useState({ username: '', first_name: '', last_name: '', password: '' })
  const [guardandoGuardia, setGuardandoGuardia] = useState(false)
  const [nuevoPropietario, setNuevoPropietario] = useState({ username: '', password: '', first_name: '', last_name: '', torre: '', departamento: '' })
  const [guardandoPropietario, setGuardandoPropietario] = useState(false)

  const fetchList = useCallback(async (name, url = `/${name}/`) => {
    setLists(current => ({ ...current, [name]: { ...current[name], loading: true, error: '' } }))
    try {
      const response = await api.get(url)
      setLists(current => ({ ...current, [name]: { ...normalizeListResponse(response.data), loading: false, error: '' } }))
    } catch (error) {
      setLists(current => ({
        ...current,
        [name]: { ...current[name], loading: false, error: getApiErrorMessage(error, 'No se pudieron cargar los registros') },
      }))
    }
  }, [])

  const load = useCallback(() => Promise.all([
    fetchList('vehiculos'), fetchList('vehiculosPendientes', '/vehiculos/?estado=pendiente'), fetchList('ingresos'), fetchList('propietarios'), fetchList('estacionamientos'), fetchList('guardias'),
  ]), [fetchList])

  useEffect(() => { load() }, [load])

  const resolver = useCallback(async (id, aprobar) => {
    const motivo_rechazo = motivos[id]
    if (!aprobar && !motivo_rechazo) return toast.error('Ingresa el motivo de rechazo')
    try {
      await api.post(`/vehiculos/${id}/resolver/`, { aprobar, motivo_rechazo })
      toast.success(aprobar ? 'Vehículo aprobado' : 'Vehículo rechazado')
      await Promise.all([fetchList('vehiculos'), fetchList('vehiculosPendientes', '/vehiculos/?estado=pendiente')])
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo resolver la solicitud')) }
  }, [fetchList, motivos])

  const abrirEdicion = propietario => setEditando({ ...propietario, torre: String(propietario.torre), departamento: String(propietario.departamento) })
  const guardarPropietario = async event => {
    event.preventDefault()
    const torre = Number(editando.torre), departamento = Number(editando.departamento)
    if (!Number.isInteger(torre) || torre < 1 || torre > 25) return toast.error('La torre debe ser un número entero entre 1 y 25')
    if (!Number.isInteger(departamento)) return toast.error('El departamento debe ser un número entero')
    setGuardando(true)
    try {
      await api.patch(`/propietarios/${editando.id}/`, {
        first_name: editando.first_name?.trim() ?? '',
        last_name: editando.last_name?.trim() ?? '',
        torre,
        departamento,
      })
      toast.success('Propietario actualizado'); setEditando(null); await fetchList('propietarios')
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo actualizar el propietario')) }
    finally { setGuardando(false) }
  }

  const agregarEstacionamientoAEditando = async event => {
    event.preventDefault()
    if (!numeroEstacionamientoRapido.trim()) return toast.error('Ingresa el número de estacionamiento')
    setGuardandoEstacionamiento(true)
    try {
      await api.post('/estacionamientos/', { numero: numeroEstacionamientoRapido.trim(), propietario: editando.id })
      toast.success('Estacionamiento asignado')
      setNumeroEstacionamientoRapido('')
      await Promise.all([fetchList('estacionamientos'), fetchList('propietarios')])
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo asignar el estacionamiento')) }
    finally { setGuardandoEstacionamiento(false) }
  }

  const crearGuardia = async event => {
    event.preventDefault()
    if (!nuevoGuardia.username.trim()) return toast.error('Ingresa el nombre de usuario')
    if (!nuevoGuardia.first_name.trim()) return toast.error('Ingresa el nombre')
    if (nuevoGuardia.password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres')
    setGuardandoGuardia(true)
    try {
      await api.post('/guardias/', {
        username: nuevoGuardia.username.trim(),
        first_name: nuevoGuardia.first_name.trim(),
        last_name: nuevoGuardia.last_name.trim(),
        password: nuevoGuardia.password,
      })
      toast.success('Guardia registrado')
      setNuevoGuardia({ username: '', first_name: '', last_name: '', password: '' })
      await fetchList('guardias')
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo registrar el guardia')) }
    finally { setGuardandoGuardia(false) }
  }

  const crearPropietario = async event => {
    event.preventDefault()
    const torre = Number(nuevoPropietario.torre), departamento = Number(nuevoPropietario.departamento)
    if (!nuevoPropietario.username.trim()) return toast.error('Ingresa el nombre de usuario')
    if (!nuevoPropietario.first_name.trim()) return toast.error('Ingresa el nombre')
    if (nuevoPropietario.password.length < 8) return toast.error('La contraseña debe tener al menos 8 caracteres')
    if (!Number.isInteger(torre) || torre < 1 || torre > 25) return toast.error('La torre debe ser un número entero entre 1 y 25')
    if (!Number.isInteger(departamento)) return toast.error('El departamento debe ser un número entero')
    setGuardandoPropietario(true)
    try {
      await api.post('/propietarios/', {
        username: nuevoPropietario.username.trim(),
        password: nuevoPropietario.password,
        first_name: nuevoPropietario.first_name.trim(),
        last_name: nuevoPropietario.last_name.trim(),
        torre,
        departamento,
      })
      toast.success('Propietario registrado')
      setNuevoPropietario({ username: '', password: '', first_name: '', last_name: '', torre: '', departamento: '' })
      await fetchList('propietarios')
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo registrar el propietario')) }
    finally { setGuardandoPropietario(false) }
  }
  const eliminarEstacionamiento = useCallback(async id => {
    try { await api.delete(`/estacionamientos/${id}/`); toast.success('Estacionamiento eliminado'); await Promise.all([fetchList('estacionamientos'), fetchList('propietarios')]) }
    catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo eliminar el estacionamiento')) }
  }, [fetchList])

  const { propietarios } = lists
  const vehiculoCols = useMemo(() => [
    { header: 'Patente', accessorKey: 'patente' },
    { header: 'Propietario', accessorFn: vehiculo => `Torre ${vehiculo.propietario_torre} - Depto ${vehiculo.propietario_departamento}` },
    { header: 'Acciones', cell: info => <div className="flex flex-wrap gap-2"><button onClick={() => resolver(info.row.original.id, true)} className="btn-ok"><Check size={16}/> Aprobar</button><input className="input max-w-48" placeholder="Motivo rechazo" onChange={event => setMotivos(current => ({ ...current, [info.row.original.id]: event.target.value }))}/><button onClick={() => resolver(info.row.original.id, false)} className="btn-danger"><X size={16}/> Rechazar</button></div> },
  ], [resolver])
  const ingresoCols = useMemo(() => [{ header: 'Fecha', accessorKey: 'timestamp', cell: info => info.getValue() ? format(parseISO(info.getValue()), 'PPp', { locale: es }) : '' }, { header: 'Tipo', accessorKey: 'tipo' }, { header: 'Valor', accessorKey: 'valor_ingresado' }, { header: 'Resultado', accessorKey: 'resultado' }], [])
  const propietarioCols = useMemo(() => [
    { header: 'Usuario', accessorKey: 'username' },
    { header: 'Nombre', accessorFn: propietario => `${propietario.first_name} ${propietario.last_name}`.trim() || '—' },
    { header: 'Unidad', cell: info => <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600"><Building2 size={13}/> Torre {info.row.original.torre} · Depto {info.row.original.departamento}</span> },
    { header: 'Estacionamientos', cell: info => { const espacios = info.row.original.estacionamientos ?? []; return espacios.length ? <div className="flex flex-wrap gap-1.5">{espacios.map(numero => <span key={numero} className="inline-flex items-center gap-1 rounded-full bg-[#4696e5]/10 px-2.5 py-1 text-xs font-bold text-[#317fcf]"><ParkingSquare size={12}/> {numero}</span>)}</div> : <span className="badge-gray">Sin estacionamiento</span> } },
    { header: 'Acciones', cell: info => <button className="btn-secondary" onClick={() => abrirEdicion(info.row.original)}><Pencil size={15}/> Editar</button> },
  ], [])
  const guardiaCols = useMemo(() => [
    { header: 'Usuario', accessorKey: 'username' },
    { header: 'Nombre', accessorFn: guardia => `${guardia.first_name ?? ''} ${guardia.last_name ?? ''}`.trim() || '—' },
  ], [])
  const estacionamientoCols = useMemo(() => [
    { header: 'Número', accessorKey: 'numero', cell: info => <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4696e5]/10 px-3 py-1 text-xs font-bold text-[#317fcf]"><ParkingSquare size={13}/> {info.getValue()}</span> },
    { header: 'Propietario', accessorFn: estacionamiento => { const propietario = propietarios.results.find(item => item.id === estacionamiento.propietario); return propietario ? `Torre ${propietario.torre} · Depto ${propietario.departamento} (${propietario.username})` : `#${estacionamiento.propietario}` } },
    { header: 'Acciones', cell: info => <button className="btn-danger" onClick={() => eliminarEstacionamiento(info.row.original.id)}><Trash2 size={15}/> Eliminar</button> },
  ], [propietarios.results, eliminarEstacionamiento])
  const tableProps = (name, data = lists[name].results) => ({ data, ...lists[name], onPrevious: () => fetchList(name, lists[name].previous), onNext: () => fetchList(name, lists[name].next) })

  return <Layout><div className="space-y-6">
    <section className="card"><h1 className="mb-4 text-2xl font-bold">Solicitudes pendientes</h1><Table {...tableProps('vehiculosPendientes')} columns={vehiculoCols} emptyMessage="No hay solicitudes pendientes."/></section>
    <section className="card"><h1 className="mb-4 text-2xl font-bold">Historial de ingresos</h1><Table {...tableProps('ingresos')} columns={ingresoCols}/></section>
    <section className="card"><h1 className="mb-4 text-2xl font-bold">Propietarios</h1>
      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={crearPropietario}>
        <div><label className="block text-sm" htmlFor="propietario-username">Usuario</label><input id="propietario-username" className="input" required value={nuevoPropietario.username} onChange={event => setNuevoPropietario(current => ({ ...current, username: event.target.value }))}/></div>
        <div><label className="block text-sm" htmlFor="propietario-password">Contraseña</label><input id="propietario-password" className="input" type="password" minLength={8} required value={nuevoPropietario.password} onChange={event => setNuevoPropietario(current => ({ ...current, password: event.target.value }))}/></div>
        <div><label className="block text-sm" htmlFor="propietario-nombre">Nombre</label><input id="propietario-nombre" className="input" required value={nuevoPropietario.first_name} onChange={event => setNuevoPropietario(current => ({ ...current, first_name: event.target.value }))}/></div>
        <div><label className="block text-sm" htmlFor="propietario-apellido">Apellido (opcional)</label><input id="propietario-apellido" className="input" value={nuevoPropietario.last_name} onChange={event => setNuevoPropietario(current => ({ ...current, last_name: event.target.value }))}/></div>
        <div><label className="block text-sm" htmlFor="propietario-torre">Torre</label><input id="propietario-torre" className="input" type="number" min="1" max="25" required value={nuevoPropietario.torre} onChange={event => setNuevoPropietario(current => ({ ...current, torre: event.target.value }))}/></div>
        <div><label className="block text-sm" htmlFor="propietario-departamento">Departamento</label><input id="propietario-departamento" className="input" type="number" required value={nuevoPropietario.departamento} onChange={event => setNuevoPropietario(current => ({ ...current, departamento: event.target.value }))}/></div>
        <button className="btn-ok" disabled={guardandoPropietario}><Building2 size={16}/> {guardandoPropietario ? 'Registrando...' : 'Registrar propietario'}</button>
      </form>
      {editando && <div className="mb-4 space-y-4 rounded-xl border border-[#4696e5]/30 bg-[#4696e5]/5 p-4">
        <form className="flex flex-wrap items-end gap-3" onSubmit={guardarPropietario}>
          <div><p className="mb-2 font-semibold">Editando a {editando.username}</p><label className="block text-sm" htmlFor="nombre">Nombre</label><input id="nombre" className="input" value={editando.first_name ?? ''} onChange={event => setEditando(current => ({ ...current, first_name: event.target.value }))}/></div>
          <div><label className="block text-sm" htmlFor="apellido">Apellido</label><input id="apellido" className="input" value={editando.last_name ?? ''} onChange={event => setEditando(current => ({ ...current, last_name: event.target.value }))}/></div>
          <div><label className="block text-sm" htmlFor="torre">Torre</label><input id="torre" className="input" type="number" min="1" max="25" required value={editando.torre} onChange={event => setEditando(current => ({ ...current, torre: event.target.value }))}/></div>
          <div><label className="block text-sm" htmlFor="departamento">Departamento</label><input id="departamento" className="input" type="number" required value={editando.departamento} onChange={event => setEditando(current => ({ ...current, departamento: event.target.value }))}/></div>
          <button className="btn-ok" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button><button className="btn-secondary" type="button" disabled={guardando} onClick={() => setEditando(null)}>Cancelar</button>
        </form>
        <div className="border-t border-[#4696e5]/20 pt-4"><p className="mb-2 text-sm font-semibold">Estacionamientos de este propietario</p>
          <div className="mb-3 flex flex-wrap gap-2">{lists.estacionamientos.results.filter(estacionamiento => estacionamiento.propietario === editando.id).length === 0 ? <span className="badge-gray">Sin estacionamiento</span> : lists.estacionamientos.results.filter(estacionamiento => estacionamiento.propietario === editando.id).map(estacionamiento => <span key={estacionamiento.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#4696e5]/10 py-1 pl-3 pr-1.5 text-xs font-bold text-[#317fcf]"><ParkingSquare size={12}/> {estacionamiento.numero}<button type="button" className="rounded-full p-0.5 hover:bg-red-100 hover:text-red-600" aria-label={`Eliminar estacionamiento ${estacionamiento.numero}`} onClick={() => eliminarEstacionamiento(estacionamiento.id)}><X size={13}/></button></span>)}</div>
          <form className="flex items-end gap-2" onSubmit={agregarEstacionamientoAEditando}><div><label className="block text-sm" htmlFor="estacionamiento-rapido">Número</label><input id="estacionamiento-rapido" className="input w-36" placeholder="228" value={numeroEstacionamientoRapido} onChange={event => setNumeroEstacionamientoRapido(event.target.value)}/></div><button className="btn-primary" disabled={guardandoEstacionamiento}><Plus size={16}/> {guardandoEstacionamiento ? 'Agregando...' : 'Agregar'}</button></form>
        </div>
      </div>}
      <Table {...tableProps('propietarios')} columns={propietarioCols}/></section>
    <section className="card"><h1 className="mb-4 text-2xl font-bold">Estacionamientos</h1>
      <Table {...tableProps('estacionamientos')} columns={estacionamientoCols}/></section>
    <section className="card"><h2 className="section-title"><ShieldPlus/> Guardias</h2>
      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={crearGuardia}>
        <div><label className="block text-sm" htmlFor="guardia-username">Usuario</label><input id="guardia-username" className="input" required value={nuevoGuardia.username} onChange={event => setNuevoGuardia(current => ({ ...current, username: event.target.value }))}/></div>
        <div><label className="block text-sm" htmlFor="guardia-nombre">Nombre</label><input id="guardia-nombre" className="input" required value={nuevoGuardia.first_name} onChange={event => setNuevoGuardia(current => ({ ...current, first_name: event.target.value }))}/></div>
        <div><label className="block text-sm" htmlFor="guardia-apellido">Apellido (opcional)</label><input id="guardia-apellido" className="input" value={nuevoGuardia.last_name} onChange={event => setNuevoGuardia(current => ({ ...current, last_name: event.target.value }))}/></div>
        <div><label className="block text-sm" htmlFor="guardia-password">Contraseña</label><input id="guardia-password" className="input" type="password" minLength={8} required value={nuevoGuardia.password} onChange={event => setNuevoGuardia(current => ({ ...current, password: event.target.value }))}/></div>
        <button className="btn-ok" disabled={guardandoGuardia}><ShieldPlus size={16}/> {guardandoGuardia ? 'Registrando...' : 'Registrar guardia'}</button>
      </form>
      <Table {...tableProps('guardias')} columns={guardiaCols} emptyMessage="No hay guardias registrados."/></section>
  </div></Layout>
}
