import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api, { getApiErrorMessage, normalizeListResponse } from '../api'
import Layout from '../components/Layout'
import Table from '../components/Table'

const emptyPage = { results: [], count: 0, next: null, previous: null, loading: true, error: '' }

export default function Admin() {
  const [lists, setLists] = useState({
    vehiculos: { ...emptyPage }, ingresos: { ...emptyPage }, propietarios: { ...emptyPage }, estacionamientos: { ...emptyPage },
  })
  const [motivos, setMotivos] = useState({})
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [nuevoEstacionamiento, setNuevoEstacionamiento] = useState({ numero: '', propietario: '' })
  const [guardandoEstacionamiento, setGuardandoEstacionamiento] = useState(false)

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
    fetchList('vehiculos'), fetchList('ingresos'), fetchList('propietarios'), fetchList('estacionamientos'),
  ]), [fetchList])

  useEffect(() => { load() }, [load])

  const resolver = useCallback(async (id, aprobar) => {
    const motivo_rechazo = motivos[id]
    if (!aprobar && !motivo_rechazo) return toast.error('Ingresa el motivo de rechazo')
    try {
      await api.post(`/vehiculos/${id}/resolver/`, { aprobar, motivo_rechazo })
      toast.success(aprobar ? 'Vehículo aprobado' : 'Vehículo rechazado')
      await fetchList('vehiculos')
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
      await api.patch(`/propietarios/${editando.id}/`, { torre, departamento })
      toast.success('Propietario actualizado'); setEditando(null); await fetchList('propietarios')
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo actualizar el propietario')) }
    finally { setGuardando(false) }
  }

  const crearEstacionamiento = async event => {
    event.preventDefault()
    if (!nuevoEstacionamiento.numero.trim()) return toast.error('Ingresa el número de estacionamiento')
    if (!nuevoEstacionamiento.propietario) return toast.error('Selecciona un propietario')
    setGuardandoEstacionamiento(true)
    try {
      await api.post('/estacionamientos/', { numero: nuevoEstacionamiento.numero.trim(), propietario: Number(nuevoEstacionamiento.propietario) })
      toast.success('Estacionamiento asignado'); setNuevoEstacionamiento({ numero: '', propietario: '' }); await fetchList('estacionamientos')
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo asignar el estacionamiento')) }
    finally { setGuardandoEstacionamiento(false) }
  }
  const eliminarEstacionamiento = useCallback(async id => {
    try { await api.delete(`/estacionamientos/${id}/`); toast.success('Estacionamiento eliminado'); await fetchList('estacionamientos') }
    catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo eliminar el estacionamiento')) }
  }, [fetchList])

  const { vehiculos, propietarios } = lists
  const pendientes = vehiculos.results.filter(vehiculo => vehiculo.estado === 'pendiente')
  const vehiculoCols = useMemo(() => [
    { header: 'Patente', accessorKey: 'patente' },
    { header: 'Propietario', accessorFn: vehiculo => `Torre ${vehiculo.propietario_torre} - Depto ${vehiculo.propietario_departamento}` },
    { header: 'Acciones', cell: info => <div className="flex flex-wrap gap-2"><button onClick={() => resolver(info.row.original.id, true)} className="btn-ok"><Check size={16}/> Aprobar</button><input className="input max-w-48" placeholder="Motivo rechazo" onChange={event => setMotivos(current => ({ ...current, [info.row.original.id]: event.target.value }))}/><button onClick={() => resolver(info.row.original.id, false)} className="btn-danger"><X size={16}/> Rechazar</button></div> },
  ], [resolver])
  const ingresoCols = useMemo(() => [{ header: 'Fecha', accessorKey: 'timestamp', cell: info => info.getValue() ? format(parseISO(info.getValue()), 'PPp', { locale: es }) : '' }, { header: 'Tipo', accessorKey: 'tipo' }, { header: 'Valor', accessorKey: 'valor_ingresado' }, { header: 'Resultado', accessorKey: 'resultado' }], [])
  const propietarioCols = useMemo(() => [{ header: 'Usuario', accessorKey: 'username' }, { header: 'Nombre', accessorFn: p => `${p.first_name} ${p.last_name}`.trim() }, { header: 'Torre', accessorKey: 'torre' }, { header: 'Departamento', accessorKey: 'departamento' }, { header: 'Estacionamientos', accessorFn: p => p.estacionamientos?.join(', ') || 'Sin estacionamiento' }, { header: 'Acciones', cell: info => <button className="btn-secondary" onClick={() => abrirEdicion(info.row.original)}>Editar</button> }], [])
  const estacionamientoCols = useMemo(() => [{ header: 'Número', accessorKey: 'numero' }, { header: 'Propietario', accessorFn: e => { const p = propietarios.results.find(item => item.id === e.propietario); return p ? `Torre ${p.torre} - Depto ${p.departamento} (${p.username})` : `#${e.propietario}` } }, { header: 'Acciones', cell: info => <button className="btn-danger" onClick={() => eliminarEstacionamiento(info.row.original.id)}><X size={16}/> Eliminar</button> }], [propietarios.results, eliminarEstacionamiento])
  const tableProps = (name, data = lists[name].results) => ({ data, ...lists[name], onPrevious: () => fetchList(name, lists[name].previous), onNext: () => fetchList(name, lists[name].next) })

  return <Layout><div className="space-y-6">
    <section className="card"><h1 className="mb-4 text-2xl font-bold">Solicitudes pendientes</h1><Table {...tableProps('vehiculos', pendientes)} columns={vehiculoCols} emptyMessage="No hay solicitudes pendientes."/></section>
    <section className="card"><h1 className="mb-4 text-2xl font-bold">Historial de ingresos</h1><Table {...tableProps('ingresos')} columns={ingresoCols}/></section>
    <section className="card"><h1 className="mb-4 text-2xl font-bold">Propietarios</h1>
      {editando && <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={guardarPropietario}><div><p className="mb-2 font-semibold">Editando a {editando.username}</p><label className="block text-sm" htmlFor="torre">Torre</label><input id="torre" className="input" type="number" min="1" max="25" required value={editando.torre} onChange={event => setEditando(current => ({ ...current, torre: event.target.value }))}/></div><div><label className="block text-sm" htmlFor="departamento">Departamento</label><input id="departamento" className="input" type="number" required value={editando.departamento} onChange={event => setEditando(current => ({ ...current, departamento: event.target.value }))}/></div><button className="btn-ok" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button><button className="btn-secondary" type="button" disabled={guardando} onClick={() => setEditando(null)}>Cancelar</button></form>}
      <Table {...tableProps('propietarios')} columns={propietarioCols}/></section>
    <section className="card"><h1 className="mb-4 text-2xl font-bold">Estacionamientos</h1>
      <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={crearEstacionamiento}><div><label className="block text-sm" htmlFor="numero-estacionamiento">Número</label><input id="numero-estacionamiento" className="input" placeholder="228" value={nuevoEstacionamiento.numero} onChange={event => setNuevoEstacionamiento(current => ({ ...current, numero: event.target.value }))}/></div><div><label className="block text-sm" htmlFor="propietario-estacionamiento">Propietario</label><select id="propietario-estacionamiento" className="input" value={nuevoEstacionamiento.propietario} onChange={event => setNuevoEstacionamiento(current => ({ ...current, propietario: event.target.value }))}><option value="">Selecciona un propietario</option>{propietarios.results.map(p => <option key={p.id} value={p.id}>Torre {p.torre} - Depto {p.departamento} ({p.username})</option>)}</select></div><button className="btn-ok" disabled={guardandoEstacionamiento}>{guardandoEstacionamiento ? 'Asignando...' : 'Asignar estacionamiento'}</button></form>
      <Table {...tableProps('estacionamientos')} columns={estacionamientoCols}/></section>
  </div></Layout>
}
