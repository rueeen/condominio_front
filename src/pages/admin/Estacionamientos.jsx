import { Link2Off, ParkingSquare, RefreshCw, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api, { getApiErrorMessage, normalizeListResponse } from '../../api'
import Table from '../../components/Table'

const emptyPage = { results: [], count: 0, next: null, previous: null, loading: true, error: '' }
export default function Estacionamientos() {
  const [estacionamientos, setEstacionamientos] = useState(emptyPage)
  const [propietarios, setPropietarios] = useState(emptyPage)
  const [procesando, setProcesando] = useState(null)
  const [reasignaciones, setReasignaciones] = useState({})
  const fetchList = useCallback(async (name, url = `/${name}/`) => {
    const setter = name === 'estacionamientos' ? setEstacionamientos : setPropietarios
    setter(current => ({ ...current, loading: true, error: '' }))
    try { const response = await api.get(url); setter({ ...normalizeListResponse(response.data), loading: false, error: '' }) }
    catch (error) { setter(current => ({ ...current, loading: false, error: getApiErrorMessage(error, 'No se pudieron cargar los registros') })) }
  }, [])
  useEffect(() => { Promise.all([fetchList('estacionamientos'), fetchList('propietarios')]) }, [fetchList])
  const eliminarEstacionamiento = useCallback(async id => {
    setProcesando({ id, accion: 'eliminar' })
    try { await api.delete(`/estacionamientos/${id}/`); toast.success('Estacionamiento eliminado'); await Promise.all([fetchList('estacionamientos'), fetchList('propietarios')]) }
    catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo eliminar el estacionamiento')) }
    finally { setProcesando(null) }
  }, [fetchList])
  const desvincularEstacionamiento = useCallback(async estacionamiento => {
    if (!window.confirm(`¿Desvincular el estacionamiento ${estacionamiento.numero}? El espacio quedará libre y el propietario perderá ese cupo de patentes.`)) return
    setProcesando({ id: estacionamiento.id, accion: 'desvincular' })
    try { await api.patch(`/estacionamientos/${estacionamiento.id}/`, { propietario: null }); toast.success('Estacionamiento desvinculado'); await Promise.all([fetchList('estacionamientos'), fetchList('propietarios')]) }
    catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo desvincular el estacionamiento')) }
    finally { setProcesando(null) }
  }, [fetchList])
  const reasignarEstacionamiento = useCallback(async estacionamiento => {
    const propietario = reasignaciones[estacionamiento.id]
    if (!propietario) return toast.error('Selecciona un propietario')
    setProcesando({ id: estacionamiento.id, accion: 'reasignar' })
    try {
      await api.patch(`/estacionamientos/${estacionamiento.id}/`, { propietario: Number(propietario) })
      toast.success('Estacionamiento reasignado')
      setReasignaciones(current => { const siguiente = { ...current }; delete siguiente[estacionamiento.id]; return siguiente })
      await Promise.all([fetchList('estacionamientos'), fetchList('propietarios')])
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo reasignar el estacionamiento')) }
    finally { setProcesando(null) }
  }, [fetchList, reasignaciones])
  const columns = useMemo(() => [
    { header: 'Número', accessorKey: 'numero', cell: info => <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4696e5]/10 px-3 py-1 text-xs font-bold text-[#317fcf]"><ParkingSquare size={13}/> {info.getValue()}</span> },
    { header: 'Propietario', cell: info => { const id = info.row.original.propietario; if (id == null) return <span className="badge-gray">Sin asignar</span>; const propietario = propietarios.results.find(item => item.id === id); return propietario ? `Torre ${propietario.torre} · Depto ${propietario.departamento} (${propietario.username})` : `#${id}` } },
    { header: 'Acciones', cell: info => {
      const estacionamiento = info.row.original
      const filaProcesando = procesando?.id === estacionamiento.id
      return <div className="flex min-w-72 flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          {estacionamiento.propietario != null && <button className="btn-primary disabled:opacity-50" disabled={filaProcesando} onClick={() => desvincularEstacionamiento(estacionamiento)}><Link2Off size={15}/> {filaProcesando && procesando.accion === 'desvincular' ? 'Procesando...' : 'Desvincular'}</button>}
          <button className="btn-danger min-h-0 px-3 py-2 text-sm disabled:opacity-50" disabled={filaProcesando} onClick={() => eliminarEstacionamiento(estacionamiento.id)}><Trash2 size={14}/> {filaProcesando && procesando.accion === 'eliminar' ? 'Procesando...' : 'Eliminar'}</button>
        </div>
        <div className="flex gap-2">
          <select className="input min-w-44" aria-label={`Nuevo propietario del estacionamiento ${estacionamiento.numero}`} disabled={filaProcesando} value={reasignaciones[estacionamiento.id] ?? ''} onChange={event => setReasignaciones(current => ({ ...current, [estacionamiento.id]: event.target.value }))}>
            <option value="">Seleccionar propietario</option>
            {propietarios.results.map(propietario => <option key={propietario.id} value={propietario.id}>Torre {propietario.torre} · Depto {propietario.departamento} ({propietario.username})</option>)}
          </select>
          <button className="btn-secondary disabled:opacity-50" disabled={filaProcesando || !reasignaciones[estacionamiento.id]} onClick={() => reasignarEstacionamiento(estacionamiento)}><RefreshCw size={15}/> {filaProcesando && procesando.accion === 'reasignar' ? 'Procesando...' : 'Reasignar'}</button>
        </div>
      </div>
    } },
  ], [propietarios.results, procesando, reasignaciones, eliminarEstacionamiento, desvincularEstacionamiento, reasignarEstacionamiento])
  return <section className="card"><h1 className="mb-4 text-2xl font-bold">Estacionamientos</h1><Table {...estacionamientos} data={estacionamientos.results} columns={columns} onPrevious={() => fetchList('estacionamientos', estacionamientos.previous)} onNext={() => fetchList('estacionamientos', estacionamientos.next)}/></section>
}
