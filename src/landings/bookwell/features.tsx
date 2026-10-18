import { useMemo, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Check, CreditCard, Smartphone, Wallet } from 'lucide-react'
import { CountUp, EASE, MORPH, Reveal, SectionHead, useLoop } from './parts'

/* ---------- 7.1 Deposits ---------- */
const PAYERS = [
  { n: 'Jordan', how: 'Apple Pay', Icon: Smartphone },
  { n: 'Priya', how: 'Google Pay', Icon: Wallet },
  { n: 'Sam', how: 'Card', Icon: CreditCard },
  { n: 'Alex', how: 'Apple Pay', Icon: Smartphone },
  { n: 'Mo', how: 'Card', Icon: CreditCard },
]
function DepositVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  const { ref: loopRef, step } = useLoop(PAYERS.length, 2200, 2)
  const rows = [0, 1, 2].map((k) => ({ ...PAYERS[(step - k + PAYERS.length * 2) % PAYERS.length], id: step - k }))
  const pct = 10 / 35
  const on = inView || !!reduce
  return (
    <div className="bw-vis bw-dep" ref={ref} role="img" aria-label="Service editor for Skin fade, 45 minutes, $35, with the deposit slider at $10 of $35">
      <div className="bw-dep-editor" aria-hidden="true">
        <div className="bw-dep-fields">
          <span><small>Service</small><b>Skin fade</b></span>
          <span><small>Length</small><b>45 min</b></span>
          <span><small>Price</small><b>$35</b></span>
        </div>
        <div className="bw-dep-label"><small>Deposit</small><b>{on ? <CountUp to={10} ms={800} prefix="$" /> : '$0'} <em>of $35</em></b></div>
        <div className="bw-slider">
          <motion.i className="bw-slider-fill" initial={{ scaleX: 0 }} animate={{ scaleX: on ? pct : 0 }} transition={{ duration: reduce ? 0 : 0.8, ease: MORPH }} />
          <motion.span className="bw-slider-rail" initial={{ x: '0%' }} animate={{ x: on ? `${pct * 100}%` : '0%' }} transition={{ duration: reduce ? 0 : 0.8, ease: MORPH }}>
            <b className="bw-slider-thumb" />
          </motion.span>
        </div>
        <div className="bw-slider-scale"><span>$0</span><span>$35</span></div>
      </div>
      <div className="bw-ledger" ref={loopRef} aria-hidden="true">
        <span className="bw-ledger-h">Deposits today</span>
        <ul>
          <AnimatePresence initial={false} mode="popLayout">
            {rows.map((r) => (
              <motion.li key={r.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.4, ease: EASE }}>
                <span className="bw-ledger-ico"><r.Icon size={12} /></span>
                <span>{r.n}<small>{r.how}</small></span>
                <b>+$10</b>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </div>
    </div>
  )
}

/* ---------- 7.2 Reminders ---------- */
function ReminderVisual() {
  const { ref, step } = useLoop(5, 1100, 3)
  return (
    <div className="bw-vis bw-lock" ref={ref} role="img" aria-label="Phone lock screen with a booking confirmation text and a reminder text from Fade Room">
      <div className="bw-lock-time" aria-hidden="true"><b>18:00</b><small>Tuesday 20 October</small></div>
      <div className="bw-lock-stack" aria-hidden="true">
        <Bubble show={step < 4} title="Fade Room · Wed">You are booked: Skin fade, Wed 21 Oct, 14:30. Change or cancel: bookwell.app/c/8f2k</Bubble>
        {step === 1 && <span className="bw-typing"><i /><i /><i /></span>}
        <Bubble show={step === 2 || step === 3} title="Fade Room · now">Reminder: Skin fade at Fade Room tomorrow 14:30. Cancel: bookwell.app/c/8f2k</Bubble>
      </div>
    </div>
  )
}
function Bubble({ show, title, children }: { show: boolean; title: string; children: ReactNode }) {
  return (
    <motion.div className="bw-bubble" initial={false} animate={show ? { opacity: 1, x: 0 } : { opacity: 0, x: 24 }} transition={{ duration: 0.42, ease: EASE }}>
      <small>{title}</small>
      <span>{children}</span>
    </motion.div>
  )
}

/* ---------- 7.3 Calendar ---------- */
const BUSY = [{ d: 0, s: 0, l: 2, t: 'Busy' }, { d: 2, s: 3, l: 1.5, t: 'Busy' }, { d: 4, s: 5, l: 2, t: 'Busy' }, { d: 1, s: 6.5, l: 1, t: 'Busy' }]
const BOOKED = [
  { d: 0, s: 3.5, l: 0.75, t: 'Sam', h: '12:30' },
  { d: 1, s: 1, l: 0.75, t: 'Priya', h: '10:00' },
  { d: 2, s: 5.5, l: 0.75, t: 'Jordan', h: '14:30' },
  { d: 3, s: 2, l: 1, t: 'Alex', h: '11:00' },
  { d: 4, s: 1, l: 0.75, t: 'Mo', h: '10:00' },
  { d: 3, s: 6, l: 0.75, t: 'Lee', h: '15:00' },
]
function CalendarVisual() {
  const { ref, step } = useLoop(BOOKED.length + 3, 650, BOOKED.length + 2)
  const H = 100 / 8
  return (
    <div className="bw-vis bw-week" ref={ref} role="img" aria-label="Week view with grey busy blocks from Google Calendar and amber Bookwell bookings">
      <div className="bw-week-head" aria-hidden="true">
        {['Mon 19', 'Tue 20', 'Wed 21', 'Thu 22', 'Fri 23'].map((d) => <span key={d}>{d}</span>)}
      </div>
      <div className="bw-week-grid" aria-hidden="true">
        <div className="bw-week-hours">{['9', '10', '11', '12', '13', '14', '15', '16'].map((h) => <span key={h}>{h}</span>)}</div>
        <div className="bw-week-cols">
          {[0, 1, 2, 3, 4].map((d) => (
            <div key={d} className="bw-week-col">
              {BUSY.filter((b) => b.d === d).map((b, i) => (
                <span key={i} className="bw-ev busy" style={{ top: `${b.s * H}%`, height: `${b.l * H}%` }}>{b.t}</span>
              ))}
              {BOOKED.map((b, i) => b.d === d && (
                <motion.span
                  key={i}
                  className="bw-ev booked"
                  style={{ top: `${b.s * H}%`, height: `${b.l * H}%` }}
                  initial={false}
                  animate={i < step ? { opacity: 1, y: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.36, ease: EASE }}
                >
                  <b>{b.t}</b><small>{b.h}</small>
                </motion.span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------- 7.4 Your booking link ---------- */
function qrCells() {
  const N = 21
  const cells: boolean[] = []
  let seed = 7
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
  const finder = (r: number, c: number) => {
    for (const [fr, fc] of [[0, 0], [0, N - 7], [N - 7, 0]]) {
      const y = r - fr, x = c - fc
      if (y >= 0 && y < 7 && x >= 0 && x < 7) {
        const ring = Math.min(y, x, 6 - y, 6 - x)
        return ring === 0 || ring >= 2 ? 1 : 0
      }
      if (y >= -1 && y <= 7 && x >= -1 && x <= 7) return 0
    }
    return -1
  }
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const f = finder(r, c)
    cells.push(f === -1 ? rnd() > 0.52 : f === 1)
  }
  return cells
}
function QrVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.5 })
  const cells = useMemo(qrCells, [])
  return (
    <div className="bw-vis bw-window" ref={ref} role="img" aria-label="A printed QR code poster in a shop window that links to bookwell.app/b/fade-room">
      <div className="bw-window-glare" aria-hidden="true" />
      <div className="bw-poster" aria-hidden="true">
        <small>Book online</small>
        <b>Fade Room</b>
        <div className={`bw-qr${inView ? ' on' : ''}`}>
          {cells.map((on, i) => <i key={i} className={on ? 'k' : ''} style={{ animationDelay: `${Math.round((i / cells.length) * 600)}ms` }} />)}
        </div>
        <span className="bw-poster-url">bookwell.app/b/fade-room</span>
      </div>
    </div>
  )
}

/* ---------- 7.5 No double bookings ---------- */
function ClashVisual() {
  const { ref, step } = useLoop(3, 1700, 2)
  const reduce = useReducedMotion()
  const done = step >= 1
  return (
    <div className="bw-vis bw-duo" ref={ref} role="img" aria-label="Two phones: one shows Booked for 14:30, the other says that slot was taken a moment ago and offers 15:15">
      <div className="bw-mphone" aria-hidden="true">
        <small>Customer A</small>
        {!done ? <span className="bw-slot sel tap">14:30</span> : (
          <motion.span className="bw-mres ok" initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: EASE }}>
            <Check size={14} strokeWidth={3} /> Booked · 14:30
          </motion.span>
        )}
      </div>
      <div className="bw-duo-vs" aria-hidden="true"><span>same moment</span></div>
      <motion.div
        className="bw-mphone"
        aria-hidden="true"
        animate={done && !reduce && step === 1 ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }}
        transition={{ duration: 0.45, ease: EASE }}
      >
        <small>Customer B</small>
        {!done ? <span className="bw-slot sel tap">14:30</span> : (
          <motion.span className="bw-mres taken" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
            That slot was taken a moment ago
            <em>Next free: 15:15</em>
          </motion.span>
        )}
      </motion.div>
    </div>
  )
}

/* ---------- Bento ---------- */
type Feature = { id: string; eyebrow: string; h: string; body: string; bullets: string[]; vis: ReactNode; size: string }
const FEATURES: Feature[] = [
  {
    id: 'deposits', eyebrow: 'Deposits', h: 'People turn up when they have paid.', size: 'w4',
    body: 'Set a deposit per service, from $0 to the full price. Customers pay by card when they book. The money goes straight to your own Stripe account and your bank.',
    bullets: ['Deposit per service', 'Apple Pay and Google Pay', 'Paid out to your bank by Stripe'], vis: <DepositVisual />,
  },
  {
    id: 'reminders', eyebrow: 'Reminders', h: 'A text the day before. Sent for you.', size: 'w2',
    body: 'Every customer gets a confirmation text and a reminder 24 hours before, with a link to change or cancel. Cancelled slots open up again on your page.',
    bullets: ['Confirmation and reminder texts', 'One-tap cancel link', 'Freed slots go back on sale'], vis: <ReminderVisual />,
  },
  {
    id: 'page', eyebrow: 'Your page', h: 'One link for your bio, your window and your WhatsApp.', size: 'w2',
    body: 'You get bookwell.app/b/yourname plus a QR code to print for the shop window or the mirror.',
    bullets: ['Custom link', 'Printable QR code', 'Looks good on cheap phones'], vis: <QrVisual />,
  },
  {
    id: 'calendar', eyebrow: 'Calendar', h: 'Your Google Calendar stays the boss.', size: 'w4',
    body: 'Connect Google Calendar once. Anything already in it blocks those times on your booking page, and every new booking appears in it with the customer’s name and number.',
    bullets: ['Busy times block slots', 'Bookings added automatically', 'Works on your phone’s calendar app'], vis: <CalendarVisual />,
  },
  {
    id: 'clash', eyebrow: 'Peace of mind', h: 'Two people can never grab the same slot.', size: 'w6',
    body: 'If two customers tap 14:30 at the same moment, only one gets it. The other is offered the next free time. No awkward phone calls.',
    bullets: ['Live availability', 'Buffer time between clients', 'Days off in two taps'], vis: <ClashVisual />,
  },
]

export function Features() {
  return (
    <section className="bw-sec bw-bg" id="features" aria-labelledby="bw-features-h">
      <div className="bw-wrap">
        <SectionHead center eyebrow="Features" title={<span id="bw-features-h">Bookwell does the five things you need.</span>} />
        <div className="bw-bento">
          {FEATURES.map((f, i) => (
            <Reveal as="article" key={f.id} className={`bw-tile bw-feat bw-${f.size}`} delay={(i % 2) * 0.07}>
              {f.vis}
              <div className="bw-feat-copy">
                <span className="bw-eyebrow"><i />{f.eyebrow}</span>
                <h3>{f.h}</h3>
                <p>{f.body}</p>
                <ul className="bw-ticks">
                  {f.bullets.map((b) => <li key={b}><Check size={14} strokeWidth={2.6} aria-hidden="true" />{b}</li>)}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

