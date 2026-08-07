import { zodResolver } from '@hookform/resolvers/zod'
import { LockKeyhole } from 'lucide-react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'
import api from '../api'
import { useAuth } from '../context/AuthContext'

const schema = z.object({ username: z.string().min(1, 'Ingresa tu usuario'), password: z.string().min(1, 'Ingresa tu contraseña') })
const homeByRole = { propietario: '/propietario', guardia: '/guardia', admin: '/admin' }

export default function Login() {
  const { login } = useAuth(); const navigate = useNavigate()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) })
  const onSubmit = async (values) => {
    try { const { data } = await api.post('/token/', values); login(data.access, data.refresh); const payload = JSON.parse(atob(data.access.split('.')[1])); navigate(homeByRole[payload.rol || payload.role] || '/login') }
    catch { toast.error('Usuario o contraseña inválidos') }
  }
  return <div className="grid min-h-screen place-items-center bg-gradient-to-br from-[#4696e5]/10 via-white to-slate-100 px-4"><form onSubmit={handleSubmit(onSubmit)} className="card w-full max-w-md space-y-6 p-7 sm:p-9"><div className="text-center"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[#4696e5]/10"><LockKeyhole className="text-[#4696e5]" size={36}/></div><h1 className="mt-4 text-3xl font-bold tracking-tight">Acceso condominio</h1><p className="mt-1 text-slate-500">Ingresa con tu cuenta asignada</p></div><label className="field">Usuario<input className="input" autoComplete="username" {...register('username')} />{errors.username && <small className="error">{errors.username.message}</small>}</label><label className="field">Contraseña<input type="password" className="input" autoComplete="current-password" {...register('password')} />{errors.password && <small className="error">{errors.password.message}</small>}</label><button disabled={isSubmitting} className="btn-primary w-full">{isSubmitting ? 'Entrando...' : 'Entrar'}</button></form></div>
}
