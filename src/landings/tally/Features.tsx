import { useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Check, CornerDownLeft, Repeat } from 'lucide-react'
import { EASE, LOOP, Reveal, SectionHead, useCountUp, useLoopStep } from './shared'

type TileProps = {
  cls: string; eyebrow: string; title: string; body: string; bullets: string[]; visual: ReactNode; delay?: number
}

function Tile({ cls, eyebrow, title, body, bullets, visual, delay = 0 }: TileProps) {
  return (
    <li className={`tl-tile ${cls}`}>
      <Reveal className="tl-tile-copy" delay={delay}>
        <span className="tl-tile-eyebrow">{eyebrow}</span>
        <h3 className="tl-h3">{title}</h3>
        <p className="tl-tile-body">{body}</p>
        <ul className="tl-bullets">
          {bullets.map((b) => <li key={b}><Check size={14} strokeWidth={1.75} aria-hidden="true" />{b}</li>)}
        </ul>
      </Reveal>
      <Reveal className="tl-tile-visual" delay={delay + 0.12} scale>{visual}</Reveal>
    </li>
  )
}

/* 7.1 Reminders editor: steps highlight in turn, the live preview follows. */
const REMINDERS: [string, string, string][] = [
  ['3 days before', 'Coming up: INV-0042 is due on Friday', 'Hi Dana, a quick heads-up that this one is due on Friday.'],
  ['On the due date', 'INV-0042 is due today', 'Hi Dana, just a note that this is due today. Thank you!'],
  ['3 days after', 'Quick reminder: INV-0042 for $2,400.00', 'Hi Dana, this is now three days past due. Could you take a look?'],
  ['7 days after', 'INV-0042 is a week overdue', 'Hi Dana, this invoice is now a week overdue. Please pay or let me know the date.'],
  ['14 days after', 'Final reminder: INV-0042', 'Hi Dana, this is two weeks overdue. Please arrange payment this week.'],
]
function RemindersVisual() {
  const { ref, step } = useLoopStep(5, 1600)
  const [, subject, body] = REMINDERS[step]
  return (
    <div ref={ref} className="tl-v-rem" role="img" aria-label="Reminders editor with five steps and a live email preview">
      <ol className="tl-rem-steps" aria-hidden="true">
        {REMINDERS.map(([when], i) => (
          <li key={when} className={i === step ? 'is-on' : i < step ? 'is-past' : ''}>
            <span className="tl-mono">{String(i + 1).padStart(2, '0')}</span>{when}
            <span className="tl-rem-tone" style={{ width: `${20 + i * 18}%` }} />
          </li>
        ))}
      </ol>
      <div className="tl-rem-preview tl-frame" aria-hidden="true">
        <span className="tl-rem-k">Preview</span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: EASE }}>
            <b>{subject}</b>
            <p>{body}</p>
          </motion.div>
        </AnimatePresence>
        <span className="tl-rem-foot">Sends 9:00 to 17:00, client time</span>
      </div>
    </div>
  )
}

/* 7.2 A reply arrives; Tally reads it and pauses until the day after the promised date. */
function ReplyVisual() {
  const { ref, step } = useLoopStep(4, 1300)
  return (
    <div ref={ref} className="tl-v-reply" role="img" aria-label="Reply card: Promise to pay, 20 Nov. Reminders paused until 21 Nov.">
      <div className="tl-bubble" aria-hidden="true">
        <span className="tl-bubble-from"><CornerDownLeft size={12} strokeWidth={1.75} /> Dana at Northwind</span>
        {step === 0 ? <span className="tl-typing"><i /><i /><i /></span> : <p>Thanks for the nudge, paying this Friday.</p>}
      </div>
      <motion.div className="tl-replycard tl-frame" aria-hidden="true" animate={{ opacity: step >= 2 ? 1 : 0.25, y: step >= 2 ? 0 : 4 }} transition={{ duration: 0.36, ease: LOOP }}>
        <div className="tl-replycard-top"><span className="tl-chip-k">Promise to pay</span><span className="tl-mono">20 Nov</span></div>
        <p>“Thanks for the nudge, paying this Friday.”</p>
        <span className="tl-paused"><i /> Paused until 21 Nov</span>
      </motion.div>
      <ol className="tl-miniseq" aria-hidden="true">
        <li className="is-sent" /><li className="is-sent" /><li className={`is-gap ${step >= 3 ? 'is-on' : ''}`} /><li /><li />
      </ol>
    </div>
  )
}

