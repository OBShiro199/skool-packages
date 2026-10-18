import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { Check, ChevronDown, Clock, Download, FileSpreadsheet, MessageSquareWarning, Pause, Play, RotateCcw, Search } from 'lucide-react'
import { Button, ConfBadge, EASE, MORPH, Page, Reveal, SectionHead, StatePill, TrialButton, Wordmark, scrollToId, track } from './shared'
import { PIPELINE } from './pipeline'

/* ------------------------------------------------------------------ 5. Problem */

const PAINS = [
  { icon: Search, t: 'Who answered this last time?', b: 'Ctrl+F through last quarter’s questionnaire, copy one cell at a time, and hope the backup policy has not changed since.' },
  { icon: MessageSquareWarning, t: 'ChatGPT said yes.', b: 'Confident answers with no source. Nobody can tell which ones were checked, and one wrong yes can come back in a contract.' },
  { icon: Clock, t: 'The CTO has 40 of these.', b: 'Your most expensive people spend a day a week on homework instead of the product.' },
]

export function Problem() {
  return (
    <Page id="problem" clause="1" note="Why this exists" labelledBy="ds-prob-h">
      <SectionHead id="ds-prob-h" eyebrow="The deal is waiting on a spreadsheet" title="Procurement sent 400 questions. The deal is stuck until you answer them." />
      <ul className="ds-pains">
        {PAINS.map(({ icon: Icon, t, b }, i) => (
          <Reveal as="li" key={t} delay={i * 0.08} className="ds-pain">
            <span className="ds-pain-icon"><Icon size={18} strokeWidth={1.5} aria-hidden="true" /></span>
            <h3 className="ds-h3">{t}</h3>
            <p>{b}</p>
          </Reveal>
        ))}
      </ul>
      <Reveal className="ds-closing">
        <p>A 250-question questionnaire takes 10 to 20 hours. It should take one.</p>
      </Reveal>
    </Page>
  )
}

/* ------------------------------------------------------------------ 6. Product demo (built in code) */

const SCENES: [number, string][] = [
  [0, 'Upload the buyer’s XLSX'],
  [6, 'Check the columns'],
  [14, 'Draft all 388 questions'],
  [24, 'Open a low-confidence answer and read the source'],
  [34, 'Redraft: “say yes and mention SSO”'],
  [42, 'Approve and save to the library'],
  [48, 'Export the same file'],
  [54, 'Open it in Excel, answers in place'],
]
const DURATION = 60
const CHIPS: [number, string][] = [[6, 'Check the columns'], [24, 'Read the source'], [48, 'Export the same file']]
const DEMO_ROWS: [string, string, string][] = [
  ['4.1', 'Is customer data encrypted at rest?', 'Yes. AES-256 with keys in AWS KMS.'],
  ['4.2', 'Do you run annual penetration tests?', 'Yes. Annually, by an external firm.'],
  ['4.3', 'Is single sign-on supported?', 'No.'],
  ['4.4', 'How long are backups retained?', '35 days, tested every quarter.'],
  ['4.5', 'Where is customer data hosted?', 'AWS eu-west-1 (Ireland).'],
]
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

