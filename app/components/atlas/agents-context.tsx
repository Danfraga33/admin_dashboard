import { createContext, useContext } from 'react'
import { AGENTS, type Agent } from '~/lib/atlas-data'

interface AgentsContextValue {
  agents: Agent[]
}

const AgentsContext = createContext<AgentsContextValue | undefined>(undefined)

/** Provides the shared agent list. Single-tenant, single agent (Scout). */
export function AgentsProvider({ children }: { children: React.ReactNode }) {
  return <AgentsContext.Provider value={{ agents: AGENTS }}>{children}</AgentsContext.Provider>
}

export function useAgents(): AgentsContextValue {
  const ctx = useContext(AgentsContext)
  if (!ctx) throw new Error('useAgents must be used within AgentsProvider')
  return ctx
}
