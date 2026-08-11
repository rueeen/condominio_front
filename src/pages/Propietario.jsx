import { zodResolver } from '@hookform/resolvers/zod'
import { format, formatDistanceToNowStrict, isAfter, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { QRCodeSVG } from 'qrcode.react'
import { Car, QrCode, Share2, Trash2, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { z } from 'zod'
import api, { getApiErrorMessage, normalizeListResponse } from '../api'
import Layout from '../components/Layout'
import Table from '../components/Table'
import { documentoEsValido, formatearDocumento } from '../utils/documento'
import { MENSAJE_FORMATO_PATENTE, normalizarPatente, patenteEsValida } from '../utils/patente'

const documentTypes = [
  { value: 'rut', label: 'RUT chileno' },
  { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'dni', label: 'DNI extranjero' },
  { value: 'otro', label: 'Otro' },
]
const ahoraLocal = () => {
  const ahora = new Date()
  ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset())
  return ahora.toISOString().slice(0, 16)
}

const visitorSchema = z.object({
  tipo_documento: z.enum(['rut', 'pasaporte', 'dni', 'otro']),
  numero_documento: z.string().trim().min(3, 'Ingresa al menos 3 caracteres').max(50, 'Máximo 50 caracteres'),
  pais_documento: z.string().trim().max(80, 'Máximo 80 caracteres').optional(),
  nombre: z.string().min(2, 'Ingresa al menos 2 caracteres'),
  tipo_visita: z.enum(['temporal', 'permanente']),
  fecha_fin: z.preprocess(value => value === '' ? undefined : value, z.string().min(1).optional()),
}).refine(data => documentoEsValido(data.tipo_documento, data.numero_documento), {
  message: 'El RUT no es válido, revisa el dígito verificador',
  path: ['numero_documento'],
}).refine(data => data.tipo_visita === 'permanente' || !data.fecha_fin || new Date(data.fecha_fin) >= new Date(), {
  message: 'La fecha de vencimiento no puede estar en el pasado',
  path: ['fecha_fin'],
})
const carSchema = z.object({ patente: z.string().transform(normalizarPatente).refine(patenteEsValida, MENSAJE_FORMATO_PATENTE) })
const emptyPage = { results: [], count: 0, next: null, previous: null, loading: true, error: '' }

export default function Propietario() {
  const [activeTab, setActiveTab] = useState('visitas')
  const [lists, setLists] = useState({ visitantes: { ...emptyPage }, vehiculos: { ...emptyPage } })
  const [estacionamientos, setEstacionamientos] = useState(null)
  const [qrVisitor, setQrVisitor] = useState(null)
  const visitorForm = useForm({ resolver: zodResolver(visitorSchema), defaultValues: { tipo_documento: 'rut', numero_documento: '', pais_documento: '', nombre: '', tipo_visita: 'temporal', fecha_fin: '' } })
  const carForm = useForm({ resolver: zodResolver(carSchema) })

  const fetchList = useCallback(async (name, url = `/${name}/`) => {
    setLists(current => ({ ...current, [name]: { ...current[name], loading: true, error: '' } }))
    try {
      const response = await api.get(url)
      setLists(current => ({ ...current, [name]: { ...normalizeListResponse(response.data), loading: false, error: '' } }))
    } catch (error) {
      setLists(current => ({ ...current, [name]: { ...current[name], loading: false, error: getApiErrorMessage(error, 'No se pudieron cargar los registros') } }))
    }
  }, [])

  useEffect(() => {
    fetchList('visitantes')
    fetchList('vehiculos')
    api.get('/mis-estacionamientos/').then(response => setEstacionamientos(response.data)).catch(() => setEstacionamientos(null))
  }, [fetchList])

  const crearVisitante = async data => {
    const payload = {
      tipo_documento: data.tipo_documento,
      numero_documento: data.numero_documento.trim().toUpperCase(),
      nombre: data.nombre.trim(),
    }
    if (data.tipo_documento !== 'rut' && data.pais_documento) payload.pais_documento = data.pais_documento.trim()
    if (data.tipo_visita === 'permanente') payload.fecha_fin = null
    else if (data.fecha_fin) payload.fecha_fin = data.fecha_fin
    try {
      await api.post('/visitantes/', payload)
      toast.success('Visita creada'); visitorForm.reset(); await fetchList('visitantes')
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo crear la visita')) }
  }
  const eliminarVehiculo = useCallback(async id => {
    if (!window.confirm('¿Eliminar esta patente? Liberarás el cupo para registrar otra.')) return
    try {
      await api.delete(`/vehiculos/${id}/`)
      toast.success('Patente eliminada')
      await fetchList('vehiculos')
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo eliminar la patente')) }
  }, [fetchList])

  const crearVehiculo = async data => {
    try {
      await api.post('/vehiculos/', data)
      toast.success('Solicitud enviada'); carForm.reset(); await fetchList('vehiculos')
    } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo enviar la solicitud')) }
  }

  const { vehiculos } = lists
  const activeCars = vehiculos.results.filter(vehicle => ['pendiente', 'aprobado'].includes(vehicle.estado)).length
  const limitePatentes = estacionamientos?.limite_patentes
  const limiteConocido = Number.isFinite(limitePatentes)
  const limiteAlcanzado = limiteConocido && activeCars >= limitePatentes
  const espacios = Array.isArray(estacionamientos?.estacionamientos) ? estacionamientos.estacionamientos : []
  const visitorDocumentType = visitorForm.watch('tipo_documento')
  const visitorType = visitorForm.watch('tipo_visita')
  const visitorEndDate = visitorForm.watch('fecha_fin')
  const visitorDocumentRegistration = visitorForm.register('numero_documento')
  const carRegistration = carForm.register('patente')
  const qrIsPermanent = qrVisitor?.fecha_fin == null
  const qrExpired = !qrIsPermanent && !isAfter(parseISO(qrVisitor.fecha_fin), new Date())
  const qrValidity = qrIsPermanent ? 'Sin vencimiento' : `Válido hasta ${format(parseISO(qrVisitor.fecha_fin), 'PPp', { locale: es })}`
  const shareQr = async () => {
    const text = `Tu acceso a Condominio Seguro: ${qrVisitor.token_qr}. ${qrValidity}. Muestra este código en portería.`
    if (navigator.share) {
      try { await navigator.share({ title: 'Acceso de visita', text }); return } catch (error) { if (error.name === 'AbortError') return }
    }
    try { await navigator.clipboard.writeText(text); toast.success('Copiado al portapapeles') } catch { toast.error('No se pudo copiar el acceso') }
  }
  const visitorCols = useMemo(() => [
    { header: 'Nombre', accessorKey: 'nombre' },
    { header: 'Tipo de documento', accessorKey: 'tipo_documento', cell: info => documentTypes.find(type => type.value === info.getValue())?.label || info.getValue() || '—' },
    { header: 'Número de documento', accessorKey: 'numero_documento' },
    { header: 'País', accessorKey: 'pais_documento', cell: info => info.getValue() || '—' },
    { header: 'Vigente hasta', accessorKey: 'fecha_fin', cell: info => info.getValue() ? `${format(parseISO(info.getValue()), 'PPp', { locale: es })} (${formatDistanceToNowStrict(parseISO(info.getValue()), { locale: es, addSuffix: true })})` : <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold uppercase text-blue-700">Permanente</span> },
    { header: 'Estado', cell: info => { const permanent = info.row.original.fecha_fin == null; const storedState = info.row.original.estado; const active = permanent || (storedState ? ['vigente', 'activo', 'autorizado'].includes(storedState.toLowerCase()) : isAfter(parseISO(info.row.original.fecha_fin), new Date())); const label = permanent ? 'vigente' : storedState || (active ? 'vigente' : 'expirada'); return <span className={active ? 'badge-green' : 'badge-gray'}>{label}</span> } },
    { header: 'Acciones', cell: info => <button type="button" className="btn-secondary" disabled={!info.row.original.token_qr} onClick={() => setQrVisitor(info.row.original)} title={!info.row.original.token_qr ? 'Esta visita no tiene un código QR' : ''}><QrCode size={17}/> Ver QR</button> },
  ], [])
  const carCols = useMemo(() => [{ header: 'Patente', accessorKey: 'patente' }, { header: 'Estado', cell: info => <span title={info.row.original.motivo_rechazo || ''} className={info.row.original.estado === 'aprobado' ? 'badge-green' : info.row.original.estado === 'rechazado' ? 'badge-red' : 'badge-yellow'}>{info.row.original.estado}</span> }, { header: 'Acciones', cell: info => <button type="button" className="btn-danger" onClick={() => eliminarVehiculo(info.row.original.id)}><Trash2 size={15}/> Eliminar</button> }], [eliminarVehiculo])
  const tableProps = name => ({ ...lists[name], data: lists[name].results, onPrevious: () => fetchList(name, lists[name].previous), onNext: () => fetchList(name, lists[name].next) })

  return <Layout><div className="mx-auto max-w-5xl">
    <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm" role="tablist" aria-label="Gestión de propietario">
      <button type="button" id="tab-visitas" role="tab" aria-selected={activeTab === 'visitas'} aria-controls="panel-visitas" onClick={() => setActiveTab('visitas')} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-md px-3 font-bold transition ${activeTab === 'visitas' ? 'bg-[#4696e5] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><UserPlus size={21}/> <span>Visitas</span></button>
      <button type="button" id="tab-vehiculos" role="tab" aria-selected={activeTab === 'vehiculos'} aria-controls="panel-vehiculos" onClick={() => setActiveTab('vehiculos')} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-md px-3 font-bold transition ${activeTab === 'vehiculos' ? 'bg-[#4696e5] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Car size={21}/> <span>Vehículos</span></button>
    </div>
    {activeTab === 'visitas' ? <section id="panel-visitas" role="tabpanel" aria-labelledby="tab-visitas" className="card"><h2 className="section-title"><UserPlus/> Visitantes</h2>
      <form onSubmit={visitorForm.handleSubmit(crearVisitante)} className="grid gap-3 md:grid-cols-2">
        <div><label className="mb-1 block text-sm font-medium" htmlFor="visitor-document-type">Tipo de documento</label><select id="visitor-document-type" className="input w-full" {...visitorForm.register('tipo_documento')} onChange={event => { visitorForm.setValue('tipo_documento', event.target.value); if (event.target.value === 'rut') visitorForm.setValue('pais_documento', '') }}>{documentTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
        <div><label className="mb-1 block text-sm font-medium" htmlFor="visitor-document-number">Número de documento</label><input id="visitor-document-number" className={`input h-14 w-full text-lg ${visitorDocumentType !== 'rut' ? 'uppercase' : ''}`} placeholder={visitorDocumentType === 'rut' ? '12.345.678-5' : 'PA123456'} {...visitorDocumentRegistration} onBlur={event => { event.target.value = formatearDocumento(visitorDocumentType, event.target.value); visitorDocumentRegistration.onChange(event); visitorDocumentRegistration.onBlur(event) }}/>{visitorForm.formState.errors.numero_documento && <p className="mt-1 text-sm text-red-600">{visitorForm.formState.errors.numero_documento.message}</p>}</div>
        {visitorDocumentType !== 'rut' && <div><label className="mb-1 block text-sm font-medium" htmlFor="visitor-document-country">País emisor (opcional)</label><input id="visitor-document-country" className="input w-full" placeholder="Ej.: Perú" {...visitorForm.register('pais_documento')}/>{visitorForm.formState.errors.pais_documento && <p className="mt-1 text-sm text-red-600">{visitorForm.formState.errors.pais_documento.message}</p>}</div>}
        <div><label className="mb-1 block text-sm font-medium" htmlFor="visitor-name">Nombre</label><input id="visitor-name" className="input w-full" placeholder="Nombre" {...visitorForm.register('nombre')}/>{visitorForm.formState.errors.nombre && <p className="mt-1 text-sm text-red-600">{visitorForm.formState.errors.nombre.message}</p>}</div>
        <fieldset className="md:col-span-2"><legend className="mb-2 text-sm font-medium">Tipo de visita</legend><div className="grid gap-2 sm:grid-cols-2">
          {[{ value: 'temporal', title: 'Visita temporal', description: 'El QR vence cuando elijas; sin fecha, dura 5 horas desde ahora.' }, { value: 'permanente', title: 'Visita permanente', description: 'El QR no vence. Ideal para familiares, nana o cuidador.' }].map(option => <label key={option.value} className={`cursor-pointer rounded-xl border p-3 transition ${visitorType === option.value ? 'border-[#4696e5] bg-blue-50 text-blue-900 ring-1 ring-[#4696e5]' : 'border-slate-200 hover:bg-slate-50'}`}><input className="sr-only" type="radio" value={option.value} {...visitorForm.register('tipo_visita')} /><span className="block font-bold">{option.title}</span><span className="mt-1 block text-sm">{option.description}</span></label>)}
        </div></fieldset>
        {visitorType === 'temporal' && <div className="md:col-span-2"><label className="mb-1 block text-sm font-medium" htmlFor="fecha-fin">Vigente hasta (opcional)</label><input id="fecha-fin" className="input w-full" type="datetime-local" min={ahoraLocal()} {...visitorForm.register('fecha_fin')}/>{visitorForm.formState.errors.fecha_fin && <p className="mt-1 text-sm text-red-600">{visitorForm.formState.errors.fecha_fin.message}</p>}</div>}
        <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 md:col-span-2">{visitorType === 'permanente' ? 'Este QR no vence. Puedes eliminar la visita cuando ya no la necesites.' : visitorEndDate ? `Vence el ${format(new Date(visitorEndDate), "d 'de' MMMM 'a las' HH:mm", { locale: es })} — ${formatDistanceToNowStrict(new Date(visitorEndDate), { locale: es, addSuffix: true })}.` : 'Sin fecha, el QR vence 5 horas después de crear la visita.'}</p>
        <button className="btn-primary h-14 md:col-span-2">Crear visitante</button>
      </form><div className="mt-5"><Table {...tableProps('visitantes')} columns={visitorCols} emptyMessage="No hay visitantes registrados."/></div>
    </section> : <section id="panel-vehiculos" role="tabpanel" aria-labelledby="tab-vehiculos" className="card"><h2 className="section-title"><Car/> Vehículos</h2>
      {limiteConocido && (espacios.length > 0 ? <p className="mb-3 text-sm text-slate-600">Tienes {espacios.length} {espacios.length === 1 ? 'estacionamiento' : 'estacionamientos'} ({espacios.join(', ')}) — puedes registrar hasta {limitePatentes} {limitePatentes === 1 ? 'vehículo' : 'vehículos'}.</p> : <p className="mb-3 text-sm text-red-600">No tienes estacionamientos asignados — no puedes registrar vehículos. Contacta al administrador.</p>)}
      <form onSubmit={carForm.handleSubmit(crearVehiculo)} className="flex flex-col gap-3 sm:flex-row"><div className="grow"><input className="input h-14 w-full text-lg uppercase" placeholder="Ej.: AB1234 o ABC12345" {...carRegistration} onChange={event => { event.target.value = normalizarPatente(event.target.value); carRegistration.onChange(event) }}/>{carForm.formState.errors.patente && <p className="mt-1 text-sm text-red-600">{carForm.formState.errors.patente.message}</p>}</div><button disabled={limiteAlcanzado} className="btn-primary h-14 self-stretch disabled:opacity-50 sm:self-start">Solicitar</button></form>
      {limiteAlcanzado && limitePatentes > 0 && <p className="mt-2 text-sm text-red-600">Ya alcanzaste el límite de {limitePatentes} {limitePatentes === 1 ? 'patente pendiente o aprobada' : 'patentes pendientes o aprobadas'}.</p>}
      <div className="mt-5"><Table {...tableProps('vehiculos')} columns={carCols} emptyMessage="No hay vehículos registrados."/></div>
    </section>}
    {qrVisitor && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="qr-title" onMouseDown={event => { if (event.target === event.currentTarget) setQrVisitor(null) }}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <div className="flex items-center justify-between"><h2 id="qr-title" className="text-2xl font-black">Código de acceso</h2><button type="button" className="btn-secondary px-3" onClick={() => setQrVisitor(null)} aria-label="Cerrar"><X/></button></div>
        {qrExpired ? <div className="my-8 rounded-xl bg-red-50 p-6 text-xl font-bold text-red-700">Esta autorización ya expiró</div> : <>
          <div className="mx-auto my-6 w-fit rounded-xl border border-slate-200 bg-white p-4"><QRCodeSVG value={qrVisitor.token_qr} size={240} level="M" title={`Acceso de ${qrVisitor.nombre}`} /></div>
          <p className="text-lg font-bold">{qrVisitor.nombre}</p><p className="mt-1 text-slate-600">{qrValidity}</p>
          <button type="button" className="btn-primary mt-6 w-full" onClick={shareQr}><Share2 size={19}/> Compartir</button>
        </>}
      </div>
    </div>}
  </div></Layout>
}