/* 7.3 Brand colour: the email and the pay page follow the business accent. */
const BRANDS: [string, string, string][] = [['Moss Studio', '#3f9a90', '#eff7f6'], ['Kiln & Co', '#c2603d', '#fbf1ec'], ['Northlight', '#5f6fd9', '#f1f3fd']]
function BrandVisual() {
  const { ref, step } = useLoopStep(3, 1800)
  const [name, c, soft] = BRANDS[step]
  return (
    <div ref={ref} className="tl-v-brand" role="img" aria-label="Reminder email from the business's own address next to the pay page in the business brand colour">
      <div className="tl-brand-mail tl-frame" aria-hidden="true">
        <span className="tl-brand-bar" style={{ background: c }} />
        <span className="tl-brand-from">accounts@{name.toLowerCase().replace(/[^a-z]/g, '')}.com</span>
        <b>INV-0042 from {name}</b>
        <span className="tl-brand-lines"><i /><i /><i /></span>
        <span className="tl-brand-btn" style={{ borderColor: c, color: c }}>View and pay</span>
      </div>
      <div className="tl-brand-pay tl-frame" aria-hidden="true" style={{ background: soft }}>
        <span className="tl-brand-logo" style={{ background: c }} />
        <span className="tl-brand-name">{name}</span>
        <b className="tl-money">$2,400.00</b>
        <span className="tl-brand-paybtn" style={{ borderColor: c, color: c }}>Pay now</span>
      </div>
      <ul className="tl-swatches" aria-hidden="true">
        {BRANDS.map(([n, col], i) => <li key={n} className={i === step ? 'is-on' : ''} style={{ background: col }} />)}
      </ul>
    </div>
  )
}

/* 7.4 Pay page: full or part, then the method. */
function PayVisual() {
  const { ref, step } = useLoopStep(4, 1400)
  const part = step >= 2
  const method = ['Card', 'Bank (ACH)', 'Bank (ACH)', 'Card'][step]
  return (
    <div ref={ref} className="tl-v-pay tl-frame" role="img" aria-label="Pay page with Pay in full or Pay part, and a choice of card or bank payment">
      <div className="tl-seg" aria-hidden="true">
        <span className={!part ? 'is-on' : ''}>Pay in full</span>
        <span className={part ? 'is-on' : ''}>Pay part</span>
      </div>
      <div className="tl-pay-amt" aria-hidden="true">
        <span>Amount</span>
        <b className="tl-money">{part ? '$1,000.00' : '$2,400.00'}</b>
        <small>{part ? 'Minimum $500.00 · $1,400.00 left after this' : 'Balance due 15 Nov'}</small>
      </div>
      <ul className="tl-methods" aria-hidden="true">
        {['Card', 'Bank (ACH)'].map((m) => <li key={m} className={m === method ? 'is-on' : ''}><i />{m}</li>)}
      </ul>
    </div>
  )
}

/* 7.5 Recurring list with per-client currency, converted to yours. */
const RECUR: [string, string, string, string][] = [
  ['Northwind Coffee', 'Monthly on the 1st', '$2,400.00', 'Sends'],
  ['Atelier Brun', 'Monthly on the 15th', '€1,800.00', 'Draft first'],
  ['Hollis & Pike', 'Quarterly', '£3,000.00', 'Sends'],
]
function RecurringVisual() {
  const { ref, step } = useLoopStep(4, 1200)
  return (
    <div ref={ref} className="tl-v-recur tl-frame" role="img" aria-label="Recurring invoices list: Monthly on the 1st, sends automatically, in several currencies">
      <ul aria-hidden="true">
        {RECUR.map(([c, when, amt, mode], i) => (
          <li key={c} className={i === step % 3 ? 'is-on' : ''}>
            <Repeat size={13} strokeWidth={1.5} />
            <span className="tl-recur-main"><b>{c}</b><small>{when} · {mode}</small></span>
            <span className="tl-money">{amt}</span>
          </li>
        ))}
      </ul>
      <div className="tl-recur-foot" aria-hidden="true"><span>Shown in your currency</span><span className="tl-mono">USD · ECB rate, daily</span></div>
    </div>
  )
}

