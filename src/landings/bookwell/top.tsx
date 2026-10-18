import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'motion/react'
import {
  ArrowRight, BellRing, Brush, CalendarX2, Car, Check, Dog, Dumbbell, Eye, GraduationCap, Hand, Menu, MessageCircle, Play, Scissors, X,
} from 'lucide-react'
import { BookingScreen, PhoneFrame, type Step } from './phone'
import { CountUp, EASE, Reveal, SectionHead, TrialButton, Wordmark, jumpTo, track, useLoop } from './parts'

const LINKS = [['how', 'How it works'], ['features', 'Features'], ['pricing', 'Pricing'], ['faq', 'FAQ']] as const

/* ---------- 2. Sticky nav ---------- */
export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const last = useRef(0)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY
      setScrolled(y > 8)
      setHidden(y > 400 && y > last.current)
      last.current = y
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const go = (e: MouseEvent, id: string) => { setOpen(false); jumpTo(e, id) }
  return (
    <motion.header
      className={`bw-nav${scrolled ? ' is-scrolled' : ''}${hidden && !open ? ' is-hidden' : ''}`}
      initial={{ y: '-100%' }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
    >
      <div className="bw-wrap bw-nav-row">
        <a href="#top" className="bw-nav-brand" aria-label="Bookwell home" onClick={(e) => go(e, 'top')}><Wordmark /></a>
        <nav className="bw-nav-links" aria-label="Main">
          {LINKS.map(([id, label]) => <a key={id} href={`#${id}`} onClick={(e) => go(e, id)}>{label}</a>)}
        </nav>
        <div className="bw-nav-right">
          <a href="/login" className="bw-nav-login" onClick={(e) => e.preventDefault()}>Log in</a>
          <TrialButton location="nav" size="sm" />
          <button type="button" className="bw-nav-menu" aria-expanded={open} aria-controls="bw-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <motion.div id="bw-sheet" className="bw-sheet" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: EASE }}>
          {LINKS.map(([id, label]) => <a key={id} href={`#${id}`} onClick={(e) => go(e, id)}>{label}<ArrowRight size={16} aria-hidden="true" /></a>)}
          <a href="/login" onClick={(e) => { e.preventDefault(); setOpen(false) }}>Log in<ArrowRight size={16} aria-hidden="true" /></a>
        </motion.div>
      )}
    </motion.header>
  )
}

/* ---------- 3. Hero ---------- */
function Float({ className, delay, children }: { className: string; delay: number; children: ReactNode }) {
  const reduce = useReducedMotion()
  return (
    <motion.div
      className={`bw-float ${className}`}
      initial={reduce ? false : { opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.36, delay, ease: EASE }}
    >
      <div className="bw-bob">{children}</div>
    </motion.div>
  )
}

export function Hero() {
  const reduce = useReducedMotion()
  const item = (i: number) => ({
    initial: reduce ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: reduce ? 0.01 : 0.36, delay: reduce ? 0 : 0.08 + i * 0.07, ease: EASE },
  })
  return (
    <section className="bw-hero" id="top" aria-labelledby="bw-h1">
      <div className="bw-wrap bw-hero-grid">
        <div className="bw-hero-copy">
          <motion.span className="bw-pill" {...item(0)}><i />For barbers, trainers, tutors and every one-person shop</motion.span>
          <motion.h1 id="bw-h1" {...item(1)}>Stop losing money to <em>no-shows.</em></motion.h1>
          <motion.p className="bw-lead" {...item(2)}>
            Put one link in your Instagram bio. Customers pick a time, pay a small deposit and get a text the day before. Every booking lands in your Google Calendar.
          </motion.p>
          <motion.div className="bw-cta-row" {...item(3)}>
            <TrialButton location="hero" />
            <a href="#demo" className="bw-btn bw-btn-ghost bw-btn-lg" onClick={(e) => { track('demo_open', { location: 'hero' }); jumpTo(e, 'demo') }}>
              Try a demo booking
            </a>
          </motion.div>
          <motion.p className="bw-micro" {...item(4)}>7 days free · Set up in 10 minutes · From $19/month</motion.p>
        </div>

        <div className="bw-hero-visual">
          <motion.div
            className="bw-hero-phone"
            initial={reduce ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
          >
            <PhoneFrame label="Bookwell booking page on a phone with the 14:30 slot selected">
              <BookingScreen step={1} pick="14:30" tap />
            </PhoneFrame>
          </motion.div>
          <Float className="bw-f1" delay={0.85}>
            <span className="bw-ok-dot"><Check size={13} strokeWidth={3} aria-hidden="true" /></span>
            <span><b>Deposit paid · $10</b></span>
          </Float>
          <Float className="bw-f2" delay={0.97}>
            <span className="bw-sms-head"><MessageCircle size={13} aria-hidden="true" /> Messages · now</span>
            <span>Reminder: Skin fade at Fade Room tomorrow 14:30.</span>
          </Float>
          <Float className="bw-f3" delay={1.09}>
            <span className="bw-cal-head" aria-hidden="true"><i /><i /><i /></span>
            <span className="bw-cal-event"><b>Skin fade: Jordan</b><small>14:30 to 15:15</small></span>
          </Float>
        </div>
      </div>
    </section>
  )
}

