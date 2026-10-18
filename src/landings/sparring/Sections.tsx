import { useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Check, ChevronDown, Flame, Ear, Users, Minus } from 'lucide-react'
import { EASE, Eyebrow, MORPH, Reveal, TrialButton, Wordmark, track } from './shared'

/* 4. Logo strip */
const ROLES = ['SDR teams', 'BDR managers', 'Sales bootcamps', 'Founders selling B2B', 'Agency new business', 'Recruitment desks']
export function LogoStrip() {
  return (
    <section className="sp-strip" aria-label="Who Sparring is for">
      <div className="sp-wrap">
        <Reveal>
          <p className="sp-strip-l">Built for people who have to pick up the phone</p>
          <ul className="sp-roles">{ROLES.map((r) => <li key={r}>{r}</li>)}</ul>
        </Reveal>
      </div>
    </section>
  )
}

/* 5. Problem */
const PROBLEMS = [
  { icon: Flame, h: 'Burned the best accounts.', p: 'New reps practise on the territory you spent months building. Each fumbled opener is a prospect who will not pick up again.' },
  { icon: Users, h: 'Roleplay on Friday, maybe.', p: 'Managers mean to roleplay every week. It happens twice a month, the manager plays nice, and the feedback comes from memory.' },
  { icon: Ear, h: 'Nobody hears the call.', p: 'Without a recording and a score, nobody knows if the opener got better or the same objection killed ten calls this week.' },
]
export function Problem() {
  return (
    <section className="sp-section" aria-labelledby="sp-prob-h">
      <div className="sp-wrap">
        <Reveal className="sp-head">
          <Eyebrow>Why reps ramp slowly</Eyebrow>
          <h2 id="sp-prob-h" className="sp-h2">Every rep learns to cold call on real prospects. That is the expensive way.</h2>
        </Reveal>
        <div className="sp-cols">
          {PROBLEMS.map(({ icon: Icon, h, p }, i) => (
            <Reveal key={h} className="sp-col" delay={i * 0.08}>
              <Icon size={18} strokeWidth={1.5} className="sp-col-i" aria-hidden="true" />
              <h3 className="sp-h3">{h}</h3>
              <p className="sp-body">{p}</p>
            </Reveal>
          ))}
        </div>
        <Reveal><p className="sp-closer">Skill on the phone comes from reps. Make the reps free.</p></Reveal>
      </div>
    </section>
  )
}

/* 8. How it works, with the one ASCII diagram on the page */
const STEPS = [
  { h: 'Pick who you are calling.', p: 'Choose a persona, a scenario and a difficulty. Read the 3 line brief.' },
  { h: 'Make the call.', p: 'Press Call, use your headphones, and talk like it is real. Hang up when you are done (or when they hang up on you).' },
  { h: 'Read your scorecard.', p: 'Score out of 100, coaching notes on the recording, and one thing to fix. Run it again.' },
]
const ASCII = String.raw` you ───► persona ───► recording
 (mic)    (~1s reply)  + transcript
                            │
                            ▼
          Claude scores 5 lines × 20 pts
 opener ......... 16  [########..]
 permission ..... 14  [#######...]
 pain discovery . 11  [#####.....]
 objections ..... 13  [######....]
 next step ...... 18  [#########.]
                            │
                            ▼
 scorecard  72 / 100  Solid
 top fix    "ask, then wait"  ──► run it again`
export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  return (
    <section className="sp-section sp-band" id="how" aria-labelledby="sp-how-h">
      <div className="sp-wrap">
        <Reveal className="sp-head">
          <Eyebrow>How it works</Eyebrow>
          <h2 id="sp-how-h" className="sp-h2">Three steps, about five minutes.</h2>
        </Reveal>
        <div className="sp-steps" ref={ref}>
          <motion.span className="sp-steps-line" aria-hidden="true" initial={{ scaleX: reduce ? 1 : 0 }} animate={{ scaleX: inView ? 1 : reduce ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.6, ease: MORPH }} />
          {STEPS.map((s, i) => (
            <Reveal key={s.h} className="sp-step" delay={i * 0.08}>
              <span className="sp-step-n sp-num">{i + 1}</span>
              <h3 className="sp-h3">{s.h}</h3>
              <p className="sp-body">{s.p}</p>
            </Reveal>
          ))}
        </div>
        <Reveal className="sp-ascii-box">
          <div className="sp-ascii-bar"><span>what happens after you press Call</span><span>scoring pipeline</span></div>
          <pre className="sp-ascii" aria-label="Diagram: your voice goes to the persona, the call is recorded and transcribed, Claude scores five lines of 20 points each, giving a scorecard of 72 out of 100 and one top fix, then you run it again">{ASCII}</pre>
        </Reveal>
      </div>
    </section>
  )
}

