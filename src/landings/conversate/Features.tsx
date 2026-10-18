import { useEffect, useRef, useState, type ReactNode } from 'react'
import { motion, useInView } from 'motion/react'
import { Bot, Check, Copy, FileText, Inbox, Search, Sparkles, StickyNote, TriangleAlert, User } from 'lucide-react'
import { EASE, Conf, Eyebrow, Reveal, TypingDots, track, useLoopStep } from './shared'

function Feature({ id, eyebrow, title, body, bullets, flip, children }: {
  id: string; eyebrow: string; title: string; body: string; bullets?: string[]; flip?: boolean; children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const seen = useInView(ref, { once: true, amount: 0.3 })
  useEffect(() => { if (seen) track('feature_view', { id }) }, [seen, id])
  return (
    <div ref={ref} className={`cv-feature ${flip ? 'is-flip' : ''}`} id={`feature-${id}`}>
      <Reveal className="cv-feature-copy">
        <Eyebrow>{eyebrow}</Eyebrow>
        <h3 className="cv-h3">{title}</h3>
        <p className="cv-body">{body}</p>
        {bullets && (
          <ul className="cv-bullets">
            {bullets.map((b) => <li key={b}><Check size={14} aria-hidden="true" /> {b}</li>)}
          </ul>
        )}
      </Reveal>
      <Reveal delay={0.12} className="cv-feature-visual cv-frame cv-tile">{children}</Reveal>
    </div>
  )
}

/* 7.1 Help centre admin table with a public article page behind it. Rows publish one by one. */
const ARTICLES: [string, string, string][] = [
  ['Shipping to Canada and the US', 'Shipping', '1,204'],
  ['Returns within 30 days', 'Orders', '988'],
  ['Pausing a subscription', 'Subscriptions', '761'],
  ['Changing your grind size', 'Products', '540'],
  ['Paying with a gift card', 'Billing', '312'],
  ['Wholesale accounts', 'Billing', '96'],
]
function HelpCentreTile() {
  const { ref, step } = useLoopStep(8, 900)
  const published = Math.min(step, 6)
  return (
    <div ref={ref} className="cv-mock cv-hc" role="img" aria-label="Help Centre admin table with six AI-drafted articles being published, and a public article page behind it.">
      <div className="cv-hc-article" aria-hidden="true">
        <span className="cv-faint">Help centre / Shipping</span>
        <b>Shipping to Canada and the US</b>
        <span className="cv-sk cv-sk-l" /><span className="cv-sk cv-sk-m" /><span className="cv-sk cv-sk-l" />
      </div>
      <div className="cv-hc-table" aria-hidden="true">
        <div className="cv-hc-toolbar"><Search size={13} /> <span className="cv-faint">Search articles</span><span className="cv-hc-count cv-tab-num">{published} of 6 published</span></div>
        <div className="cv-hc-row cv-hc-th"><span>Title</span><span>Category</span><span>Status</span><span>AI</span><span className="cv-hide-sm">Views</span></div>
        {ARTICLES.map(([t, c, v], i) => (
          <div key={t} className="cv-hc-row">
            <span className="cv-ell">{t}</span>
            <span className="cv-faint cv-ell">{c}</span>
            <span><span className={`cv-tag ${i < published ? 'cv-tag-ok' : 'cv-tag-grey'}`}>{i < published ? 'Published' : 'Draft'}</span></span>
            <span><span className="cv-tag cv-tag-accent">AI</span></span>
            <span className="cv-tab-num cv-faint cv-hide-sm">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* 7.2 A confident answer with sources, then the "not sure" card. */
function AnswersTile() {
  // The first exchange stays put. The second loops: shown, cleared, question, typing dots, "not sure" card.
  const { ref, step: s } = useLoopStep(5, 1300)
  const q2 = s !== 1
  const dots = s === 3
  const card = s === 0 || s === 4
  return (
    <div ref={ref} className="cv-mock cv-answers" role="img" aria-label="Two widget answers: a confident one with sources and a High 0.91 score, and a low confidence one that shows 'I am not sure about this one' with a Talk to a human button.">
      <div className="cv-answers-thread" aria-hidden="true">
        <div className="cv-msg cv-msg-visitor">Can I change my plan mid-month?</div>
        <div className="cv-msg cv-msg-ai">Yes. Upgrades apply straight away and you pay the difference for the rest of the month.</div>
        <div className="cv-sources is-on"><span className="cv-src">Changing plans</span><span className="cv-src">Billing FAQ</span><Conf v={0.91} /></div>
        <div className={`cv-msg cv-msg-visitor cv-fade ${q2 ? 'is-on' : ''}`}>Do you sponsor school events?</div>
        <div className="cv-slot">
          <div className={`cv-notsure cv-fade ${card ? 'is-on' : ''}`}>
            <p><TriangleAlert size={14} /> I am not sure about this one, and I would rather not guess.</p>
            <div className="cv-notsure-btns"><span className="cv-wbtn cv-wbtn-primary"><User size={13} /> Talk to a human</span><span className="cv-wbtn">Ask another way</span></div>
          </div>
          <div className={`cv-fade cv-dots-abs ${dots ? 'is-on' : ''}`}><span className="cv-msg cv-msg-ai cv-msg-dots"><TypingDots /></span></div>
        </div>
      </div>
    </div>
  )
}

/* 7.3 The three-pane inbox with a note and a suggested reply. */
const SUGGEST = 'Hi Maria, yes we ship to Canada in 4 to 7 working days, and orders over $80 ship free.'
function InboxTile() {
  const { ref, step, reduce } = useLoopStep(4, 1400)
  const filled = reduce || step >= 2
  return (
    <div ref={ref} className="cv-mock cv-inbox" role="img" aria-label="Three-pane inbox: conversation list, a thread with an AI answer, a team note and a suggested reply, and visitor details.">
      <div className="cv-inbox-list" aria-hidden="true">
        <div className="cv-inbox-pane-h"><Inbox size={13} /> <b>Unassigned</b> <span className="cv-tab-num cv-faint">12</span></div>
        {[['Maria Lopez', 'Do you ship to Canada?', '1m'], ['Visitor 4821', 'Pause my subscription', '6m'], ['ben@crate.io', 'Damaged bag', '12m'], ['ana@luz.mx', 'Gift card balance', '31m']].map(([n, m, t], i) => (
          <div key={n} className={`cv-inbox-row ${i === 0 ? 'is-sel' : ''}`}>
            <span className="cv-l1"><b className="cv-ell">{n}</b><span className="cv-tab-num cv-faint">{t}</span></span>
            <span className="cv-l2 cv-ell">{m}</span>
          </div>
        ))}
      </div>
      <div className="cv-inbox-thread" aria-hidden="true">
        <div className="cv-inbox-pane-h"><b className="cv-ell">Shipping to Canada</b><span className="cv-tag cv-tag-accent">Open</span><span className="cv-tag cv-tag-ok-outline">Human</span></div>
        <div className="cv-inbox-msgs">
          <div className="cv-msg cv-msg-visitor-l">Do you ship to Canada? And is it free?</div>
          <div className="cv-msg cv-msg-ai cv-msg-ai-edge"><span className="cv-tag cv-tag-accent">AI</span> We ship to Canada in 4 to 7 working days.<span className="cv-sources is-on"><span className="cv-src">Shipping</span><Conf v={0.62} /></span></div>
          <div className="cv-note"><StickyNote size={12} /> <span><b>Note</b> · only your team sees this. Free over $80 since October.</span></div>
        </div>
        <div className="cv-inbox-composer">
          <div className="cv-inbox-tabs"><span className="is-on">Reply</span><span>Note</span></div>
          <div className="cv-inbox-draft">
            <span className={`cv-skel-lines cv-fade ${filled ? '' : 'is-on'}`}><i /><i /><i /></span>
            <span className={`cv-fade ${filled ? 'is-on' : ''}`}>{SUGGEST}</span>
          </div>
          <div className="cv-inbox-tools"><span className="cv-wbtn"><Sparkles size={12} /> Suggest reply</span><span className="cv-wbtn cv-wbtn-primary">Send</span></div>
        </div>
      </div>
      <div className="cv-inbox-details" aria-hidden="true">
        <span className="cv-faint">Visitor</span>
        <b>Maria Lopez</b>
        <span className="cv-muted">maria@hollow.co</span>
        <span className="cv-muted">Toronto, Canada</span>
        <span className="cv-faint cv-mt">Tags</span>
        <span className="cv-tag-row"><span className="cv-tag cv-tag-grey">shipping</span><span className="cv-tag cv-tag-violet">canada</span></span>
        <span className="cv-faint cv-mt">Sources used</span>
        <span className="cv-muted"><FileText size={11} /> /shipping</span>
      </div>
    </div>
  )
}

/* 7.4 Content gaps table: questions grouped, the missing article drafted in one click. */
function GapsTile() {
  const { ref, step } = useLoopStep(4, 1300)
  const gaps: [string, number][] = [['Can I pay by invoice?', 14], ['Do you have a student discount?', 9], ['Can I change my delivery day?', 6]]
  return (
    <div ref={ref} className="cv-mock cv-gaps" role="img" aria-label="Content gaps table: Can I pay by invoice, asked 14 times, with a Draft article button.">
      <div className="cv-gaps-head" aria-hidden="true"><b>Content gaps</b><span className="cv-faint">Last 30 days</span></div>
      {gaps.map(([q, n], i) => (
        <div key={q} className="cv-gaps-row" aria-hidden="true">
          <span className="cv-ell"><b>{q}</b></span>
          <span className="cv-faint cv-tab-num">asked {n} times</span>
          <span className={`cv-wbtn cv-gap-btn ${i === 0 && step >= 2 ? 'is-done' : ''}`}>
            {i === 0 && step >= 2 ? <><Check size={12} /> Drafted</> : <><FileText size={12} /> Draft article</>}
          </span>
        </div>
      ))}
      <div className="cv-gaps-slot" aria-hidden="true">
      <div className={`cv-gaps-wait cv-fade ${step >= 2 ? '' : 'is-on'}`}>The draft appears here, sourced from your pages</div>
      <div className={`cv-gaps-draft cv-fade ${step >= 2 ? 'is-on' : ''}`}>
        <span className="cv-tag cv-tag-accent">AI draft</span>
        <b>Paying by invoice</b>
        <span className="cv-muted">Business orders over $300 can pay by invoice with 14-day terms. <span className="cv-gap-fill">[Fill in: who to email]</span></span>
      </div>
      </div>
    </div>
  )
}

/* 7.5 Snippet code box and the branding panel with a live preview. */
const SWATCHES = ['#3c8fb0', '#7b6fd6', '#2f9e6b', '#d0772d']
function InstallTile() {
  const { ref, step } = useLoopStep(4, 1500)
  const [copied, setCopied] = useState(false)
  useEffect(() => { if (!copied) return; const id = window.setTimeout(() => setCopied(false), 1600); return () => window.clearTimeout(id) }, [copied])
  const brand = SWATCHES[step]
  const snippet = '<script\n  src="https://conversate.app/w.js"\n  data-key="pk_live_7Hq2…" defer>\n</script>'
  return (
    <div ref={ref} className="cv-mock cv-install">
      <div className="cv-snippet">
        <div className="cv-snippet-h">
          <span className="cv-faint">Paste before &lt;/head&gt;</span>
          <button type="button" className="cv-wbtn cv-copy" onClick={() => { navigator.clipboard?.writeText(snippet).catch(() => {}); setCopied(true) }}>
            {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy snippet</>}
          </button>
        </div>
        <pre className="cv-code"><code>{snippet}</code></pre>
        <div className="cv-platforms" aria-hidden="true">{['Plain HTML', 'Webflow', 'WordPress', 'Shopify', 'Framer', 'Next.js'].map((p, i) => <span key={p} className={i === 1 ? 'is-on' : ''}>{p}</span>)}</div>
        <ol className="cv-steps-mini" aria-hidden="true">
          <li><span>Open <b>Site settings</b> then <b>Custom code</b></span></li>
          <li><span>Paste the snippet in <b>Head code</b></span></li>
          <li><span>Click <b>Publish</b></span></li>
        </ol>
        <div className="cv-snippet-status"><i className="cv-dot cv-dot-ok cv-dot-pulse" /> Live on northwind.coffee · 2m ago</div>
      </div>
      <div className="cv-brand-panel" role="img" aria-label="Branding panel: brand colour swatches with a live widget preview that follows the chosen colour.">
        <div className="cv-brand-set" aria-hidden="true">
          <span className="cv-faint">Brand colour</span>
          <span className="cv-swatches">{SWATCHES.map((c, i) => <i key={c} style={{ background: c }} className={i === step ? 'is-on' : ''} />)}</span>
          <span className="cv-faint">Greeting</span>
          <span className="cv-fake-input">Hi there. How can we help?</span>
        </div>
        <div className="cv-brand-preview" aria-hidden="true" style={{ ['--b' as string]: brand }}>
          <div className="cv-bp-panel">
            <span className="cv-bp-head"><Bot size={12} /> Northwind</span>
            <span className="cv-bp-msg">Hi there. How can we help?</span>
          </div>
          <motion.span className="cv-bp-launch" key={brand} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: EASE }}>Help</motion.span>
        </div>
      </div>
    </div>
  )
}

export function Features() {
  return (
    <section className="cv-section cv-band" id="product" aria-label="Product">
      <div className="cv-wrap cv-features">
        <Feature
          id="help-centre"
          eyebrow="Help centre"
          title="Real articles, written from your own pages."
          body="Conversate reads up to 5,000 pages, groups them into categories and drafts clear, sourced articles. You review, edit and publish. Your help centre lives at yourdomain/acme/help with search."
          bullets={['Drafts cite the pages they came from', 'Placeholders where a fact is missing, never guesses', 'Search and SEO-friendly article pages']}
        >
          <HelpCentreTile />
        </Feature>
        <Feature
          id="ai-agent"
          flip
          eyebrow="AI agent"
          title="It answers from your knowledge, or says it is not sure."
          body="Every answer shows its sources. Every answer gets a confidence score. Below your threshold, the visitor sees 'Talk to a human' instead of a guess."
          bullets={["Answers in the visitor's language", "Ignores 'ignore your instructions' tricks", 'You set how cautious it is']}
        >
          <AnswersTile />
        </Feature>
        <Feature
          id="inbox"
          eyebrow="Inbox"
          title="Every conversation lands in one place."
          body="Assign, snooze, tag, add notes and canned replies. Replies reach the visitor live, or by email if they have left. Their email reply comes back into the same thread."
          bullets={['Open, pending, snoozed, closed', 'Suggested replies from your knowledge', 'Email alerts for handoffs and low-confidence answers']}
        >
          <InboxTile />
        </Feature>
        <Feature
          id="content-gaps"
          flip
          eyebrow="Gets better weekly"
          title="Unanswered questions become articles in one click."
          body="When visitors ask something your help centre does not cover, Conversate groups the questions and drafts the missing article for you."
        >
          <GapsTile />
        </Feature>
        <Feature
          id="install"
          eyebrow="Install"
          title="One line in your head tag."
          body="Copy the snippet, follow the steps for Webflow, WordPress, Shopify, Framer or Next.js. Brand it with your icon, colour, greeting and office hours."
        >
          <InstallTile />
        </Feature>
      </div>
    </section>
  )
}
