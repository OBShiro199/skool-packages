import { type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, Download, FileText, MousePointer2, ShieldCheck } from 'lucide-react'
import { Cite, ConfBadge, EASE, LOOP, MORPH, Page, Reveal, SectionHead, StatePill, type Band, useLoopStep } from './shared'

type TileProps = {
  cls: string; id?: string; eyebrow: string; title: string; body: string; bullets: string[]; visual: ReactNode; delay?: number
}

function Tile({ cls, id, eyebrow, title, body, bullets, visual, delay = 0 }: TileProps) {
  return (
    <li className={`ds-tile ${cls}`} id={id}>
      <Reveal className="ds-tile-visual" delay={delay}>{visual}</Reveal>
      <Reveal className="ds-tile-copy" delay={delay + 0.08}>
        <span className="ds-tile-eyebrow">{eyebrow}</span>
        <h3 className="ds-h3">{title}</h3>
        <p className="ds-tile-body">{body}</p>
        <ul className="ds-bullets">
          {bullets.map((b) => <li key={b}><Check size={14} strokeWidth={1.75} aria-hidden="true" />{b}</li>)}
        </ul>
      </Reveal>
    </li>
  )
}

/* 7.1 Citation chips take turns; a 1px teal line draws from the selected chip to the evidence card. */
const PASSAGES = [
  { doc: 'Information Security Policy, p. 7', pre: '8.2 Storage. ', quote: 'Customer data is encrypted at rest using AES-256.', post: ' Keys are held in AWS KMS.' },
  { doc: 'SOC 2 Type II report, p. 41', pre: 'CC6.1 ', quote: 'Backups inherit the encryption of the primary store.', post: ' Tested quarterly.' },
]
function CitationVisual() {
  const { ref, step, reduce } = useLoopStep(2, 2600)
  const p = PASSAGES[step]
  return (
    <div ref={ref} className="ds-v-cite" role="img" aria-label="An answer with two citation chips. The selected chip is joined by a teal line to an evidence card showing the quoted line, the page and the document.">
      <div className="ds-v-cite-ans ds-frame" aria-hidden="true">
        <span className="ds-mono ds-faint">4.1 · Is customer data encrypted at rest?</span>
        <p>Yes. Customer data is encrypted at rest with AES-256<sup className="ds-num">1</sup> and backups use the same encryption.<sup className="ds-num">2</sup></p>
        <div className="ds-ws-cites">
          <Cite n={1} label="InfoSec Policy, p. 7" on={step === 0} />
          <Cite n={2} label="SOC 2 report, p. 41" on={step === 1} />
        </div>
      </div>
      <svg className="ds-v-cite-line" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true">
        <motion.path
          key={step}
          d={step === 0 ? 'M18 0 V20 H60 V40' : 'M58 0 V20 H60 V40'}
          initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: reduce ? 0 : 0.5, ease: MORPH }}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="ds-v-cite-card ds-frame" aria-hidden="true">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={step} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: EASE }}>
            <div className="ds-evi-head"><FileText size={14} strokeWidth={1.5} /> {p.doc}</div>
            <p className="ds-evi-text">{p.pre}<mark className="ds-mark-q">{p.quote}</mark>{p.post}</p>
            <span className="ds-check-line"><Check size={12} strokeWidth={2} /> Quote matches the source word for word</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

