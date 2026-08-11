import { zodResolver } from '@hookform/resolvers/zod'
import { useCallback, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api, { getApiErrorMessage } from '../../../api'
import { profileSchema } from '../schemas'
export default function usePerfil() {
  const [profile, setProfile] = useState(null); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [regenerating, setRegenerating] = useState(false)
  const form = useForm({ resolver: zodResolver(profileSchema), defaultValues: { email: '', telefono: '' } })
  const fetchProfile = useCallback(async () => { setLoading(true); setError(''); try { const { data } = await api.get('/perfil/'); setProfile(data); form.reset({ email: data.email || '', telefono: data.telefono || '' }) } catch (requestError) { setError(getApiErrorMessage(requestError, 'No se pudo cargar tu perfil')) } finally { setLoading(false) } }, [form])
  useEffect(() => { Promise.resolve().then(fetchProfile) }, [fetchProfile])
  const guardar = async data => { try { const response = await api.patch('/perfil/', { email: data.email.trim(), telefono: data.telefono.trim() }); const updated = { ...profile, ...response.data }; setProfile(updated); form.reset({ email: updated.email || '', telefono: updated.telefono || '' }); toast.success('Perfil actualizado') } catch (requestError) { toast.error(getApiErrorMessage(requestError, 'No se pudo guardar tu perfil')) } }
  const regenerar = async () => { if (!window.confirm('Tu código actual dejará de funcionar de inmediato. Úsalo solo si perdiste tu teléfono o crees que alguien más tiene tu código.')) return; setRegenerating(true); try { await api.post('/perfil/regenerar-qr/'); await fetchProfile(); toast.success('Código QR regenerado') } catch (requestError) { toast.error(getApiErrorMessage(requestError, 'No se pudo regenerar el código')) } finally { setRegenerating(false) } }
  return { profile, loading, error, form, fetchProfile, guardar, regenerar, regenerating }
}
