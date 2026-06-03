/** Client-safe types and constants for SaaS events. No server-only code here. */

export const REGIONS_FILTER = ['USA', 'Canada', 'Australia', 'Europe'] as const
export type Region = 'USA' | 'Canada' | 'Australia' | 'Europe' | 'Online' | 'Other'

export const DOMAINS_FILTER = ['SaaS', 'Ecommerce', 'AI Coding'] as const
export type Domain = 'SaaS' | 'Ecommerce' | 'AI Coding'

export interface SaasEvent {
  id: string
  name: string
  date: string // ISO YYYY-MM-DD
  location: string
  region: Region
  domain: Domain
  format: string // in-person | virtual | hybrid
  url: string
  category: string
  desc: string
}

export interface SaasEventsResult {
  events: SaasEvent[]
  fetchedAt: string
  stale: boolean
}
