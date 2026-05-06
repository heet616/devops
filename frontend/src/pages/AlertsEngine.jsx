import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, AlertOctagon, X, RefreshCw, Bell, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'
import { API_BASE, GRAFANA_BASE } from '../config'
import { useToast } from '../context/ToastContext'
import PatientDrawer from '../components/PatientDrawer'

// ---------- Skeleton row ----------
function AlertRowSkeleton() {
  return (
    <tr className="border-b border-slate-800/60">
      {[1,2,3,4,5].map(i => (
        <td key={i} className="px-4 py-3"><div className="skeleton h-3 w-full max-w-[140px]" /></td>
      ))}
    </tr>
  )
}

// ---------- Grafana Drawer ----------
function GrafanaDrawer({ alert, onClose }) {
  if (!alert) return null
  const alertEpoch = new Date(alert.timestamp).getTime()
  const from = alertEpoch - 300_000
  const to   = alertEpoch + 300_000
  const src = `${GRAFANA_BASE}/d-solo?orgId=1&from=${from}&to=${to}&theme=dark&panelId=1`

  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {/* Drawer */}
      <div className="relative w-full max-w-2xl h-full bg-slate-950 border-l border-slate-800 flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <AlertOctagon className={`w-4 h-4 ${alert.severity === 'CRITICAL' ? 'text-rose-400' : 'text-amber-400'}`} />
              <h2 className="font-bold text-slate-100">{alert.severity} — {alert.sensor_type.replace('_',' ')}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">{alert.patient_id} • {format(new Date(alert.timestamp), 'PPpp')}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl glass-panel flex items-center justify-center text-slate-400 hover:text-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alert message */}
        <div className={`mx-6 mt-4 p-3 rounded-xl text-sm border ${
          alert.severity === 'CRITICAL' ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }`}>
          {alert.message}
        </div>

        {/* Grafana embed */}
        <div className="flex items-center justify-between px-6 py-3">
          <p className="text-xs text-slate-500 font-mono">Diagnostic window: ±5 min around alert</p>
          <a href={GRAFANA_BASE} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs text-cyan-400 hover:underline">
            <ExternalLink className="w-3 h-3" /> Open Grafana
          </a>
        </div>
        <div className="flex-1 mx-6 mb-6 rounded-xl overflow-hidden border border-slate-800">
          <iframe
            src={src}
            className="w-full h-full"
            title="Grafana Diagnostic Panel"
            frameBorder="0"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}

// ---------- Main Page ----------
export default function AlertsEngine() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [selectedPatient, setSelectedPatient] = useState(null)
  const [severityFilter, setSeverityFilter] = useState('all')
  const { addToast } = useToast()

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/v1/alerts`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setAlerts(data)
    } catch (e) {
      addToast('Failed to fetch alerts – backend may be offline', 'error')
    } finally {
      setLoading(false)
    }
  }, [addToast])

  useEffect(() => {
    fetchAlerts()
    const interval = setInterval(fetchAlerts, 15000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  const filtered = severityFilter === 'all'
    ? alerts
    : alerts.filter(a => a.severity === severityFilter)

  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length
  const warningCount  = alerts.filter(a => a.severity === 'WARNING').length

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Alerts Engine</h1>
          <p className="text-slate-500 text-sm mt-1">Clinical anomaly log — click any row for diagnostic panel</p>
        </div>
        <button
          onClick={() => { setLoading(true); fetchAlerts() }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-panel p-4">
          <p className="stat-label">Total Alerts</p>
          <p className="stat-value mt-1">{alerts.length}</p>
        </div>
        <div className="glass-panel p-4 border-rose-500/20">
          <p className="stat-label text-rose-500">Critical</p>
          <p className="text-2xl font-bold text-rose-400 font-mono mt-1">{criticalCount}</p>
        </div>
        <div className="glass-panel p-4 border-amber-500/20">
          <p className="stat-label text-amber-500">Warning</p>
          <p className="text-2xl font-bold text-amber-400 font-mono mt-1">{warningCount}</p>
        </div>
      </div>

      {/* Severity filter */}
      <div className="flex items-center gap-2">
        {['all','CRITICAL','WARNING'].map(s => (
          <button key={s} onClick={() => setSeverityFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              severityFilter === s
                ? s === 'CRITICAL' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                  : s === 'WARNING' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'text-slate-500 border-transparent hover:text-slate-300'
            }`}>
            {s === 'all' ? 'All Alerts' : s}
          </button>
        ))}
      </div>

      {/* Alerts table */}
      <div className="glass-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              {['Severity','Patient','Sensor','Message','Timestamp'].map(h => (
                <th key={h} className="px-4 py-3 stat-label font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <AlertRowSkeleton key={i} />)
              : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3 text-slate-600">
                        <Bell className="w-10 h-10" />
                        <p>No alerts recorded yet</p>
                        <p className="text-xs">Anomalous readings will appear here automatically</p>
                      </div>
                    </td>
                  </tr>
                )
                : filtered.map((a, i) => (
                  <tr key={i}
                    onClick={() => { setSelected(a); setSelectedPatient(a.patient_id) }}
                    className="border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer transition-colors group">
                    <td className="px-4 py-3">
                      {a.severity === 'CRITICAL'
                        ? <span className="flex items-center gap-1.5 badge badge-rose"><AlertOctagon className="w-3 h-3" />CRITICAL</span>
                        : <span className="flex items-center gap-1.5 badge badge-amber"><AlertTriangle className="w-3 h-3" />WARNING</span>
                      }
                    </td>
                    <td className="px-4 py-3 text-slate-200 font-medium">{a.patient_id.replace('_',' ')}</td>
                    <td className="px-4 py-3"><span className="badge badge-cyan">{a.sensor_type.replace('_',' ')}</span></td>
                    <td className="px-4 py-3 text-slate-400 max-w-xs truncate">{a.message}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">
                      {format(new Date(a.timestamp), 'MMM d, HH:mm:ss')}
                    </td>
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>

      {/* Grafana drawer */}
      <GrafanaDrawer alert={selected} onClose={() => { setSelected(null); setSelectedPatient(null) }} />

      {/* Patient report drawer — opens alongside */}
      <PatientDrawer patientId={selectedPatient} onClose={() => setSelectedPatient(null)} />
    </div>
  )
}
