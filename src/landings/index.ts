import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * Example marketing site for each kit's fictional brand, built from that kit's landingPrd.
 * Each lives in src/landings/<slug>/index.tsx (default export) with styles scoped under .lp-<slug>.
 * Every folder that exists is picked up automatically.
 */
const modules = import.meta.glob<{ default: ComponentType }>('./*/index.tsx')

export const LANDINGS: Record<string, LazyExoticComponent<ComponentType>> = Object.fromEntries(
  Object.entries(modules).map(([path, load]) => [path.split('/')[1], lazy(load)]),
)

export const hasLanding = (slug: string) => slug in LANDINGS
