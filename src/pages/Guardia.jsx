import { AlertTriangle, Camera, Car, Check, CheckCircle2, ListChecks, RotateCcw, UserRoundSearch, WifiOff, X, XCircle } from 'lucide-react'
import { useCallback, useState } from 'react'
import toast from 'react-hot-toast'
import api, { getApiErrorMessage } from '../api'
import CameraCapture from '../components/CameraCapture'
import Layout from '../components/Layout'
import QrScanner from '../components/QrScanner'
import Spinner from '../components/Spinner'
import { documentoEsValido, formatearDocumento } from '../utils/documento'
import { MENSAJE_FORMATO_PATENTE, normalizarPatente, patenteEsValida } from '../utils/patente'

const documentTypes = [
  { value: 'rut', label: 'RUT chileno' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'dni', label: 'DNI extranjero' },
  { value: 'otro', label: 'Otro' },
]
function Result({ status, title, details }) {
  if (!status) return null
  const styles = {
    authorized: 'border-emerald-700 bg-emerald-600',
    rejected: 'border-red-700 bg-red-600',
    network: 'border-amber-700 bg-amber-600',
    server: 'border-orange-700 bg-orange-600',
  }
  const Icon = status === 'authorized' ? CheckCircle2 : status === 'network' ? WifiOff : status === 'server' ? AlertTriangle : XCircle
  return <div className={`mt-5 rounded-2xl border p-6 text-center text-white shadow-sm sm:p-8 ${styles[status]}`}>
    <Icon className="mx-auto" size={64} />
    <h2 className="mt-3 text-3xl font-black sm:text-4xl">{title}</h2>
    <p className="mt-2 text-xl sm:text-2xl">{details}</p>
  </div>
}

const getAuthorizations = data => {
  if (Array.isArray(data)) return data
  if (Array.isArray(data?.autorizaciones)) return data.autorizaciones
  if (Array.isArray(data?.results)) return data.results
  return data?.permitido ? [data] : []
}

const authorizationDetails = authorization => ({
  name: authorization.nombre || authorization.visitante?.nombre || 'Visitante',
  unit: authorization.unidad || authorization.departamento || authorization.unidad_destino || '—',
  validity: authorization.vigencia || authorization.fecha_fin || authorization.vigente_hasta || 'Vigencia no informada',
})

