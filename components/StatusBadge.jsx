import { STATUS } from '@/lib/constantes'

export default function StatusBadge({ status }) {
  const s = STATUS[status] || STATUS.aberto
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${s.cor}`}>
      {s.label}
    </span>
  )
}
