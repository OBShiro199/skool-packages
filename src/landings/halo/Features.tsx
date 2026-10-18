import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, CheckCheck, ChevronDown, ExternalLink, Eye, MessageSquare, Phone as PhoneIc, Send, Sparkles, Star } from 'lucide-react'
import { Avatar, EASE, Eyebrow, MORPH, Pill, Reveal, SectionHead, useLoopStep, useTyping } from './shared'
import { GoogleG, Phone, RatingScreen, Stars } from './phone'

function Tile({ eyebrow, title, body, bullets, className = '', children, delay = 0, bulletLink }: {
  eyebrow: string; title: string; body: string; bullets: string[]; className?: string; children: ReactNode; delay?: number
  bulletLink?: string
}) {
  return (
    <div className={`hl-tile ${className}`}>
      <Reveal delay={delay} className="hl-tile-inner">
        <div className="hl-tile-copy">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h3>{title}</h3>
          <p>{body}</p>
          <ul className="hl-bullets">
            {bullets.map((b, i) => (
              <li key={b}><Check size={14} aria-hidden="true" />{bulletLink && i === bullets.length - 1 ? <a href={bulletLink}>{b}</a> : b}</li>
            ))}
          </ul>
        </div>
        <div className="hl-tile-visual">{children}</div>
      </Reveal>
    </div>
  )
}

/* 7.1 Requests table with funnel ticks. */
const TICKS = [Send, CheckCheck, Eye, Star, ExternalLink, MessageSquare]
const TICK_NAMES = ['Sent', 'Delivered', 'Opened', 'Rated', 'Clicked to Google', 'Private note']
function RequestsVisual() {
  const { ref, step } = useLoopStep(6, 900)
  const rows: { name: string; reached: number[]; pill: ReactNode }[] = [
    { name: 'Maria G.', reached: [0, 1, 2, 3, 4], pill: <Pill tone="blue">Sent</Pill> },
    { name: 'Aisha K.', reached: [0, 1, 2].slice(0, Math.min(3, step + 1)), pill: step < 2 ? <Pill tone="accent" dot="live">Sending</Pill> : <Pill tone="blue">Sent</Pill> },
    { name: 'Tom R.', reached: [0, 1, 2, 3, 5], pill: <Pill tone="blue">Sent</Pill> },
    { name: 'James P.', reached: [], pill: <Pill tone="grey">Scheduled for 09:00</Pill> },
  ]
  return (
    <div ref={ref} className="hl-req" role="img" aria-label="Requests table: each request shows ticks for sent, delivered, opened, rated, clicked to Google and private note; one is scheduled for 09:00">
      <div className="hl-req-head"><span>Customer</span><span>Progress</span><span>Status</span></div>
      {rows.map((r) => (
        <div key={r.name} className="hl-req-row">
          <span className="hl-req-name">{r.name}</span>
          <span className="hl-ticks">
            {TICKS.map((I, i) => <I key={i} size={14} strokeWidth={1.5} className={r.reached.includes(i) ? 'on' : ''} aria-label={TICK_NAMES[i]} />)}
          </span>
          <span className="hl-req-pill">{r.pill}</span>
        </div>
      ))}
      <p className="hl-req-foot">Sending hours 09:00 to 19:00 · One reminder if never opened</p>
    </div>
  )
}

