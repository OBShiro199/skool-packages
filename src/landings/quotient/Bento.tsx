import { type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Copy, MousePointer2, ScanSearch, MessageSquare, Mail, BellRing, CalendarCheck } from 'lucide-react'
import { EASE, Example, MORPH, Pill, Reveal, SectionHead, useLoop } from './shared'

function Tile({ span, eyebrow, title, body, bullets, label, children, delay = 0 }: {
  span: 2 | 3 | 4; eyebrow: string; title: string; body: string; bullets: string[]; label: string; children: ReactNode; delay?: number
}) {
  return (
    <Reveal className={`qt-tile qt-span-${span}`} delay={delay}>
      <div className="qt-tile-vis" role="img" aria-label={label}>{children}</div>
      <div className="qt-tile-text">
        <span className="qt-kicker">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{body}</p>
        <ul className="qt-ticks">{bullets.map((b) => <li key={b}><Check size={14} aria-hidden="true" />{b}</li>)}</ul>
      </div>
    </Reveal>
  )
}

const r5d = (n: number) => Math.floor(n / 5) * 5
const r5u = (n: number) => Math.ceil(n / 5) * 5

/* 7.1 Builder rule rows with a phone preview whose price follows the bedroom count. */
function RulesVis() {
  const { ref, step } = useLoop(4, 1600, 2)
  const beds = step + 1
  const mid = Math.max(70, (40 + beds * 30) * 1.4)
  return (
    <div ref={ref} className="qt-rules-vis">
      <div className="qt-rules-list">
        <div className="qt-rules-tabs"><span>Questions</span><span className="is-on">Pricing</span><span>Zones</span></div>
        {[
          ['Call-out base', 'Fixed', '£40', false],
          ['Bedrooms', 'Per room', '£30', true],
          ['Deep clean', 'Multiplier', 'x 1.4', false],
          ['Minimum charge', 'Floor', '£70', false],
          ['SW11, SW6', 'Zone B', '+£10', false],
        ].map(([l, k, v, live]) => (
          <div key={l as string} className={`qt-rule${live ? ' is-on' : ''}`}>
            <span>{l}<small>{k}</small></span><b className="qt-num">{v}</b>
          </div>
        ))}
        <div className="qt-rules-range"><span>Range</span><b>-0% / +25%, rounded to £5</b></div>
      </div>
      <div className="qt-mini-phone">
        <span className="qt-faint">Bedrooms</span>
        <div className="qt-mini-opts">{[1, 2, 3, 4].map((n) => <span key={n} className={n === beds ? 'is-on' : ''}>{n}</span>)}</div>
        <span className="qt-faint">Deep clean · SW15</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.b key={beds} className="qt-num qt-mini-price" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: MORPH }}>
            £{r5d(mid)} to £{r5u(mid * 1.25)}
          </motion.b>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* 7.2 One snippet over a blurred trades website; the cursor copies it. */
function SnippetVis() {
  const { ref, step } = useLoop(4, 1100, 2)
  const copied = step >= 2
  return (
    <div ref={ref} className="qt-snip-vis">
      <div className="qt-fake-site" aria-hidden="true"><i /><i /><i /><i /></div>
      <div className="qt-snip">
        <div className="qt-snip-top">
          <span>Embed snippet</span>
          <span className={`qt-snip-btn${copied ? ' is-on' : ''}`}>{copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}</span>
        </div>
        <code>{'<script src="https://quotient.app/w.js" data-quote="sparkle" async></script>'}</code>
        <div className="qt-snip-chips">{['Wix', 'Squarespace', 'WordPress', 'Webflow'].map((c) => <span key={c}>{c}</span>)}</div>
      </div>
      <motion.span className="qt-cursor" initial={false} animate={{ x: step >= 1 ? 0 : -60, y: step >= 1 ? 0 : 40, scale: step === 1 ? 0.9 : 1 }} transition={{ duration: 0.5, ease: EASE }}>
        <MousePointer2 size={16} />
      </motion.span>
    </div>
  )
}

