import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { useCallback, useEffect, useMemo, useState } from 'react'
import api, { getApiErrorMessage, normalizeListResponse } from '../../api'
import Table from '../../components/Table'

const emptyPage = { results: [], count: 0, next: null, previous: null, loading: true, error: '' }
export default function Ingresos() {
  const [ingresos, setIngresos] = useState(emptyPage)
  const fetchList = useCallback(async (url = '/ingresos/') => {
    setIngresos(current => ({ ...current, loading: true, error: '' }))
    try { const response = await api.get(url); setIngresos({ ...normalizeListResponse(response.data), loading: false, error: '' }) }
    catch (error) { setIngresos(current => ({ ...current, loading: false, error: getApiErrorMessage(error, 'No se pudieron cargar los registros') })) }
  }, [])
  useEffect(() => { fetchList() }, [fetchList])
  const columns = useMemo(() => [{ header: 'Fecha', accessorKey: 'timestamp', cell: info => info.getValue() ? format(parseISO(info.getValue()), 'PPp', { locale: es }) : '' }, { header: 'Tipo', accessorKey: 'tipo' }, { header: 'Valor', accessorKey: 'valor_ingresado' }, { header: 'Resultado', accessorKey: 'resultado' }], [])
  return <section className="card"><h1 className="mb-4 text-2xl font-bold">Historial de ingresos</h1><Table {...ingresos} data={ingresos.results} columns={columns} onPrevious={() => fetchList(ingresos.previous)} onNext={() => fetchList(ingresos.next)}/></section>
}
