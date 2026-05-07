// Centralised API base URL - reads from env at build time, falls back to localhost
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
export const GRAFANA_BASE = import.meta.env.VITE_GRAFANA_BASE || 'http://localhost:3001';
export const PROMETHEUS_BASE = import.meta.env.VITE_PROMETHEUS_BASE || 'http://localhost:9090';

const apiUrl = new URL(API_BASE);
const appHost = `${apiUrl.protocol}//${apiUrl.hostname}`;
export const ANALYSIS_BASE = import.meta.env.VITE_ANALYSIS_BASE || `${appHost}:8002`;
export const DASHBOARD_BASE = import.meta.env.VITE_DASHBOARD_BASE || `${appHost}:8003`;