/* 9. Comparison */
const COLS = ['Sparring', 'Hyperbound', 'Second Nature', 'PitchMonster', 'Manager roleplay']
const ROWS: [string, ...string[]][] = [
  ['Starting price', '$49/month, published', 'Free tier; paid is by quote (reported from about $40 to $250/user/mo) [verify]', 'By quote (reported about $30 to $40/user/mo, annual) [verify]', 'Reported $1,200/quarter for teams [verify]', 'Free, costs manager hours'],
  ['Buy without a sales call', 'Yes', 'Free tier only [verify]', 'No [verify]', 'No [verify]', 'n/a'],
  ['Live voice roleplay', 'Yes', 'Yes', 'Yes', 'Yes [verify]', 'Yes'],
  ['Built-in cold call personas', 'Yes, 3 + custom', 'Yes', 'Yes', 'Yes [verify]', '1 (your manager)'],
  ['Custom persona from your ICP and objections', 'Yes, in about a minute', 'Yes [verify]', 'Yes, with setup [verify]', '[verify]', 'n/a'],
  ['Score with timestamped coaching notes', 'Yes', 'Yes [verify]', 'Yes [verify]', 'Yes [verify]', 'From memory'],
  ['Assignments and leaderboards', 'Team and Floor', 'Yes', 'Yes', 'Yes [verify]', 'Spreadsheet'],
  ['Hard cap on usage, no overage', 'Yes', '[verify]', '[verify]', '[verify]', 'n/a'],
]
function Cell({ v }: { v: string }) {
  const verify = v.includes('[verify]')
  const text = v.replace(' [verify]', '').replace('[verify]', '')
  return <>{text || <span className="sp-faint">Unknown</span>}{verify && <span className="sp-verify">verify</span>}</>
}
export function Compare() {
  return (
    <section className="sp-section" id="compare" aria-labelledby="sp-cmp-h">
      <div className="sp-wrap">
        <Reveal className="sp-head">
          <Eyebrow>Compare</Eyebrow>
          <h2 id="sp-cmp-h" className="sp-h2">Built for teams of 1 to 16, priced on the page</h2>
        </Reveal>
        <p className="sp-swipe">Swipe to compare</p>
        <Reveal className="sp-table-wrap">
          <table className="sp-table">
            <thead>
              <tr>
                <th scope="col"><span className="sp-sr">Feature</span></th>
                {COLS.map((c, i) => <th scope="col" key={c} className={i === 0 ? 'is-us' : ''}>{i === 0 ? <span className="sp-us-chip">Sparring</span> : c}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, ...vals], r) => (
                <motion.tr key={label} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: r * 0.04 }}>
                  <th scope="row">{label}</th>
                  {vals.map((v, i) => <td key={i} className={i === 0 ? 'is-us' : ''}><Cell v={v} /></td>)}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Reveal>
        <p className="sp-fineprint">Competitor prices are from third-party comparisons in Oct 2026, because the vendors quote by demo. Confirm before you rely on them.</p>
        <p className="sp-after">Sparring is for teams that want to start today: pick a plan, invite the team, run the first drill this afternoon.</p>
      </div>
    </section>
  )
}

