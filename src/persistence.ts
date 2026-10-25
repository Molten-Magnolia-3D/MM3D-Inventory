import { seedListings } from './listings'
import type { Property } from './types'

const KEY = 'mm3d-homestead-projects-v1'

export function loadProjects(): Property[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return seedListings()
    const parsed = JSON.parse(raw) as Property[]
    if (!Array.isArray(parsed) || parsed.length === 0) return seedListings()
    return parsed
  } catch {
    return seedListings()
  }
}

export function saveProjects(projects: Property[]): void {
  localStorage.setItem(KEY, JSON.stringify(projects))
}

export function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'listing'
}
