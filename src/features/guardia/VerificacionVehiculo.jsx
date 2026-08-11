import { Car } from 'lucide-react'
import CameraCapture from '../../components/CameraCapture'
import Spinner from '../../components/Spinner'
import { normalizarPatente } from '../../utils/patente'
import ResultadoAcceso from './ResultadoAcceso'
export default function VerificacionVehiculo({ access }) { return <section className="card min-h-[520px] space-y-5 p-6 sm:p-8" role="tabpanel"><div><h2 className="text-2xl font-bold">Verificar vehículo</h2><p className="mt-1 text-slate-500">Captura la patente o ingrésala manualmente.</p></div><CameraCapture onCapture={access.leerFoto}/><input className="input h-14 text-xl uppercase" aria-label="Patente del vehículo" placeholder="Ej.: AB1234 o ABC12345" value={access.patente} onChange={event => access.setPatente(normalizarPatente(event.target.value))}/><button disabled={access.loading} onClick={access.verificarPatente} className="btn-primary h-16 w-full text-xl disabled:opacity-50"><Car/> Confirmar patente</button>{access.loading ? <Spinner text="Procesando..."/> : <ResultadoAcceso {...(access.results.vehiculo || {})}/>}</section> }