/* 10. Testimonials slot: dashed placeholders until three real quotes exist */
export function Testimonials() {
  return (
    <section className="sp-section sp-band" aria-labelledby="sp-tst-h">
      <div className="sp-wrap">
        <Reveal className="sp-head">
          <Eyebrow>Early teams</Eyebrow>
          <h2 id="sp-tst-h" className="sp-h2">What reps and managers say</h2>
        </Reveal>
        <div className="sp-quotes">
          {[0, 1, 2].map((i) => (
            <Reveal key={i} className="sp-quote" delay={i * 0.08}>
              <p className="sp-quote-q">Your first customer quote goes here</p>
              <p className="sp-body">Name, role, company. One number where possible, like "booked their first meetings in week 2 instead of week 5".</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* 11. Pricing */
type Plan = { id: string; name: string; m: string; y: string; ym: string; for: string; rows: [string, string][]; team: boolean; popular?: boolean }
const PLANS: Plan[] = [
  { id: 'solo', name: 'Solo', m: '49', y: '490', ym: '40.83', for: 'Founders and individual reps', team: false, rows: [['Seats', '1'], ['Practice minutes a month (pooled)', '90'], ['Longest call', '10 min'], ['Custom personas', '3'], ['Persona drafts a month', '5']] },
  { id: 'team', name: 'Team', m: '199', y: '1,990', ym: '165.83', for: 'SDR teams up to 5 reps + a manager', team: true, popular: true, rows: [['Seats', '6'], ['Practice minutes a month (pooled)', '360'], ['Longest call', '15 min'], ['Custom personas', '25'], ['Persona drafts a month', '30']] },
  { id: 'floor', name: 'Floor', m: '499', y: '4,990', ym: '415.83', for: 'Bigger floors and bootcamp cohorts', team: true, rows: [['Seats', '16'], ['Practice minutes a month (pooled)', '900'], ['Longest call', '20 min'], ['Custom personas', '500'], ['Persona drafts a month', '100']] },
]
const ALL = ['All built-in personas and scenarios', 'Score and coaching notes on every call', 'Recordings and transcripts for 90 days']
export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const reduce = useReducedMotion()
  const set = (a: boolean) => { setAnnual(a); track('lp_pricing_toggle', { interval: a ? 'year' : 'month' }) }
  return (
    <section className="sp-section" id="pricing" aria-labelledby="sp-price-h">
      <div className="sp-wrap">
        <Reveal className="sp-head sp-head-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 id="sp-price-h" className="sp-h2">Practice minutes for the whole team, on one card</h2>
          <p className="sp-lead">Every plan starts with a 7 day free trial with 20 practice minutes. Cancel any time from Billing.</p>
          <div className="sp-toggle-row">
            <div className="sp-toggle" role="radiogroup" aria-label="Billing interval">
              <button type="button" role="radio" aria-checked={!annual} className={!annual ? 'is-on' : ''} onClick={() => set(false)}>Monthly</button>
              <button type="button" role="radio" aria-checked={annual} className={annual ? 'is-on' : ''} onClick={() => set(true)}>Annual</button>
            </div>
            <span className="sp-chip-free">2 months free</span>
          </div>
        </Reveal>
        <div className="sp-plans">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} className={`sp-plan sp-plan-${p.id} ${p.popular ? 'is-pop' : ''}`} delay={i * 0.08}>
              <div className="sp-plan-top">
                <h3 className="sp-h3">{p.name}</h3>
                {p.popular && <span className="sp-chip-pop">Most popular</span>}
              </div>
              <p className="sp-plan-for">{p.for}</p>
              <div className="sp-price" aria-live="polite">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={annual ? 'y' : 'm'} className="sp-price-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}>
                    <span className="sp-price-n sp-big sp-num">${annual ? p.y : p.m}</span>
                    <span className="sp-price-int">{annual ? '/year' : '/month'}</span>
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="sp-price-sub sp-num">{annual ? `$${p.ym}/mo billed yearly` : 'Billed monthly'}</p>
              <a href={`/signup?plan=${p.id}&interval=${annual ? 'year' : 'month'}`} className={`sp-btn sp-btn-lg ${p.popular ? 'sp-btn-primary' : 'sp-btn-ghost'} sp-btn-block`} onClick={(e) => { e.preventDefault(); track('lp_cta_clicked', { location: `pricing_${p.id}` }) }}>Start free trial</a>
              <dl className="sp-plan-rows">
                {p.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="sp-num">{v}</dd></div>)}
                <div><dt>Assignments, leaderboard, trends</dt><dd>{p.team ? <Check size={15} aria-label="Included" /> : <Minus size={15} className="sp-faint" aria-label="Not included" />}</dd></div>
                <div><dt>Monday team report email</dt><dd>{p.team ? <Check size={15} aria-label="Included" /> : <Minus size={15} className="sp-faint" aria-label="Not included" />}</dd></div>
              </dl>
              <ul className="sp-ticks sp-plan-all">{ALL.map((a) => <li key={a}><Check size={14} strokeWidth={1.8} aria-hidden="true" />{a}</li>)}</ul>
            </Reveal>
          ))}
        </div>
        <p className="sp-closer">If 15 minutes a day gets one rep to their first meeting a week sooner, Team has paid for itself.</p>
        <p className="sp-fineprint sp-center">No setup fee, no contract, no overage. Calls stop at your minute cap.</p>
      </div>
    </section>
  )
}

