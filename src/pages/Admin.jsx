import { flexRender, getCoreRowModel, getFilteredRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Check, X } from 'lucide-react'
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
  const [loading, setLoading] = useState(true)
  const [motivos, setMotivos] = useState({})
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [vehiculosResponse, ingresosResponse, propietariosResponse] = await Promise.all([
        api.get('/vehiculos/'),
        api.get('/ingresos/'),
        api.get('/propietarios/'),
      ])
      setVehiculos(vehiculosResponse.data)
      setIngresos(ingresosResponse.data)
      setPropietarios(propietariosResponse.data)
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
      await api.patch(`/propietarios/${editando.id}/`, { torre, departamento })
      toast.success('Propietario actualizado')
      setEditando(null)
      const response = await api.get('/propietarios/')
      setPropietarios(response.data)
    } catch (error) {
      toast.error(getErrorMessage(error, 'No se pudo actualizar el propietario'))
    } finally {
      setGuardando(false)
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
    { header: 'Nombre', accessorFn: propietario => `${propietario.first_name} ${propietario.last_name}`.trim() },
    { header: 'Torre', accessorKey: 'torre' },
    { header: 'Departamento', accessorKey: 'departamento' },
    {
      header: 'Estacionamientos',
      accessorFn: propietario => propietario.estacionamientos?.join(', ') || 'Sin estacionamiento',
    },
    { header: 'Acciones', cell: info => <button className="btn-secondary" onClick={() => abrirEdicion(info.row.original)}>Editar</button> },
  ], [])

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
        <h1 className="mb-4 text-2xl font-bold">Propietarios</h1>
        {editando && <form className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4" onSubmit={guardarPropietario}>
          <div>
            <p className="mb-2 font-semibold">Editando a {editando.username}</p>
            <label className="block text-sm" htmlFor="torre">Torre</label>
            <input id="torre" className="input" type="number" min="1" max="25" required value={editando.torre} onChange={event => setEditando(current => ({ ...current, torre: event.target.value }))} />
          </div>
          <div>
            <label className="block text-sm" htmlFor="departamento">Departamento</label>
            <input id="departamento" className="input" type="number" required value={editando.departamento} onChange={event => setEditando(current => ({ ...current, departamento: event.target.value }))} />
          </div>
          <button className="btn-ok" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar'}</button>
          <button className="btn-secondary" type="button" disabled={guardando} onClick={() => setEditando(null)}>Cancelar</button>
        </form>}
        <Table data={propietarios} columns={propietarioCols} />
      </section>
    </div>
  </Layout>
}
