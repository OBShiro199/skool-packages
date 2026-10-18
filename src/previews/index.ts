import type { ComponentType } from 'react'

/**
 * Hero previews, one per kit: a single designed hero composition (not the full landing page),
 * drawn on a fixed 1200×750 stage that KitPreview scales to fit. Explicit list so half-written
 * files never reach the build.
 */
const modules = import.meta.glob<{ default: ComponentType }>(['./marquee.tsx', './etcher.tsx', './harvest.tsx', './echo.tsx', './factorie.tsx', './ethereel.tsx', './tally.tsx', './halo.tsx'], { eager: true })

export const PREVIEWS: Record<string, ComponentType> = Object.fromEntries(
  Object.entries(modules).map(([path, m]) => [path.replace(/^\.\/(.+)\.tsx$/, '$1'), m.default]),
)
