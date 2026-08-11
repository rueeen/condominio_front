import { format, isAfter, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Download, Share2, X } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { useRef } from 'react'
import toast from 'react-hot-toast'
import { compartirQr, descargarQr } from '../../utils/compartirQr'
export default function VisitanteQrModal({ visitante, onClose }) {
  const canvasRef = useRef(null)
  if (!visitante) return null
  const permanent = visitante.fecha_fin == null; const expired = !permanent && !isAfter(parseISO(visitante.fecha_fin), new Date()); const validity = permanent ? 'Sin vencimiento' : `Válido hasta ${format(parseISO(visitante.fecha_fin), 'PPp', { locale: es })}`
  const texto = `Tu acceso a Condominio Seguro: ${visitante.nombre}. ${validity}. Muestra este código QR en portería. Código: ${visitante.token_qr}`
  const share = async () => {
    try {
      const via = await compartirQr({ canvas: canvasRef.current, titulo: 'Acceso de visita', texto, nombreArchivo: `acceso-${visitante.nombre}.png` })
      if (via === 'portapapeles') toast.success('Copiado al portapapeles')
    } catch { toast.error('No se pudo compartir el acceso') }
  }
  const descargar = async () => {
    try { await descargarQr(canvasRef.current, `acceso-${visitante.nombre}.png`) }
    catch { toast.error('No se pudo descargar el código') }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="qr-title" onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}><div className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl"><div className="flex items-center justify-between"><h2 id="qr-title" className="text-2xl font-black">Código de acceso</h2><button type="button" className="btn-secondary px-3" onClick={onClose} aria-label="Cerrar"><X/></button></div>{expired ? <div className="my-8 rounded-xl bg-red-50 p-6 text-xl font-bold text-red-700">Esta autorización ya expiró</div> : <><div className="mx-auto my-6 w-fit rounded-xl border border-slate-200 bg-white p-4"><QRCodeCanvas ref={canvasRef} value={visitante.token_qr} size={240} level="M" title={`Acceso de ${visitante.nombre}`}/></div><p className="text-lg font-bold">{visitante.nombre}</p><p className="mt-1 text-slate-600">{validity}</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" className="btn-primary justify-center" onClick={share}><Share2 size={19}/> Compartir</button><button type="button" className="btn-secondary justify-center" onClick={descargar}><Download size={19}/> Descargar</button></div></>}</div></div>
}
