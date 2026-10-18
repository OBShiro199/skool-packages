import { useLayoutEffect, useRef, useState } from 'react'
import type { AppDef } from '../content/types'
import { PREVIEWS } from '../previews'
import { AppArt } from './AppArt'

export const STAGE_W = 1200
export const STAGE_H = 750

/** The kit's designed hero, scaled down from its 1200×750 stage to whatever width it is given. */
export function KitPreview({ app }: { app: AppDef }) {
  const Hero = PREVIEWS[app.slug]
  const box = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / STAGE_W))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  if (!Hero) return <AppArt app={app} />
  return (
    <div ref={box} className="kit-preview" role="img" aria-label={`${app.name} preview`}>
      <div className="kit-preview-stage" style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, visibility: scale ? 'visible' : 'hidden' }} aria-hidden>
        <Hero />
      </div>
    </div>
  )
}
