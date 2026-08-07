import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'

export default function Table({
  data,
  columns,
  count = data.length,
  next = null,
  previous = null,
  onNext,
  onPrevious,
  loading = false,
  error = '',
  emptyMessage = 'No hay registros.',
}) {
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
    <input className="input mb-3" placeholder="Filtrar por texto..." value={globalFilter} onChange={event => setGlobalFilter(event.target.value)} />
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
          {!loading && !error && table.getRowModel().rows.length === 0 && <tr>
            <td className="px-4 py-6 text-center text-slate-500" colSpan={columns.length}>{emptyMessage}</td>
          </tr>}
          {loading && <tr><td className="px-4 py-6 text-center text-slate-500" colSpan={columns.length}>Cargando...</td></tr>}
          {error && !loading && <tr><td className="px-4 py-6 text-center text-red-600" colSpan={columns.length}>{error}</td></tr>}
          {table.getRowModel().rows.map(row => <tr className="border-t border-slate-200 hover:bg-slate-50/70" key={row.id}>
            {row.getVisibleCells().map(cell => <td className="px-4 py-3" key={cell.id}>
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </td>)}
          </tr>)}
        </tbody>
      </table>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
      <span className="text-slate-600">Total: {count} {count === 1 ? 'registro' : 'registros'}</span>
      <div className="flex gap-2">
        <button className="btn-secondary" type="button" disabled={!previous || loading} onClick={onPrevious}>Anterior</button>
        <button className="btn-secondary" type="button" disabled={!next || loading} onClick={onNext}>Siguiente</button>
      </div>
    </div>
  </>
}
