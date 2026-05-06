import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Activity, Clock, Server } from 'lucide-react'
import { API_BASE, GRAFANA_BASE } from '../config'
import { useToast } from '../context/ToastContext'

const PROMETHEUS_BASE = import.meta.env.VITE_PROMETHEUS_BASE || 'http://localhost:9090'

// Individual service health checks
const SERVICES = [
  { name: 'Ingestion Service',  url: `${API_BASE}/metrics`,         label: 'FastAPI',    port: '8000' },
  { name: 'Analysis Service',   url: 'http://localhost:8002/metrics', label: 'FastAPI',   port: '8002' },
  { name: 'Dashboard Service',  url: 'http://localhost:8003/metrics', label: 'FastAPI',   port: '8003' },
  { name: 'Prometheus',         url: `${PROMETHEUS_BASE}/-/healthy`,  label: 'Prometheus', port: '9090' },
  { name: 'Grafana',            url: `${GRAFANA_BASE}/api/health`,    label: 'Grafana',    port: '3001' },
]

function StatusBadge({ status }) {
  if (status === 'online')  return <span className="badge badge-green"><CheckCircle2 className="w-3 h-3" />ONLINE</span>
  if (status === 'offline') return <span className="badge badge-rose"><XCircle className="w-3 h-3" />OFFLINE</span>
  return <span className="badge badge-slate"><AlertCircle className="w-3 h-3" />CHECKING…</span>
}

function ServiceRow({ svc }) {
  const [status, setStatus] = useState('checking')
  const [latency, setLatency] = useState(null)
  const [lastChecked, setLastChecked] = useState(null)

  const check = useCallback(async () => {
    const t0 = performance.now()
    try {
      await fetch(svc.url, { signal: AbortSignal.timeout(2500), mode: 'no-cors' })
      setLatency(Math.round(performance.now() - t0))
      setStatus('online')
    } catch {
      setStatus('offline')
      setLatency(null)
    }
    setLastChecked(new Date())
  }, [svc.url])

  useEffect(() => {
    check()
    const id = setInterval(check, 10000)
    return () => clearInterval(id)
  }, [check])

  return (
    <tr className="border-b border-slate-800/60 hover:bg-slate-800/20 transition-colors">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${status === 'online' ? 'bg-emerald-400 animate-pulse' : status === 'offline' ? 'bg-rose-400' : 'bg-slate-600 animate-pulse'}`} />
          <span className="font-medium text-slate-200">{svc.name}</span>
        </div>
      </td>
      <td className="px-4 py-4"><span className="badge badge-slate text-[10px]">{svc.label}</span></td>
      <td className="px-4 py-4 font-mono text-xs text-slate-400">:{svc.port}</td>
      <td className="px-4 py-4"><StatusBadge status={status} /></td>
      <td className="px-4 py-4 font-mono text-xs text-slate-400">
        {latency !== null ? <span className={latency < 100 ? 'text-emerald-400' : latency < 500 ? 'text-amber-400' : 'text-rose-400'}>{latency} ms</span> : '–'}
      </td>
      <td className="px-4 py-4 text-xs text-slate-600">
        {lastChecked ? lastChecked.toLocaleTimeString() : '–'}
      </td>
    </tr>
  )
}

// Prometheus targets
function PrometheusTargets() {
  const [targets, setTargets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(`${PROMETHEUS_BASE}/api/v1/targets`)
        const json = await res.json()
        setTargets(json.data?.activeTargets || [])
      } catch {
        setTargets([])
      } finally {
        setLoading(false)
      }
    }
    fetch_()
    const id = setInterval(fetch_, 15000)
    return () => clearInterval(id)
  }, [])

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="skeleton h-12 w-full rounded-xl" />)}
    </div>
  )

  if (targets.length === 0) return (
    <div className="text-center py-8 text-slate-600 text-sm">
      Could not reach Prometheus API at {PROMETHEUS_BASE}
    </div>
  )

  return (
    <div className="space-y-3">
      {targets.map((t, i) => (
        <div key={i} className="glass-panel-dark p-4 rounded-xl flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-200">{t.labels?.job || 'unknown'}</p>
            <p className="text-xs text-slate-500 font-mono mt-0.5">{t.scrapeUrl}</p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="stat-label text-[10px]">Last Scrape</p>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                {t.lastScrape ? new Date(t.lastScrape).toLocaleTimeString() : '–'}
              </p>
            </div>
            <div className="text-right">
              <p className="stat-label text-[10px]">Duration</p>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                {t.lastScrapeDuration ? `${(t.lastScrapeDuration * 1000).toFixed(1)} ms` : '–'}
              </p>
            </div>
            {t.health === 'up'
              ? <span className="badge badge-green"><CheckCircle2 className="w-3 h-3" />UP</span>
              : <span className="badge badge-rose"><XCircle className="w-3 h-3" />DOWN</span>
            }
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Observability() {
  const [tick, setTick] = useState(0)

  return (
    <div className="p-6 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Service Observability</h1>
          <p className="text-slate-500 text-sm mt-1">Real-time health checks across all stack components</p>
        </div>
        <button onClick={() => setTick(t => t + 1)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all">
          <RefreshCw className="w-4 h-4" /> Force Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel p-4 flex items-center gap-3">
          <Server className="w-8 h-8 text-cyan-400" />
          <div>
            <p className="stat-label">Total Services</p>
            <p className="stat-value">{SERVICES.length}</p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-3">
          <Activity className="w-8 h-8 text-emerald-400" />
          <div>
            <p className="stat-label">Monitored via Prometheus</p>
            <p className="stat-value text-emerald-400">2</p>
          </div>
        </div>
        <div className="glass-panel p-4 flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-400" />
          <div>
            <p className="stat-label">Scrape Interval</p>
            <p className="stat-value text-amber-400">5s</p>
          </div>
        </div>
      </div>

      {/* Service health table */}
      <section>
        <h2 className="text-base font-semibold text-slate-300 mb-3">Live Health Checks</h2>
        <div className="glass-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left">
                {['Service', 'Type', 'Port', 'Status', 'Latency', 'Last Checked'].map(h => (
                  <th key={h} className="px-4 py-3 stat-label">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody key={tick}>
              {SERVICES.map((svc, i) => <ServiceRow key={`${i}-${tick}`} svc={svc} />)}
            </tbody>
          </table>
        </div>
      </section>

      {/* Prometheus targets */}
      <section>
        <h2 className="text-base font-semibold text-slate-300 mb-3">Prometheus Scrape Targets</h2>
        <PrometheusTargets />
      </section>
    </div>
  )
}
