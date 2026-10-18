import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'

export interface SignaturePadHandle { clear: () => void; toDataURL: () => string; isEmpty: () => boolean }

/** Pointer-driven signature canvas with pressure-ish smoothing. Works with mouse, pen and touch. */
export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (empty: boolean) => void }>(function SignaturePad({ onChange }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const strokes = useRef(0)
  const last = useRef<{ x: number; y: number; t: number; w: number } | null>(null)

  const ink = () => getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#0F0F0F'

  const resize = () => {
    const c = canvas.current!
    const r = c.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    const prev = strokes.current ? c.toDataURL() : null
    c.width = r.width * dpr
    c.height = r.height * dpr
    const ctx = c.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (prev) { const img = new Image(); img.onload = () => ctx.drawImage(img, 0, 0, r.width, r.height); img.src = prev }
  }

  useEffect(() => {
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas.current!)
    return () => ro.disconnect()
  }, []) // eslint-disable-line

  useImperativeHandle(ref, () => ({
    clear: () => {
      const c = canvas.current!
      c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
      strokes.current = 0
      onChange?.(true)
    },
    toDataURL: () => canvas.current!.toDataURL('image/png'),
    isEmpty: () => strokes.current === 0,
  }))

  const pos = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }

  const down = (e: React.PointerEvent) => {
    e.preventDefault()
    canvas.current!.setPointerCapture(e.pointerId)
    const p = pos(e)
    last.current = { ...p, t: performance.now(), w: 2.6 }
    const ctx = canvas.current!.getContext('2d')!
    ctx.fillStyle = ink()
    ctx.beginPath(); ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2); ctx.fill()
  }

  const move = (e: React.PointerEvent) => {
    if (!last.current) return
    const p = pos(e)
    const now = performance.now()
    const l = last.current
    const dist = Math.hypot(p.x - l.x, p.y - l.y)
    const v = dist / Math.max(1, now - l.t)
    const target = e.pressure && e.pointerType === 'pen' ? 1 + e.pressure * 3 : Math.max(1.1, 3.2 - v * 1.4)
    const w = l.w * 0.7 + target * 0.3
    const ctx = canvas.current!.getContext('2d')!
    ctx.strokeStyle = ink()
    ctx.lineWidth = w
    ctx.beginPath()
    ctx.moveTo(l.x, l.y)
    ctx.quadraticCurveTo(l.x, l.y, (l.x + p.x) / 2, (l.y + p.y) / 2)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    last.current = { ...p, t: now, w }
  }

  const up = () => {
    if (!last.current) return
    last.current = null
    strokes.current++
    onChange?.(false)
  }

  return (
    <canvas ref={canvas} className="sig-canvas" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onPointerLeave={up}
      aria-label="Signature box. Draw your signature with a mouse, finger or pen." />
  )
})
