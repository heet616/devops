import { NavLink } from 'react-router-dom'
import { Activity, Bell, Cpu, Radio, Clock, LayoutDashboard, Server } from 'lucide-react'
import { useState, useEffect } from 'react'
import { API_BASE } from '../config'

export default function Sidebar() {
  const [time, setTime] = useState(new Date())
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const tick = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    const check = async () => {
      try {
        await fetch(`${API_BASE}/metrics`, { signal: AbortSignal.timeout(2000), mode: 'no-cors' })
        setOnline(true)
      } catch {
        setOnline(false)
      }
    }
    check()
    const interval = setInterval(check, 10000)
    return () => clearInterval(interval)
  }, [])

  const navItem = (to, Icon, label, end = false) => (
    <NavLink to={to} end={end} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
      <Icon className="w-4 h-4" />
      {label}
    </NavLink>
  )

  return (
    <aside className="w-64 flex-shrink-0 h-screen glass-panel-dark border-r border-slate-800/60 flex flex-col p-4 gap-2">
      {/* Logo */}
      <div className="flex items-center gap-3 px-2 py-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
          <Activity className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <div className="text-sm font-bold text-slate-100 leading-none">MedIoT</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">COMMAND CENTER</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1 flex-1">
        <p className="stat-label px-3 mb-1 mt-2">Navigation</p>
        {navItem('/', Cpu, 'Dashboard', true)}
        {navItem('/alerts', Bell, 'Alerts Engine')}
        {navItem('/grafana', LayoutDashboard, 'Grafana')}
        {navItem('/observability', Server, 'Observability')}
      </nav>

      {/* Status footer */}
      <div className="glass-panel p-3 mt-auto space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Radio className="w-3 h-3" />
            API Status
          </div>
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${online ? 'text-emerald-400' : 'text-rose-400'}`}>
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
            {online ? 'ONLINE' : 'OFFLINE'}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3 h-3" />
            System Time
          </div>
          <span className="text-xs font-mono text-cyan-400">
            {time.toLocaleTimeString()}
          </span>
        </div>
        <div className="text-[10px] text-slate-600 text-center font-mono pt-1 border-t border-slate-800">
          {time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </div>
      </div>
    </aside>
  )
}
