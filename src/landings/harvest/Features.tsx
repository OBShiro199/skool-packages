import { useMemo, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ExternalLink, MessageSquare, ThumbsUp, Webhook } from 'lucide-react'
import { Avatar, EASE, Eyebrow, MORPH, Mark, Pill, Reveal, SectionHead, TierPill, useLoopStep, useTyping } from './shared'

function Tile({ eyebrow, title, body, className = '', children, delay = 0 }: {
  eyebrow: string; title: string; body: string; className?: string; children: ReactNode; delay?: number
}) {
  return (
    <div className={`hv-tile ${className}`}>
      <Reveal delay={delay} className="hv-tile-inner">
        <div className="hv-tile-copy">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h3>{title}</h3>
          <p>{body}</p>
        </div>
        <div className="hv-tile-visual">{children}</div>
      </Reveal>
    </div>
  )
}

/* 7.1 Sources: a LinkedIn-style post with engagers streaming into a scored lead list. */
type Engager = { name: string; headline: string; score: number | null; reason?: string }
const ENGAGERS: Engager[] = [
  { name: 'Sam Lee', headline: 'Head of Customer Success, Northbeam', score: 86 },
  { name: 'Theo Brandt', headline: 'Student, looking for internships', score: null, reason: 'Student' },
  { name: 'Ines Duarte', headline: 'VP Customer Success, Lumen Labs', score: 81 },
  { name: 'Ravi Menon', headline: 'CS Ops Lead, Orbitly', score: 67 },
  { name: 'Kara Wills', headline: 'Founder, a CS consulting agency', score: null, reason: 'Vendor' },
  { name: 'Jonah Pike', headline: 'Director of Support, Brightpath', score: 72 },
  { name: 'Mei Tanaka', headline: 'Open to work', score: null, reason: 'Job seeker' },
  { name: 'Owen Hale', headline: 'Head of CX, Plotwise', score: 78 },
]