/* 7.2 The list filters between all questions and Needs review. */
const REVIEW: [string, string, Band, number, string][] = [
  ['4.3', 'How long are backups retained?', 'Low', 48, 'Stale source'],
  ['6.2', 'Do you support customer-managed keys?', 'Low', 31, 'No source'],
  ['7.1', 'Where is customer data hosted?', 'Medium', 72, 'Conflicting documents'],
  ['9.4', 'Is MFA enforced for all staff?', 'Low', 55, 'Stale source'],
]
const ALL: [string, string, Band, number][] = [
  ['4.1', 'Is customer data encrypted at rest?', 'High', 92],
  ['4.2', 'Which key management service do you use?', 'High', 88],
  ['4.3', 'How long are backups retained?', 'Low', 48],
  ['4.4', 'Are backups tested for restore?', 'High', 90],
]
function ConfidenceVisual() {
  const { ref, step } = useLoopStep(2, 2800)
  const filtered = step === 1
  return (
    <div ref={ref} className="ds-v-conf ds-frame" role="img" aria-label="Question list filtered to Needs review, with Low and Medium confidence badges and flag chips for no source, stale source and conflicting documents.">
      <div className="ds-v-conf-bar" aria-hidden="true">
        <span className={`ds-filter ${filtered ? '' : 'is-on'}`}>All <b className="ds-num">388</b></span>
        <span className={`ds-filter ${filtered ? 'is-on' : ''}`}>Needs review <b className="ds-num">40</b></span>
        <span className="ds-filter-th ds-mono">threshold 80</span>
      </div>
      <ul className="ds-v-conf-list" aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          {(filtered ? REVIEW : ALL).map((r, i) => (
            <motion.li key={(filtered ? 'r' : 'a') + r[0]} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, delay: i * 0.05, ease: LOOP }}>
              <span className="ds-mono ds-faint">{r[0]}</span>
              <span className="ds-ell">{r[1]}</span>
              <ConfBadge band={r[2]} score={r[3]} />
              {filtered && <span className="ds-flag">{(r as typeof REVIEW[number])[4]}</span>}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  )
}

/* 7.3 Library: a new question matches an approved answer; one row's review date has passed. */
const LIB: [string, string, string, string, boolean][] = [
  ['Do you encrypt data at rest?', 'Priya N.', '14 Jan 2027', 'Exact', false],
  ['Describe your incident response plan', 'Sam O.', '02 Mar 2027', 'Meaning', false],
  ['How long are backups retained?', 'Lee K.', '01 Sep 2026', '', true],
  ['Is SSO available on all plans?', 'Priya N.', '20 Feb 2027', 'Meaning', false],
]
function LibraryVisual() {
  const { ref, step } = useLoopStep(4, 1500)
  const hit = [0, 1, 3][step % 3]
  return (
    <div ref={ref} className="ds-v-lib ds-frame" role="img" aria-label="Answer library table with owners and review dates. One row is marked review date passed in warning ink; matching rows are marked reused.">
      <div className="ds-v-lib-head" aria-hidden="true"><span>Approved answer</span><span>Owner</span><span>Review by</span></div>
      <ul aria-hidden="true">
        {LIB.map(([q, o, d, m, stale], i) => (
          <li key={q} className={`${stale ? 'is-stale' : ''} ${i === hit ? 'is-hit' : ''}`}>
            <span className="ds-ell">{q}</span>
            <span className="ds-ell">{o}</span>
            <span className="ds-num">{stale ? 'Review date passed' : d}</span>
            <span className="ds-reuse">{!stale && i === hit ? <motion.span key={step} initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: EASE }}>Reused · {m}</motion.span> : null}</span>
          </li>
        ))}
      </ul>
      <div className="ds-redline" aria-hidden="true">
        <span className="ds-mono ds-faint">Revision by Lee K.</span>
        <p>Backups are kept for <del>14 days</del> <ins>35 days</ins> and tested every quarter.</p>
      </div>
    </div>
  )
}