function DemoStage({ t }: { t: number }) {
  let s = 0
  SCENES.forEach(([at], i) => { if (t >= at) s = i })
  const sceneT = t - SCENES[s][0]
  const filled = s < 2 ? 0 : s === 2 ? Math.min(5, Math.floor(sceneT / 1.6) + 1) : 5
  const redrafted = s >= 4
  const approved = s >= 5
  return (
    <div className="ds-stage" aria-hidden="true">
      {s === 0 ? (
        <div className="ds-drop">
          <FileSpreadsheet size={28} strokeWidth={1.25} />
          <span className="ds-mono">acme-vendor-review.xlsx</span>
          <span className="ds-drop-track"><span style={{ transform: `scaleX(${Math.min(1, sceneT / 5)})` }} /></span>
          <span className="ds-faint">Reading file · 3 sheets</span>
        </div>
      ) : (
        <div className={`ds-stage-sheet ${s === 7 ? 'is-excel' : ''}`}>
          <div className="ds-stage-bar">
            <span className="ds-mono">{s === 7 ? 'acme-vendor-review.xlsx · Excel' : 'Acme Corp vendor review'}</span>
            {s >= 2 && s < 7 && <span className="ds-stage-count ds-num">{s === 2 ? `Drafting ${Math.min(388, Math.round((sceneT / 10) * 388))} of 388` : approved ? '388 approved' : '40 need review'}</span>}
          </div>
          <table className="ds-xl ds-stage-table">
            <thead><tr><th /><th>A</th><th className={s === 1 ? 'is-qcol' : ''}>B {s === 1 && <em>Questions</em>}</th><th className={s === 1 ? 'is-acol' : ''}>C {s === 1 && <em>Answers</em>}</th>{s > 1 && s < 7 && <th className="ds-stage-th-s">Status</th>}</tr></thead>
            <tbody>
              {DEMO_ROWS.map(([id, q, a], i) => {
                const isLow = i === 2
                const has = i < filled
                const answer = isLow && redrafted ? null : a
                return (
                  <tr key={id} className={isLow && (s === 3 || s === 4) ? 'is-focus' : ''}>
                    <td>{i + 2}</td>
                    <td className="ds-num">{id}</td>
                    <td><span className="ds-ell">{q}</span></td>
                    <td className={has ? 'is-fill' : ''}>
                      {has && (answer
                        ? <span className="ds-ell">{answer}</span>
                        : <span className="ds-ell ds-redline-inline"><del>No.</del> <ins>Yes. SSO via SAML 2.0 on every plan.</ins></span>)}
                    </td>
                    {s > 1 && s < 7 && (
                      <td className="ds-stage-st">
                        {has && (approved ? <StatePill state="Approved" /> : isLow && !redrafted ? <ConfBadge band="Low" score={41} /> : <ConfBadge band="High" score={isLow ? 88 : 90 + i} />)}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
          {(s === 3 || s === 4) && (
            <motion.div className="ds-stage-evi ds-frame" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE }}>
              <span className="ds-faint">Product security overview, p. 3</span>
              <p><mark className="ds-mark-q">SAML 2.0 single sign-on is available on every plan.</mark></p>
              {s === 4 && <span className="ds-stage-prompt ds-mono">› say yes and mention SSO</span>}
            </motion.div>
          )}
          {(s === 5 || s === 6) && (
            <motion.span className="ds-toast ds-stage-toast" key={s} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: EASE }}>
              {s === 5 ? <><Check size={14} strokeWidth={2} /> Saved to library</> : <><Download size={14} strokeWidth={1.5} /> Exported</>}
            </motion.span>
          )}
        </div>
      )}
    </div>
  )
}

export function Demo() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5 })
  const reduce = useReducedMotion()
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [started, setStarted] = useState(false)
  const autoplayed = useRef(false)

  useEffect(() => {
    if (inView && !reduce && !autoplayed.current) { autoplayed.current = true; setStarted(true); setPlaying(true) }
    if (!inView) setPlaying(false)
  }, [inView, reduce])
  useEffect(() => {
    const on = () => { setT(0); setStarted(true); setPlaying(true); autoplayed.current = true; track('lp_demo_played') }
    window.addEventListener('ds-play-demo', on)
    return () => window.removeEventListener('ds-play-demo', on)
  }, [])
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => setT((v) => {
      if (v + 0.25 >= DURATION) { setPlaying(false); return DURATION }
      return v + 0.25
    }), 250)
    return () => window.clearInterval(id)
  }, [playing])

  let s = 0
  SCENES.forEach(([at], i) => { if (t >= at) s = i })
  const ended = t >= DURATION
  const toggle = () => {
    if (ended) { setT(0); setPlaying(true); return }
    if (!playing) track('lp_demo_played'); else track('lp_demo_paused', { seconds_watched: Math.round(t) })
    setStarted(true); setPlaying((p) => !p)
  }
  const seek = (at: number) => { setT(at); setStarted(true); setPlaying(true) }

  return (
    <Page id="demo" clause="2" note="Sixty seconds, start to finish" band labelledBy="ds-demo-h">
      <SectionHead id="ds-demo-h" eyebrow="See it work" title="388 questions in. A filled spreadsheet out." />
      <Reveal>
        <div className="ds-player ds-frame" ref={ref}>
          <p className="ds-sr" aria-live="polite">{started ? `Step ${s + 1} of ${SCENES.length}: ${SCENES[s][1]}` : ''}</p>
          <DemoStage t={started ? t : 54} />
          {!started && (
            <button type="button" className="ds-play-big" onClick={toggle} aria-label="Play the 60 second demo">
              <Play size={22} strokeWidth={1.5} />
            </button>
          )}
          <div className="ds-caption" aria-hidden="true">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span key={started ? s : 'poster'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE }}>
                {started ? SCENES[s][1] : 'Upload, check, draft, review, export'}
              </motion.span>
            </AnimatePresence>
          </div>
          <div className="ds-controls">
            <button type="button" className="ds-ctl" onClick={toggle} aria-label={ended ? 'Replay demo' : playing ? 'Pause demo' : 'Play demo'}>
              {ended ? <RotateCcw size={15} strokeWidth={1.5} /> : playing ? <Pause size={15} strokeWidth={1.5} /> : <Play size={15} strokeWidth={1.5} />}
            </button>
            <div className="ds-scrub" role="progressbar" aria-label="Demo progress" aria-valuemin={0} aria-valuemax={DURATION} aria-valuenow={Math.round(t)}>
              <span style={{ transform: `scaleX(${t / DURATION})` }} />
              {SCENES.map(([at]) => <i key={at} style={{ left: `${(at / DURATION) * 100}%` }} />)}
            </div>
            <span className="ds-num ds-time">{fmt(t)} / 1:00</span>
          </div>
        </div>
      </Reveal>
      <ul className="ds-chips">
        {CHIPS.map(([at, l]) => (
          <li key={at}>
            <button type="button" className={`ds-chip ${started && t >= at && t < at + 6 ? 'is-on' : ''}`} onClick={() => seek(at)}>
              <span className="ds-mono">{fmt(at)}</span>{l}
            </button>
          </li>
        ))}
      </ul>
    </Page>
  )
}

