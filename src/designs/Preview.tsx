import { useEffect, useRef, useState } from 'react'
import { asset } from './data'

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) // easeInOutCubic
const rand = (a: number, b: number) => a + Math.random() * (b - a)

/**
 * The whole landing page inside a browser frame, scrolled the way a person reads it: a slow glide of
 * roughly half a screen, a pause to look, another glide, and so on to the bottom, then a long ease back
 * to the top. Runs on its own while the card is on screen; pauses off screen and for reduced motion.
 */
export function ScrollPreview({ slug, height }: { slug: string; height: number }) {
  const view = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = view.current, im = img.current
    if (!el || !im || !loaded) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let y = 0, raf = 0, timer = 0, visible = false, running = false
    const set = (v: number) => { y = v; im.style.transform = `translate3d(0, ${-v}px, 0)` }
    const max = () => Math.max(0, im.offsetHeight - el.clientHeight)
    const glide = (to: number, ms: number, then: () => void) => {
      const from = y, start = performance.now()
      const step = (now: number) => {
        if (!visible) { running = false; return }
        const t = Math.min(1, (now - start) / ms)
        set(from + (to - from) * ease(t))
        if (t < 1) raf = requestAnimationFrame(step)
        else then()
      }
      raf = requestAnimationFrame(step)
    }
    const next = () => {
      if (!visible) { running = false; return }
      running = true
      const m = max(), h = el.clientHeight
      if (m <= 0) { running = false; return }
      if (y >= m - 1) {
        // at the bottom: linger, then drift back to the top
        timer = window.setTimeout(() => glide(0, rand(2600, 3400), () => { timer = window.setTimeout(next, rand(1800, 2600)) }), rand(2000, 3000))
        return
      }
      const to = Math.min(m, y + h * rand(0.35, 0.65))
      glide(to, rand(1400, 2200), () => { timer = window.setTimeout(next, rand(900, 2200)) })
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !running) { running = true; timer = window.setTimeout(next, rand(400, 2400)) }
      if (!visible) { cancelAnimationFrame(raf); clearTimeout(timer); running = false }
    }, { threshold: 0.2 })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf); clearTimeout(timer) }
  }, [loaded, slug, height])

  return (
    <div className="dz-frame">
      <div className="dz-bar"><i /><i /><i /></div>
      <div className="dz-view" ref={view}>
        <img src={asset(`${slug}-poster.webp`)} alt="" className="dz-poster" style={{ opacity: loaded ? 0 : 1 }} draggable={false} />
        <img ref={img} src={asset(`${slug}.webp`)} alt="" loading="lazy" decoding="async" draggable={false} onLoad={() => setLoaded(true)} className="dz-shot" />
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
