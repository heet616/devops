import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import AlertsEngine from './pages/AlertsEngine'
import GrafanaView from './pages/GrafanaView'
import Observability from './pages/Observability'
import Toast from './components/Toast'
import { ToastProvider } from './context/ToastContext'

export default function App() {
  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alerts" element={<AlertsEngine />} />
            <Route path="/grafana" element={<GrafanaView />} />
            <Route path="/observability" element={<Observability />} />
          </Routes>
        </main>
      </div>
      <Toast />
    </ToastProvider>
  )
}
