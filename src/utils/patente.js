const FORMATO_PATENTE = /^[A-Z0-9]{4,10}$/

export const MENSAJE_FORMATO_PATENTE = 'Solo letras y números, sin guiones ni espacios (4 a 10 caracteres)'

export function normalizarPatente(valor = '') {
  return valor.toUpperCase().replace(/[^A-Z0-9]/g, '')
}

export function patenteEsValida(valor) {
  return FORMATO_PATENTE.test(valor)
}