/* 7.6 Dashboard: stat boxes count up, forecast bars grow week by week. */
const FORECAST = [0.42, 0.7, 0.36, 0.88, 0.55, 0.64, 0.3, 0.5]
function DashboardVisual() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.3 })
  const reduce = useReducedMotion()
  const out = useCountUp(12480, 900, inView)
  const over = useCountUp(3150, 900, inView)
  const days = useCountUp(18, 900, inView)
  return (
    <div ref={ref} className="tl-v-dash" role="img" aria-label="Dashboard with outstanding, overdue and average days to pay, and an eight week cash forecast. Example data.">
      <div className="tl-stats" aria-hidden="true">
        <div><span>Outstanding</span><b className="tl-money">${out.toLocaleString('en-US')}</b></div>
        <div><span>Overdue</span><b className="tl-money is-amber">${over.toLocaleString('en-US')}</b></div>
        <div><span>Avg days to pay</span><b className="tl-money">{days}</b></div>
      </div>
      <div className="tl-forecast tl-frame" aria-hidden="true">
        <div className="tl-forecast-head"><span>Cash forecast by week</span><span className="tl-mono">Example data</span></div>
        <div className="tl-bars">
          {FORECAST.map((h, i) => (
            <span key={i} className="tl-bar">
              <motion.i initial={{ scaleY: reduce ? 1 : 0 }} animate={{ scaleY: inView || reduce ? 1 : 0 }} transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.06, ease: [0.2, 0, 0, 1] }} style={{ height: `${h * 100}%` }} />
              <small className="tl-mono">W{i + 1}</small>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Features() {
  return (
    <section className="tl-section" id="features" aria-labelledby="tl-features-h">
      <div className="tl-container">
        <SectionHead n="05" id="tl-features-h" eyebrow="Features" title="Everything between sending an invoice and getting paid." />
        <ul className="tl-bento">
          <Tile
            cls="tl-c7" eyebrow="Polite, then firm" title="Five reminders, each a little clearer than the last."
            body="Three days before it is due, on the day, then 3, 7 and 14 days after. Edit every word, or paste one of your own emails and Tally rewrites the whole sequence in your voice."
            bullets={["Sent in your client's working hours", 'Different rules for different clients', 'Optional late fees, capped and clearly stated']}
            visual={<RemindersVisual />}
          />
          <Tile
            cls="tl-c5" delay={0.06} eyebrow="Never awkward" title="A reply pauses everything. 'Paying Friday' pauses until Saturday."
            body="Every reminder goes out with a reply address Tally can read. When your client writes back, reminders stop at once and the reply lands in your inbox with a one-line summary. If they promise a date, Tally waits until then."
            bullets={['Out-of-office replies do not stop the sequence', 'Disputes are flagged for you, never auto-answered', 'You decide when to resume']}
            visual={<ReplyVisual />}
          />
          <Tile
            cls="tl-c4" eyebrow="Looks like you" title="Your logo, your colours, your email address."
            body="Invoices and reminders come from accounts@yourstudio.com, not a no-reply address. The PDF and the pay page use your brand colour, so clients see your business, not ours."
            bullets={['Step-by-step DNS help for Porkbun, Cloudflare and GoDaddy', 'PDF attached on the first send', 'Hosted pay page that works on any phone']}
            visual={<BrandVisual />}
          />
          <Tile
            cls="tl-c4" delay={0.06} eyebrow="Getting paid" title="Clients pay in a minute. The money goes to your Stripe."
            body="Card everywhere, plus ACH, SEPA and Bacs Direct Debit or bank transfer where your Stripe account supports them. Take deposits, accept part payments, and record cheques or wires by hand."
            bullets={['No cut taken by Tally', 'Part payments with a minimum you set', 'Deposits deducted from the final invoice']}
            visual={<PayVisual />}
          />
          <Tile
            cls="tl-c4" delay={0.12} eyebrow="Set and forget" title="Retainers bill themselves, in any currency."
            body="Weekly, monthly, quarterly or yearly invoices that send themselves or wait for your OK. Invoice in USD, EUR, GBP and more, and see everything in your own currency."
            bullets={['Auto-send or draft for review', 'Daily ECB exchange rates', 'Per-client currency and terms']}
            visual={<RecurringVisual />}
          />
          <Tile
            cls="tl-c12" eyebrow="Dashboard" title="Outstanding, overdue and the next 8 weeks of cash."
            body="See who owes what, how long each client really takes to pay, and a cash forecast built from their actual history. Export everything for your accountant in one click, in Xero or QuickBooks layout."
            bullets={['Average days to pay, per client', 'Cash forecast by week', 'CSV export for your accountant']}
            visual={<DashboardVisual />}
          />
        </ul>
      </div>
    </section>
  )
}
