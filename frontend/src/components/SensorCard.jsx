import { TrendingUp, TrendingDown, Minus, Heart, Wind, Thermometer, Activity } from 'lucide-react'

const SENSOR_META = {
  heart_rate:     { label: 'Heart Rate',      unit: 'bpm',  Icon: Heart,        color: 'text-rose-400',    bg: 'bg-rose-500/15', border: 'border-rose-500/30' },
  spo2:           { label: 'SpO₂',            unit: '%',    Icon: Wind,         color: 'text-cyan-400',    bg: 'bg-cyan-500/15', border: 'border-cyan-500/30' },
  body_temp:      { label: 'Body Temp',        unit: '°F',   Icon: Thermometer,  color: 'text-amber-400',   bg: 'bg-amber-500/15', border: 'border-amber-500/30' },
  blood_pressure: { label: 'Blood Pressure',   unit: 'mmHg', Icon: Activity,     color: 'text-violet-400',  bg: 'bg-violet-500/15', border: 'border-violet-500/30' },
}

function PatientAvatar({ patientId }) {
  // Generate deterministic color from patient ID
  const colors = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e']
  const idx = patientId.charCodeAt(patientId.length - 1) % colors.length
  const initials = patientId.replace('patient_', 'P').toUpperCase().slice(0, 2)
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="rounded-full">
      <circle cx="24" cy="24" r="24" fill={colors[idx]} fillOpacity="0.2" />
      <circle cx="24" cy="24" r="23" stroke={colors[idx]} strokeOpacity="0.5" strokeWidth="1" />
      <circle cx="24" cy="18" r="7" fill={colors[idx]} fillOpacity="0.6" />
      <ellipse cx="24" cy="36" rx="12" ry="8" fill={colors[idx]} fillOpacity="0.4" />
      <text x="24" y="22" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10" fontWeight="600">{initials}</text>
    </svg>
  )
}

function TrendIndicator({ day, min5 }) {
  const diff = min5 - day
  const pct = day > 0 ? ((diff / day) * 100).toFixed(1) : 0
  if (Math.abs(diff) < 0.5) return (
    <span className="flex items-center gap-1 text-xs text-slate-500"><Minus className="w-3 h-3" /> Stable</span>
  )
  if (diff > 0) return (
    <span className="flex items-center gap-1 text-xs text-rose-400">
      <TrendingUp className="w-3 h-3" />+{pct}%
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs text-emerald-400">
      <TrendingDown className="w-3 h-3" />{pct}%
    </span>
  )
}

export default function SensorCard({ node }) {
  const meta = SENSOR_META[node.sensor_type] || SENSOR_META.heart_rate
  const { Icon } = meta

  return (
    <div className="glass-panel p-5 flex flex-col gap-4 h-full select-none min-w-[280px]">
      {/* Header row */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <PatientAvatar patientId={node.patient_id} />
          <div>
            <p className="text-sm font-semibold text-slate-100">{node.patient_id.replace('_', ' ').toUpperCase()}</p>
            <p className="text-xs text-slate-400 mt-0.5">{node.sensor_name}</p>
          </div>
        </div>
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${meta.bg} ${meta.color} border ${meta.border}`}>
          <Icon className="w-3 h-3" />
          {meta.label}
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-panel-dark p-3 rounded-xl">
          <p className="stat-label text-[10px]">24h Average</p>
          <p className={`text-xl font-bold font-mono mt-1 ${meta.color}`}>
            {node.mean_past_day}<span className="text-xs text-slate-500 font-normal ml-1">{meta.unit}</span>
          </p>
        </div>
        <div className="glass-panel-dark p-3 rounded-xl">
          <p className="stat-label text-[10px]">Last 5 min</p>
          <p className={`text-xl font-bold font-mono mt-1 ${meta.color}`}>
            {node.mean_last_5min}<span className="text-xs text-slate-500 font-normal ml-1">{meta.unit}</span>
          </p>
        </div>
      </div>

      {/* Trend */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-800">
        <span className="stat-label text-[10px]">Trend vs 24h mean</span>
        <TrendIndicator day={node.mean_past_day} min5={node.mean_last_5min} />
      </div>
    </div>
  )
}
