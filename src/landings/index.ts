import { lazy, type ComponentType, type LazyExoticComponent } from 'react'

/**
 * Example marketing site for each kit's fictional brand, built from that kit's landingPrd.
 * Each lives in src/landings/<slug>/index.tsx (default export) with styles scoped under .lp-<slug>.
 * Only finished pages are listed, so a half-built page can never break the build.
 */
const modules = import.meta.glob<{ default: ComponentType }>([
  './bookwell/index.tsx', './helpdeck/index.tsx', './signet/index.tsx', './folio/index.tsx', './outbounder/index.tsx', './factorie/index.tsx', './etcher/index.tsx', './conversate/index.tsx', './ethereel/index.tsx', './echo/index.tsx', './tally/index.tsx', './harvest/index.tsx', './halo/index.tsx', './sparring/index.tsx', './marquee/index.tsx', './shortlist/index.tsx', './rota/index.tsx', './dossier/index.tsx', './quotient/index.tsx',
])

export const LANDINGS: Record<string, LazyExoticComponent<ComponentType>> = Object.fromEntries(
  Object.entries(modules).map(([path, load]) => [path.split('/')[1], lazy(load)]),
)

export const hasLanding = (slug: string) => slug in LANDINGS