/* ------------------------------------------------------------------ 8. How it works + the ASCII pipeline */

const STEPS = [
  ['Add your sources.', 'Policies, SOC 2 summary, past questionnaires, product docs. Ten minutes, once.'],
  ['Drop in the questionnaire.', 'XLSX, DOCX, PDF or pasted text. Check the columns, click Draft all.'],
  ['Review and export.', 'Fix the flagged ones, approve, and download the same file with every answer filled.'],
]

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  return (
    <Page id="how" clause="4" note="The whole method" band labelledBy="ds-how-h">
      <SectionHead id="ds-how-h" eyebrow="How it works" title="Three steps, about an hour." />
      <div className="ds-steps" ref={ref}>
        <motion.span className="ds-steps-line" aria-hidden="true" initial={{ scaleX: reduce ? 1 : 0 }} animate={{ scaleX: inView || reduce ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.6, ease: MORPH }} />
        <ol>
          {STEPS.map(([t, b], i) => (
            <Reveal as="li" key={t} delay={i * 0.08} className="ds-step">
              <span className="ds-step-n ds-num">{i + 1}</span>
              <h3 className="ds-h3">{t}</h3>
              <p>{b}</p>
            </Reveal>
          ))}
        </ol>
      </div>
      <Reveal className="ds-ascii ds-frame">
        <div className="ds-ascii-bar"><span className="ds-mono">what happens to one question</span><span className="ds-faint">Fig. 1</span></div>
        <pre aria-label="Diagram: your sources are chunked and indexed. Each question from the buyer's file searches them and gets the top 6 passages. Dossier drafts from those passages only, checks every quote word for word and scores confidence from 0 to 100. Answers at 80 and over are ready; under 80 go to Needs review for you. Both end up in the same xlsx, answer cells only.">{PIPELINE}</pre>
      </Reveal>
    </Page>
  )
}

