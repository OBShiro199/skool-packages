import type { AppDef, Phase } from '../types'
import { buildPhases } from '../phases'

// Every top-level module in this folder that exports an AppDef becomes a kit.
const modules = import.meta.glob<Record<string, unknown>>('./*.ts', { eager: true })
const ORDER = ['etcher', 'factorie', 'ethereel', 'conversate', 'outbounder', 'bookwell', 'helpdeck']

const isApp = (v: unknown): v is AppDef => !!v && typeof v === 'object' && 'slug' in v && 'content' in v

export const APPS: AppDef[] = Object.entries(modules)
  .filter(([path]) => !path.endsWith('/index.ts'))
  .flatMap(([, mod]) => Object.values(mod).filter(isApp))
  .filter((a) => a.slug !== 'closebook') // replaced by Etcher
  .filter((a, i, all) => all.findIndex((b) => b.slug === a.slug) === i)
  .sort((a, b) => (ORDER.indexOf(a.slug) + 1 || 99) - (ORDER.indexOf(b.slug) + 1 || 99))

export function getApp(slug: string | undefined): AppDef | undefined {
  return APPS.find((a) => a.slug === slug)
}

const phaseCache = new Map<string, Phase[]>()
export function getPhases(app: AppDef): Phase[] {
  let p = phaseCache.get(app.slug)
  if (!p) {
    p = buildPhases(app)
    phaseCache.set(app.slug, p)
  }
  return p
}
