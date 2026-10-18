import type { AppDef, Phase } from '../types'
import { buildPhases } from '../phases'
import { ethereel } from './ethereel'
import { outbounder } from './outbounder'
import { closebook, bookwell, helpdeck } from './previews'

export const APPS: AppDef[] = [ethereel, outbounder, closebook, bookwell, helpdeck]

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
