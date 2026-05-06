import { useState, useEffect } from 'react'
import { X, Heart, Wind, Thermometer, Activity, AlertOctagon, AlertTriangle } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { format } from 'date-fns'
import { API_BASE } from '../config'

const SENSOR_META = {
  heart_rate:     { label: 'Heart Rate',     unit: 'bpm',  Icon: Heart,       color: '#f43f5e' },
  spo2:           { label: 'SpO₂',           unit: '%',    Icon: Wind,        color: '#06b6d4' },
  body_temp:      { label: 'Body Temp',      unit: '°F',   Icon: Thermometer, color: '#f59e0b' },
  blood_pressure: { label: 'Blood Pressure', unit: 'mmHg', Icon: Activity,    color: '#8b5cf6' },
}

function StatBox({ label, value, unit, color }) {
  return (
    <div className="glass-panel-dark p-3 rounded-xl">
      <p className="stat-label text-[10px]">{label}</p>
      <p className="text-lg font-bold font-mono mt-1" style={{ color }}>
        {value}<span className="text-xs text-slate-500 font-normal ml-1">{unit}</span>
      </p>
    </div>
  )
}

function SensorSection({ summary }) {
  const meta = SENSOR_META[summary.sensor_type] || { label: summary.sensor_type, unit: '', Icon: Activity, color: '#06b6d4' }
  const { Icon } = meta

  const chartData = summary.recent_readings.map(r => ({
    t: format(new Date(r.timestamp), 'HH:mm:ss'),
    v: r.value,
  }))

  return (
    <div className="glass-panel p-5 space-y-4">
      {/* Sensor header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${meta.color}20` }}>
          <Icon className="w-4 h-4" style={{ color: meta.color }} />
        </div>
        <div>
          <p className="font-semibold text-slate-100">{meta.label}</p>
          <p className="text-xs text-slate-500">{summary.sensor_name} • {summary.reading_count.toLocaleString()} readings</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <StatBox label="All-time Mean" value={summary.mean_all} unit={meta.unit} color={meta.color} />
        <StatBox label="24h Mean" value={summary.mean_24h} unit={meta.unit} color={meta.color} />
        <StatBox label="Last 5 min" value={summary.mean_5min} unit={meta.unit} color={meta.color} />
        <StatBox label="Min" value={summary.min_val} unit={meta.unit} color="#64748b" />
        <StatBox label="Max" value={summary.max_val} unit={meta.unit} color="#64748b" />
      </div>

      {/* Sparkline chart */}
      {chartData.length > 1 && (
        <div style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="t" tick={{ fontSize: 9, fill: '#475569' }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 9, fill: '#475569' }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: '#94a3b8' }}
                itemStyle={{ color: meta.color }}
              />
              <Line type="monotone" dataKey="v" stroke={meta.color} strokeWidth={1.5} dot={false} name={meta.unit} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

export default function PatientDrawer({ patientId, onClose }) {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!patientId) return
    setLoading(true)
    setReport(null)
    fetch(`${API_BASE}/api/v1/patients/${patientId}/report`)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        // Ensure the response has the expected shape
        if (data && Array.isArray(data.sensor_summaries)) {
          setReport(data)
        } else {
          setReport({ patient_id: patientId, sensor_summaries: [], alerts: [] })
        }
      })
      .catch(() => {
        setReport({ patient_id: patientId, sensor_summaries: [], alerts: [] })
      })
      .finally(() => setLoading(false))
  }, [patientId])

  if (!patientId) return null

  // Patient avatar color
  const colors = ['#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#f43f5e']
  const idx = patientId.charCodeAt(patientId.length - 1) % colors.length
  const avatarColor = colors[idx]

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl h-full bg-slate-950 border-l border-slate-800 flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <svg width="44" height="44" viewBox="0 0 44 44" className="rounded-full shrink-0">
              <circle cx="22" cy="22" r="22" fill={avatarColor} fillOpacity="0.2" />
              <circle cx="22" cy="22" r="21" stroke={avatarColor} strokeOpacity="0.5" strokeWidth="1" />
              <circle cx="22" cy="16" r="6" fill={avatarColor} fillOpacity="0.6" />
              <ellipse cx="22" cy="32" rx="11" ry="7" fill={avatarColor} fillOpacity="0.4" />
              <text x="22" y="20" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="9" fontWeight="600">
                {patientId.replace('patient_', 'P').toUpperCase().slice(0, 2)}
              </text>
            </svg>
            <div>
              <h2 className="font-bold text-slate-100">{patientId.replace('_', ' ').toUpperCase()}</h2>
              <p className="text-xs text-slate-500 mt-0.5">Full Diagnostic Report</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl glass-panel flex items-center justify-center text-slate-400 hover:text-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="skeleton h-48 w-full rounded-2xl" />)}
            </div>
          ) : !report || !Array.isArray(report.sensor_summaries) ? (
            <div className="text-center py-16 text-slate-600">No data available for this patient</div>
          ) : (
            <>
              {/* Summary header */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-panel p-4">
                  <p className="stat-label">Total Readings</p>
                  <p className="stat-value text-cyan-400">
                    {(report.sensor_summaries || []).reduce((s, x) => s + x.reading_count, 0).toLocaleString()}
                  </p>
                </div>
                <div className="glass-panel p-4">
                  <p className="stat-label">Active Sensors</p>
                  <p className="stat-value text-cyan-400">{(report.sensor_summaries || []).length}</p>
                </div>
              </div>

              {/* Sensor sections */}
              {(report.sensor_summaries || []).length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-sm">No sensor readings yet for this patient.</div>
              ) : (
                (report.sensor_summaries || []).map((s, i) => (
                  <SensorSection key={i} summary={s} />
                ))
              )}

              {/* Recent alerts for this patient */}
              {report.alerts.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-400 mb-2">Recent Alerts ({report.alerts.length})</h3>
                  <div className="space-y-2">
                    {report.alerts.map((a, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-sm ${
                        a.severity === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                      }`}>
                        {a.severity === 'CRITICAL'
                          ? <AlertOctagon className="w-4 h-4 mt-0.5 shrink-0" />
                          : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        }
                        <div>
                          <p className="font-medium">{a.message}</p>
                          <p className="text-xs opacity-60 mt-0.5">{format(new Date(a.timestamp), 'MMM d, HH:mm:ss')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
