import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api, { getApiErrorMessage, normalizeListResponse } from '../../../api'
import { visitorSchema } from '../schemas'

const emptyPage = { results: [], count: 0, next: null, previous: null, loading: true, error: '' }
export default function useVisitantes() {
  const [page, setPage] = useState(emptyPage); const [qrVisitor, setQrVisitor] = useState(null); const [eliminando, setEliminando] = useState(null)
  const form = useForm({ resolver: zodResolver(visitorSchema), defaultValues: { tipo_documento: 'rut', numero_documento: '', pais_documento: '', nombre: '', tipo_visita: 'temporal', fecha_fin: '' } })
  const fetchPage = useCallback(async (url = '/visitantes/') => { setPage(current => ({ ...current, loading: true, error: '' })); try { const response = await api.get(url); setPage({ ...normalizeListResponse(response.data), loading: false, error: '' }) } catch (error) { setPage(current => ({ ...current, loading: false, error: getApiErrorMessage(error, 'No se pudieron cargar los registros') })) } }, [])
  useEffect(() => { Promise.resolve().then(fetchPage) }, [fetchPage])
  const crear = async data => { const payload = { tipo_documento: data.tipo_documento, numero_documento: data.numero_documento.trim().toUpperCase(), nombre: data.nombre.trim() }; if (data.tipo_documento !== 'rut' && data.pais_documento) payload.pais_documento = data.pais_documento.trim(); if (data.tipo_visita === 'permanente') payload.fecha_fin = null; else if (data.fecha_fin) payload.fecha_fin = data.fecha_fin; try { await api.post('/visitantes/', payload); toast.success('Visita creada'); form.reset(); await fetchPage() } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo crear la visita')) } }
  const eliminar = useCallback(async id => { if (!window.confirm('¿Cancelar esta visita? El código QR dejará de funcionar de inmediato y la persona ya no podrá entrar. Para autorizarla nuevamente, tendrás que crear una nueva visita y compartir un QR distinto.')) return; setEliminando(id); try { await api.delete(`/visitantes/${id}/`); setQrVisitor(current => current?.id === id ? null : current); toast.success('Visita cancelada'); await fetchPage() } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo cancelar la visita')) } finally { setEliminando(null) } }, [fetchPage])
  return { page, fetchPage, form, crear, eliminar, eliminando, qrVisitor, setQrVisitor }
}
