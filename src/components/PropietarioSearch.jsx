import { Search, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import api, { getApiErrorMessage, normalizeListResponse } from '../api'
import propietarioLabel from './propietarioLabel'

export default function PropietarioSearch({ value, onChange, label = 'Propietario (opcional)', disabled = false }) {
  const id = useId()
  const [buscar, setBuscar] = useState('')
  const [resultados, setResultados] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (value || !buscar.trim()) return
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      setLoading(true); setError('')
      try {
        const response = await api.get('/propietarios/', { params: { buscar: buscar.trim() }, signal: controller.signal })
        setResultados(normalizeListResponse(response.data).results)
      } catch (requestError) {
        if (requestError.code !== 'ERR_CANCELED') setError(getApiErrorMessage(requestError, 'No se pudo buscar propietarios'))
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [buscar, value])

  return <div className="relative">
    <label className="mb-1 block text-sm font-medium" htmlFor={id}>{label}</label>
    {value ? <div className="input flex min-h-11 items-center justify-between gap-2 bg-white"><span>{propietarioLabel(value)}</span><button type="button" className="rounded p-1 hover:bg-slate-100" disabled={disabled} aria-label="Quitar propietario seleccionado" onClick={() => { onChange(null); setBuscar(''); setResultados([]); setError('') }}><X size={16}/></button></div> : <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={18}/><input id={id} className="input w-full pl-10" value={buscar} disabled={disabled} autoComplete="off" placeholder="Nombre, torre o departamento" onChange={event => { const term = event.target.value; setBuscar(term); if (!term.trim()) { setResultados([]); setError(''); setLoading(false) } }} aria-describedby={`${id}-status`}/></div>}
    <p id={`${id}-status`} className={`mt-1 text-xs ${error ? 'text-red-600' : 'text-slate-500'}`}>{error || (loading ? 'Buscando…' : !value && buscar.trim() ? `${resultados.length} resultado(s)` : '')}</p>
    {!value && resultados.length > 0 && <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">{resultados.map(propietario => <li key={propietario.id}><button type="button" className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50" onClick={() => { onChange(propietario); setResultados([]); setError('') }}>{propietarioLabel(propietario)}</button></li>)}</ul>}
  </div>
}
