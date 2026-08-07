import { Camera, RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import api from '../api'

const INTERVALO_DETECCION_MS = 800
const ANCHO_FRAME_DETECCION = 480
const UMBRAL_CAPTURAS_SEGUIDAS = 3

export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const detectionCanvasRef = useRef(null)
  const streamRef = useRef(null)
  const capturedUrlRef = useRef('')
  const pollIntervalRef = useRef(null)
  const pollInProgressRef = useRef(false)
  const captureInProgressRef = useRef(false)
  const captureFrameRef = useRef(null)
  const detectedStreakRef = useRef(0)
  const [capturedUrl, setCapturedUrl] = useState('')
  const [error, setError] = useState('')
  const [cameraActive, setCameraActive] = useState(false)
  const [detectedStreak, setDetectedStreak] = useState(0)

  const resetDetection = () => {
    detectedStreakRef.current = 0
    setDetectedStreak(0)
  }

  const stopPolling = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current)
    pollIntervalRef.current = null
  }

  const clearCapturedUrl = () => {
    if (capturedUrlRef.current) URL.revokeObjectURL(capturedUrlRef.current)
    capturedUrlRef.current = ''
    setCapturedUrl('')
  }

  const stopCamera = () => {
    stopPolling()
    resetDetection()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setCameraActive(false)
  }

  useEffect(() => () => {
    stopPolling()
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
    captureInProgressRef.current = false
    resetDetection()

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
    if (!width || !height || captureInProgressRef.current) return

    captureInProgressRef.current = true
    stopPolling()
    resetDetection()

    const cropX = width * 0.10
    const cropY = height * 0.375
    const cropWidth = width * 0.80
    const cropHeight = height * 0.25

    canvas.width = cropWidth
    canvas.height = cropHeight
    canvas.getContext('2d').drawImage(
      video,
      cropX, cropY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight,
    )
    canvas.toBlob((blob) => {
      if (!blob) {
        captureInProgressRef.current = false
        setError('No se pudo capturar la imagen. Intenta nuevamente.')
        return
      }
      setPreview(blob)
      onCapture(blob)
      stopCamera()
    }, 'image/jpeg', 0.9)
  }

  useEffect(() => {
    captureFrameRef.current = captureFrame
  }, [captureFrame])

  useEffect(() => {
    if (!cameraActive) return undefined

    const pollCurrentFrame = async () => {
      if (pollInProgressRef.current || captureInProgressRef.current) return

      const video = videoRef.current
      const canvas = detectionCanvasRef.current
      if (!video || !canvas || !video.videoWidth || !video.videoHeight) return

      pollInProgressRef.current = true
      const scale = Math.min(1, ANCHO_FRAME_DETECCION / video.videoWidth)
      canvas.width = Math.round(video.videoWidth * scale)
      canvas.height = Math.round(video.videoHeight * scale)
      canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)

      try {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.75))
        if (!blob || captureInProgressRef.current) return

        const formData = new FormData()
        formData.append('foto', blob, 'deteccion.jpg')
        const { data } = await api.post('/ocr/detectar-patente/', formData)
        if (captureInProgressRef.current) return

        if (data.detectada) {
          const nextStreak = detectedStreakRef.current + 1
          detectedStreakRef.current = nextStreak
          setDetectedStreak(nextStreak)
          if (nextStreak >= UMBRAL_CAPTURAS_SEGUIDAS) captureFrameRef.current?.()
        } else {
          resetDetection()
        }
      } catch {
        // Un fallo transitorio del detector no debe bloquear la captura manual.
        resetDetection()
      } finally {
        pollInProgressRef.current = false
      }
    }

    pollCurrentFrame()
    pollIntervalRef.current = setInterval(pollCurrentFrame, INTERVALO_DETECCION_MS)

    return () => {
      stopPolling()
    }
  }, [cameraActive])

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
          <div className={`pointer-events-none absolute inset-x-[10%] inset-y-[37.5%] rounded-xl border-4 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] transition-all duration-300 ${detectedStreak > 0 ? 'animate-pulse border-green-400' : 'border-yellow-300'}`} />
        </div>
        {detectedStreak > 0 && detectedStreak < UMBRAL_CAPTURAS_SEGUIDAS && <p className="text-center font-semibold text-green-700" aria-live="polite">Mantén la patente así...</p>}
        <button type="button" onClick={captureFrame} className="btn-primary h-16 w-full text-xl"><Camera/> Capturar</button>
      </div> : <button type="button" onClick={activateCamera} className="btn-secondary h-16 w-full justify-center text-xl"><Camera/> Activar cámara</button>}
    </>}
    {error && <p className="text-sm text-red-600">{error}</p>}
    {error && <label className="btn-secondary flex h-16 w-full cursor-pointer justify-center text-xl"><Camera/> Subir foto de patente<input className="hidden" type="file" accept="image/*" capture="environment" onChange={handleFile}/></label>}
    <canvas ref={canvasRef} className="hidden" />
    <canvas ref={detectionCanvasRef} className="hidden" />
  </div>
}