/* 7.2 Private feedback alert on the owner's phone. */
function FeedbackVisual() {
  const { ref, step } = useLoopStep(4, 1400)
  const status = step < 2 ? <Pill tone="amber">New</Pill> : step === 2 ? <Pill tone="blue">Contacted</Pill> : <Pill tone="green">Resolved</Pill>
  return (
    <div ref={ref} className="hl-fb" role="img" aria-label="The owner's phone shows an email: 2 star feedback from Tom R. at Brightside Dental, with his note and number">
      <Phone className="hl-mini-phone">
        <motion.div
          className="hl-fb-notify"
          initial={false}
          animate={{ opacity: step >= 1 ? 1 : 0, y: step >= 1 ? 0 : -8 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          <span className="hl-v-app">Mail · now</span>
          <b>2 star feedback from Tom R. at Brightside Dental</b>
        </motion.div>
        <div className="hl-fb-mail">
          <Stars n={2} size={13} />
          <p>"Waited 40 minutes past my time"</p>
          <p className="hl-faint">Tom R. · (555) 014-2290</p>
          <span className="hl-fb-call"><PhoneIc size={12} aria-hidden="true" />Call Tom</span>
        </div>
      </Phone>
      <div className="hl-fb-inbox">
        <div className="hl-fb-row"><span>Tom R.</span><Stars n={2} size={11} /><span className="hl-fb-pill">{status}</span></div>
        <div className="hl-fb-row"><span>Lena M.</span><Stars n={3} size={11} /><span className="hl-fb-pill"><Pill tone="green">Resolved</Pill></span></div>
      </div>
    </div>
  )
}

/* 7.3 Google-style reviews tile with an AI reply draft awaiting approval. */
const DRAFT = 'Thank you, Daniel. We are glad the cleaning felt quick and easy, and we have passed your note about the parking to the team. See you at your next visit.'
function RepliesVisual() {
  const { ref, step } = useLoopStep(3, 3600)
  const drafting = step === 0
  const typed = useTyping(DRAFT, step === 1, 18)
  const text = step === 2 ? DRAFT : step === 1 ? typed : ''
  return (
    <div ref={ref} className="hl-gr" role="img" aria-label="Google reviews for Brightside Dental, 4.8 average. A new 4 star review from Daniel has a reply drafted by Halo, waiting for the owner to approve">
      <div className="hl-gr-head">
        <GoogleG size={16} />
        <span className="hl-gr-title">Reviews · Brightside Dental</span>
        <span className="hl-gr-avg"><b>4.8</b><Stars n={5} size={12} /><span className="hl-faint">(214)</span></span>
      </div>
      <div className="hl-gr-review">
        <Avatar name="Daniel Ochoa" tone={2} />
        <div className="hl-gr-body">
          <div className="hl-gr-meta"><b>Daniel O.</b><Stars n={4} size={12} /><span className="hl-faint">2 hours ago</span></div>
          <p>Quick, friendly cleaning and no waiting. Parking out front was a pain though.</p>
        </div>
        <Pill tone={step === 2 ? 'accent' : 'amber'} className="hl-gr-pill">{step === 2 ? 'Draft ready' : 'Needs reply'}</Pill>
      </div>
      <div className="hl-draft">
        <div className="hl-draft-top"><span><Sparkles size={12} aria-hidden="true" />Reply drafted in your voice</span><span className="hl-faint">Not posted</span></div>
        <div className="hl-draft-text">
          {drafting ? <span className="hl-drafting"><i className="hl-dot hl-dot-live" />Drafting reply</span> : <span>{text}</span>}
        </div>
        <p className="hl-draft-checks">{step === 2 ? 'Checks passed' : ''}</p>
        <div className="hl-draft-actions">
          <span className={`hl-btn hl-btn-primary hl-btn-sm hl-fake${step === 2 ? ' ready' : ''}`}>Approve and post</span>
          <span className="hl-btn hl-btn-secondary hl-btn-sm hl-fake">Redraft</span>
          <span className="hl-btn hl-btn-ghost hl-btn-sm hl-fake">Copy</span>
        </div>
      </div>
      <div className="hl-gr-review dim">
        <Avatar name="Priya Nair" tone={1} />
        <div className="hl-gr-body">
          <div className="hl-gr-meta"><b>Priya N.</b><Stars n={5} size={12} /><span className="hl-faint">Yesterday</span></div>
          <p>Dr. Shaw explained everything. Lovely team.</p>
        </div>
        <Pill tone="green" className="hl-gr-pill">Posted</Pill>
      </div>
    </div>
  )
}

/* 7.4 Dashboard: funnel and the rating trend from 4.61 to 4.82. */
const TREND = [4.61, 4.63, 4.62, 4.66, 4.69, 4.68, 4.72, 4.74, 4.73, 4.77, 4.79, 4.82]
const FUNNEL: [string, number][] = [['Sent', 412], ['Delivered', 398], ['Opened', 271], ['Rated', 176], ['Clicked to Google', 128]]
function DashboardVisual() {
  const { ref, inView, reduce } = useLoopStep(1, 1000, 0.3)
  const W = 320, H = 150, lo = 4.5, hi = 5.0
  const x = (i: number) => 28 + (i * (W - 40)) / (TREND.length - 1)
  const y = (v: number) => 10 + ((hi - v) / (hi - lo)) * (H - 30)
  const d = TREND.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const show = inView || reduce
  return (
    <div ref={ref} className="hl-dash" role="img" aria-label="Dashboard: of 412 requests sent, 398 delivered, 271 opened, 176 rated and 128 clicked to Google; the average rating rose from 4.61 to 4.82 over 12 weeks">
      <div className="hl-funnel">
        {FUNNEL.map(([l, n], i) => (
          <div key={l} className="hl-funnel-row">
            <span className="hl-funnel-l">{l}</span>
            <span className="hl-funnel-bar"><motion.span initial={reduce ? false : { scaleX: 0 }} animate={show ? { scaleX: n / 412 } : undefined} transition={{ duration: 0.45, delay: i * 0.08, ease: MORPH }} /></span>
            <span className="hl-funnel-n"><span className="hl-num">{n}</span><span className="hl-faint">{Math.round((n / 412) * 100)}%</span></span>
          </div>
        ))}
      </div>
      <div className="hl-trend">
        <div className="hl-trend-top"><span>Average rating</span><span className="hl-trend-v"><span className="hl-faint">4.61</span> → <b>4.82</b></span></div>
        <svg viewBox={`0 0 ${W} ${H}`} className="hl-trend-svg" aria-hidden="true">
          {[4.5, 4.6, 4.7, 4.8, 4.9, 5.0].map((g) => (
            <g key={g}>
              <line x1="28" x2={W - 12} y1={y(g)} y2={y(g)} className="hl-grid" />
              <text x="0" y={y(g) + 3} className="hl-axis">{g.toFixed(1)}</text>
            </g>
          ))}
          <motion.path
            d={d} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={show ? { pathLength: 1 } : undefined}
            transition={{ duration: 0.9, ease: MORPH }}
          />
          <motion.circle cx={x(TREND.length - 1)} cy={y(4.82)} r="3" fill="#fff" stroke="var(--accent)" strokeWidth="1.5"
            initial={reduce ? false : { opacity: 0 }} animate={show ? { opacity: 1 } : undefined} transition={{ duration: 0.2, delay: 0.85 }} />
          <text x={x(0)} y={H - 2} className="hl-axis">12 weeks ago</text>
          <text x={W - 12} y={H - 2} className="hl-axis" textAnchor="end">This week</text>
        </svg>
      </div>
    </div>
  )
}

/* 7.5 Policy-safe: two phones, 5 stars and 2 stars, with the identical Google buttons joined. */
function PolicyVisual() {
  const { ref, step } = useLoopStep(4, 1800)
  const left = step % 2 === 0 ? 5 : 4
  const right = [2, 1, 3, 2][step]
  const wrap = useRef<HTMLDivElement>(null)
  const [line, setLine] = useState<{ x: number; y: number; w: number } | null>(null)
  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const measure = () => {
      const btns = el.querySelectorAll<HTMLElement>('.hl-gbtn')
      if (btns.length < 2) return
      const box = el.getBoundingClientRect()
      const k = box.width ? el.offsetWidth / box.width : 1
      const a = btns[0].getBoundingClientRect()
      const b = btns[1].getBoundingClientRect()
      setLine({ x: (a.right - box.left) * k, y: (a.top + a.height / 2 - box.top) * k, w: (b.left - a.right) * k })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref}>
      <div ref={wrap} className="hl-policy" role="img" aria-label="Two rating pages side by side, one rated 5 stars and one rated 2 stars. The Post a review on Google button is identical and in the same place on both">
        <div className="hl-policy-col">
          <span className="hl-policy-tag">{`${left} stars`}</span>
          <Phone className="hl-policy-phone"><RatingScreen size="sm" state={{ rating: left }} /></Phone>
        </div>
        <div className="hl-policy-col">
          <span className="hl-policy-tag">{`${right} star${right > 1 ? 's' : ''}`}</span>
          <Phone className="hl-policy-phone"><RatingScreen size="sm" state={{ rating: right }} /></Phone>
        </div>
        {line && <span className="hl-bridge" aria-hidden="true" style={{ left: line.x, top: line.y, width: line.w }} />}
        <p className="hl-policy-cap">Same button, same place</p>
      </div>
    </div>
  )
}

/* 7.6 Agencies: the location switcher open with five clients. */
const CLIENTS: [string, string, 'ok' | 'attn'][] = [
  ['Brightside Dental', 'All replied', 'ok'],
  ['Oak & Ivy Salon', '2 need a reply', 'attn'],
  ['Northgate Physio', 'All replied', 'ok'],
  ['Rapid Rooter Plumbing', '1 new feedback', 'attn'],
  ['Main Street Auto', 'All replied', 'ok'],
]
function AgencyVisual() {
  const { ref, step } = useLoopStep(5, 1100)
  return (
    <div ref={ref} className="hl-agency" role="img" aria-label="Location switcher open with five client businesses, each with a status dot">
      <div className="hl-switch"><span>{CLIENTS[step][0]}</span><ChevronDown size={14} aria-hidden="true" /></div>
      <div className="hl-frame hl-switch-menu">
        <div className="hl-switch-item all"><span>All locations</span><span className="hl-faint">5 clients</span></div>
        {CLIENTS.map(([n, s, k], i) => (
          <div key={n} className={`hl-switch-item${i === step ? ' hi' : ''}`}>
            <i className={`hl-sdot ${k}`} aria-hidden="true" /><span>{n}</span><span className="hl-faint">{s}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Features() {
  return (
    <section className="hl-section hl-band" id="features">
      <div className="hl-rail">
        <SectionHead eyebrow="Features" title="Ask, listen, reply, and see it working." />
        <div className="hl-bento">
          <Tile className="hl-t-req" eyebrow="Requests" title="Every finished visit gets a friendly text two hours later."
            body="Connect your booking tool with Zapier or a webhook, upload yesterday's visits as a CSV, or send one by hand. Halo waits for your sending hours, sends one text, and one reminder only if they never opened it."
            bullets={['Works with any booking or job tool through Zapier or webhooks', 'Texts from your own verified number, in your business name', 'Never asks the same person twice in 90 days']}>
            <RequestsVisual />
          </Tile>
          <Tile className="hl-t-replies" delay={0.08} eyebrow="AI replies" title="A reply drafted the moment a review lands. You approve it."
            body="Halo learns your tone from a few replies you like. Each new Google review gets a short, specific draft. Edit it or approve it, and it posts to Google. Nothing posts without you."
            bullets={['Never confirms private details (safe for clinics)', 'Flags reviews you should handle personally', 'Works by copy and paste if you have not connected Google yet']}>
            <RepliesVisual />
          </Tile>
          <Tile className="hl-t-fb" eyebrow="Private feedback" title="A problem in your inbox today, not on Google next week."
            body="Anyone can send a private note with their rating. Low ratings open the note box straight away, and you get an email with their name and number within a minute, so you can call and put it right."
            bullets={['Alerts for 3 stars or fewer (you choose)', 'Inbox with Contacted and Resolved', 'Every customer still sees the Google button']}>
            <FeedbackVisual />
          </Tile>
          <Tile className="hl-t-dash" delay={0.08} eyebrow="Dashboard" title="Requests, clicks, new reviews and your rating, per location."
            body="One dashboard for one shop or ten. See how many customers opened the text, how many went to Google, how many new reviews arrived, and where your average is heading."
            bullets={['Rating trend over time', 'Compare locations side by side', 'Weekly report for each location']}>
            <DashboardVisual />
          </Tile>
          <Tile className="hl-t-policy" eyebrow="Policy-safe" title="No review gating. Ever."
            body="Google does not allow businesses to selectively ask happy customers for reviews or to discourage negative ones, or to offer anything in return for a review. Halo is designed around those rules: same message to every customer, same Google button for every rating, no incentives."
            bullets={['Same Google button for every rating', 'No incentive wording allowed in templates', 'Read the plain English guide']} bulletLink="/google-review-policy">
            <PolicyVisual />
          </Tile>
          <Tile className="hl-t-agency" delay={0.08} eyebrow="Agencies" title="Run reviews for ten client businesses from one login."
            body="Each client gets its own number, review link, tone and report, with your clients' names on every email and no Halo branding."
            bullets={['Up to 10 client locations', 'Weekly client reports by email', 'Switch clients in one click']}>
            <AgencyVisual />
          </Tile>
        </div>
      </div>
    </section>
  )
}
