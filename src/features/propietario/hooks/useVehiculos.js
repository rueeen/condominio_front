import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api, { getApiErrorMessage, normalizeListResponse } from '../../../api'
import { carSchema } from '../schemas'
const emptyPage = { results: [], count: 0, next: null, previous: null, loading: true, error: '' }
export default function useVehiculos() {
  const [page, setPage] = useState(emptyPage); const [estacionamientos, setEstacionamientos] = useState(null); const [eliminando, setEliminando] = useState(null); const form = useForm({ resolver: zodResolver(carSchema) })
  const fetchPage = useCallback(async (url = '/vehiculos/') => { setPage(current => ({ ...current, loading: true, error: '' })); try { const response = await api.get(url); setPage({ ...normalizeListResponse(response.data), loading: false, error: '' }) } catch (error) { setPage(current => ({ ...current, loading: false, error: getApiErrorMessage(error, 'No se pudieron cargar los registros') })) } }, [])
  useEffect(() => { Promise.resolve().then(fetchPage); api.get('/mis-estacionamientos/').then(response => setEstacionamientos(response.data)).catch(() => setEstacionamientos(null)) }, [fetchPage])
  const crear = async data => { try { await api.post('/vehiculos/', data); toast.success('Solicitud enviada'); form.reset(); await fetchPage() } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo enviar la solicitud')) } }
  const eliminar = useCallback(async id => { if (!window.confirm('¿Eliminar esta patente? Liberarás el cupo para registrar otra.')) return; setEliminando(id); try { await api.delete(`/vehiculos/${id}/`); toast.success('Patente eliminada'); await fetchPage() } catch (error) { toast.error(getApiErrorMessage(error, 'No se pudo eliminar la patente')) } finally { setEliminando(null) } }, [fetchPage])
  return { page, fetchPage, estacionamientos, form, crear, eliminar, eliminando }
}
