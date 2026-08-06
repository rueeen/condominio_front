import { Camera, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

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

    try {
      // getUserMedia requiere HTTPS excepto en localhost; para probar en un dispositivo real usa vite --host --https o ngrok.
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      setCameraActive(true)
    } catch {
      setError('No se pudo activar la cámara. Puedes continuar subiendo una foto desde el dispositivo.')
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

    canvas.width = width
    canvas.height = height
    canvas.getContext('2d').drawImage(video, 0, 0, width, height)
    canvas.toBlob((blob) => {
      if (!blob) {
        setError('No se pudo capturar la imagen. Intenta nuevamente.')
        return
      }
      setPreview(blob)
      onCapture(blob)
      stopCamera()
    }, 'image/jpeg', 0.9)
  }

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    setPreview(file)
    onCapture(file)
    event.target.value = ''
  }

  return <div className="space-y-3">
    {capturedUrl ? <div className="space-y-3">
      <img src={capturedUrl} alt="Patente capturada" className="max-h-72 w-full rounded-2xl object-cover" />
      <button type="button" onClick={activateCamera} className="btn-secondary h-14 w-full justify-center text-xl"><RefreshCw/> Reintentar</button>
    </div> : <>
      {cameraActive ? <div className="space-y-3">
        <div className="relative overflow-hidden rounded-2xl bg-slate-900">
          <video ref={videoRef} autoPlay playsInline muted className="max-h-72 w-full object-cover" />
          <div className="pointer-events-none absolute inset-x-[12%] top-1/2 h-20 -translate-y-1/2 rounded-xl border-4 border-yellow-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        </div>
        <button type="button" onClick={captureFrame} className="btn-primary h-16 w-full text-xl"><Camera/> Capturar</button>
      </div> : <button type="button" onClick={activateCamera} className="btn-secondary h-16 w-full justify-center text-xl"><Camera/> Activar cámara</button>}
    </>}
    {error && <p className="text-sm text-red-600">{error}</p>}
    {error && <label className="btn-secondary flex h-16 w-full cursor-pointer justify-center text-xl"><Camera/> Subir foto de patente<input className="hidden" type="file" accept="image/*" capture="environment" onChange={handleFile}/></label>}
    <canvas ref={canvasRef} className="hidden" />
  </div>
}
