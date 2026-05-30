import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { AGENTS, type Agent } from '~/lib/atlas-data'

interface AgentsContextValue {
  agents: Agent[]
  running: boolean
  runAgents: () => void
}

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined)

/** Provides shared "live agent" state. Run agents = cosmetic 2.4s busy animation. */
export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<Agent[]>(AGENTS)
  const [running, setRunning] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const runAgents = useCallback(() => {
    setRunning((isRunning) => {
      if (isRunning) return isRunning
      setAgents((a) => a.map((x) => ({ ...x, state: 'running', last: 'now' })))
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        setRunning(false)
        setAgents(AGENTS)
      }, 2400)
      return true
    })
  }, [])

  return <AgentsContext.Provider value={{ agents, running, runAgents }}>{children}</AgentsContext.Provider>
}

export function useAgents(): AgentsContextValue {
  const ctx = useContext(AgentsContext)
  if (!ctx) throw new Error('useAgents must be used within AgentsProvider')
  return ctx
}
