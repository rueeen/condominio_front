import { Html5Qrcode } from 'html5-qrcode'
import { Camera, X } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export default function QrScanner({ onClose, onScan }) {
  const secureCameraAvailable = window.isSecureContext && navigator.mediaDevices?.getUserMedia
  const insecureContextMessage = `La cámara requiere HTTPS. Estás en una conexión no segura (${window.location.origin}). Usa el sitio publicado en HTTPS o levanta el servidor de desarrollo con certificado.`
  const readerId = `qr-reader-${useId().replace(/:/g, '')}`
  const scannerRef = useRef(null)
  const startPromiseRef = useRef(null)
  const cleanupPromiseRef = useRef(Promise.resolve())
  const handledRef = useRef(false)
  const [error, setError] = useState(secureCameraAvailable ? '' : insecureContextMessage)

  useEffect(() => {
    let cancelled = false
    const scanner = new Html5Qrcode(readerId)
    scannerRef.current = scanner
    const previousCleanup = cleanupPromiseRef.current

    const clearScanner = activeScanner => {
      try { activeScanner?.clear() } catch { /* La instancia puede no haber alcanzado a crear su UI. */ }
    }

    if (!secureCameraAvailable) {
      return () => { cancelled = true; clearScanner(scanner) }
    }

    const start = async () => {
      try {
        await previousCleanup
        if (cancelled) return
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
        if (cancelled && scanner.isScanning) await scanner.stop()
      } catch (cameraError) {
        if (!cancelled) {
          const messages = { NotAllowedError: 'No diste permiso para usar la cámara. Habilítalo en la configuración del navegador.', NotFoundError: 'No se encontró una cámara en este dispositivo.', NotReadableError: 'La cámara está ocupada por otra aplicación. Ciérrala e intenta nuevamente.' }
          setError(messages[cameraError?.name] || 'No se pudo acceder a la cámara. Revisa el permiso del navegador o usa el ingreso manual.')
        }
      }
    }
    startPromiseRef.current = start()

    return () => {
      cancelled = true
      const activeScanner = scannerRef.current
      scannerRef.current = null
      const startPromise = startPromiseRef.current
      startPromiseRef.current = null
      cleanupPromiseRef.current = startPromise?.catch(() => {}).then(async () => {
        if (activeScanner?.isScanning) await activeScanner.stop().catch(() => {})
        clearScanner(activeScanner)
      }) || Promise.resolve()
    }
  }, [onScan, readerId, secureCameraAvailable])

  return <div className="rounded-2xl border-2 border-[#4696e5] bg-blue-50 p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-lg font-bold text-blue-950"><Camera/> Apunta al código QR</h3>
      <button type="button" className="btn-secondary" onClick={onClose} aria-label="Cerrar lector"><X size={18}/> Cerrar</button>
    </div>
    <div id={readerId} className="overflow-hidden rounded-xl bg-black" />
    {error && <p role="alert" className="mt-3 rounded-lg bg-red-100 p-3 font-semibold text-red-800">{error}</p>}
  </div>
}
