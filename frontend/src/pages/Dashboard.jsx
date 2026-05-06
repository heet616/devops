import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Search, Filter, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'
import SensorCard from '../components/SensorCard'
import PatientDrawer from '../components/PatientDrawer'
import { API_BASE } from '../config'
import { useToast } from '../context/ToastContext'

// ---------- Skeleton ----------
function CardSkeleton() {
  return (
    <div className="glass-panel p-5 flex flex-col gap-4 min-w-[280px] h-[220px]">
      <div className="flex items-center gap-3">
        <div className="skeleton w-12 h-12 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton h-3 w-28" />
          <div className="skeleton h-2 w-20" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-16 rounded-xl" />
        <div className="skeleton h-16 rounded-xl" />
      </div>
      <div className="skeleton h-3 w-32" />
    </div>
  )
}

function GridRowSkeleton() {
  return (
    <tr className="border-b border-slate-800/60">
      {[1,2,3,4,5].map(i => (
        <td key={i} className="px-4 py-3"><div className="skeleton h-3 w-full max-w-[120px]" /></td>
      ))}
    </tr>
  )
}

// ---------- Sparkline mini ----------
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return <span className="text-slate-600 text-xs">–</span>
  return (
    <ResponsiveContainer width={80} height={30}>
      <LineChart data={data.map((v, i) => ({ i, v }))}>
        <Line type="monotone" dataKey="v" stroke={color || '#06b6d4'} strokeWidth={1.5} dot={false} />
        <Tooltip content={() => null} />
      </LineChart>
    </ResponsiveContainer>
  )
}

const SENSOR_COLORS = { heart_rate: '#f43f5e', spo2: '#06b6d4', body_temp: '#f59e0b', blood_pressure: '#8b5cf6' }

// ---------- Dashboard ----------
export default function Dashboard() {
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [carouselIdx, setCarouselIdx] = useState(0)
  const { addToast } = useToast()
  const [selectedPatient, setSelectedPatient] = useState(null)
  const timerRef = useRef(null)
  const carouselRef = useRef(null)

  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/sensors/summary`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setNodes(data)
    } catch (e) {
      addToast('Backend offline – retrying in 10s', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchSummary()
    timerRef.current = setInterval(fetchSummary, 10000)
    return () => clearInterval(timerRef.current)
  }, [fetchSummary])

  // Filtered grid
  const sensorTypes = ['all', ...new Set(nodes.map(n => n.sensor_type))]
  const filtered = nodes.filter(n => {
    const matchType = filterType === 'all' || n.sensor_type === filterType
    const matchSearch = n.patient_id.toLowerCase().includes(search.toLowerCase()) ||
      n.sensor_name.toLowerCase().includes(search.toLowerCase())
    return matchType && matchSearch
  })

  const VISIBLE = 3
  const maxIdx = Math.max(0, nodes.length - VISIBLE)
  const prev = () => setCarouselIdx(i => Math.max(0, i - 1))
  const next = () => setCarouselIdx(i => Math.min(maxIdx, i + 1))

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Sensor Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">Live telemetry from all reporting IoT nodes</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchSummary() }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ---- CAROUSEL ---- */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-300">Active Sensor Modules</h2>
          <div className="flex gap-2">
            <button onClick={prev} disabled={carouselIdx === 0}
              className="w-8 h-8 rounded-xl glass-panel flex items-center justify-center text-slate-400 hover:text-slate-100 hover:border-cyan-500/40 disabled:opacity-30 transition-all">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={next} disabled={carouselIdx >= maxIdx}
              className="w-8 h-8 rounded-xl glass-panel flex items-center justify-center text-slate-400 hover:text-slate-100 hover:border-cyan-500/40 disabled:opacity-30 transition-all">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div ref={carouselRef} className="overflow-hidden">
          <div
            className="flex gap-4 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(calc(-${carouselIdx} * (296px)))` }}
          >
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
              : nodes.length === 0
                ? (
                  <div className="glass-panel p-10 flex flex-col items-center gap-3 w-full text-center">
                    <WifiOff className="w-10 h-10 text-slate-600" />
                    <p className="text-slate-400 font-medium">No sensor data yet</p>
                    <p className="text-slate-600 text-sm">Run <code className="text-cyan-400 bg-slate-800 px-1 rounded">python3 simulate_iot.py</code> to send data</p>
                  </div>
                )
                : nodes.map((node, i) => (
                  <div key={i} className="flex-shrink-0 w-72 cursor-pointer" onClick={() => setSelectedPatient(node.patient_id)}>
                    <SensorCard node={node} />
                  </div>
                ))
            }
          </div>
        </div>
        {/* dots */}
        {nodes.length > 0 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {Array.from({ length: maxIdx + 1 }).map((_, i) => (
              <button key={i} onClick={() => setCarouselIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-all ${i === carouselIdx ? 'bg-cyan-400 w-4' : 'bg-slate-700'}`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ---- GRID ---- */}
      <section>
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h2 className="text-base font-semibold text-slate-300">Global Node Grid</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search nodes…"
                className="pl-8 pr-3 py-1.5 text-sm bg-slate-900 border border-slate-700 rounded-xl text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 w-44"
              />
            </div>
            {/* Filter chips */}
            <div className="flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              {sensorTypes.map(t => (
                <button key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                    filterType === t ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-slate-500 hover:text-slate-300 border border-transparent'
                  }`}>
                  {t === 'all' ? 'All' : t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                {['Patient', 'Device', 'Sensor Type', '24h Mean', '5min Mean', 'Trend'].map(h => (
                  <th key={h} className="px-4 py-3 stat-label font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 4 }).map((_, i) => <GridRowSkeleton key={i} />)
                : filtered.length === 0
                  ? (
                    <tr><td colSpan={6} className="text-center py-12 text-slate-600">No matching nodes found</td></tr>
                  )
                  : filtered.map((n, i) => {
                    const color = SENSOR_COLORS[n.sensor_type] || '#06b6d4'
                    const diff = n.mean_last_5min - n.mean_past_day
                    return (
                      <tr key={i} className="border-b border-slate-800/60 hover:bg-slate-800/30 cursor-pointer transition-colors" onClick={() => setSelectedPatient(n.patient_id)}>
                        <td className="px-4 py-3 font-medium text-slate-200">{n.patient_id.replace('_', ' ')}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{n.sensor_name}</td>
                        <td className="px-4 py-3">
                          <span className="badge badge-cyan">{n.sensor_type.replace('_', ' ')}</span>
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-300">{n.mean_past_day}</td>
                        <td className="px-4 py-3 font-mono text-slate-300">{n.mean_last_5min}</td>
                        <td className="px-4 py-3">
                          <Sparkline data={[n.mean_past_day, n.mean_last_5min]} color={color} />
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </section>
      {/* Patient report drawer */}
      <PatientDrawer patientId={selectedPatient} onClose={() => setSelectedPatient(null)} />
    </div>
  )
}
