import { ParkingSquare, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api, { getApiErrorMessage, normalizeListResponse } from '../../api'
import Table from '../../components/Table'

const emptyPage = { results: [], count: 0, next: null, previous: null, loading: true, error: '' }
export default function Estacionamientos() {
  const [estacionamientos, setEstacionamientos] = useState(emptyPage)
  const [propietarios, setPropietarios] = useState(emptyPage)
  const [eliminando, setEliminando] = useState(null)
  const fetchList = useCallback(async (name, url = `/${name}/`) => {
    const setter = name === 'estacionamientos' ? setEstacionamientos : setPropietarios
    setter(current => ({ ...current, loading: true, error: '' }))
    try { const response = await api.get(url); setter({ ...normalizeListResponse(response.data), loading: false, error: '' }) }
    catch (error) { setter(current => ({ ...current, loading: false, error: getApiErrorMessage(error, 'No se pudieron cargar los registros') })) }
  }, [])
  useEffect(() => { Promise.all([fetchList('estacionamientos'), fetchList('propietarios')]) }, [fetchList])
  const eliminarEstacionamiento = useCallback(async id => {
    setEliminando(id)
    try { await api.delete(`/estacionamientos/${id}/`); toast.success('Estacionamiento eliminado'); await Promise.all([fetchList('estacionamientos'), fetchList('propietarios')]) }
    catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo eliminar el estacionamiento')) }
    finally { setEliminando(null) }
  }, [fetchList])
  const columns = useMemo(() => [
    { header: 'Número', accessorKey: 'numero', cell: info => <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4696e5]/10 px-3 py-1 text-xs font-bold text-[#317fcf]"><ParkingSquare size={13}/> {info.getValue()}</span> },
    { header: 'Propietario', accessorFn: estacionamiento => { const propietario = propietarios.results.find(item => item.id === estacionamiento.propietario); return propietario ? `Torre ${propietario.torre} · Depto ${propietario.departamento} (${propietario.username})` : `#${estacionamiento.propietario}` } },
    { header: 'Acciones', cell: info => { const procesando = eliminando === info.row.original.id; return <button className="btn-danger disabled:opacity-50" disabled={procesando} onClick={() => eliminarEstacionamiento(info.row.original.id)}><Trash2 size={15}/> {procesando ? 'Procesando...' : 'Eliminar'}</button> } },
  ], [propietarios.results, eliminarEstacionamiento, eliminando])
  return <section className="card"><h1 className="mb-4 text-2xl font-bold">Estacionamientos</h1><Table {...estacionamientos} data={estacionamientos.results} columns={columns} onPrevious={() => fetchList('estacionamientos', estacionamientos.previous)} onNext={() => fetchList('estacionamientos', estacionamientos.next)}/></section>
}
