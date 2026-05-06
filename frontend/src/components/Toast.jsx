import { useToast } from '../context/ToastContext'
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react'

const ICONS = {
  error: <AlertCircle className="w-4 h-4 text-rose-400" />,
  success: <CheckCircle className="w-4 h-4 text-emerald-400" />,
  info: <Info className="w-4 h-4 text-cyan-400" />,
}
const BORDERS = {
  error: 'border-rose-500/40',
  success: 'border-emerald-500/40',
  info: 'border-cyan-500/40',
}

export default function Toast() {
  const { toasts } = useToast()
  return (
    <div className="fixed bottom-5 right-5 flex flex-col gap-2 z-50">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`animate-fade-in flex items-center gap-3 glass-panel border ${BORDERS[t.type] || BORDERS.error} px-4 py-3 min-w-[260px] max-w-sm shadow-xl`}
        >
          {ICONS[t.type] || ICONS.error}
          <p className="text-sm text-slate-200 flex-1">{t.msg}</p>
        </div>
      ))}
    </div>
  )
}