/* ------------------------------------------------------------------ 9. Comparison */

const COLS: [string, string | null][] = [
  ['Dossier', null],
  ['Loopio', 'https://loopio.com/pricing/'],
  ['Responsive', 'https://www.responsive.io/pricing'],
  ['Conveyor', 'https://www.conveyor.com/pricing'],
  ['Vanta (questionnaire add-on)', 'https://www.vanta.com/pricing'],
  ['Spreadsheet + ChatGPT', 'https://openai.com/chatgpt/pricing/'],
]
const ROWS: [string, ...string[]][] = [
  ['Price', 'From $249/month', 'About $20,000+/year [verify]', 'About $10,000+/year [verify]', 'Business about $9,600/year [verify]', 'Add-on about $10,000 to $25,000/year [verify]', '$20/month a seat'],
  ['Self-serve trial', '7 days', 'Demo first', 'Demo first', 'Free tier [verify]', 'Sales-led', 'n/a'],
  ['Answers cite your documents', 'Yes, with quote and page', 'Library-based', 'Library-based', 'Yes', 'Yes [verify]', 'No'],
  ['Confidence per answer', 'Yes, with reasons', '[verify]', '[verify]', 'Yes [verify]', '[verify]', 'No'],
  ['Fills the original XLSX', 'Yes, cells only', 'Yes', 'Yes', 'Yes', 'Yes [verify]', 'By hand'],
  ['Answer owners and review dates', 'Yes', 'Yes', 'Yes', '[verify]', '[verify]', 'No'],
  ['Needs a compliance platform', 'No', 'No', 'No', 'No', 'Yes (Vanta)', 'No'],
  ['Data used for training', 'Never', '[verify]', '[verify]', '[verify]', '[verify]', 'Depends on plan'],
]
function Cell({ v }: { v: string }) {
  if (v === '[verify]') return <span className="ds-unk">Not checked<sup>†</sup></span>
  if (v.endsWith(' [verify]')) return <>{v.replace(' [verify]', '')}<sup className="ds-dag">†</sup></>
  return <>{v}</>
}

