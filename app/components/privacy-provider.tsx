import { createContext, useContext, useEffect, useState } from 'react'

interface PrivacyContextValue {
  hidden: boolean
  toggle: () => void
}

const PrivacyContext = createContext<PrivacyContextValue | undefined>(undefined)

const STORAGE_KEY = 'atlas-privacy'

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  // Server renders visible; localStorage is synced after hydration to avoid a mismatch
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setHidden(localStorage.getItem(STORAGE_KEY) === 'hidden')
  }, [])

  function toggle() {
    setHidden((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, next ? 'hidden' : 'visible')
      return next
    })
  }

  return <PrivacyContext.Provider value={{ hidden, toggle }}>{children}</PrivacyContext.Provider>
}

export function usePrivacy() {
  const ctx = useContext(PrivacyContext)
  if (!ctx) throw new Error('usePrivacy must be used within PrivacyProvider')
  return ctx
}
