import { Camera } from 'lucide-react'
import QrScanner from '../../components/QrScanner'
export default function VerificacionQr({ access }) { return access.scanning ? <QrScanner onScan={access.verificarQr} onClose={() => access.setScanning(false)}/> : <button type="button" disabled={access.loading} onClick={() => { access.setResults(current => ({ ...current, visita: null })); access.setScanning(true) }} className="btn-primary h-16 w-full text-xl disabled:opacity-50"><Camera/> Escanear QR</button> }