/* ---------- 4. Trade strip ---------- */
const TRADES = [
  [Scissors, 'Barbers'], [Dumbbell, 'Personal trainers'], [GraduationCap, 'Tutors'], [Brush, 'Nail techs'],
  [Hand, 'Massage'], [Dog, 'Dog groomers'], [Eye, 'Lash artists'], [Car, 'Driving instructors'],
] as const

export function TradeStrip() {
  const row = (aria: boolean) => (
    <ul className="bw-trades" aria-hidden={aria || undefined}>
      {TRADES.map(([Icon, label], i) => (
        <Reveal as="li" key={label} delay={i * 0.05}>
          <Icon size={16} strokeWidth={1.7} aria-hidden="true" />{label}
        </Reveal>
      ))}
    </ul>
  )
  return (
    <section className="bw-strip" aria-labelledby="bw-strip-h">
      <div className="bw-wrap">
        <h2 id="bw-strip-h" className="bw-strip-h">Built for shops that run on appointments</h2>
        <div className="bw-marquee">
          <div className="bw-marquee-track">
            {row(false)}
            {row(true)}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ---------- 5. Problem ---------- */
function DmPiece() {
  const { ref, step } = useLoop(4, 1100, 3)
  return (
    <div ref={ref} className="bw-mini bw-dm" aria-hidden="true">
      <span className="bw-dm-in">See you Tuesday</span>
      <span className={`bw-dm-out${step >= 1 ? ' on' : ''}`}>Great, 14:30 it is</span>
      <span className={`bw-dm-seen${step >= 2 ? ' on' : ''}`}>{step >= 3 ? 'Tuesday 14:45 · no reply' : 'Seen'}</span>
    </div>
  )
}
function ClashPiece() {
  const { ref, step } = useLoop(2, 1400, 1)
  return (
    <div ref={ref} className={`bw-mini bw-clash${step ? ' on' : ''}`} aria-hidden="true">
      <span className="a">14:30 · Sam (DM)</span>
      <span className="b">14:30 · Priya (WhatsApp)</span>
      <CalendarX2 size={16} className="bw-clash-x" />
    </div>
  )
}
function TextsPiece() {
  const { ref, step } = useLoop(11, 520, 10)
  return (
    <div ref={ref} className="bw-mini bw-texts" aria-hidden="true">
      <span className="bw-texts-n">{step}</span>
      <span>of 10 reminder texts sent tonight</span>
      <span className="bw-texts-bar"><i style={{ transform: `scaleX(${step / 10})` }} /></span>
    </div>
  )
}

const PAINS = [
  { t: '“See you Tuesday” and then nothing.', d: 'No deposit means no reason to turn up. One no-show a week is a whole day’s takings gone each month.', piece: <DmPiece />, Icon: MessageCircle },
  { t: 'Double booked again.', d: 'Your calendar, your DMs and your head never agree.', piece: <ClashPiece />, Icon: CalendarX2 },
  { t: 'Reminding people by hand.', d: 'Ten texts every evening that you are not paid for.', piece: <TextsPiece />, Icon: BellRing },
]

export function Problem() {
  return (
    <section className="bw-sec bw-bg" aria-labelledby="bw-problem-h">
      <div className="bw-wrap">
        <SectionHead
          title={<span id="bw-problem-h">DMs are not a booking system.</span>}
          sub="Most small shops still take bookings by Instagram DM, WhatsApp and memory. It works until it does not."
        />
        <div className="bw-pains">
          {PAINS.map(({ t, d, piece, Icon }, i) => (
            <Reveal as="article" key={t} className="bw-tile bw-pain" delay={i * 0.07}>
              {piece}
              <div className="bw-pain-copy">
                <span className="bw-icon"><Icon size={16} aria-hidden="true" /></span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="bw-stat" delay={0.1}>
          <p>A $35 appointment missed four times a month is <CountUp to={1680} prefix="$" /> a year.</p>
          <a href="/no-show-calculator" onClick={(e) => { e.preventDefault(); track('calculator_click') }}>Work out your number <ArrowRight size={14} aria-hidden="true" /></a>
        </Reveal>
      </div>
    </section>
  )
}

/* ---------- 6. Product demo ---------- */
const CAPTIONS = ['Pick a service', 'Pick a time', 'Pay a $10 deposit', 'Booked. Text reminder on its way.']

export function Demo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const reduce = useReducedMotion()
  const [step, setStep] = useState<Step>(1)
  const [playing, setPlaying] = useState(false)
  const [manual, setManual] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [hover, setHover] = useState(false)

  // Autoplay only while 50% in view, never with reduced motion, never once the visitor takes over.
  useEffect(() => {
    if (manual || userPaused) return
    if (reduce) return
    setPlaying(inView)
    if (inView) track('video_play', { autoplay: true })
  }, [inView, reduce, manual, userPaused])

  useEffect(() => {
    if (!playing || manual || hover) return
    const id = window.setInterval(() => setStep((s) => ((s + 1) % 4) as Step), 2400)
    return () => window.clearInterval(id)
  }, [playing, manual, hover])

  const tryIt = () => {
    track('demo_open', { location: 'demo' })
    setManual(true); setPlaying(false); setStep(0)
  }
  const pick = (n: Step) => { setManual(true); setPlaying(false); setStep(n) }

  return (
    <section className="bw-sec bw-surface" id="demo" aria-labelledby="bw-demo-h">
      <div className="bw-wrap bw-demo">
        <div className="bw-demo-copy">
          <SectionHead
            title={<span id="bw-demo-h">See a booking happen in 20 seconds.</span>}
            sub="This is what your customers see. No app, no account, works on any phone."
          />
          <Reveal delay={0.1}>
            <ol className="bw-demo-steps" aria-label="Booking steps">
              {CAPTIONS.map((c, i) => (
                <li key={c} className={i === step ? 'on' : i < step ? 'done' : ''}>
                  <span className="bw-num">{i + 1}</span>{c}
                </li>
              ))}
            </ol>
            <div className="bw-cta-row">
              <button type="button" className="bw-btn bw-btn-primary bw-btn-lg" onClick={tryIt}>
                {manual ? 'Start again' : 'Try the demo yourself'}
              </button>
              {!manual && (
                <button type="button" className="bw-btn bw-btn-ghost bw-btn-lg" aria-pressed={playing} onClick={() => { setUserPaused(playing); setPlaying(!playing); if (!playing) track('video_play', { autoplay: false }) }}>
                  {playing ? 'Pause' : <><Play size={14} aria-hidden="true" /> Play</>}
                </button>
              )}
            </div>
            {manual && <p className="bw-micro">Your turn: tap a service, then 14:30, then pay.</p>}
          </Reveal>
        </div>
        <Reveal className="bw-demo-stage" delay={0.05}>
          <div ref={ref} className="bw-demo-glow" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
            <PhoneFrame live={manual} label={manual ? 'Demo booking page for Fade Room. Tap through the steps.' : `Demo booking for Fade Room, step ${step + 1} of 4: ${CAPTIONS[step]}`}>
              <BookingScreen step={step} pick={step >= 1 ? '14:30' : undefined} onPick={manual ? pick : undefined} />
            </PhoneFrame>
            <motion.span key={step} className="bw-caption" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }} aria-live="polite">
              {CAPTIONS[step]}
            </motion.span>
            {!playing && !manual && (
              <button type="button" className="bw-play" aria-label="Play the demo booking" onClick={() => { setUserPaused(false); setPlaying(true); track('video_play', { autoplay: false }) }}>
                <Play size={20} aria-hidden="true" />
              </button>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
