import { Car, CheckCircle2, UserRoundSearch, XCircle } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import CameraCapture from '../components/CameraCapture'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'

const rutOk = (value) => /^\d{7,8}-[\dkK]$/.test(value)
const patenteOk = (value) => /^([A-Z]{4}\d{2}|[A-Z]{2}\d{4})$/.test(value)

function Result({ ok, title, details }) {
  if (ok === null) return null

  return <div className={`mt-5 rounded-2xl border p-6 text-center text-white shadow-sm sm:p-8 ${ok ? 'border-emerald-700 bg-emerald-600' : 'border-red-700 bg-red-600'}`}>
    {ok ? <CheckCircle2 className="mx-auto" size={64} /> : <XCircle className="mx-auto" size={64} />}
    <h2 className="mt-3 text-3xl font-black sm:text-4xl">{title}</h2>
    <p className="mt-2 text-xl sm:text-2xl">{details}</p>
  </div>
}

export default function Guardia() {
  const [activeTab, setActiveTab] = useState('visita')
  const [rut, setRut] = useState('')
  const [patente, setPatente] = useState('')
  const [results, setResults] = useState({ visita: null, vehiculo: null })
  const [loading, setLoading] = useState(false)

  const selectTab = (tab) => {
    setActiveTab(tab)
  }

  const verificarRut = async () => {
    if (!rutOk(rut)) return toast.error('RUT inválido')
    setLoading(true)
    try {
      const { data } = await api.post('/guardia/verificar-rut/', { rut })
      setResults(current => ({
        ...current,
        visita: {
          ok: data.permitido,
          title: data.permitido ? 'VISITA AUTORIZADA' : 'VISITA RECHAZADA',
          details: data.permitido ? `${data.nombre} · Unidad ${data.unidad}` : 'RUT sin visita vigente',
        },
      }))
      toast[data.permitido ? 'success' : 'error'](data.permitido ? 'Visita vigente' : 'Visita no autorizada')
    } finally {
      setLoading(false)
    }
  }

  const leerFoto = async (foto) => {
    if (!foto) return
    const fd = new FormData()
    fd.append('foto', foto)
    setLoading(true)
    try {
      const { data } = await api.post('/ocr/leer-patente/', fd)
      if (data.ok) {
        setPatente(data.patente)
        toast.success('Patente detectada')
      } else {
        toast.error(data.detalle || 'No se pudo leer la patente')
      }
    } finally {
      setLoading(false)
    }
  }

  const verificarPatente = async () => {
    const normalizedPatente = patente.toUpperCase()
    if (!patenteOk(normalizedPatente)) return toast.error('Patente inválida')
    setLoading(true)
    try {
      const { data } = await api.post('/guardia/verificar-patente/', { patente: normalizedPatente })
      setResults(current => ({
        ...current,
        vehiculo: {
          ok: data.permitido,
          title: data.permitido ? 'VEHÍCULO AUTORIZADO' : 'VEHÍCULO RECHAZADO',
          details: data.permitido ? `Unidad ${data.unidad}` : 'Patente no aprobada',
        },
      }))
      toast[data.permitido ? 'success' : 'error'](data.permitido ? 'Patente aprobada' : 'Patente rechazada')
    } finally {
      setLoading(false)
    }
  }

  return <Layout>
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-[#4696e5]">Conserjería</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">Control de acceso</h1>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm" role="tablist" aria-label="Tipo de registro">
        <button type="button" role="tab" aria-selected={activeTab === 'visita'} onClick={() => selectTab('visita')} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-md px-3 font-bold transition ${activeTab === 'visita' ? 'bg-[#4696e5] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#317fcf]'}`}>
          <UserRoundSearch size={21} /> <span>Registrar Visita</span>
        </button>
        <button type="button" role="tab" aria-selected={activeTab === 'vehiculo'} onClick={() => selectTab('vehiculo')} className={`inline-flex min-h-14 items-center justify-center gap-2 rounded-md px-3 font-bold transition ${activeTab === 'vehiculo' ? 'bg-[#4696e5] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-[#317fcf]'}`}>
          <Car size={21} /> <span>Registrar Vehículo</span>
        </button>
      </div>

      {activeTab === 'visita' ? <section className="card min-h-[420px] space-y-5 p-6 sm:p-8" role="tabpanel">
        <div>
          <h2 className="text-2xl font-bold">Verificar visita</h2>
          <p className="mt-1 text-slate-500">Ingresa el RUT informado por el visitante.</p>
        </div>
        <input className="input h-14 text-xl" aria-label="RUT del visitante" placeholder="12345678-9" value={rut} onChange={event => setRut(event.target.value)} />
        <button disabled={loading} onClick={verificarRut} className="btn-primary h-16 w-full text-xl disabled:opacity-50"><UserRoundSearch /> Verificar RUT</button>
        {loading ? <Spinner text="Procesando..." /> : <Result {...(results.visita || { ok: null })} />}
      </section> : <section className="card min-h-[520px] space-y-5 p-6 sm:p-8" role="tabpanel">
        <div>
          <h2 className="text-2xl font-bold">Verificar vehículo</h2>
          <p className="mt-1 text-slate-500">Captura la patente o ingrésala manualmente.</p>
        </div>
        <CameraCapture onCapture={leerFoto} />
        <input className="input h-14 text-xl uppercase" aria-label="Patente del vehículo" placeholder="AABB11 o AA1111" value={patente} onChange={event => setPatente(event.target.value.toUpperCase())} />
        <button disabled={loading} onClick={verificarPatente} className="btn-primary h-16 w-full text-xl disabled:opacity-50"><Car /> Confirmar patente</button>
        {loading ? <Spinner text="Procesando..." /> : <Result {...(results.vehiculo || { ok: null })} />}
      </section>}
    </div>
  </Layout>
}
