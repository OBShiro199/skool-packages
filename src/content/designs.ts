import quietPrecision from './QUIET_PRECISION.md?raw'

export interface Design {
  slug: string
  name: string
  tagline: string
  /** Who it suits, shown as chips. */
  tags: string[]
  /** Swatches for the card preview: the first is the background, the last the accent. */
  swatches: string[]
  font: string
  /** The full design system, in Markdown, to hand to Claude Code as DESIGN.md. */
  source: string
}

// Add a design: write its Markdown next to this file, import it with ?raw and add an entry below.
export const DESIGNS: Design[] = [
  {
    slug: 'quiet-precision',
    name: 'Quiet Precision',
    tagline: 'Calm white surfaces, hairlines, one pastel blue and Geist set close. The base for every app in the vault.',
    tags: ['B2B dashboards', 'Data tables', 'Light only'],
    swatches: ['#ffffff', '#e6e6e9', '#3c4149', '#08090a', '#5f86e0'],
    font: 'Geist',
    source: quietPrecision,
  },
]