function SourcesVisual() {
  const { ref, step, reduce } = useLoopStep(ENGAGERS.length * 4, 1500)
  const latest = useMemo(() => {
    const out: (Engager & { k: number })[] = []
    for (let i = 0; i < 4; i++) {
      const k = step - i
      const idx = ((k % ENGAGERS.length) + ENGAGERS.length) % ENGAGERS.length
      out.push({ ...ENGAGERS[idx], k })
    }
    return out
  }, [step, reduce])
  const reactions = 340 + (step % ENGAGERS.length) * 3
  return (
    <div ref={ref} className="hv-sources" role="img" aria-label="A LinkedIn post by Priya Shah about onboarding churn; people who react and comment stream into a lead list, scored against your ICP, with students, vendors and job seekers filtered out">
      <div className="hv-sources-top">
        <div className="hv-post">
          <div className="hv-post-head">
            <Avatar name="Priya Shah" tone={1} />
            <div><b>Priya Shah</b><span>Founder at Loopwise · 2d</span></div>
            <Pill tone="violet">Competitor</Pill>
          </div>
          <p className="hv-post-text">Most onboarding churn starts in week two, not week six. By the time the first report lands, half the team has stopped logging in.</p>
          <div className="hv-post-stats">
            <span><ThumbsUp size={12} aria-hidden="true" /><span className="hv-data">{reactions}</span></span>
            <span><MessageSquare size={12} aria-hidden="true" /><span className="hv-data">62</span> comments</span>
          </div>
        </div>
        <div className="hv-lane" aria-hidden="true">
          <span className="hv-lane-line" />
          {!reduce && (
            <motion.span
              key={step}
              className="hv-lane-token"
              initial={{ x: 0, opacity: 0 }}
              animate={{ x: 36, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 0.9, ease: EASE }}
            />
          )}
        </div>
        <div className="hv-stream">
          <div className="hv-stream-head"><span>Engagers</span><span>ICP score</span></div>
          <ul>
            <AnimatePresence initial={false}>
              {latest.map((e) => (
                <motion.li
                  key={e.k}
                  layout={!reduce}
                  className={`hv-stream-row${e.score === null ? ' out' : ''}`}
                  initial={reduce ? false : { opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.36, ease: EASE }}
                >
                  <Avatar name={e.name} tone={e.k} />
                  <span className="hv-stream-who"><b>{e.name}</b><span>{e.headline}</span></span>
                  {e.score === null
                    ? <span className="hv-stream-out">Filtered · {e.reason}</span>
                    : <span className="hv-stream-score"><span className="hv-data">{e.score}</span><TierPill tier={e.score >= 80 ? 'Hot' : e.score >= 60 ? 'Warm' : 'Cold'} /></span>}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        </div>
      </div>
      <table className="hv-mini-table">
        <thead><tr><th scope="col">Source</th><th scope="col">Relation</th><th scope="col" className="hv-num">Yield</th></tr></thead>
        <tbody>
          <tr><td>Your post on pipeline reviews</td><td><Pill tone="accent">Mine</Pill></td><td className="hv-num hv-data">11 leads</td></tr>
          <tr><td>Priya Shah · onboarding churn</td><td><Pill tone="violet">Competitor</Pill></td><td className="hv-num hv-data">7 leads</td></tr>
          <tr><td>Jon Pace (creator)</td><td><Pill tone="sky">Influencer</Pill></td><td className="hv-num hv-data">4 leads</td></tr>
        </tbody>
      </table>
    </div>
  )
}

/* 7.2 Targeting: ICP chips and the ICP score meter. */
const SCORED = [
  { name: 'Sam Lee', head: 'Head of Customer Success, Northbeam', role: 34, co: 30, intent: 22 },
  { name: 'Ravi Menon', head: 'CS Ops Lead, Orbitly', role: 26, co: 25, intent: 16 },
  { name: 'Theo Brandt', head: 'Student, looking for internships', role: 4, co: 6, intent: 8 },
]
function IcpVisual() {
  const { ref, step } = useLoopStep(SCORED.length, 2400)
  const p = SCORED[step]
  const total = p.role + p.co + p.intent
  const tier = total >= 80 ? 'Hot' : total >= 60 ? 'Warm' : 'Cold'
  const parts: [string, number, number][] = [['Role fit', p.role, 40], ['Company fit', p.co, 35], ['Engagement intent', p.intent, 25]]
  return (
    <div ref={ref} className="hv-icp" role="img" aria-label="ICP form with chips, and a score meter that scores each engager out of 100 on role fit, company fit and engagement intent">
      <p className="hv-icp-input">Heads of customer success at B2B SaaS companies with 51 to 500 staff in the US and UK</p>
      <div className="hv-chips">
        {['Head of CS', 'VP CS', 'Director', '51 to 500', 'B2B SaaS', 'US, UK'].map((c) => <span key={c} className="hv-chip">{c}</span>)}
      </div>
      <div className="hv-meter-card">
        <div className="hv-meter-top">
          <span className="hv-stream-who"><b>{p.name}</b><span>{p.head}</span></span>
          <span className="hv-meter-total"><span className="hv-data">{total}</span><TierPill tier={tier} /></span>
        </div>
        <div className="hv-meter" aria-hidden="true">
          <span className="hv-meter-fill" style={{ transform: `scaleX(${total / 100})` }} />
          <i style={{ left: '60%' }} /><i style={{ left: '80%' }} />
        </div>
        <div className="hv-meter-scale hv-data" aria-hidden="true"><span>0</span><span style={{ left: '60%' }}>60 warm</span><span style={{ left: '80%' }}>80 hot</span><span>100</span></div>
        <ul className="hv-meter-parts">
          {parts.map(([l, v, max]) => (
            <li key={l}>
              <span>{l}</span>
              <span className="hv-part-bar" aria-hidden="true"><span style={{ transform: `scaleX(${v / max})` }} /></span>
              <span className="hv-data">{v}/{max}</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="hv-hint">About 34% of last week's engagers pass</p>
    </div>
  )
}

/* 7.3 Contact data: verified twice. */
function ContactVisual() {
  const { ref, step } = useLoopStep(4, 1300)
  const verified = step >= 2
  return (
    <div ref={ref} className="hv-contact" role="img" aria-label="Contact block for Sam Lee: work email checked by a verifier and marked Verified, with company domain, size and industry">
      <div className="hv-contact-row">
        <span className="hv-faint">Email</span>
        <span className="hv-data hv-ellipsis">sam.lee@northbeam.io</span>
        <span className="hv-status-slot">
          {verified
            ? <Pill tone="green"><Check size={11} aria-hidden="true" />Verified</Pill>
            : <Pill tone="cold" dot="live">{step === 0 ? 'Finding' : 'Verifying'}</Pill>}
        </span>
      </div>
      <div className="hv-contact-row"><span className="hv-faint">Domain</span><span className="hv-data">northbeam.io</span><span /></div>
      <div className="hv-contact-row"><span className="hv-faint">Size</span><span>51 to 200</span><span /></div>
      <div className="hv-contact-row"><span className="hv-faint">Industry</span><span>B2B software</span><span /></div>
      <div className="hv-checks" aria-hidden="true">
        <span className={step >= 1 ? 'on' : ''}><Check size={12} />Provider match</span>
        <span className={step >= 2 ? 'on' : ''}><Check size={12} />Verifier check</span>
      </div>
    </div>
  )
}

/* 7.4 Openers. */
const OPENERS = [
  { kind: 'From a comment', icon: MessageSquare, text: 'Your point about churn starting in week two matched what we see too: most teams lose people before the first report lands.' },
  { kind: 'From a reaction', icon: ThumbsUp, text: 'Saw you follow the onboarding churn conversation. Week-two drop-off seems to be the part most CS teams are rethinking.' },
]
function OpenersVisual() {
  const { ref, step } = useLoopStep(2, 5200)
  const typed = useTyping(OPENERS[step].text, true, 26)
  return (
    <div ref={ref} className="hv-openers" role="img" aria-label="Two openers: one written from a comment, one from a reaction">
      {OPENERS.map((o, i) => {
        const active = i === step
        const text = active ? typed : OPENERS[i].text
        return (
          <div key={o.kind} className={`hv-opener-mini${active ? ' active' : ''}`}>
            <div className="hv-opener-mini-top"><span><o.icon size={12} aria-hidden="true" />{o.kind}</span><span className="hv-data hv-faint">{text.length} / 240</span></div>
            <p className="hv-opener-box"><span>{text}</span><span className="hv-ghost-text">{OPENERS[i].text.slice(text.length)}</span></p>
          </div>
        )
      })}
    </div>
  )
}

/* 7.5 Exports: the Push menu over the selection bar. */
const PUSH = [
  { l: 'HubSpot', s: 'Growth and up' }, { l: 'Pipedrive', s: 'Growth and up' }, { l: 'Download CSV', s: 'With opener column' }, { l: 'Webhook', s: 'Signed, to Zapier or Make' },
]
function PushVisual() {
  const { ref, step } = useLoopStep(6, 900)
  const hi = Math.min(step, 3)
  const done = step >= 5
  return (
    <div ref={ref} className="hv-push" role="img" aria-label="Push menu open over a selection of 3 leads, with HubSpot, Pipedrive, CSV and webhook options">
      <div className="hv-frame hv-push-menu">
        {PUSH.map((p, i) => (
          <div key={p.l} className={`hv-push-item${i === (done ? 0 : hi) ? ' hi' : ''}`}>
            {i === 3 ? <Webhook size={14} aria-hidden="true" /> : <ExternalLink size={14} aria-hidden="true" />}
            <span>{p.l}</span><span className="hv-faint">{p.s}</span>
          </div>
        ))}
      </div>
      <div className="hv-selbar">
        <span><span className="hv-data">3</span> selected</span>
        <span className="hv-selbar-actions"><span>Save to list</span><span className="on">Push</span></span>
      </div>
      <div className={`hv-push-toast${done ? ' on' : ''}`} aria-hidden="true"><Check size={12} />Pushed 3 leads to HubSpot</div>
    </div>
  )
}

/* Digest tile: the inbox at 06:58, then the digest lands. */
function DigestTileVisual() {
  const { ref, step } = useLoopStep(5, 1100)
  const times = ['06:58', '06:59', '07:00', '07:00', '07:00']
  const landed = step >= 2
  return (
    <div ref={ref} className="hv-inbox" role="img" aria-label="An inbox at 7:00 with the Harvest digest arriving: 12 warm leads from yesterday's posts">
      <div className="hv-inbox-bar"><span>Inbox</span><span className="hv-data">{times[step]}</span></div>
      <div className="hv-inbox-list">
        <div className="hv-inbox-slot">
        <div className={`hv-inbox-wait${landed ? ' off' : ''}`} aria-hidden="true"><i className="hv-dot hv-dot-live" />Digest arrives at 07:00</div>
        <div className={`hv-inbox-row new${landed ? ' on' : ''}`}>
          <Mark size={18} />
          <span className="hv-inbox-main"><b>Harvest</b><span><b>12 warm leads from yesterday's posts</b> · Sam Lee · Hot · 86 · Head of Customer Success at Northbeam</span></span>
          <span className="hv-data hv-faint">07:00</span>
        </div>
        </div>
        <div className="hv-inbox-row"><Avatar name="Ana Ortiz" tone={2} /><span className="hv-inbox-main"><b>Ana Ortiz</b><span>Re: Thursday call notes</span></span><span className="hv-data hv-faint">Mon</span></div>
        <div className="hv-inbox-row"><Avatar name="Billing Team" tone={3} /><span className="hv-inbox-main"><b>Accounts</b><span>October invoice for your records</span></span><span className="hv-data hv-faint">Mon</span></div>
      </div>
      <div className={`hv-inbox-peek${step >= 3 ? ' on' : ''}`}>
        <span className="hv-faint">Why they fit</span>
        <span><Check size={12} aria-hidden="true" />Head of CS, your exact title</span>
        <span><Check size={12} aria-hidden="true" />51 to 200 staff, B2B software</span>
        <span><Check size={12} aria-hidden="true" />Commented, not just a like</span>
      </div>
    </div>
  )
}

/* 7.6 Safe by design. */
const SAFE = ['Never logs in as you', 'Never messages anyone', 'Forget anyone in one click']
function SafeVisual() {
  const { ref, step } = useLoopStep(5, 900)
  return (
    <div ref={ref} className="hv-safe" role="img" aria-label="Checklist: never logs in as you, never messages anyone, forget anyone in one click">
      {SAFE.map((s, i) => (
        <div key={s} className="hv-safe-row">
          <span className={`hv-safe-check${step > i ? ' on' : ''}`} aria-hidden="true">
            <motion.span initial={false} animate={{ scale: step > i ? 1 : 0.6, opacity: step > i ? 1 : 0 }} transition={{ duration: 0.24, ease: MORPH }}><Check size={12} /></motion.span>
          </span>
          <span>{s}</span>
        </div>
      ))}
      <div className="hv-safe-foot"><span className="hv-faint">LinkedIn password or cookie</span><span className="hv-data">never stored</span></div>
    </div>
  )
}

export function Features() {
  return (
    <section className="hv-section hv-band" id="features">
      <div className="hv-rail">
        <SectionHead eyebrow="Inside Harvest" title="From a public post to a lead you can email." />
        <div className="hv-bento">
          <Tile className="hv-t-sources" eyebrow="Sources" title="Track your posts, your competitors' and your niche's creators."
            body="Paste a post link or a profile link. Creators are checked every night, and every new post they publish is collected at 24 hours, 3 days and 7 days, when most of the engagement has happened.">
            <SourcesVisual />
          </Tile>
          <Tile className="hv-t-icp" delay={0.06} eyebrow="Targeting" title="Only the people who fit get looked up."
            body="Describe your buyer in a sentence. Harvest turns it into titles, seniority, company size, industries and countries, filters every engager on their headline first, and only then finds a role, company and email for the ones that fit. Students, job seekers and other vendors never reach your inbox.">
            <IcpVisual />
          </Tile>
          <Tile className="hv-t-third" eyebrow="Contact data" title="Role, company, size and an email that is checked twice."
            body="Each lead gets a current title, company, headcount, industry and a work email from a commercial data provider, then a second check with an email verifier. Invalid addresses are removed, catch-all domains are marked.">
            <ContactVisual />
          </Tile>
          <Tile className="hv-t-third" delay={0.06} eyebrow="Openers" title="A first line that proves you are not spamming."
            body="Every lead comes with a one or two sentence opener about the topic they engaged with or the point they made in their comment. No flattery, no links, no 'I saw your comment'. Edit it or copy it as is.">
            <OpenersVisual />
          </Tile>
          <Tile className="hv-t-third" delay={0.12} eyebrow="Exports" title="One click to HubSpot, Pipedrive, a CSV or any webhook."
            body="Push a lead or a whole list to your CRM with a note about what they engaged with. Export a CSV with the opener column for Smartlead or Instantly, or send signed webhooks to Zapier, Make or Clay.">
            <PushVisual />
          </Tile>
          <Tile className="hv-t-digest" eyebrow="Your digest" title="Your digest lands at 7:00."
            body="At 7am: the 20 warmest people, why they fit, an opener, and a push button.">
            <DigestTileVisual />
          </Tile>
          <Tile className="hv-t-safe" delay={0.06} eyebrow="Your account" title="Harvest never touches your LinkedIn login."
            body="No cookies, no browser extension, no auto-connects, no DMs. Harvest reads public engagement on posts you choose using third-party data providers, keeps only what it needs, and forgets anyone you ask it to.">
            <SafeVisual />
          </Tile>
        </div>
      </div>
    </section>
  )
}

