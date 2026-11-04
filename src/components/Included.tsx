import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { BookOpen, Database, LayoutGrid, MessagesSquare, TrendingUp, Video } from 'lucide-react'
import { APPS } from '../content/apps'

/** Ticks every `ms`, unless the viewer prefers reduced motion. */
function useTick(ms: number) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setN((v) => v + 1), ms)
    return () => clearInterval(id)
  }, [ms, reduce])
  return n
}

function Tile({ icon: Icon, title, children }: { icon: typeof Database; title: string; children: React.ReactNode }) {
  return (
    <div className="inc-tile">
      <div className="inc-head">
        <Icon size={15} strokeWidth={1.5} aria-hidden />
        <span>{title}</span>
      </div>
      <div className="inc-body">{children}</div>
    </div>
  )
}

const leads = [
  ['a.bello@p•••••.io', 'Founder'],
  ['m.hale@n••••••d.io', 'Director'],
  ['p.raman@l•••••t.co', 'C-level'],
  ['d.whit@b••••••s.com', 'Director'],
  ['s.klein@v•••••l.io', 'Founder'],
  ['t.ade@k••••••q.com', 'Owner'],
]

function Leads() {
  const t = useTick(1400)
  const rows = [0, 1, 2].map((i) => leads[(t + i) % leads.length])
  return (
    <Tile icon={Database} title="10M+ verified B2B leads">
      <div className="inc-big num">10,000,000+</div>
      <div className="inc-rows">
        <AnimatePresence initial={false} mode="popLayout">
          {rows.map(([email, title]) => (
            <motion.div
              key={email}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="inc-lead"
            >
              <span className="inc-trunc">{email}</span>
              <span className="tag tag-blue">{title}</span>
              <span className="tag tag-green">Valid</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Tile>
  )
}

const weeks = ['Foundations', 'Build', 'First Customers', 'Growth', 'Retain & Scale']
const lessons = ['Validation', 'Pre-Selling', 'Core Feature', 'Auth, Data & Payments', 'Cold Email Scripts', 'Cold Calling', 'Paid Ads', 'SEO', 'Beating Churn', 'Exit Your SaaS']

function Curriculum() {
  const t = useTick(900)
  const step = t % (weeks.length + 2)
  return (
    <Tile icon={BookOpen} title="40-lesson course">
      <div className="inc-weeks">
        {weeks.map((w, i) => (
          <div key={w} className="inc-week">
            <div className="inc-week-bar">
              <motion.div className="inc-week-fill" animate={{ scaleX: i < step ? 1 : 0 }} transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }} />
            </div>
            <span>{w}</span>
          </div>
        ))}
      </div>
      <div className="inc-sub">
        Now:{' '}
        <AnimatePresence mode="wait">
          <motion.b key={t % lessons.length} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.2 }}>
            {lessons[t % lessons.length]}
          </motion.b>
        </AnimatePresence>
      </div>
    </Tile>
  )
}

function Apps() {
  const t = useTick(1600)
  const app = APPS[t % APPS.length]
  return (
    <Tile icon={LayoutGrid} title="20 apps ready to clone">
      <AnimatePresence mode="wait">
        <motion.div key={app.slug} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
          <img className="inc-thumb" src={`${import.meta.env.BASE_URL}apps/${app.slug}.webp`} alt="" width={480} height={300} />
          <div className="inc-app">{app.name}</div>
          <div className="inc-sub">You could charge <b>${app.price.monthly}+/mo</b></div>
        </motion.div>
      </AnimatePresence>
    </Tile>
  )
}

const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']

function Calls() {
  const t = useTick(1100)
  const on = t % days.length
  return (
    <Tile icon={Video} title="Daily live calls">
      <div className="inc-days">
        {days.map((d, i) => (
          <div key={d} className={`inc-day ${i === on ? 'on' : ''}`}>
            {i === on && <span className="live-dot" aria-hidden />}
            {d}
          </div>
        ))}
      </div>
      <div className="inc-sub">5pm UK · 1 hour · recorded</div>
    </Tile>
  )
}

function LiveBuild() {
  const reduce = useReducedMotion()
  const steps = [0, 4, 9, 15, 22, 30, 39, 50, 62, 75, 88, 100]
  let d = 'M 0 40'
  steps.forEach((v, i) => {
    if (i) d += ` H ${(i / (steps.length - 1)) * 200} V ${40 - (v / 100) * 36}`
  })
  return (
    <Tile icon={TrendingUp} title="Watch me build to $10K/month">
      <svg viewBox="0 0 200 44" className="inc-chart" aria-hidden>
        <motion.path
          d={d}
          fill="none"
          stroke="var(--q-blue)"
          strokeWidth="1.6"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={reduce ? { duration: 0 } : { duration: 3.2, ease: 'easeInOut', repeat: Infinity, repeatDelay: 1.2 }}
        />
      </svg>
      <div className="inc-sub">Every cold email, call, ad and churn save, live</div>
    </Tile>
  )
}

const questions = ['How do I price my first plan?', 'Is my cold email too long?', 'Supabase or Firebase?', 'How do I handle churn?']

function QA() {
  const t = useTick(2200)
  return (
    <Tile icon={MessagesSquare} title="Unlimited Q&A">
      <AnimatePresence mode="wait">
        <motion.div key={t % questions.length} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.3 }} className="inc-bubble">
          {questions[t % questions.length]}
        </motion.div>
      </AnimatePresence>
      <div className="inc-sub">Every post answered within 24 hours</div>
    </Tile>
  )
}

/** Six moving tiles showing what the community includes. */
export function Included() {
  return (
    <div className="inc-grid">
      <Leads />
      <Curriculum />
      <LiveBuild />
      <Calls />
      <Apps />
      <QA />
    </div>
  )
}