export function Compare() {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.5 })
  const reduce = useReducedMotion()
  useEffect(() => { if (seen) track('lp_compare_viewed') }, [seen])
  return (
    <Page id="compare" clause="5" note="Side by side, with footnotes" labelledBy="ds-cmp-h">
      <SectionHead id="ds-cmp-h" eyebrow="Compare" title="Enterprise answer quality without the enterprise contract." />
      <Reveal className="ds-cmp-frame ds-frame">
        <div className="ds-cmp-scroll" ref={ref} tabIndex={0} role="region" aria-label="Comparison table, scrolls sideways">
          <table className="ds-cmp">
            <thead>
              <tr>
                <th scope="col"><span className="ds-sr">Feature</span></th>
                {COLS.map(([n, href]) => (
                  <th scope="col" key={n} className={href ? '' : 'is-us'}>
                    {href ? <a href={href} target="_blank" rel="noreferrer">{n}</a> : <span className="ds-cmp-us"><Wordmark /></span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, ...vals], i) => (
                <motion.tr key={label} initial={{ opacity: 0 }} animate={{ opacity: seen || reduce ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : i * 0.04, ease: EASE }}>
                  <th scope="row">{label}</th>
                  {vals.map((v, j) => <td key={j} className={j === 0 ? 'is-us' : ''}><Cell v={v} /></td>)}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </Reveal>
      <p className="ds-fine">Competitor prices from public reviews and comparison pages, checked Oct 2026. They change, so we link each one. † Not yet confirmed on the vendor’s own page.</p>
    </Page>
  )
}

/* ------------------------------------------------------------------ 11. Pricing */

type Plan = { id: string; name: string; monthly: string; annualMo: string; annual: string; spokenMo: string; for: string; pop?: boolean; rows: [string, string][] }
const PLANS: Plan[] = [
  {
    id: 'team', name: 'Team', monthly: '249', annualMo: '207.50', annual: '$2,490', spokenMo: '207 dollars 50',
    for: 'For your first enterprise deals. About 4 questionnaires a month.',
    rows: [['Questions answered a month', '1,000'], ['Seats', '5'], ['Source documents', '300'], ['Parsed pages a month', '3,000'], ['Answer library', 'Unlimited'], ['XLSX, DOCX, PDF and CSV export', 'Yes'], ['Auto-assign by section, two-step approval', ''], ['Audit log', '90 days']],
  },
  {
    id: 'business', name: 'Business', monthly: '599', annualMo: '499.17', annual: '$5,990', spokenMo: '499 dollars 17', pop: true,
    for: 'For teams answering every week. About 15 questionnaires a month.',
    rows: [['Questions answered a month', '4,000'], ['Seats', '15'], ['Source documents', '1,500'], ['Parsed pages a month', '10,000'], ['Answer library', 'Unlimited'], ['XLSX, DOCX, PDF and CSV export', 'Yes'], ['Auto-assign by section, two-step approval', 'Yes'], ['Audit log', '1 year, CSV export']],
  },
  {
    id: 'scale', name: 'Scale', monthly: '1,299', annualMo: '1,082.50', annual: '$12,990', spokenMo: '1,082 dollars 50',
    for: 'For sales and security teams at volume. About 40 a month.',
    rows: [['Questions answered a month', '10,000'], ['Seats', '40'], ['Source documents', '5,000'], ['Parsed pages a month', '30,000'], ['Answer library', 'Unlimited'], ['XLSX, DOCX, PDF and CSV export', 'Yes'], ['Auto-assign by section, two-step approval', 'Yes'], ['Audit log', '3 years, CSV export']],
  },
]

export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const reduce = useReducedMotion()
  const set = (a: boolean) => { if (a !== annual) { setAnnual(a); track('lp_pricing_toggled', { interval: a ? 'year' : 'month' }) } }
  return (
    <Page id="pricing" clause="6" note="Billed by the question" band labelledBy="ds-price-h">
      <SectionHead id="ds-price-h" eyebrow="Pricing" title="Priced per question answered, not per seat." />
      <div className="ds-toggle-row">
        <div className="ds-toggle" role="radiogroup" aria-label="Billing interval">
          <motion.span className="ds-toggle-thumb" aria-hidden="true" animate={{ x: annual ? '100%' : '0%' }} transition={{ duration: reduce ? 0 : 0.2, ease: MORPH }} />
          {([['Monthly', false], ['Annual', true]] as const).map(([l, a]) => (
            <button
              key={l} type="button" role="radio" aria-checked={annual === a} className={annual === a ? 'is-on' : ''} tabIndex={annual === a ? 0 : -1}
              onClick={() => set(a)}
              onKeyDown={(e) => {
                if (['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                  e.preventDefault(); set(!annual)
                  const sib = e.currentTarget.parentElement?.querySelectorAll('button')[annual ? 0 : 1] as HTMLButtonElement | undefined
                  sib?.focus()
                }
              }}
            >{l}</button>
          ))}
        </div>
        <span className="ds-eyebrow is-quiet">2 months free</span>
      </div>
      <p className="ds-sr" aria-live="polite">{annual ? 'Showing annual prices, billed yearly' : 'Showing monthly prices'}</p>
      <ul className="ds-plans">
        {PLANS.map((p, i) => (
          <Reveal as="li" key={p.id} delay={i * 0.08} className={`ds-plan ${p.pop ? 'is-pop' : ''}`}>
            <div className="ds-plan-top">
              <h3 className="ds-h3">{p.name}</h3>
              <span className={`ds-eyebrow ${p.pop ? '' : 'is-hidden'}`} aria-hidden={!p.pop}>Most teams pick this</span>
            </div>
            <p className="ds-plan-for">{p.for}</p>
            <div className="ds-price" aria-label={annual ? `${p.spokenMo} a month, billed yearly at ${p.annual}` : `${p.monthly} dollars a month`}>
              <span className="ds-price-cur" aria-hidden="true">$</span>
              <span className="ds-price-slot" aria-hidden="true">
                <span className="is-ghost">{p.annualMo}</span>
                <AnimatePresence initial={false}>
                  <motion.span key={annual ? 'a' : 'm'} className="ds-price-v" initial={{ opacity: 0, y: reduce ? 0 : 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: reduce ? 0 : -6 }} transition={{ duration: reduce ? 0 : 0.16, ease: EASE }}>
                    {annual ? p.annualMo : p.monthly}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="ds-price-per" aria-hidden="true">/mo</span>
            </div>
            <p className="ds-price-note">{annual ? `${p.annual} billed yearly` : 'Billed monthly'}</p>
            <Button onClick={() => track('lp_cta_clicked', { location: `pricing_${p.id}`, href: `/signup?plan=${p.id}&interval=${annual ? 'year' : 'month'}` })} href={`/signup?plan=${p.id}&interval=${annual ? 'year' : 'month'}`} variant={p.pop ? 'primary' : 'secondary'}>Start free trial</Button>
            <dl className="ds-plan-rows">
              {p.rows.map(([k, v]) => (
                <div key={k} className={v ? '' : 'is-off'}>
                  <dt>{k}</dt>
                  <dd className="ds-num">{v === 'Yes' ? <Check size={14} strokeWidth={2} aria-label="Included" /> : v || <span aria-label="Not included">–</span>}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        ))}
      </ul>
      <p className="ds-fine is-center">7 day free trial with 150 questions. Every draft and redraft counts as one question. Answers you reuse by hand from the library are free.</p>
    </Page>
  )
}

/* ------------------------------------------------------------------ 12. FAQ */

export const FAQ: [string, string][] = [
  ['Is my data used to train AI models?', 'No. Drafting uses Anthropic’s commercial API, which does not train on API data by default. Search uses Voyage AI with training opt-out on. Our security page lists every vendor.'],
  ['What file types can I upload?', 'Questionnaires as XLSX, DOCX, PDF or pasted text. Sources as PDF, DOCX, XLSX, Markdown or text, up to 50 MB each.'],
  ['Will it break my buyer’s spreadsheet?', 'No. Dossier writes only into the answer cells you confirm and leaves every other cell, sheet, colour, dropdown and formula alone.'],
  ['What happens when Dossier does not know?', 'It says so. Answers with no supporting passage are flagged “No source”, scored low and never marked ready on their own.'],
  ['How is confidence worked out?', 'From how closely the cited passages match the question and how sure the model was, with caps for missing, stale or conflicting sources. You set the threshold.'],
  ['What counts as a question?', 'Every draft or redraft of one question. A 250-question questionnaire drafted once uses 250. Editing and approving are free.'],
  ['What if we run out of questions mid-month?', 'Drafting pauses and everything else keeps working. You can draft part of a questionnaire or upgrade for the rest of the month.'],
  ['Can my team work on one questionnaire together?', 'Yes. Assign questions or sections, comment with @mentions, and approve. Roles control who can approve and export.'],
  ['Do you support SOC 2, ISO 27001, CAIQ and SIG questionnaires?', 'Yes. They are spreadsheets or documents like any other. Dossier answers from whatever evidence you upload.'],
  ['Can I import our past answers?', 'Yes. Upload a completed questionnaire as a source and approve its answers into the library in bulk.'],
  ['Is there a contract?', 'No. Monthly or annual, cancel from the billing page.'],
  ['Do you fill buyer portals like OneTrust or Whistic?', 'Not yet. Export to XLSX or CSV and import it there.'],
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(null)
  const reduce = useReducedMotion()
  return (
    <Page id="faq" clause="7" note="Questions, answered with sources" labelledBy="ds-faq-h">
      <SectionHead id="ds-faq-h" eyebrow="FAQ" title="The questionnaire about the questionnaire tool." />
      <div className="ds-faq">
        {FAQ.map(([q, a], i) => {
          const isOpen = open === i
          return (
            <div key={q} className={`ds-faq-item ${isOpen ? 'is-open' : ''}`}>
              <h3>
                <button type="button" id={`ds-faq-q${i}`} aria-expanded={isOpen} aria-controls={`ds-faq-a${i}`} onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('lp_faq_opened', { index: i }) }}>
                  <span className="ds-faq-n ds-mono" aria-hidden="true">Q{String(i + 1).padStart(2, '0')}</span>
                  <span className="ds-faq-q">{q}</span>
                  <ChevronDown size={16} strokeWidth={1.75} className="ds-faq-chev" aria-hidden="true" />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div id={`ds-faq-a${i}`} role="region" aria-labelledby={`ds-faq-q${i}`} className="ds-faq-a" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.2, ease: MORPH }}>
                    <p><span className="ds-faq-n ds-mono" aria-hidden="true">A</span>{a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </Page>
  )
}

/* ------------------------------------------------------------------ 13. Final CTA + 14. Footer */

export function FinalCta() {
  return (
    <Page id="final" clause="8" note="Next step" tint labelledBy="ds-final-h">
      <Reveal className="ds-final">
        <h2 className="ds-h2" id="ds-final-h">Answer the next questionnaire in an afternoon.</h2>
        <p className="ds-sub">Add your sources once. Every questionnaire after that starts mostly done.</p>
        <div className="ds-hero-ctas">
          <TrialButton location="final" size="lg" />
          <Button variant="secondary" size="lg" onClick={() => { track('lp_security_clicked', { location: 'final' }); scrollToId('data-handling') }}>Read our security page</Button>
        </div>
      </Reveal>
    </Page>
  )
}

const FOOT: [string, [string, string][]][] = [
  ['Product', [['Features', 'features'], ['Pricing', 'pricing'], ['Compare', 'compare'], ['Changelog', '']]],
  ['Security', [['Security page', 'data-handling'], ['Subprocessors', 'data-handling'], ['Data handling', 'data-handling']]],
  ['Resources', [['Documentation', ''], ['Questionnaire glossary', ''], ['Blog', '']]],
  ['Company', [['Contact', ''], ['Privacy', ''], ['Terms', '']]],
]

export function Footer() {
  return (
    <footer className="ds-foot">
      <div className="ds-foot-grid">
        <div className="ds-foot-brand"><Wordmark /></div>
        {FOOT.map(([h, links]) => (
          <nav key={h} aria-label={h}>
            <h3>{h}</h3>
            <ul>
              {links.map(([l, id]) => (
                <li key={l}><a href={id ? `#${id}` : '#top'} onClick={(e) => { if (id) { e.preventDefault(); if (h === 'Security') track('lp_security_clicked', { location: 'footer' }); scrollToId(id) } }}>{l}</a></li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="ds-foot-base">
        <span>© 2026 Dossier</span>
        <span>Your documents are never used to train AI models.</span>
      </div>
    </footer>
  )
}

