import { createContext, useContext, useState, useCallback } from 'react'

const ToastCtx = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((msg, type = 'error') => {
    const id = Date.now()
    setToasts(t => [...t, { id, msg, type }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000)
  }, [])

  return (
    <ToastCtx.Provider value={{ toasts, addToast }}>
      {children}
    </ToastCtx.Provider>
  )
}

export const useToast = () => useContext(ToastCtx)
