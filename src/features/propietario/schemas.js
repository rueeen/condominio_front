import { z } from 'zod'
import { documentoEsValido } from '../../utils/documento'
import { MENSAJE_FORMATO_PATENTE, normalizarPatente, patenteEsValida } from '../../utils/patente'

export const documentTypes = [
  { value: 'rut', label: 'RUT chileno' }, { value: 'pasaporte', label: 'Pasaporte' },
  { value: 'dni', label: 'DNI extranjero' }, { value: 'otro', label: 'Otro' },
]
export const visitorSchema = z.object({
  tipo_documento: z.enum(['rut', 'pasaporte', 'dni', 'otro']),
  numero_documento: z.string().trim().min(3, 'Ingresa al menos 3 caracteres').max(50, 'Máximo 50 caracteres'),
  pais_documento: z.string().trim().max(80, 'Máximo 80 caracteres').optional(), nombre: z.string().min(2, 'Ingresa al menos 2 caracteres'),
  tipo_visita: z.enum(['temporal', 'permanente']), fecha_fin: z.preprocess(value => value === '' ? undefined : value, z.string().min(1).optional()),
}).refine(data => documentoEsValido(data.tipo_documento, data.numero_documento), { message: 'El RUT no es válido, revisa el dígito verificador', path: ['numero_documento'] })
  .refine(data => data.tipo_visita === 'permanente' || !data.fecha_fin || new Date(data.fecha_fin) >= new Date(), { message: 'La fecha de vencimiento no puede estar en el pasado', path: ['fecha_fin'] })
export const carSchema = z.object({ patente: z.string().transform(normalizarPatente).refine(patenteEsValida, MENSAJE_FORMATO_PATENTE) })
export const profileSchema = z.object({ email: z.string().trim().email('Ingresa un email válido'), telefono: z.string().trim().refine(value => value === '' || /^\+?[\d\s-]+$/.test(value) && /\d/.test(value), 'Usa solo dígitos, espacios, guiones y un + inicial') })
