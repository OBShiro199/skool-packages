import type { JSX } from 'react'

/** One small brand mark per kit, keyed by slug. Drawn on a 24×24 grid; must read at 16px. */
export const MARKS: Record<string, (p: { size: number }) => JSX.Element> = {}
