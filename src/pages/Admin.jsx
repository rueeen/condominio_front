import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Building2, Check, ParkingSquare, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../api'
import Layout from '../components/Layout'
import Spinner from '../components/Spinner'

function getErrorMessage(error, fallback) {
  const data = error.response?.data
  if (typeof data === 'string') return data
  if (Array.isArray(data)) return data[0] || fallback
  if (data && typeof data === 'object') {
    for (const value of Object.values(data)) {
      if (Array.isArray(value) && value[0]) return value[0]
      if (typeof value === 'string') return value
    }
  }
  return fallback
}

function Table({ data, columns }) {
  const [globalFilter, setGlobalFilter] = useState('')
  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return <>
    <input className="input mb-3" placeholder="Filtrar por texto..." value={globalFilter} onChange={e => setGlobalFilter(e.target.value)} />
    <div className="overflow-auto rounded-2xl border border-slate-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          {table.getHeaderGroups().map(group => <tr key={group.id}>
            {group.headers.map(header => <th className="cursor-pointer px-4 py-3 text-left" onClick={header.column.getToggleSortingHandler()} key={header.id}>
              {flexRender(header.column.columnDef.header, header.getContext())}
            </th>)}
          </tr>)}
        </thead>
        <tbody>
          {table.getRowModel().rows.map(row => <tr className="border-t border-slate-200 hover:bg-slate-50/70" key={row.id}>
            {row.getVisibleCells().map(cell => <td className="px-4 py-3" key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
  </>
}

export default function Admin() {
  const [vehiculos, setVehiculos] = useState([])
  const [ingresos, setIngresos] = useState([])
  const [propietarios, setPropietarios] = useState([])
  const [estacionamientos, setEstacionamientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [motivos, setMotivos] = useState({})
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [nuevoEstacionamiento, setNuevoEstacionamiento] = useState({ numero: '', propietario: '' })
  const [numeroEstacionamientoRapido, setNumeroEstacionamientoRapido] = useState('')
  const [guardandoEstacionamiento, setGuardandoEstacionamiento] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [vehiculosResponse, ingresosResponse, propietariosResponse, estacionamientosResponse] = await Promise.all([
        api.get('/vehiculos/'),
        api.get('/ingresos/'),
        api.get('/propietarios/'),
        api.get('/estacionamientos/'),
      ])
      setVehiculos(vehiculosResponse.data.results ?? vehiculosResponse.data)
      setIngresos(ingresosResponse.data.results ?? ingresosResponse.data)
      setPropietarios(propietariosResponse.data.results ?? propietariosResponse.data)
      setEstacionamientos(estacionamientosResponse.data.results ?? estacionamientosResponse.data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    Promise.resolve().then(load).catch(() => toast.error('No se pudo cargar admin'))
  }, [])

  const resolver = async (id, aprobar) => {
    const motivo_rechazo = motivos[id]
    if (!aprobar && !motivo_rechazo) return toast.error('Ingresa el motivo de rechazo')
    try {
      await api.post(`/vehiculos/${id}/resolver/`, { aprobar, motivo_rechazo })
      toast.success(aprobar ? 'Vehículo aprobado' : 'Vehículo rechazado')
      load().catch(() => toast.error('No se pudo actualizar admin'))
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo resolver la solicitud'))
    }
  }

  const abrirEdicion = propietario => {
    setEditando({ ...propietario, torre: String(propietario.torre), departamento: String(propietario.departamento) })
  }

  const guardarPropietario = async event => {
    event.preventDefault()
    const torre = Number(editando.torre)
    const departamento = Number(editando.departamento)
    if (!Number.isInteger(torre) || torre < 1 || torre > 25) {
      return toast.error('La torre debe ser un número entero entre 1 y 25')
    }
    if (!Number.isInteger(departamento)) {
      return toast.error('El departamento debe ser un número entero')
    }

    setGuardando(true)
    try {
      await api.patch(`/propietarios/${editando.id}/`, {
        torre,
        departamento,
        first_name: editando.first_name?.trim() ?? '',
        last_name: editando.last_name?.trim() ?? '',
      })
      toast.success('Propietario actualizado')
      setEditando(null)
      const response = await api.get('/propietarios/')
      setPropietarios(response.data.results ?? response.data)
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el propietario'))
    } finally {
      setGuardando(false)
    }
  }

  const agregarEstacionamientoAEditando = async event => {
    event.preventDefault()
    if (!numeroEstacionamientoRapido.trim()) return toast.error('Ingresa el número de estacionamiento')

    setGuardandoEstacionamiento(true)
    try {
      await api.post('/estacionamientos/', {
        numero: numeroEstacionamientoRapido.trim(),
        propietario: editando.id,
      })
      toast.success('Estacionamiento asignado')
      setNumeroEstacionamientoRapido('')
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo asignar el estacionamiento'))
    } finally {
      setGuardandoEstacionamiento(false)
    }
  }

  const crearEstacionamiento = async event => {
    event.preventDefault()
    if (!nuevoEstacionamiento.numero.trim()) return toast.error('Ingresa el número de estacionamiento')
    if (!nuevoEstacionamiento.propietario) return toast.error('Selecciona un propietario')

    setGuardandoEstacionamiento(true)
    try {
      await api.post('/estacionamientos/', {
        numero: nuevoEstacionamiento.numero.trim(),
        propietario: Number(nuevoEstacionamiento.propietario),
      })
      toast.success('Estacionamiento asignado')
      setNuevoEstacionamiento({ numero: '', propietario: '' })
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo asignar el estacionamiento'))
    } finally {
      setGuardandoEstacionamiento(false)
    }
  }

  const eliminarEstacionamiento = async id => {
    try {
      await api.delete(`/estacionamientos/${id}/`)
      toast.success('Estacionamiento eliminado')
      await load()
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo eliminar el estacionamiento'))
    }
  }

  const pendientes = vehiculos.filter(vehiculo => vehiculo.estado === 'pendiente')
  const vehiculoCols = useMemo(() => [
    { header: 'Patente', accessorKey: 'patente' },
    {
      header: 'Propietario',
      accessorFn: vehiculo => `Torre ${vehiculo.propietario_torre} - Depto ${vehiculo.propietario_departamento}`,
    },
    {
      header: 'Acciones',
      cell: info => <div className="flex flex-wrap gap-2">
        <button onClick={() => resolver(info.row.original.id, true)} className="btn-ok"><Check size={16} /> Aprobar</button>
        <input className="input max-w-48" placeholder="Motivo rechazo" onChange={event => setMotivos(current => ({ ...current, [info.row.original.id]: event.target.value }))} />
        <button onClick={() => resolver(info.row.original.id, false)} className="btn-danger"><X size={16} /> Rechazar</button>
      </div>,
    },
  ], [motivos])
  const ingresoCols = useMemo(() => [
    { header: 'Fecha', accessorKey: 'timestamp', cell: info => info.getValue() ? format(parseISO(info.getValue()), 'PPp', { locale: es }) : '' },
    { header: 'Tipo', accessorKey: 'tipo' },
    { header: 'Valor', accessorKey: 'valor_ingresado' },
    { header: 'Resultado', accessorKey: 'resultado' },
  ], [])
  const propietarioCols = useMemo(() => [
    { header: 'Usuario', accessorKey: 'username' },
    { header: 'Nombre', accessorFn: propietario => `${propietario.first_name} ${propietario.last_name}`.trim() || '—' },
    {
      header: 'Unidad',
      cell: info => <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
        <Building2 size={13} /> Torre {info.row.original.torre} · Depto {info.row.original.departamento}
      </span>,
    },
    {
      header: 'Estacionamientos',
      cell: info => {
        const espacios = info.row.original.estacionamientos ?? []
        if (espacios.length === 0) return <span className="badge-gray">Sin estacionamiento</span>
        return <div className="flex flex-wrap gap-1.5">
          {espacios.map(numero => <span key={numero} className="inline-flex items-center gap-1 rounded-full bg-[#4696e5]/10 px-2.5 py-1 text-xs font-bold text-[#317fcf]">
            <ParkingSquare size={12} /> {numero}
          </span>)}
        </div>
      },
    },
    {
      header: 'Acciones', cell: info => <button className="btn-secondary" onClick={() => abrirEdicion(info.row.original)}>
        <Pencil size={15} /> Editar
      </button>,
    },
  ], [])
  const estacionamientoCols = useMemo(() => [
    {
      header: 'Número',
      cell: info => <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4696e5]/10 px-3 py-1 text-xs font-bold text-[#317fcf]">
        <ParkingSquare size={13} /> {info.getValue()}
      </span>,
      accessorKey: 'numero',
    },
    {
      header: 'Propietario',
      accessorFn: estacionamiento => {
        const propietario = propietarios.find(p => p.id === estacionamiento.propietario)
        return propietario ? `Torre ${propietario.torre} · Depto ${propietario.departamento} (${propietario.username})` : `#${estacionamiento.propietario}`
      },
    },
    {
      header: 'Acciones',
      cell: info => <button className="btn-danger" onClick={() => eliminarEstacionamiento(info.row.original.id)}>
        <Trash2 size={15} /> Eliminar
      </button>,
    },
  ], [propietarios])

  if (loading) return <Layout><Spinner /></Layout>

  return <Layout>
    <div className="space-y-6">
      <section className="card">
        <h1 className="mb-4 text-2xl font-bold">Solicitudes pendientes</h1>
        <Table data={pendientes} columns={vehiculoCols} />
      </section>
      <section className="card">
        <h1 className="mb-4 text-2xl font-bold">Historial de ingresos</h1>
        <Table data={ingresos} columns={ingresoCols} />
      </section>
      <section className="card">
        <h1 className="section-title"><Building2 className="text-[#4696e5]" /> Propietarios</h1>
        {editando && <div className="mb-5 space-y-4 rounded-xl border border-[#4696e5]/30 bg-[#4696e5]/5 p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#4696e5] text-white">
              <Pencil size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Editando unidad de</p>
              <p className="font-bold text-slate-800">{editando.username}</p>
            </div>
          </div>

          <form className="flex flex-wrap items-end gap-4" onSubmit={guardarPropietario}>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600" htmlFor="nombre">Nombre</label>
              <input id="nombre" className="input w-40" value={editando.first_name ?? ''} onChange={event => setEditando(current => ({ ...current, first_name: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600" htmlFor="apellido">Apellido</label>
              <input id="apellido" className="input w-40" value={editando.last_name ?? ''} onChange={event => setEditando(current => ({ ...current, last_name: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600" htmlFor="torre">Torre</label>
              <input id="torre" className="input w-24" type="number" min="1" max="25" required value={editando.torre} onChange={event => setEditando(current => ({ ...current, torre: event.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-600" htmlFor="departamento">Departamento</label>
              <input id="departamento" className="input w-28" type="number" required value={editando.departamento} onChange={event => setEditando(current => ({ ...current, departamento: event.target.value }))} />
            </div>
            <div className="flex gap-2">
              <button className="btn-ok" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
              <button className="btn-secondary" type="button" disabled={guardando} onClick={() => setEditando(null)}>Cancelar</button>
            </div>
          </form>

          <div className="border-t border-[#4696e5]/20 pt-4">
            <p className="mb-2 text-sm font-semibold text-slate-600">Estacionamientos de esta unidad</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {estacionamientos.filter(estacionamiento => estacionamiento.propietario === editando.id).length === 0
                ? <span className="badge-gray">Sin estacionamiento</span>
                : estacionamientos.filter(estacionamiento => estacionamiento.propietario === editando.id).map(estacionamiento => (
                  <span key={estacionamiento.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#4696e5]/10 py-1 pl-3 pr-1.5 text-xs font-bold text-[#317fcf]">
                    <ParkingSquare size={12} /> {estacionamiento.numero}
                    <button type="button" className="rounded-full p-0.5 hover:bg-red-100 hover:text-red-600" title="Eliminar" onClick={() => eliminarEstacionamiento(estacionamiento.id)}>
                      <X size={13} />
                    </button>
                  </span>
                ))}
            </div>
            <form className="flex items-end gap-2" onSubmit={agregarEstacionamientoAEditando}>
              <input
                className="input w-32"
                placeholder="Número, ej. 228"
                value={numeroEstacionamientoRapido}
                onChange={event => setNumeroEstacionamientoRapido(event.target.value)}
              />
              <button className="btn-primary" type="submit" disabled={guardandoEstacionamiento}>
                <Plus size={16} /> Agregar
              </button>
            </form>
          </div>
        </div>}
        <Table data={propietarios} columns={propietarioCols} />
      </section>
      <section className="card">
        <h1 className="section-title"><ParkingSquare className="text-[#4696e5]" /> Estacionamientos</h1>
        <form className="mb-5 flex flex-wrap items-end gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5" onSubmit={crearEstacionamiento}>
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-600" htmlFor="numero-estacionamiento">Número</label>
            <input
              id="numero-estacionamiento"
              className="input w-32"
              placeholder="228"
              value={nuevoEstacionamiento.numero}
              onChange={event => setNuevoEstacionamiento(current => ({ ...current, numero: event.target.value }))}
            />
          </div>
          <div className="min-w-64 flex-1">
            <label className="mb-1 block text-sm font-semibold text-slate-600" htmlFor="propietario-estacionamiento">Propietario</label>
            <select
              id="propietario-estacionamiento"
              className="input"
              value={nuevoEstacionamiento.propietario}
              onChange={event => setNuevoEstacionamiento(current => ({ ...current, propietario: event.target.value }))}
            >
              <option value="">Selecciona un propietario</option>
              {propietarios.map(propietario => <option key={propietario.id} value={propietario.id}>
                Torre {propietario.torre} - Depto {propietario.departamento} ({propietario.username})
              </option>)}
            </select>
          </div>
          <button className="btn-primary" type="submit" disabled={guardandoEstacionamiento}>
            <Plus size={17} /> {guardandoEstacionamiento ? 'Asignando...' : 'Asignar estacionamiento'}
          </button>
        </form>
        <Table data={estacionamientos} columns={estacionamientoCols} />
      </section>
    </div>
  </Layout>
}
