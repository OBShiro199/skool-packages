import type { AppDef } from '../content/types'
import { MARKS } from '../logos/marks'

/** The kit's brand mark, falling back to its initial in a soft tile. */
export function KitLogo({ app, size = 20 }: { app: Pick<AppDef, 'slug' | 'name'>; size?: number }) {
  const Mark = MARKS[app.slug]
  if (Mark) return <span className="kit-logo" style={{ width: size, height: size }} aria-hidden><Mark size={size} /></span>
  return <span className="kit-logo kit-logo-fallback" style={{ width: size, height: size, fontSize: Math.round(size * 0.5) }} aria-hidden>{app.name[0]}</span>
}
