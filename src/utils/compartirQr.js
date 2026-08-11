// Convierte el <canvas> del QR en un PNG y lo comparte o descarga.
// Se usa canvas (no SVG) porque solo un canvas puede exportarse a blob.

function canvasABlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('sin blob')), 'image/png')
  })
}

export async function descargarQr(canvas, nombreArchivo = 'codigo-qr.png') {
  const blob = await canvasABlob(canvas)
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = nombreArchivo
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
  URL.revokeObjectURL(url)
}

// Cadena de respaldo: imagen -> texto -> portapapeles.
// Devuelve 'archivo' | 'texto' | 'portapapeles' para que quien llama
// decida qué mensaje mostrar.
export async function compartirQr({ canvas, titulo, texto, nombreArchivo = 'codigo-qr.png' }) {
  if (canvas && navigator.canShare) {
    try {
      const blob = await canvasABlob(canvas)
      const archivo = new File([blob], nombreArchivo, { type: 'image/png' })
      const datos = { title: titulo, text: texto, files: [archivo] }
      if (navigator.canShare(datos)) {
        await navigator.share(datos)
        return 'archivo'
      }
    } catch (error) {
      if (error.name === 'AbortError') return 'archivo'
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, text: texto })
      return 'texto'
    } catch (error) {
      if (error.name === 'AbortError') return 'texto'
    }
  }
  await navigator.clipboard.writeText(texto)
  return 'portapapeles'
}
