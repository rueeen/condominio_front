import { Link2Off, ParkingSquare, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api, { getApiErrorMessage, normalizeListResponse } from '../../api'
import PropietarioSearch from '../../components/PropietarioSearch'
import propietarioLabel from '../../components/propietarioLabel'
import Table from '../../components/Table'

const emptyPage = { results: [], count: 0, next: null, previous: null, loading: true, error: '' }
const propietarioDe = estacionamiento => estacionamiento.propietario_detalle || (typeof estacionamiento.propietario === 'object' ? estacionamiento.propietario : null)
export default function Estacionamientos() {
  const [page, setPage] = useState(emptyPage)
  const [resumen, setResumen] = useState({ total: 0, asignados: 0, libres: 0, propietarios_sin_estacionamiento: 0 })
  const [buscar, setBuscar] = useState('')
  const [buscarDebounced, setBuscarDebounced] = useState('')
  const [asignado, setAsignado] = useState('')
  const [dialogo, setDialogo] = useState(null)
  const [numero, setNumero] = useState('')
  const [propietario, setPropietario] = useState(null)
  const [procesando, setProcesando] = useState(null)

  useEffect(() => { const timer = setTimeout(() => setBuscarDebounced(buscar.trim()), 300); return () => clearTimeout(timer) }, [buscar])
  const cargarResumen = useCallback(async () => { try { const { data } = await api.get('/estacionamientos/resumen/'); setResumen(data) } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo cargar el resumen')) } }, [])
  const cargar = useCallback(async (url) => {
    setPage(current => ({ ...current, loading: true, error: '' }))
    try {
      const response = url ? await api.get(url) : await api.get('/estacionamientos/', { params: { ...(buscarDebounced && { buscar: buscarDebounced }), ...(asignado !== '' && { asignado }) } })
      setPage({ ...normalizeListResponse(response.data), loading: false, error: '' })
    } catch (error) { setPage(current => ({ ...current, loading: false, error: getApiErrorMessage(error, 'No se pudieron cargar los estacionamientos') })) }
  }, [asignado, buscarDebounced])
  useEffect(() => { cargar(); cargarResumen() }, [cargar, cargarResumen])
  const refrescar = async () => Promise.all([cargar(), cargarResumen()])
  const cerrar = () => { setDialogo(null); setNumero(''); setPropietario(null) }
  const confirmarConflicto = async (error, payload) => {
    if (error.response?.status !== 409) return 'error'
    const actual = error.response.data?.propietario_actual || error.response.data?.propietario
    if (!window.confirm(`El estacionamiento ${payload.numero} ya pertenece a ${propietarioLabel(actual) || 'otro propietario'}. ¿Quieres reasignarlo?`)) return 'cancelado'
    await api.post('/estacionamientos/asignar/', { ...payload, reasignar: true })
    return 'reasignado'
  }
  const guardar = async event => {
    event.preventDefault(); if (!numero.trim()) return
    setProcesando('guardar'); const payload = { numero: numero.trim(), propietario: propietario?.id ?? null }
    try { await api.post('/estacionamientos/asignar/', payload); toast.success('Estacionamiento guardado'); cerrar(); await refrescar() }
    catch (error) { try { const resultado = await confirmarConflicto(error, payload); if (resultado === 'reasignado') { toast.success('Asignación actualizada'); cerrar(); await refrescar() } else if (resultado === 'error') toast.error(getApiErrorMessage(error, 'No se pudo guardar el estacionamiento')) } catch (retryError) { toast.error(getApiErrorMessage(retryError, 'No se pudo reasignar el estacionamiento')) } }
    finally { setProcesando(null) }
  }
  const reasignar = async event => {
    event.preventDefault(); if (!propietario) return toast.error('Selecciona un propietario')
    setProcesando('reasignar')
    try { await api.post('/estacionamientos/asignar/', { numero: dialogo.item.numero, propietario: propietario.id, reasignar: true }); toast.success('Estacionamiento reasignado'); cerrar(); await refrescar() }
    catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo reasignar')) } finally { setProcesando(null) }
  }
  const desvincular = async item => { if (!window.confirm(`¿Desvincular el estacionamiento ${item.numero}?`)) return; setProcesando(item.id); try { await api.patch(`/estacionamientos/${item.id}/`, { propietario: null }); toast.success('Estacionamiento desvinculado'); await refrescar() } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo desvincular')) } finally { setProcesando(null) } }
  const eliminar = async item => { if (!window.confirm(`¿Eliminar el estacionamiento ${item.numero}?`)) return; setProcesando(item.id); try { await api.delete(`/estacionamientos/${item.id}/`); toast.success('Estacionamiento eliminado'); await refrescar() } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo eliminar')) } finally { setProcesando(null) } }
  const columns = [
    { header: 'Número', accessorKey: 'numero', cell: info => <span className="inline-flex items-center gap-1.5 font-bold text-[#317fcf]"><ParkingSquare size={15}/>{info.getValue()}</span> },
    { header: 'Propietario', cell: info => { const item = info.row.original; const detalle = propietarioDe(item); return detalle ? propietarioLabel(detalle) : item.propietario == null ? <span className="badge-gray">Libre</span> : (item.propietario_nombre || `Propietario #${item.propietario}`) } },
    { header: 'Acciones', cell: info => <div className="flex gap-1"><button className="rounded-lg border p-2 hover:bg-slate-50" aria-label={`Reasignar estacionamiento ${info.row.original.numero}`} onClick={() => { setPropietario(null); setDialogo({ tipo: 'reasignar', item: info.row.original }) }}><Pencil size={16}/></button>{info.row.original.propietario != null && <button className="rounded-lg border p-2 hover:bg-slate-50" disabled={procesando === info.row.original.id} aria-label={`Desvincular estacionamiento ${info.row.original.numero}`} onClick={() => desvincular(info.row.original)}><Link2Off size={16}/></button>}<button className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50" disabled={procesando === info.row.original.id} aria-label={`Eliminar estacionamiento ${info.row.original.numero}`} onClick={() => eliminar(info.row.original)}><Trash2 size={16}/></button></div> },
  ]
  const tarjetas = [{ key: 'total', label: 'Total', filter: '' }, { key: 'asignados', label: 'Asignados', filter: 'true' }, { key: 'libres', label: 'Libres', filter: 'false' }, { key: 'propietarios_sin_estacionamiento', label: 'Propietarios sin estacionamiento', filter: 'false' }]
  return <section className="card space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">Estacionamientos</h1><button className="btn-primary" onClick={() => { setNumero(''); setPropietario(null); setDialogo({ tipo: 'nuevo' }) }}><Plus size={16}/> Nuevo estacionamiento</button></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{tarjetas.map(card => <button key={card.key} type="button" className={`rounded-xl border p-4 text-left ${asignado === card.filter ? 'border-[#4696e5] bg-blue-50 ring-1 ring-[#4696e5]' : 'border-slate-200 bg-white hover:bg-slate-50'}`} onClick={() => setAsignado(card.filter)}><span className="block text-2xl font-bold">{resumen[card.key] ?? 0}</span><span className="text-sm text-slate-600">{card.label}</span></button>)}</div>
    <div className="flex flex-wrap gap-3 rounded-xl bg-slate-50 p-3"><div className="min-w-52 flex-1"><label className="mb-1 block text-sm" htmlFor="buscar-estacionamiento">Buscar por número</label><input id="buscar-estacionamiento" className="input w-full" value={buscar} onChange={event => setBuscar(event.target.value)} placeholder="Ej.: 228"/></div><div><label className="mb-1 block text-sm" htmlFor="estado-estacionamiento">Estado</label><select id="estado-estacionamiento" className="input" value={asignado} onChange={event => setAsignado(event.target.value)}><option value="">Todos</option><option value="false">Libres</option><option value="true">Asignados</option></select></div></div>
    <Table {...page} data={page.results} columns={columns} onPrevious={() => cargar(page.previous)} onNext={() => cargar(page.next)}/>
    {dialogo && <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="parking-dialog-title"><form className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-5 shadow-xl" onSubmit={dialogo.tipo === 'nuevo' ? guardar : reasignar}><div className="flex justify-between"><h2 id="parking-dialog-title" className="text-xl font-bold">{dialogo.tipo === 'nuevo' ? 'Nuevo estacionamiento' : `Reasignar estacionamiento ${dialogo.item.numero}`}</h2><button type="button" aria-label="Cerrar" onClick={cerrar}><X/></button></div>{dialogo.tipo === 'nuevo' && <div><label className="mb-1 block text-sm font-medium" htmlFor="nuevo-numero">Número</label><input id="nuevo-numero" autoFocus required className="input w-full" value={numero} onChange={event => setNumero(event.target.value)}/></div>}<PropietarioSearch value={propietario} onChange={setPropietario} label={dialogo.tipo === 'nuevo' ? 'Propietario (opcional)' : 'Nuevo propietario'}/><div className="flex justify-end gap-2"><button type="button" className="btn-secondary" onClick={cerrar}>Cancelar</button><button className="btn-primary" disabled={procesando != null}>{procesando ? 'Guardando…' : dialogo.tipo === 'nuevo' ? 'Crear' : 'Reasignar'}</button></div></form></div>}
  </section>
}