export default function Guardia() {
  const [activeTab, setActiveTab] = useState('visita')
  const [document, setDocument] = useState({ tipo_documento: 'rut', numero_documento: '', pais_documento: '' })
  const [patente, setPatente] = useState('')
  const [results, setResults] = useState({ visita: null, vehiculo: null })
  const [authorizations, setAuthorizations] = useState([])
  const [selectedAuthorizationId, setSelectedAuthorizationId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const mostrarEstadoRut = document.tipo_documento === 'rut' && document.numero_documento.trim().length >= 8

  const updateDocument = (field, value) => {
    setDocument(current => ({ ...current, [field]: value, ...(field === 'tipo_documento' && value === 'rut' ? { pais_documento: '' } : {}) }))
    setAuthorizations([])
    setSelectedAuthorizationId(null)
    setResults(current => ({ ...current, visita: null }))
  }

  const verificarDocumento = async () => {
    const number = document.numero_documento.trim().toUpperCase()
    if (number.length < 3) return toast.error('Ingresa un número de documento válido')
    const payload = { tipo_documento: document.tipo_documento, numero_documento: number }
    if (document.tipo_documento !== 'rut' && document.pais_documento.trim()) payload.pais_documento = document.pais_documento.trim()
    setLoading(true); setAuthorizations([]); setSelectedAuthorizationId(null); setResults(current => ({ ...current, visita: null }))
    try {
      const { data } = await api.post('/guardia/verificar-rut/', payload)
      const matches = getAuthorizations(data)
      if (matches.length === 0) {
        setResults(current => ({ ...current, visita: { status: 'rejected', title: 'VISITA NO AUTORIZADA', details: data?.detalle || 'No hay autorizaciones vigentes' } }))
        toast.error('Visita no autorizada')
      } else if (matches.length === 1) {
        const authorization = matches[0]
        const details = authorizationDetails(authorization)
        setSelectedAuthorizationId(authorization.id)
        setResults(current => ({ ...current, visita: { status: 'authorized', title: 'VISITA AUTORIZADA', details: `${details.name} · Unidad ${details.unit} · ${details.validity}` } }))
        toast.success('Visita vigente')
      } else {
        setAuthorizations(matches)
        toast('Selecciona la unidad de destino')
      }
    } catch (error) {
      const networkError = !error.response
      setResults(current => ({ ...current, visita: { status: networkError ? 'network' : 'server', title: networkError ? 'ERROR DE RED' : 'ERROR DEL SERVIDOR', details: getApiErrorMessage(error, networkError ? 'Revisa la conexión e intenta nuevamente' : 'No se pudo verificar la visita') } }))
    } finally { setLoading(false) }
  }

  const selectAuthorization = authorization => {
    const details = authorizationDetails(authorization)
    setSelectedAuthorizationId(authorization.id)
    setResults(current => ({ ...current, visita: { status: 'authorized', title: 'VISITA AUTORIZADA', details: `${details.name} · Unidad ${details.unit} · ${details.validity}` } }))
  }

  const verificarQr = useCallback(async token => {
    setScanning(false)
    setLoading(true)
    setAuthorizations([])
    setSelectedAuthorizationId(null)
    setResults(current => ({ ...current, visita: null }))
    try {
      const { data } = await api.post('/guardia/verificar-qr/', { token })
      const allowed = data.permitido ?? data.autorizado ?? false
      const details = authorizationDetails(data)
      setResults(current => ({ ...current, visita: {
        status: allowed ? 'authorized' : 'rejected',
        title: allowed ? 'VISITA AUTORIZADA' : 'VISITA NO AUTORIZADA',
        details: allowed ? `${details.name} · Unidad ${details.unit} · ${details.validity}` : (data.detalle || 'El código no está vigente'),
      } }))
      toast[allowed ? 'success' : 'error'](allowed ? 'Visita vigente' : 'Visita no autorizada')
    } catch (error) {
      const networkError = !error.response
      const denied = error.response && [400, 403, 404].includes(error.response.status)
      setResults(current => ({ ...current, visita: {
        status: denied ? 'rejected' : networkError ? 'network' : 'server',
        title: denied ? 'VISITA NO AUTORIZADA' : networkError ? 'ERROR DE RED' : 'ERROR DEL SERVIDOR',
        details: getApiErrorMessage(error, denied ? 'El código no es válido o ya expiró' : networkError ? 'Revisa la conexión e intenta nuevamente' : 'No se pudo verificar el código'),
      } }))
    } finally { setLoading(false) }
  }, [])

  const leerFoto = async foto => {
    if (!foto) return
    const fd = new FormData(); fd.append('foto', foto); setLoading(true)
    try {
      const { data } = await api.post('/ocr/leer-patente/', fd)
      if (data.ok) { setPatente(normalizarPatente(data.patente)); toast.success('Patente detectada') } else toast.error(data.detalle || 'No se pudo leer la patente')
    } finally { setLoading(false) }
  }

  const verificarPatente = async () => {
    const normalizedPatente = normalizarPatente(patente)
    if (!patenteEsValida(normalizedPatente)) return toast.error(MENSAJE_FORMATO_PATENTE)
    setLoading(true)
    try {
      const { data } = await api.post('/guardia/verificar-patente/', { patente: normalizedPatente })
      setResults(current => ({ ...current, vehiculo: { status: data.permitido ? 'authorized' : 'rejected', title: data.permitido ? 'VEHÍCULO AUTORIZADO' : 'VEHÍCULO RECHAZADO', details: data.permitido ? `Unidad ${data.unidad}` : 'Patente no aprobada' } }))
      toast[data.permitido ? 'success' : 'error'](data.permitido ? 'Patente aprobada' : 'Patente rechazada')
    } finally { setLoading(false) }
  }

  return <Layout><div className="mx-auto max-w-2xl">
    <div className="mb-6 text-center"><p className="text-sm font-bold uppercase tracking-widest text-[#4696e5]">Conserjería</p><h1 className="mt-1 text-3xl font-black tracking-tight">Control de acceso</h1></div>
    <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm" role="tablist" aria-label="Tipo de registro">
      <button type="button" role="tab" aria-selected={activeTab === 'visita'} onClick={() => setActiveTab('visita')} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-md px-3 font-bold transition ${activeTab === 'visita' ? 'bg-[#4696e5] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><UserRoundSearch size={21}/> <span>Registrar Visita</span></button>
      <button type="button" role="tab" aria-selected={activeTab === 'vehiculo'} onClick={() => setActiveTab('vehiculo')} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-md px-3 font-bold transition ${activeTab === 'vehiculo' ? 'bg-[#4696e5] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Car size={21}/> <span>Registrar Vehículo</span></button>
    </div>
    {activeTab === 'visita' ? <section className="card min-h-[420px] space-y-5 p-6 sm:p-8" role="tabpanel">
      <div><h2 className="text-2xl font-bold">Verificar visita</h2><p className="mt-1 text-slate-500">Ingresa el documento presentado por el visitante.</p></div>
      {scanning ? <QrScanner onScan={verificarQr} onClose={() => setScanning(false)}/> : <button type="button" disabled={loading} onClick={() => { setResults(current => ({ ...current, visita: null })); setScanning(true) }} className="btn-primary h-16 w-full text-xl disabled:opacity-50"><Camera/> Escanear QR</button>}
      <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-slate-400"><span className="h-px grow bg-slate-200"/><span>o ingresa el documento</span><span className="h-px grow bg-slate-200"/></div>
      <div><label className="mb-1 block font-semibold" htmlFor="guard-document-type">Tipo de documento</label><select id="guard-document-type" className="input h-14 w-full text-lg" value={document.tipo_documento} onChange={event => updateDocument('tipo_documento', event.target.value)}>{documentTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
      {document.tipo_documento !== 'rut' && <div><label className="mb-1 block font-semibold" htmlFor="guard-document-country">País emisor (opcional)</label><input id="guard-document-country" className="input h-14 w-full text-lg" placeholder="Ej.: Perú" value={document.pais_documento} onChange={event => updateDocument('pais_documento', event.target.value)}/></div>}
      <div><label className="mb-1 block font-semibold" htmlFor="guard-document-number">Número de documento</label><div className="relative"><input id="guard-document-number" className={`input h-14 w-full text-xl ${mostrarEstadoRut ? 'pr-12' : ''} ${document.tipo_documento !== 'rut' ? 'uppercase' : ''}`} placeholder={document.tipo_documento === 'rut' ? '12.345.678-5' : 'PA123456'} value={document.numero_documento} onChange={event => updateDocument('numero_documento', event.target.value)} onBlur={() => updateDocument('numero_documento', formatearDocumento(document.tipo_documento, document.numero_documento))}/>{mostrarEstadoRut && (documentoEsValido('rut', document.numero_documento) ? <Check className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-600" aria-label="RUT válido"/> : <X className="absolute right-4 top-1/2 -translate-y-1/2 text-red-600" aria-label="RUT inválido"/>)}</div></div>
      <button disabled={loading} onClick={verificarDocumento} className="btn-primary h-16 w-full text-xl disabled:opacity-50"><UserRoundSearch/> Verificar documento</button>
      {loading ? <Spinner text="Procesando..."/> : authorizations.length > 1 && !selectedAuthorizationId ? <div className="rounded-2xl border-2 border-blue-400 bg-blue-50 p-4"><h2 className="flex items-center gap-2 text-xl font-black text-blue-900"><ListChecks/> SELECCIONA EL DESTINO</h2><div className="mt-3 grid gap-3">{authorizations.map((authorization, index) => { const details = authorizationDetails(authorization); return <button type="button" key={authorization.id ?? index} onClick={() => selectAuthorization(authorization)} className="min-h-20 rounded-xl border border-blue-300 bg-white p-4 text-left shadow-sm transition hover:bg-blue-100"><strong className="block text-lg">{details.name}</strong><span className="block">Unidad {details.unit} · {details.validity}</span></button> })}</div></div> : <><Result {...(results.visita || {})}/>{results.visita && <button type="button" className="btn-secondary mt-3 w-full justify-center" onClick={() => { setResults(current => ({ ...current, visita: null })); setScanning(true) }}><RotateCcw size={18}/> Escanear otro</button>}</>}
    </section> : <section className="card min-h-[520px] space-y-5 p-6 sm:p-8" role="tabpanel"><div><h2 className="text-2xl font-bold">Verificar vehículo</h2><p className="mt-1 text-slate-500">Captura la patente o ingrésala manualmente.</p></div><CameraCapture onCapture={leerFoto}/><input className="input h-14 text-xl uppercase" aria-label="Patente del vehículo" placeholder="Ej.: AB1234 o ABC12345" value={patente} onChange={event => setPatente(normalizarPatente(event.target.value))}/><button disabled={loading} onClick={verificarPatente} className="btn-primary h-16 w-full text-xl disabled:opacity-50"><Car/> Confirmar patente</button>{loading ? <Spinner text="Procesando..."/> : <Result {...(results.vehiculo || {})}/>}</section>}
  </div></Layout>
}
