import { Camera } from 'lucide-react'
import { Suspense, lazy } from 'react'
import Spinner from '../../components/Spinner'

// Carga diferida: html5-qrcode pesa cientos de kB y solo la necesita el
// guardia al escanear. Así no entra en el chunk que descargan todos.
const QrScanner = lazy(() => import('../../components/QrScanner'))

export default function VerificacionQr({ access }) {
  if (access.scanning) return <Suspense fallback={<div className="flex h-64 items-center justify-center"><Spinner/></div>}><QrScanner onScan={access.verificarQr} onClose={() => access.setScanning(false)}/></Suspense>
  return <button type="button" disabled={access.loading} onClick={() => { access.setResults(current => ({ ...current, visita: null })); access.setScanning(true) }} className="btn-primary h-16 w-full text-xl disabled:opacity-50"><Camera/> Escanear QR</button>
}
