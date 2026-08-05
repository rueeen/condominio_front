import { ClipLoader } from 'react-spinners'

export default function Spinner({ text = 'Cargando...' }) {
  return <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-slate-500"><ClipLoader color="#2563eb" /><span>{text}</span></div>
}