/* 7.3 Photo to quote: three photos are checked, then the AI note lands. The price never moves. */
function PhotoVis() {
  const { ref, step } = useLoop(6, 1100, 5)
  const scanning = step >= 1 && step <= 3
  return (
    <div ref={ref} className="qt-photo-vis">
      <div className="qt-photos">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`qt-ph qt-ph-${i}${step > i + 1 ? ' is-done' : ''}`}>
            <span className="qt-ph-art" />
            {scanning && step === i + 1 && <motion.i className="qt-scan" initial={{ y: '-10%' }} animate={{ y: '110%' }} transition={{ duration: 1, ease: 'linear' }} />}
            {step > i + 1 && <span className="qt-ph-ok"><Check size={11} /></span>}
          </div>
        ))}
      </div>
      <div className="qt-ai-slot">
        <div className="qt-ai-status">
          {scanning ? <><i className="qt-dot qt-dot-live" />Checking photo {step} of 3</> : step === 0 ? <span className="qt-faint">3 photos added</span> : <><ScanSearch size={14} /> Photo check done</>}
        </div>
        <motion.div className="qt-ai-note" initial={false} animate={{ opacity: step >= 4 ? 1 : 0, y: step >= 4 ? 0 : 6 }} transition={{ duration: 0.36, ease: EASE }}>
          <Pill tone="coral"><ScanSearch size={12} /> Survey suggested</Pill>
          <ul>
            <li>Photos show 4 bedrooms, customer said 2</li>
            <li>Oven looks heavily used; oven clean not ticked</li>
          </ul>
          <span className="qt-ai-price">Price unchanged · <b className="qt-num">£100 to £125</b></span>
        </motion.div>
      </div>
    </div>
  )
}

/* 7.4 Booking calendar: the cursor picks Thursday 10:00, then the deposit lands. */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const TIMES = ['09:00', '10:00', '13:00', '15:00']
const BUSY = new Set(['Mon-09:00', 'Mon-13:00', 'Tue-10:00', 'Wed-09:00', 'Wed-15:00', 'Thu-13:00', 'Fri-10:00', 'Sat-13:00', 'Sat-15:00', 'Tue-15:00'])
function CalendarVis() {
  const { ref, step } = useLoop(5, 1000, 4)
  const picked = step >= 2
  return (
    <div ref={ref} className="qt-cal-vis">
      <div className="qt-cal-head"><b>Your hours</b><span className="qt-faint">Week of 2 Nov</span></div>
      <div className="qt-cal">
        <span />
        {DAYS.map((d) => <span key={d} className="qt-cal-day">{d}</span>)}
        {TIMES.map((t) => (
          <div key={t} className="qt-cal-row">
            <span className="qt-cal-time qt-num">{t}</span>
            {DAYS.map((d) => {
              const k = `${d}-${t}`
              const busy = BUSY.has(k)
              const on = picked && k === 'Thu-10:00'
              const hover = step === 1 && k === 'Thu-10:00'
              return <span key={k} className={`qt-cal-cell${busy ? ' is-busy' : ''}${on ? ' is-on' : ''}${hover ? ' is-hover' : ''}`}>{on ? '10:00' : ''}</span>
            })}
          </div>
        ))}
      </div>
      <div className="qt-cal-foot">
        <span><CalendarCheck size={14} /> {picked ? 'Thu 10:00 · Deep clean' : 'Pick a slot'}</span>
        <span style={{ visibility: step >= 3 ? 'visible' : 'hidden' }}><Pill tone="green" dot>Deposit paid</Pill></span>
      </div>
    </div>
  )
}

/* 7.5 Follow-ups that stop the moment the customer books. */
const FOLLOW = [
  { icon: MessageSquare, label: 'Text after 2 hours' },
  { icon: Mail, label: 'Email after 2 days' },
  { icon: BellRing, label: 'Last nudge after 5 days' },
]
function FollowVis() {
  const { ref, step } = useLoop(5, 1200, 3)
  const booked = step >= 3
  return (
    <div ref={ref} className="qt-follow-vis">
      <div className="qt-sms">Hi Sam, your Sparkle Cleaning price is £180 to £230. Pick a time here: quotient.app/q/sparkle</div>
      <ol className="qt-follow">
        {FOLLOW.map(({ icon: I, label }, i) => {
          const state = booked && i >= 2 ? 'stopped' : step > i ? 'sent' : 'wait'
          return (
            <li key={label} className={`is-${state}`}>
              <span className="qt-follow-ic"><I size={13} /></span>
              <span>{label}</span>
              <span className="qt-follow-st">{state === 'sent' ? 'Sent' : state === 'stopped' ? 'Stopped' : 'Waiting'}</span>
            </li>
          )
        })}
      </ol>
      <div className="qt-follow-foot" style={{ visibility: booked ? 'visible' : 'hidden' }}><Pill tone="blue" dot>Booked · follow-ups stopped</Pill></div>
    </div>
  )
}