/* 12. FAQ */
export const FAQ: [string, string][] = [
  ['Is the prospect a real person?', 'No. It is an AI persona with a realistic voice that answers in about a second. It is built to push back like a real buyer, so the practice feels like the real thing.'],
  ['Does Sparring call real people?', 'Never. Every call is between you and a practice persona in your browser. Nothing is dialled.'],
  ['What do I need?', 'A laptop or phone with a browser, a microphone and ideally headphones. Chrome, Edge, Safari and Firefox all work.'],
  ['How is the score worked out?', 'Claude scores each call against five lines (opener, permission, pain discovery, objection handling, next step), 20 points each, and pins coaching notes to the moments that decided them. The rubric is in the docs.'],
  ['Can I use my own buyer and objections?', 'Yes. Paste your ICP and the objections your team hears, and Sparring drafts a custom persona you can edit. Solo includes 3 custom personas, Team 25.'],
  ['What happens when we run out of minutes?', 'Calls stop, nothing is charged extra, and the owner gets an email at 80% and 100%. Minutes reset on your renewal day, or you can upgrade.'],
  ['Who can see my calls?', 'You, and the owner and managers of your workspace. Other reps see only scores on the leaderboard, not your recordings or notes.'],
  ['How long do you keep recordings?', '90 days, then they are deleted. Scores and notes stay.'],
  ['Is there a free trial?', 'Yes, 7 days with 20 practice minutes and 3 persona drafts. You add a card at the start and can cancel from Billing before it ends.'],
  ['Can a bootcamp use it for a cohort?', 'Yes. Floor gives 16 seats and 900 minutes a month. Assign drills as homework and watch the leaderboard.'],
  ['Do you support languages other than English?', 'Not yet. English (US, UK, Australian and Indian accents in the voices) only for now.'],
]
export function Faq() {
  const [open, setOpen] = useState<number | null>(null)
  const reduce = useReducedMotion()
  const base = useId()
  return (
    <section className="sp-section sp-band" id="faq" aria-labelledby="sp-faq-h">
      <div className="sp-wrap sp-faq-grid">
        <Reveal className="sp-head">
          <Eyebrow>FAQ</Eyebrow>
          <h2 id="sp-faq-h" className="sp-h2">Frequently asked questions</h2>
        </Reveal>
        <ul className="sp-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <li key={q}>
                <h3>
                  <button type="button" id={`${base}-q${i}`} aria-expanded={isOpen} aria-controls={`${base}-a${i}`} onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('lp_faq_opened', { index: i }) }}>
                    <span>{q}</span>
                    <ChevronDown size={16} className={`sp-chev ${isOpen ? 'is-open' : ''}`} aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`} className="sp-faq-a"
                      initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : 0.3, ease: MORPH }}>
                      <p>{a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* 13. Final CTA */
export function FinalCta() {
  return (
    <section className="sp-section sp-tint sp-final" aria-labelledby="sp-final-h">
      <div className="sp-wrap">
        <Reveal className="sp-head sp-head-center">
          <h2 id="sp-final-h" className="sp-h2">Make your next cold call your twentieth, not your first.</h2>
          <p className="sp-lead">Start a 7 day trial and run your first practice call in about two minutes.</p>
          <TrialButton location="final" />
          <p className="sp-fineprint">Takes 2 minutes. Cancel any time.</p>
        </Reveal>
      </div>
    </section>
  )
}

/* 14. Footer */
const FOOT: [string, string[]][] = [
  ['Product', ['Features', 'Pricing', 'Compare', 'Changelog']],
  ['Resources', ['Documentation', 'Cold call openers', 'Objection handling guide', 'Free practice call']],
  ['Company', ['About', 'Contact']],
  ['Legal', ['Privacy', 'Terms']],
]
const HREF: Record<string, string> = { Features: '#features', Pricing: '#pricing', Compare: '#compare' }
export function Footer() {
  return (
    <footer className="sp-footer">
      <div className="sp-wrap">
        <div className="sp-foot-cols">
          {FOOT.map(([h, links]) => (
            <nav key={h} aria-label={h}>
              <h3>{h}</h3>
              <ul>{links.map((l) => <li key={l}><a href={HREF[l] ?? '#'} onClick={(e) => { if (!HREF[l]) e.preventDefault() }}>{l}</a></li>)}</ul>
            </nav>
          ))}
        </div>
        <div className="sp-foot-bottom">
          <Wordmark />
          <span>Practice that hits back.</span>
          <span className="sp-num">© {new Date().getFullYear()} Sparring</span>
        </div>
      </div>
    </footer>
  )
}
