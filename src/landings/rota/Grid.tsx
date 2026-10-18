import { motion } from 'motion/react'
import { AlertTriangle } from 'lucide-react'
import { Chip, DAYS, EASE, type Role } from './shared'

/* The rota builder grid, drawn in code. Used by the hero, the demo and the draft tile. */

export type Row = { name: string; role: Role; label: string; cells: string[] }
export const WEEK: Row[] = [
  { name: 'Ama', role: 'barista', label: 'Barista', cells: ['06-14', '06-14', '', '06-14', '06-14', '07-15', ''] },
  { name: 'Leo', role: 'kitchen', label: 'Kitchen', cells: ['08-16', '', '08-16', '08-16', '10-18', '10-18', ''] },
  { name: 'Mia', role: 'floor', label: 'Floor', cells: ['', '11-19', '11-19', '', '11-19', '09-17', '09-17'] },
  { name: 'Sam', role: 'barista', label: 'Barista', cells: ['14-22', '14-22', '14-22', '', '', '08-16', '08-16'] },
  { name: 'Jo', role: 'bar', label: 'Bar', cells: ['', '', '', '17-23', '17-23', '', ''] },
]
export const OPEN = ['', '', '', '', '', '12-18', '10-16']
export const DATES = [20, 21, 22, 23, 24, 25, 26]

/**
 * phase: 0 blank, 1 ghost chips drawn in, 2 published (solid).
 * clash: highlight one cell (row, day) with the coral conflict edge.
 */
export function RotaGrid({
  phase, animate = true, clash, compact = false, rows = WEEK, showOpen = true,
}: { phase: 0 | 1 | 2; animate?: boolean; clash?: [number, number]; compact?: boolean; rows?: Row[]; showOpen?: boolean }) {
  return (
    <div className={`rt-grid ${compact ? 'is-compact' : ''}`} role="presentation">
      <div className="rt-grid-row is-head">
        <span className="rt-grid-name" />
        {DAYS.map((d, i) => (
          <span key={d} className={`rt-grid-day ${i === 0 ? 'is-today' : ''}`}>{d}<b>{DATES[i]}</b></span>
        ))}
      </div>
      {rows.map((r, ri) => (
        <div className="rt-grid-row" key={r.name}>
          <span className="rt-grid-name"><i className={`rt-dot is-${r.role}`} />{r.name}{!compact && <em>{r.label}</em>}</span>
          {r.cells.map((c, ci) => {
            const isClash = clash && clash[0] === ri && clash[1] === ci
            return (
              <span key={ci} className={`rt-cell ${isClash ? 'is-clash' : ''}`}>
                {c && phase > 0 && (
                  <motion.span
                    initial={animate ? { opacity: 0, y: 4 } : false}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: animate ? ci * 0.12 + ri * 0.025 : 0, ease: EASE }}
                    className="rt-cell-in"
                  >
                    <Chip role={r.role} ghost={phase === 1} conflict={isClash ? 'block' : undefined}>
                      {c}{isClash && <AlertTriangle size={10} strokeWidth={2} aria-hidden="true" />}
                    </Chip>
                  </motion.span>
                )}
              </span>
            )
          })}
        </div>
      ))}
      {showOpen && (
        <div className="rt-grid-row is-open">
          <span className="rt-grid-name"><i className="rt-dot is-open" />Open</span>
          {OPEN.map((c, ci) => (
            <span key={ci} className="rt-cell">
              {c && phase > 0 && (
                <motion.span
                  initial={animate ? { opacity: 0, y: 4 } : false}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: animate ? ci * 0.12 + 0.15 : 0, ease: EASE }}
                  className="rt-cell-in"
                >
                  <Chip role="barista" open>{c}</Chip>
                </motion.span>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
