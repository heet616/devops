// Centralised API base URL - reads from env at build time, falls back to localhost
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
export const GRAFANA_BASE = "http://localhost:3001/d/mediot_main_dashboard";
