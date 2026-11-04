import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion } from 'motion/react'

/** A popover in a fixed-position portal so tables and scroll areas never clip it (PRD 12). */
export function Popover({ anchor, onClose, children, width = 300, label }: { anchor: HTMLElement | null; onClose: () => void; children: React.ReactNode; width?: number; label?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchor) return
    const place = () => {
      const r = anchor.getBoundingClientRect()
      const left = Math.min(Math.max(8, r.left), window.innerWidth - width - 8)
      setPos({ top: r.bottom + 6, left })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [anchor, width])

  useEffect(() => {
    const down = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || anchor?.contains(t)) return
      onClose()
    }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', down)
    document.addEventListener('keydown', key)
    return () => {
      document.removeEventListener('mousedown', down)
      document.removeEventListener('keydown', key)
    }
  }, [anchor, onClose])

  if (!pos) return null
  return createPortal(
    <motion.div
      ref={ref}
      role="dialog"
      aria-label={label}
      className="ld-pop"
      style={{ top: pos.top, left: pos.left, width, maxHeight: `calc(100vh - ${pos.top + 12}px)` }}
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>,
    document.body,
  )
}