/* 7.6 Leads inbox with status pills and analytics tiles. */
const ROWS: [string, string, number][] = [['S. Lee', '3 bed deep clean', 0], ['A. Novak', 'Window clean', 1], ['T. Brown', 'Oven clean', 2], ['K. Evans', 'End of tenancy', 3]]
const STATUSES: ['amber' | 'accent' | 'blue' | 'green' | 'grey', string][] = [['amber', 'New'], ['accent', 'Quoted'], ['blue', 'Booked'], ['green', 'Won'], ['grey', 'Lost']]
function InboxVis() {
  const { ref, step } = useLoop(4, 1400, 3)
  return (
    <div ref={ref} className="qt-inbox-vis">
      <div className="qt-inbox-filter">{STATUSES.map(([t, l]) => <Pill key={l} tone={t} dot>{l}</Pill>)}</div>
      <div className="qt-inbox-list">
        {ROWS.map(([n, j, s]) => {
          const st = STATUSES[Math.min(4, (s + step) % 4)]
          return (
            <div key={n} className="qt-inbox-li">
              <span className="qt-ink">{n}</span><span className="qt-faint">{j}</span>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span key={st[1]} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}><Pill tone={st[0]} dot>{st[1]}</Pill></motion.span>
              </AnimatePresence>
            </div>
          )
        })}
      </div>
      <div className="qt-stats">
        <div><small>Quote to booking</small><b className="qt-num">38%</b></div>
        <div><small>Average job value</small><b className="qt-num">£164</b></div>
        <div><small>Top source</small><b>Google</b></div>
      </div>
      <Example />
    </div>
  )
}

export function Features() {
  return (
    <section className="qt-section qt-band" id="features">
      <div className="qt-rail">
        <SectionHead eyebrow="Features" title="What Quotient does" center />
        <div className="qt-bento">
          <Tile span={4} eyebrow="Calculator builder" title="Price it the way you already do"
            body="Per room, per square metre, per hour, fixed prices, extras and minimum charges. Start from a template for your trade and change the numbers."
            bullets={["Postcode zones with surcharges or 'we don't cover this'", 'A price range, rounded the way you like', 'See exactly how every price was worked out']}
            label="The builder's pricing tab with rule rows, and a phone preview whose price changes as the bedroom count changes"><RulesVis /></Tile>
          <Tile span={2} delay={0.08} eyebrow="Embed anywhere" title="One snippet. Works on the site you already have."
            body="Paste one line into Wix, Squarespace, WordPress or Webflow. Or share your quote page link on Google, Facebook and the side of your van."
            bullets={['Matches your brand colour and logo', 'Hosted quote page and QR code included', 'Tracks which source each lead came from']}
            label="An embed snippet box being copied over a blurred trades website"><SnippetVis /></Tile>
          <Tile span={3} eyebrow="Photo check" title="Know when a job needs a survey"
            body="Customers add photos with their quote. AI compares them with the answers and tells you when the job looks bigger or trickier than they said. It never changes your price."
            bullets={["'Photos show 4 bedrooms, customer said 2'", 'You decide what a flag does', 'No more surveys for simple jobs']}
            label="Three customer photos being checked, then a note saying survey suggested with two flags, and the price unchanged"><PhotoVis /></Tile>
          <Tile span={3} delay={0.08} eyebrow="Booking" title="From price to booked slot in one go"
            body="Customers pick a survey or job slot from your hours. Take a deposit straight into your own Stripe account if you want one."
            bullets={['No double bookings, ever', 'Customers reschedule themselves', "Bookings appear in your phone's calendar"]}
            label="A week calendar of open hours where Thursday 10:00 is picked and a deposit paid tag appears"><CalendarVis /></Tile>
          <Tile span={2} eyebrow="Follow-ups" title="Quotient chases. You stay on the job."
            body="A text after 2 hours, an email after 2 days, a last nudge after 5. They stop the moment the customer books, replies or opts out."
            bullets={['Texts from your own verified number or business name', 'Quiet hours respected', 'Replies forwarded to your email']}
            label="A follow-up text and three follow-up steps; after the customer books, the last step shows stopped"><FollowVis /></Tile>
          <Tile span={4} delay={0.08} eyebrow="Leads and analytics" title="Every quote in one inbox"
            body="New, quoted, booked, won, lost. See your quote-to-booking rate, average job value and which sources bring booked jobs, not clicks."
            bullets={['Text or email from the lead', 'Mark won with the final value', 'Team access on Crew']}
            label="The leads inbox with status pills changing, and stat tiles for quote to booking rate, average job value and top source, marked example data"><InboxVis /></Tile>
        </div>
      </div>
    </section>
  )
}
