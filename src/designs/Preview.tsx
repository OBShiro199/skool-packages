import { useEffect, useRef, useState } from 'react'
import { asset } from './data'

/** A screenshot of the whole page that scrolls inside a browser frame: on hover in the grid, on a loop on the detail page. */
export function ScrollPreview({ slug, height, auto = false, active = false }: { slug: string; height: number; auto?: boolean; active?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const [frameH, setFrameH] = useState(0)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setFrameH(el.clientHeight * (720 / Math.max(1, el.clientWidth))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const travel = Math.max(0, height - frameH) // in 720-wide pixels
  const pct = height ? (travel / height) * 100 : 0
  const secs = Math.max(4, travel / 260)
  const reduce = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches
  const moving = !reduce && (auto || active) && loaded
  return (
    <div className="dz-frame">
      <div className="dz-bar"><i /><i /><i /></div>
      <div className="dz-view" ref={box}>
        <img
          src={asset(`${slug}-poster.webp`)}
          alt=""
          className="dz-poster"
          style={{ opacity: loaded ? 0 : 1 }}
          draggable={false}
        />
        <img
          src={asset(`${slug}.webp`)}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoaded(true)}
          className={`dz-shot ${auto && moving ? 'loop' : ''}`}
          style={
            auto
              ? ({ '--travel': `-${pct}%`, '--secs': `${secs * 2}s`, animationPlayState: moving ? 'running' : 'paused' } as React.CSSProperties)
              : { transform: `translateY(${moving ? -pct : 0}%)`, transition: `transform ${moving ? secs : 0.8}s ${moving ? 'linear' : 'cubic-bezier(.16,1,.3,1)'}` }
          }
        />
      </div>
    </div>
  )
}

export function SiteLogo({ name, logo, size = 40 }: { name: string; logo?: string; size?: number }) {
  const [bad, setBad] = useState(!logo)
  return (
    <span className="dz-logo" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {bad ? name.slice(0, 1) : <img src={logo} alt="" onError={() => setBad(true)} referrerPolicy="no-referrer" />}
    </span>
  )
}
