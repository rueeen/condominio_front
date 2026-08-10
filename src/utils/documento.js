import { format as formatearRut, validate as validarRut } from 'rut.js'

export function formatearDocumento(tipoDocumento, valor) {
  if (tipoDocumento === 'rut') {
    try {
      return formatearRut(valor)
    } catch {
      return valor
    }
  }
  return valor.toUpperCase()
}

export function documentoEsValido(tipoDocumento, valor) {
  const limpio = valor.trim()
  if (!limpio) return false
  if (tipoDocumento === 'rut') return validarRut(limpio)
  return limpio.length >= 3
}
