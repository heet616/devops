import { GRAFANA_BASE } from '../config'
import { ExternalLink, LayoutDashboard } from 'lucide-react'

const PANELS = [
  { title: 'Request Rate – All Services', panelId: 1 },
  { title: 'Ingestion Latency', panelId: 2 },
  { title: 'Live Patient Vital Values', panelId: 3 },
  { title: 'Alert Volume Over Time', panelId: 4 },
]

export default function GrafanaView() {
  const now = Date.now()
  const from = now - 30 * 60 * 1000   // last 30 min
  const to   = now
  const dashboardUid = 'mediot_main_dashboard'
  const dashboardSlug = 'mediot-analytics'

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Grafana Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">Embedded metric dashboards — last 30 minutes</p>
        </div>
        <a
          href={`${GRAFANA_BASE}/d/${dashboardUid}/${dashboardSlug}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-sm font-medium hover:bg-cyan-500/20 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          Open Full Grafana
        </a>
      </div>

      {/* Main full-height embed */}
      <div className="glass-panel overflow-hidden" style={{ height: '70vh' }}>
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-slate-800">
          <LayoutDashboard className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-slate-300">Main Dashboard</span>
          <span className="ml-auto text-xs text-slate-600 font-mono">
            {new Date(from).toLocaleTimeString()} → {new Date(to).toLocaleTimeString()}
          </span>
        </div>
        <iframe
          src={`${GRAFANA_BASE}/d/${dashboardUid}/${dashboardSlug}?orgId=1&from=${from}&to=${to}&theme=dark&kiosk=tv`}
          className="w-full"
          style={{ height: 'calc(100% - 45px)', border: 'none' }}
          title="Grafana Main Dashboard"
          allowFullScreen
        />
      </div>

      {/* Panel grid */}
      <div>
        <h2 className="text-base font-semibold text-slate-300 mb-3">Individual Panels</h2>
        <div className="grid grid-cols-2 gap-4">
          {PANELS.map(panel => (
            <div key={panel.panelId} className="glass-panel overflow-hidden" style={{ height: '280px' }}>
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800">
                <span className="text-xs font-medium text-slate-400">{panel.title}</span>
                <a
                  href={`${GRAFANA_BASE}/d-solo/${dashboardUid}/${dashboardSlug}?orgId=1&panelId=${panel.panelId}&from=${from}&to=${to}&theme=dark`}
                  target="_blank" rel="noreferrer"
                  className="text-slate-600 hover:text-cyan-400 transition-colors"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <iframe
                src={`${GRAFANA_BASE}/d-solo/${dashboardUid}/${dashboardSlug}?orgId=1&panelId=${panel.panelId}&from=${from}&to=${to}&theme=dark`}
                className="w-full"
                style={{ height: 'calc(100% - 41px)', border: 'none' }}
                title={panel.title}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
