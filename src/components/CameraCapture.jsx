import { Camera, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

// Proporción del recuadro guía, relativa al frame nativo de la cámara.
// Una patente chilena real mide ~360x130mm (razón ~2.7:1) — este recorte
// da margen de encuadre a pulso sin mandar tanto fondo como el frame
// completo, mejorando la precisión del OCR en el backend.
const RECORTE = { x: 0.18, y: 0.36, width: 0.64, height: 0.22 }
const MAX_IMAGE_DIMENSION = 1600
const JPEG_QUALITY = 0.85

const scaledDimensions = (width, height) => {
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

const canvasToBlob = canvas => new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))

const loadImage = file => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.onload = () => {
    URL.revokeObjectURL(url)
    resolve(image)
  }
  image.onerror = () => {
    URL.revokeObjectURL(url)
    reject(new Error('No se pudo decodificar la imagen'))
  }
  image.src = url
})

export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const capturedUrlRef = useRef('')
  const [capturedUrl, setCapturedUrl] = useState('')
  const [error, setError] = useState('')
  const [cameraActive, setCameraActive] = useState(false)

  const clearCapturedUrl = () => {
    if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current)
    capturedUrlRef.current = ''
    setCapturedUrl('')
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraActive(false)
  }

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current)
  }, [])

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
    }
  }, [cameraActive])

  const setPreview = (blob) => {
    clearCapturedUrl()
    const nextUrl = URL.createObjectURL(blob)
    capturedUrlRef.current = nextUrl
    setCapturedUrl(nextUrl)
  }

  const activateCamera = async () => {
    setError('')
    clearCapturedUrl()

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError(`La cámara requiere HTTPS. Estás en una conexión no segura (${window.location.origin}). Usa el sitio publicado en HTTPS o levanta el servidor de desarrollo con certificado.`)
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } })
      streamRef.current = stream
      setCameraActive(true)
    } catch (cameraError) {
      const messages = { NotAllowedError: 'No diste permiso para usar la cámara. Habilítalo en la configuración del navegador.', NotFoundError: 'No se encontró una cámara en este dispositivo.', NotReadableError: 'La cámara está ocupada por otra aplicación. Ciérrala e intenta nuevamente.' }
      setError(messages[cameraError?.name] || 'No se pudo activar la cámara. Puedes continuar subiendo una foto desde el dispositivo.')
      stopCamera()
    }
  }

  const captureFrame = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) return

    const cropX = width * RECORTE.x
    const cropY = height * RECORTE.y
    const cropWidth = width * RECORTE.width
    const cropHeight = height * RECORTE.height

    const output = scaledDimensions(cropWidth, cropHeight)
    canvas.width = output.width
    canvas.height = output.height
    canvas.getContext('2d').drawImage(
      video,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, output.width, output.height,
    )
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('No se pudo capturar la imagen. Intenta nuevamente.')
        return
      }
      setPreview(blob)
      onCapture(blob)
      stopCamera()
    }, 'image/jpeg', JPEG_QUALITY)
  }

  const handleFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    event.target.value = ''

    try {
      setError('')
      const image = await loadImage(file)
      const canvas = canvasRef.current
      if (!canvas) return
      const output = scaledDimensions(image.naturalWidth, image.naturalHeight)
      canvas.width = output.width
      canvas.height = output.height
      canvas.getContext('2d').drawImage(image, 0, 0, output.width, output.height)
      const blob = await canvasToBlob(canvas)
      if (!blob) throw new Error('No se pudo convertir la imagen')
      setPreview(blob)
      onCapture(blob)
    } catch {
      setError('No se pudo procesar la imagen seleccionada. Intenta con otra foto.')
    }
  }

  return <div className="space-y-3">
    {capturedUrl ? <div className="space-y-3">
      <img src={capturedUrl} alt="Patente capturada" className="max-h-72 w-full rounded-2xl object-cover" />
      <button type="button" onClick={activateCamera} className="btn-secondary h-14 w-full justify-center text-xl"><RefreshCw /> Reintentar</button>
    </div> : <>
      {cameraActive ? <div className="space-y-3">
        <div className="overflow-hidden rounded-2xl bg-slate-900 text-center">
          <div className="relative inline-block max-w-full align-bottom">
            {/* object-contain mantiene la guía alineada con el frame; object-cover volvería a desfasar el recorte. */}
            <video ref={videoRef} autoPlay playsInline muted className="block max-h-72 max-w-full object-contain" />
            <div className="pointer-events-none absolute rounded-xl border-4 border-yellow-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" style={{ left: `${RECORTE.x * 100}%`, top: `${RECORTE.y * 100}%`, width: `${RECORTE.width * 100}%`, height: `${RECORTE.height * 100}%` }} />
          </div>
        </div>
        <p className="text-center text-sm text-slate-500">Encuadra la patente dentro del recuadro y presiona Capturar</p>
        <button type="button" onClick={captureFrame} className="btn-primary h-16 w-full text-xl"><Camera /> Capturar</button>
      </div> : <button type="button" onClick={activateCamera} className="btn-secondary h-16 w-full justify-center text-xl"><Camera /> Activar cámara</button>}
    </>}
    {error && <p className="text-sm text-red-600">{error}</p>}
    <label className="btn-secondary flex h-16 w-full cursor-pointer justify-center text-xl"><Camera /> Subir foto de patente<input className="hidden" type="file" accept="image/*" capture="environment" onChange={handleFile} /></label>
    <canvas ref={canvasRef} className="hidden" />
  </div>
}
