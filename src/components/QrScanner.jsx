import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export default function QrScanner({ onClose, onScan }) {
  const readerId = `qr-reader-${useId().replace(/:/g, '')}`
  const scannerRef = useRef(null)
  const handledRef = useRef(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let mounted = true
    const scanner = new Html5Qrcode(readerId)
    scannerRef.current = scanner

    const start = async () => {
      try {
        // La cámara requiere HTTPS fuera de localhost, igual que getUserMedia.
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          decodedText => {
            if (handledRef.current) return
            handledRef.current = true
            onScan(decodedText.trim())
          },
          () => {},
        )
      } catch {
        if (mounted) setError('No se pudo acceder a la cámara. Revisa el permiso del navegador o usa el ingreso manual.')
      }
    }
    start()

    return () => {
      mounted = false
      const activeScanner = scannerRef.current
      scannerRef.current = null
      if (activeScanner?.isScanning) activeScanner.stop().catch(() => {}).finally(() => activeScanner.clear())
      else activeScanner?.clear()
    }
  }, [onScan, readerId])

  return <div className="rounded-2xl border-2 border-[#4696e5] bg-blue-50 p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-lg font-bold text-blue-950"><Camera/> Apunta al código QR</h3>
      <button type="button" className="btn-secondary" onClick={onClose} aria-label="Cerrar lector"><X size={18}/> Cerrar</button>
    </div>
    <div id={readerId} className="overflow-hidden rounded-xl bg-black" />
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}
  </div>
}
