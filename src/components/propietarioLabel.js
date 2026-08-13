export default function propietarioLabel(propietario) {
  if (!propietario) return ''
  const nombre = `${propietario.first_name ?? ''} ${propietario.last_name ?? ''}`.trim() || propietario.username
  return `Torre ${propietario.torre} · Depto ${propietario.departamento}${nombre ? ` · ${nombre}` : ''}`
}
