import { format, formatDistanceToNowStrict } from 'date-fns'
import { es } from 'date-fns/locale'
import { useEffect, useMemo, useState } from 'react'
import { formatearDocumento } from '../../utils/documento'
import { documentTypes } from './schemas'
const localPart = date => { const copy = new Date(date); copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset()); return copy.toISOString() }
const localDate = date => localPart(date).slice(0, 10)
const localTime = date => localPart(date).slice(11, 16)
const roundNextHalfHour = date => { const result = new Date(date); result.setSeconds(0, 0); result.setMinutes(Math.ceil((result.getMinutes() + 0.001) / 30) * 30); return result }
const timeBlocks = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`)
export default function VisitanteForm({ form, onSubmit }) {
  const documentType = form.watch('tipo_documento'); const visitorType = form.watch('tipo_visita'); const endDate = form.watch('fecha_fin'); const registration = form.register('numero_documento')
  const initial = endDate ? new Date(endDate) : null
  const [fecha, setFecha] = useState(initial && !Number.isNaN(initial) ? localDate(initial) : '')
  const [hora, setHora] = useState(initial && !Number.isNaN(initial) ? localTime(initial) : '')
  const [atajo, setAtajo] = useState('')
  const [aviso, setAviso] = useState('')
  const hoy = localDate(new Date())
  const horasDisponibles = useMemo(() => fecha === hoy ? timeBlocks.filter(block => new Date(`${fecha}T${block}`) > new Date()) : timeBlocks, [fecha, hoy])
  useEffect(() => { form.setValue('fecha_fin', fecha && hora ? `${fecha}T${hora}` : '', { shouldValidate: true }) }, [fecha, hora, form])
  const aplicarAtajo = (key, resolver) => {
    const result = roundNextHalfHour(resolver(new Date()))
    setFecha(localDate(result)); setHora(localTime(result)); setAtajo(key); setAviso('')
  }
  const cambiarFecha = event => {
    const elegida = event.target.value
    const disponibles = elegida === hoy ? timeBlocks.filter(block => new Date(`${elegida}T${block}`) > new Date()) : timeBlocks
    if (elegida === hoy && disponibles.length === 0) { const manana = new Date(); manana.setDate(manana.getDate() + 1); setFecha(localDate(manana)); setHora('00:00'); setAviso('Ya no quedan bloques disponibles hoy; avanzamos la fecha a mañana.') }
    else { setFecha(elegida); if (hora && !disponibles.includes(hora)) setHora(disponibles[0] ?? ''); setAviso('') }
    setAtajo('')
  }
  const cambiarHora = event => { setHora(event.target.value); setAtajo(''); setAviso('') }
  return <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-3 md:grid-cols-2">
    <div><label className="mb-1 block text-sm font-medium" htmlFor="visitor-document-type">Tipo de documento</label><select id="visitor-document-type" className="input w-full" {...form.register('tipo_documento')} onChange={event => { form.setValue('tipo_documento', event.target.value); if (event.target.value === 'rut') form.setValue('pais_documento', '') }}>{documentTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></div>
    <div><label className="mb-1 block text-sm font-medium" htmlFor="visitor-document-number">Número de documento</label><input id="visitor-document-number" className={`input h-14 w-full text-lg ${documentType !== 'rut' ? 'uppercase' : ''}`} placeholder={documentType === 'rut' ? '12.345.678-5' : 'PA123456'} {...registration} onBlur={event => { event.target.value = formatearDocumento(documentType, event.target.value); registration.onChange(event); registration.onBlur(event) }}/>{form.formState.errors.numero_documento && <p className="mt-1 text-sm text-red-600">{form.formState.errors.numero_documento.message}</p>}</div>
    {documentType !== 'rut' && <div><label className="mb-1 block text-sm font-medium" htmlFor="visitor-document-country">País emisor (opcional)</label><input id="visitor-document-country" className="input w-full" placeholder="Ej.: Perú" {...form.register('pais_documento')}/>{form.formState.errors.pais_documento && <p className="mt-1 text-sm text-red-600">{form.formState.errors.pais_documento.message}</p>}</div>}
    <div><label className="mb-1 block text-sm font-medium" htmlFor="visitor-name">Nombre</label><input id="visitor-name" className="input w-full" placeholder="Nombre" {...form.register('nombre')}/>{form.formState.errors.nombre && <p className="mt-1 text-sm text-red-600">{form.formState.errors.nombre.message}</p>}</div>
    <fieldset className="md:col-span-2"><legend className="mb-2 text-sm font-medium">Tipo de visita</legend><div className="grid gap-2 sm:grid-cols-2">{[{ value: 'temporal', title: 'Visita temporal', description: 'El QR vence cuando elijas; sin fecha, dura 5 horas desde ahora.' }, { value: 'permanente', title: 'Visita permanente', description: 'El QR no vence. Ideal para familiares, nana o cuidador.' }].map(option => <label key={option.value} className={`cursor-pointer rounded-xl border p-3 transition ${visitorType === option.value ? 'border-[#4696e5] bg-blue-50 text-blue-900 ring-1 ring-[#4696e5]' : 'border-slate-200 hover:bg-slate-50'}`}><input className="sr-only" type="radio" value={option.value} {...form.register('tipo_visita')}/><span className="block font-bold">{option.title}</span><span className="mt-1 block text-sm">{option.description}</span></label>)}</div></fieldset>
    {visitorType === 'temporal' && <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4 md:col-span-2"><legend className="px-1 text-sm font-medium">Vigente hasta (opcional)</legend>
      <div><span id="vigencia-atajos" className="mb-2 block text-sm font-medium">Atajos de vigencia</span><div className="flex flex-wrap gap-2" role="group" aria-labelledby="vigencia-atajos">
        {[['4h', '4 horas', now => { now.setHours(now.getHours() + 4); return now }], ['8h', '8 horas', now => { now.setHours(now.getHours() + 8); return now }], ['hoy', 'Hasta las 23:30 de hoy', now => { now.setHours(23, 30, 0, 0); return now }], ['manana', 'Mañana al mediodía', now => { now.setDate(now.getDate() + 1); now.setHours(12, 0, 0, 0); return now }]].map(([key, text, resolver]) => <button key={key} type="button" aria-pressed={atajo === key} disabled={key === 'hoy' && new Date() >= new Date(`${hoy}T23:30`)} className={`rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-40 ${atajo === key ? 'border-[#4696e5] bg-blue-50 text-blue-800 ring-1 ring-[#4696e5]' : 'border-slate-300 bg-white hover:bg-slate-50'}`} onClick={() => aplicarAtajo(key, resolver)}>{text}</button>)}</div></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><label className="mb-1 block text-sm font-medium" htmlFor="vigencia-fecha">Fecha</label><input id="vigencia-fecha" className="input w-full" type="date" min={hoy} value={fecha} onChange={cambiarFecha}/></div><div><label className="mb-1 block text-sm font-medium" htmlFor="vigencia-hora">Hora</label><select id="vigencia-hora" className="input w-full" value={hora} disabled={!fecha} onChange={cambiarHora}><option value="">Selecciona un bloque</option>{horasDisponibles.map(block => <option key={block} value={block}>{block}</option>)}</select></div></div>
      {aviso && <p className="text-sm text-amber-700">{aviso}</p>}{form.formState.errors.fecha_fin && <p className="text-sm text-red-600">{form.formState.errors.fecha_fin.message}</p>}
    </fieldset>}
    <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 md:col-span-2">{visitorType === 'permanente' ? 'Este QR no vence. Puedes eliminar la visita cuando ya no la necesites.' : endDate ? `Vence el ${format(new Date(endDate), "d 'de' MMMM 'a las' HH:mm", { locale: es })} — ${formatDistanceToNowStrict(new Date(endDate), { locale: es, addSuffix: true })}.` : 'Sin fecha, el QR vence 5 horas después de crear la visita.'}</p>
    <button className="btn-primary h-14 md:col-span-2">Crear visitante</button>
  </form>
}
