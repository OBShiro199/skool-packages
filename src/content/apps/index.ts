import type { AppDef, Phase } from '../types'
import { buildPhases } from '../phases'

// Only published kits are bundled, so a half-written kit in this folder can never break the build.
// To publish a kit: add its file here AND its slug to PUBLISHED below.
const modules = import.meta.glob<Record<string, unknown>>(
  ['./bookwell.ts', './helpdeck.ts', './signet.ts', './outbounder.ts', './folio.ts'],
  { eager: true },
)
const ORDER = ['etcher', 'factorie', 'ethereel', 'conversate', 'outbounder', 'signet', 'folio', 'bookwell', 'helpdeck']

/**
 * Kits shown to members. A kit is added here only after it is complete and checked, so
 * half-written kits in this folder never appear in the library.
 */
export const PUBLISHED = ['bookwell', 'helpdeck', 'signet', 'outbounder', 'folio']

const isApp = (v: unknown): v is AppDef => !!v && typeof v === 'object' && 'slug' in v && 'content' in v

export const APPS: AppDef[] = Object.entries(modules)
  .filter(([path]) => !path.endsWith('/index.ts'))
  .flatMap(([, mod]) => Object.values(mod).filter(isApp))
  .filter((a) => PUBLISHED.includes(a.slug))
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