/* 7.4 The answer column fills cell by cell, then an Exported toast. */
const CELLS: [string, string][] = [
  ['Is customer data encrypted at rest?', 'Yes. AES-256, keys in AWS KMS.'],
  ['Do you run annual pen tests?', 'Yes. Annual, by an external firm.'],
  ['Is SSO supported?', 'Yes. SAML 2.0 on all plans.'],
  ['Where is data hosted?', 'AWS eu-west-1 (Ireland).'],
]
function ExportVisual() {
  const { ref, step } = useLoopStep(6, 900)
  const filled = Math.min(step, 4)
  return (
    <div ref={ref} className="ds-v-xl ds-frame" role="img" aria-label="A spreadsheet window with the answer column filling in and an Exported toast.">
      <div className="ds-xl-bar" aria-hidden="true"><span className="ds-mono">acme-vendor-review.xlsx</span><span className="ds-faint">Security</span></div>
      <table className="ds-xl" aria-hidden="true">
        <thead><tr><th /><th>A</th><th>B</th><th>C</th></tr></thead>
        <tbody>
          <tr className="is-h"><td>1</td><td>ID</td><td>Question</td><td>Answer</td></tr>
          {CELLS.map(([q, a], i) => (
            <tr key={q}>
              <td>{i + 2}</td><td className="ds-num">4.{i + 1}</td><td><span className="ds-ell">{q}</span></td>
              <td className={i < filled ? 'is-fill' : ''}>
                {i < filled ? <motion.span className="ds-ell" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>{a}</motion.span> : <span className="ds-cell-empty" />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ds-xl-toast-slot" aria-hidden="true">
        <AnimatePresence>
          {step >= 4 && (
            <motion.span className="ds-toast" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.24, ease: EASE }}>
              <Download size={14} strokeWidth={1.5} /> Exported
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* 7.5 A cursor picks an assignee; an @mention comment arrives after typing dots. */
const PEOPLE = [['PN', 'Priya N.', 'Security lead'], ['SO', 'Sam O.', 'Sales engineer'], ['LK', 'Lee K.', 'Platform']]
function TeamVisual() {
  const { ref, step } = useLoopStep(5, 1100)
  const picked = step >= 2
  return (
    <div ref={ref} className="ds-v-team" role="img" aria-label="An assignee picker open over question 6.2 with Priya selected, and a comment that mentions her.">
      <div className="ds-v-team-q ds-frame" aria-hidden="true">
        <div className="ds-v-team-top"><span className="ds-mono ds-faint">6.2</span><StatePill state="Needs review" /></div>
        <p>Do you support customer-managed keys?</p>
        <span className="ds-assignee">{picked ? <><b className="ds-avatar">PN</b> Priya N. · due Fri</> : 'Unassigned'}</span>
      </div>
      <div className="ds-picker ds-frame" aria-hidden="true">
        <span className="ds-picker-k">Assign to</span>
        {PEOPLE.map(([i, n, r], k) => (
          <span key={n} className={`ds-picker-row ${k === 0 && step >= 1 ? 'is-hover' : ''} ${k === 0 && picked ? 'is-picked' : ''}`}>
            <b className="ds-avatar">{i}</b>{n}<em>{r}</em>{k === 0 && picked && <Check size={13} strokeWidth={2} />}
          </span>
        ))}
        <motion.span className="ds-cursor" animate={{ x: step >= 1 ? 52 : 120, y: step >= 1 ? 30 : 92, scale: step === 2 ? 0.9 : 1 }} transition={{ duration: 0.6, ease: LOOP }}>
          <MousePointer2 size={16} strokeWidth={1.5} />
        </motion.span>
      </div>
      <div className="ds-comment ds-frame" aria-hidden="true">
        <b className="ds-avatar">SO</b>
        {step >= 4
          ? <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24, ease: EASE }}><span className="ds-at">@Priya</span> can you confirm BYOK is on the Business plan?</motion.p>
          : <span className="ds-typing">{step >= 3 ? <><i /><i /><i /></> : null}</span>}
      </div>
    </div>
  )
}

/* 7.6 Subprocessors listed, the no-training line pulses live. */
const SUBS: [string, string][] = [
  ['Supabase', 'Database and private storage'], ['Vercel', 'Hosting'], ['Anthropic', 'Drafting answers'],
  ['Voyage AI', 'Search embeddings'], ['LlamaIndex', 'Parsing scanned files'], ['Resend', 'Email'],
  ['Stripe', 'Billing'], ['PostHog', 'Product events only'],
]
function DataVisual() {
  const { ref, step } = useLoopStep(9, 500)
  const shown = step === 8 ? 8 : step + 1
  return (
    <div ref={ref} className="ds-v-data ds-frame" role="img" aria-label="A card listing Dossier's subprocessors and what each one is used for, with a shield icon and the line never used for training.">
      <div className="ds-v-data-head" aria-hidden="true">
        <ShieldCheck size={18} strokeWidth={1.5} />
        <span>Subprocessors</span>
        <span className="ds-v-data-live"><span className="ds-live" /> Training on your data: never</span>
      </div>
      <ul aria-hidden="true">
        {SUBS.map(([v, p], i) => (
          <li key={v} className={i < shown ? 'is-on' : ''}><span>{v}</span><span className="ds-faint">{p}</span></li>
        ))}
      </ul>
    </div>
  )
}

export function Features() {
  return (
    <Page id="features" clause="3" note="What it does, tile by tile" labelledBy="ds-feat-h">
      <SectionHead id="ds-feat-h" eyebrow="Features" title="Answers with receipts, from upload to export." />
      <ul className="ds-bento">
        <Tile
          cls="is-wide" eyebrow="Sourced answers" title="Every answer shows the paragraph it came from."
          body="Dossier searches your own documents, picks the passages that answer the question, and drafts from those alone. Click a citation to see the exact line, the page and the document date."
          bullets={['Citations to document, page and quote', 'Quotes checked against the source, word for word', 'No source found? It says so, instead of guessing']}
          visual={<CitationVisual />}
        />
        <Tile
          cls="is-tall" eyebrow="Know what to check" title="Review the 40 that need you, not all 400." delay={0.08}
          body="Every answer gets a confidence score from how well the evidence matches and how sure the model was. Anything below your threshold is marked Needs review, with the reason."
          bullets={['High, Medium, Low bands you can filter', 'Flags for no source, stale source and conflicting documents', 'Set your own threshold per workspace']}
          visual={<ConfidenceVisual />}
        />
        <Tile
          cls="is-half" eyebrow="Answer library" title="Approve once. Reuse it in every questionnaire after."
          body="Approved answers go into your library with an owner and a review date. Next time the same question appears, worded differently or not, Dossier reuses the approved answer and says so."
          bullets={['Exact and meaning-based matching', 'An owner and a review date on every answer', 'Stale answers are flagged, never reused blindly']}
          visual={<LibraryVisual />}
        />
        <Tile
          cls="is-half" eyebrow="Export" title="Send back the buyer’s own spreadsheet." delay={0.08}
          body="Dossier writes answers into the original cells and leaves everything else alone: sheets, colours, dropdowns, formulas. DOCX questionnaires get answers in place. PDFs with form fields come back filled."
          bullets={['XLSX and DOCX round trip', 'PDF forms filled, plus a clean answers file', 'Only approved answers, if you want']}
          visual={<ExportVisual />}
        />
        <Tile
          cls="is-tall" eyebrow="Review workflow" title="Assign the hard ones to the person who knows."
          body="Assign questions or whole sections with a due date. Comment, mention, approve. Everyone gets one email with what is theirs, and every change is in the audit log."
          bullets={['Roles: admin, reviewer, contributor, viewer', 'Assigned to me inbox', 'Audit log of every edit, approval and export']}
          visual={<TeamVisual />}
        />
        <Tile
          cls="is-wide is-flip" id="data-handling" eyebrow="Data handling" title="Your documents are never used to train AI models." delay={0.08}
          body="Each workspace is isolated at the database level. Files sit in private storage. Drafting runs on Anthropic’s API, which does not train on API data by default, and every vendor we use is listed on our security page."
          bullets={['Row-level isolation per workspace', 'Private, encrypted storage', 'Audit log you cannot edit']}
          visual={<DataVisual />}
        />
      </ul>
    </Page>
  )
}
