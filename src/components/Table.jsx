import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useState } from 'react'

export default function Table({ data, columns }) {
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
