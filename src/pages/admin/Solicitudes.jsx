import { Check, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api, { getApiErrorMessage, normalizeListResponse } from '../../api'
import Table from '../../components/Table'

const emptyPage = { results: [], count: 0, next: null, previous: null, loading: true, error: '' }

export default function Solicitudes() {
  const [vehiculosPendientes, setVehiculosPendientes] = useState(emptyPage)
  const [motivos, setMotivos] = useState({})
  const [resolviendo, setResolviendo] = useState(null)
  const fetchList = useCallback(async (url = '/vehiculos/?estado=pendiente') => {
    setVehiculosPendientes(current => ({ ...current, loading: true, error: '' }))
    try { const response = await api.get(url); setVehiculosPendientes({ ...normalizeListResponse(response.data), loading: false, error: '' }) }
    catch (error) { setVehiculosPendientes(current => ({ ...current, loading: false, error: getApiErrorMessage(error, 'No se pudieron cargar los registros') })) }
  }, [])
  useEffect(() => { fetchList() }, [fetchList])
  const resolver = useCallback(async (id, aprobar) => {
    const motivo_rechazo = motivos[id]
    if (!aprobar && !motivo_rechazo) return toast.error('Ingresa el motivo de rechazo')
    setResolviendo({ id, aprobar })
    try { await api.post(`/vehiculos/${id}/resolver/`, { aprobar, motivo_rechazo }); toast.success(aprobar ? 'Vehículo aprobado' : 'Vehículo rechazado'); await fetchList() }
    catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo resolver la solicitud')) }
    finally { setResolviendo(null) }
  }, [fetchList, motivos])
  const columns = useMemo(() => [
    { header: 'Patente', accessorKey: 'patente' },
    { header: 'Propietario', accessorFn: vehiculo => `Torre ${vehiculo.propietario_torre} - Depto ${vehiculo.propietario_departamento}` },
    { header: 'Acciones', cell: info => { const procesando = resolviendo?.id === info.row.original.id; return <div className="flex flex-wrap gap-2"><button disabled={procesando} onClick={() => resolver(info.row.original.id, true)} className="btn-ok disabled:opacity-50"><Check size={16}/> {procesando && resolviendo.aprobar ? 'Procesando...' : 'Aprobar'}</button><input disabled={procesando} className="input max-w-48 disabled:opacity-50" placeholder="Motivo rechazo" onChange={event => setMotivos(current => ({ ...current, [info.row.original.id]: event.target.value }))}/><button disabled={procesando} onClick={() => resolver(info.row.original.id, false)} className="btn-danger disabled:opacity-50"><X size={16}/> {procesando && !resolviendo.aprobar ? 'Procesando...' : 'Rechazar'}</button></div> } },
  ], [resolver, resolviendo])
  return <section className="card"><h1 className="mb-4 text-2xl font-bold">Solicitudes pendientes</h1><Table {...vehiculosPendientes} data={vehiculosPendientes.results} columns={columns} emptyMessage="No hay solicitudes pendientes." onPrevious={() => fetchList(vehiculosPendientes.previous)} onNext={() => fetchList(vehiculosPendientes.next)}/></section>
}
