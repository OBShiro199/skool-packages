import { useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { ChevronDown, Clock, Dices, LineChart } from 'lucide-react'
import { CONCEPTS, Thumb } from './Thumb'
import { EASE, Eyebrow, MORPH, Reveal, TrialButton, Wordmark, track } from './shared'

/* 4. Works-alongside strip */
const TOOLS = ['YouTube Studio', 'Premiere Pro', 'Final Cut Pro', 'DaVinci Resolve', 'CapCut', 'Descript']
export function LogoStrip() {
  return (
    <section className="mq-strip-sec" aria-label="Tools Marquee works alongside">
      <div className="mq-wrap">
        <p className="mq-strip-l">Built for the way creators already work</p>
        <ul className="mq-tools">
          {TOOLS.map((t, i) => (
            <motion.li key={t} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.3, delay: i * 0.04 }}>{t}</motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* 5. Problem */
const PROBLEMS = [
  { icon: Clock, h: 'Hours in Photoshop.', p: 'Finding a photo with the right face, cutting it out, nudging text. Every video, every week.' },
  { icon: Dices, h: 'Picking on gut feel.', p: 'You make two versions, choose one, and never know if the other one would have doubled your views.' },
  { icon: LineChart, h: 'Studio numbers that wobble.', p: 'You swap the thumbnail on Wednesday and CTR goes up. Was it the thumbnail, or was it Wednesday?' },
]
export function Problem() {
  return (
    <section className="mq-section" aria-labelledby="mq-prob-h">
      <div className="mq-wrap">
        <Reveal className="mq-head">
          <Eyebrow>The problem</Eyebrow>
          <h2 id="mq-prob-h" className="mq-h2">Your best video can lose to a better thumbnail.</h2>
        </Reveal>
        <div className="mq-cols">
          {PROBLEMS.map(({ icon: Icon, h, p }, i) => (
            <Reveal key={h} className="mq-col" delay={i * 0.08}>
              <Icon size={16} strokeWidth={1.5} className="mq-col-i" aria-hidden="true" />
              <h3 className="mq-h3">{h}</h3>
              <p className="mq-body">{p}</p>
            </Reveal>
          ))}
        </div>
        <Reveal><p className="mq-closer">The same video at 4% CTR and 8% CTR is twice the views from the same impressions.</p></Reveal>
      </div>
    </section>
  )
}

/* 8. How it works */
const STEPS = [
  { h: 'Add your face and brand.', p: 'Photos, colours, fonts. Once.' },
  { h: 'Type the title, pick your favourites.', p: 'Six concepts in about two minutes. Tweak one in the editor.' },
  { h: 'Start a test and get back to filming.', p: 'Marquee swaps the thumbnail daily and emails you the winner.' },
]
export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.4 })
  const reduce = useReducedMotion()
  return (
    <section className="mq-section" id="how" aria-labelledby="mq-how-h">
      <div className="mq-wrap">
        <Reveal className="mq-head">
          <Eyebrow>How it works</Eyebrow>
          <h2 id="mq-how-h" className="mq-h2">Three steps. About ten minutes of your time.</h2>
        </Reveal>
        <div className="mq-steps" ref={ref}>
          <motion.span className="mq-steps-line" aria-hidden="true" initial={{ scaleX: reduce ? 1 : 0 }} animate={{ scaleX: inView || reduce ? 1 : 0 }} transition={{ duration: reduce ? 0 : 0.6, ease: MORPH }} />
          {STEPS.map((s, i) => (
            <Reveal key={s.h} className="mq-step" delay={i * 0.08}>
              <span className="mq-step-n mq-num">{i + 1}</span>
              <h3 className="mq-h3">{s.h}</h3>
              <p className="mq-body">{s.p}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

/* 9. Comparison */
const COLS = ['Marquee', 'Pikzels', 'ThumbnailTest', 'TubeBuddy', 'YouTube Test & Compare']
const ROWS: [string, ...string[]][] = [
  ['Makes thumbnails for you', 'Yes, 6 concepts per title', 'Yes', 'No', 'Basic AI tools [verify]', 'No'],
  ['Uses your real face', 'Yes, cut-outs of your photos', 'Trained persona (an AI version) [verify]', 'Not applicable', 'No [verify]', 'Not applicable'],
  ['Editable layers after generating', 'Yes', 'Partly [verify]', 'Not applicable', 'Not applicable', 'Not applicable'],
  ['A/B tests on your live video', 'Yes, daily rotation', 'No [verify]', 'Yes, rotation', 'Yes, on Legend tier [verify]', 'Yes, true split'],
  ['Judges by', 'CTR, with a watch-time guardrail', 'Not applicable', 'CTR and views [verify]', 'CTR [verify]', 'Watch time share'],
  ['Shows how sure the result is', 'Yes, plain words', 'Not applicable', '[verify]', '[verify]', 'Winner / Preferred / None'],
  ['Agencies and multiple channels', 'Up to 10 channels, 5 seats', '[verify]', 'Pro: 3 channels [verify]', 'Per channel licence [verify]', 'Per channel'],
  ['Price per month', 'From $29', 'From about $14 to $20 [verify]', 'From about $24 to $32 [verify]', 'About $31.50 [verify]', 'Free'],
]
function Cell({ v }: { v: string }) {
  const verify = v.includes('[verify]')
  const text = v.replace(' [verify]', '').replace('[verify]', '')
  return <>{text || <span className="mq-faint">Unknown</span>}{verify && <span className="mq-verify">verify</span>}</>
}
export function Compare() {
  return (
    <section className="mq-section mq-band" id="compare" aria-labelledby="mq-cmp-h">
      <div className="mq-wrap">
        <Reveal className="mq-head">
          <Eyebrow>Compare</Eyebrow>
          <h2 id="mq-cmp-h" className="mq-h2">Make them and prove them, in one place.</h2>
        </Reveal>
        <p className="mq-swipe">Swipe to compare</p>
        <Reveal className="mq-table-wrap">
          <table className="mq-table">
            <thead>
              <tr>
                <th scope="col"><span className="mq-sr">Feature</span></th>
                {COLS.map((c, i) => <th scope="col" key={c} className={i === 0 ? 'is-us' : ''}>{i === 0 ? <span className="mq-us-chip">Marquee</span> : c}</th>)}
              </tr>
            </thead>
            <tbody>
              {ROWS.map(([label, ...vals]) => (
                <tr key={label}>
                  <th scope="row">{label}</th>
                  {vals.map((v, i) => <td key={i} className={i === 0 ? 'is-us' : ''}><Cell v={v} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
        <p className="mq-fineprint">Competitor details from their public pages and reviews, checked Oct 2026. Tell us if something is out of date and we will fix it within a day.</p>
        <p className="mq-honest">
          YouTube's own Test &amp; Compare is free and splits viewers at the same time. If your channel has it, use it for
          final tests. Marquee makes the thumbnails worth testing, works on videos where Test &amp; Compare is not available,
          and adds a watch-time guardrail. <span className="mq-verify">verify current availability</span>
        </p>
      </div>
    </section>
  )
}

/* 10. Testimonials slot: no fake quotes, one honest card */
export function Testimonials() {
  return (
    <section className="mq-section" aria-labelledby="mq-tst-h">
      <div className="mq-wrap">
        <Reveal className="mq-head">
          <Eyebrow>Creators</Eyebrow>
          <h2 id="mq-tst-h" className="mq-h2">Results from real channels.</h2>
        </Reveal>
        <Reveal className="mq-collect">
          <div className="mq-collect-thumbs" aria-hidden="true">
            {[CONCEPTS[2], CONCEPTS[3], CONCEPTS[0]].map((c) => <div key={c.angle}><Thumb c={c} badge={false} /></div>)}
          </div>
          <div>
            <p className="mq-collect-q">We are collecting results from our first 50 creators. Start a trial and yours could be here.</p>
            <TrialButton location="testimonials" size="md" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}

/* 11. Pricing */
type Plan = { id: string; name: string; m: string; y: string; ym: string; sum: string; rows: [string, string][] }
const PLANS: Plan[] = [
  { id: 'creator', name: 'Creator', m: '29', y: '290', ym: '24.17', sum: 'One channel, about 14 videos a month', rows: [['Concepts per month', '84 (14 videos)'], ['Channels', '1'], ['Seats', '1'], ['Live tests at once', '3'], ['Face library', '1 person'], ['Brand fonts', '4'], ['Everything else', 'Editor, exports, guardrail, emails']] },
  { id: 'pro', name: 'Pro', m: '59', y: '590', ym: '49.17', sum: 'Growing channels and duos', rows: [['Concepts per month', '168 (28 videos)'], ['Channels', '3'], ['Seats', '2'], ['Live tests at once', '10'], ['Face library', '3 people'], ['Brand fonts', '10'], ['Everything else', 'Everything in Creator']] },
  { id: 'agency', name: 'Agency', m: '149', y: '1,490', ym: '124.17', sum: 'Agencies and networks', rows: [['Concepts per month', '420 (70 videos)'], ['Channels', '10'], ['Seats', '5'], ['Live tests at once', '40'], ['Face library', '15 people'], ['Brand fonts', '30'], ['Everything else', 'Everything in Pro, roles']] },
]
export function Pricing() {
  const [annual, setAnnual] = useState(false)
  const reduce = useReducedMotion()
  const set = (a: boolean) => { setAnnual(a); track('pricing_toggled', { to: a ? 'year' : 'month' }) }
  return (
    <section className="mq-section mq-band" id="pricing" aria-labelledby="mq-price-h">
      <div className="mq-wrap">
        <Reveal className="mq-head mq-head-center">
          <Eyebrow>Pricing</Eyebrow>
          <h2 id="mq-price-h" className="mq-h2">Pick a plan. Try it free for 7 days.</h2>
          <div className="mq-seg" role="radiogroup" aria-label="Billing interval">
            <button type="button" role="radio" aria-checked={!annual} className={!annual ? 'is-on' : ''} onClick={() => set(false)}>Monthly</button>
            <button type="button" role="radio" aria-checked={annual} className={annual ? 'is-on' : ''} onClick={() => set(true)}>Annual (2 months free)</button>
          </div>
        </Reveal>
        <div className="mq-plans">
          {PLANS.map((p, i) => (
            <Reveal key={p.id} className={`mq-plan mq-plan-${p.id} ${p.id === 'pro' ? 'is-pop' : ''}`} delay={i * 0.08}>
              <div className="mq-plan-top">
                <h3 className="mq-h3">{p.name}</h3>
                {p.id === 'pro' && <span className="mq-eyebrow mq-eyebrow-sm">Most popular</span>}
              </div>
              <div className="mq-price" aria-live="polite">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span key={annual ? 'y' : 'm'} className="mq-price-in" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.16, ease: EASE }}>
                    <span className="mq-price-n mq-num">${annual ? p.y : p.m}</span>
                    <span className="mq-price-int">{annual ? '/year' : '/month'}</span>
                  </motion.span>
                </AnimatePresence>
              </div>
              <p className="mq-price-sub mq-num">{annual ? `$${p.ym}/month, billed yearly` : 'Billed monthly'}</p>
              <p className="mq-plan-sum">{p.sum}</p>
              <a href={`/signup?plan=${p.id}&interval=${annual ? 'year' : 'month'}`} className={`mq-btn mq-btn-lg mq-btn-block ${p.id === 'pro' ? 'mq-btn-primary' : ''}`}
                onClick={(e) => { e.preventDefault(); track('cta_clicked', { location: 'pricing', plan: p.id, interval: annual ? 'year' : 'month' }) }}>Start free trial</a>
              <dl className="mq-plan-rows">
                {p.rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="mq-num">{v}</dd></div>)}
              </dl>
            </Reveal>
          ))}
        </div>
        <p className="mq-fineprint mq-center">7 days free, then billed monthly or yearly. 12 concepts and 1 test included in the trial. Cancel any time from Billing.</p>
        <p className="mq-fineprint mq-center mq-fine-tight">One concept = one thumbnail image. A title uses 6. Regenerating one idea uses 1.</p>
      </div>
    </section>
  )
}

/* 12. FAQ */
export const FAQ: [string, string][] = [
  ['Does Marquee make an AI version of my face?', 'No. You upload real photos and Marquee cuts them out. Every face in your thumbnails is a real photo of you. We do not train a model on your face.'],
  ['How does the A/B test work if YouTube shows one thumbnail at a time?', "Marquee changes the thumbnail once a day at midnight Pacific in a balanced order (A, B, B, A, B, A, A, B), then compares impressions and clicks per day from YouTube's own reports. The order cancels out most of the effect of busy and slow days."],
  ['How long does a test take?', '8 days for two thumbnails, 9 for three, then 1 to 2 days while YouTube sends the last numbers. Bigger channels get clearer answers sooner; small channels may need the 16 day option.'],
  ['What if there is no clear winner?', 'Marquee tells you, in plain words, why (not enough impressions, too close, or clicks went up but watch time went down) and keeps your original unless you pick another.'],
  ['Can I test my old videos?', 'Yes. Older videos with steady traffic are often the best place to test, and a better thumbnail can bring an old video back into suggestions.'],
  ['What does Marquee do with my YouTube account?', 'It reads your video list and stats, and changes the thumbnail only on videos you put in a test. It cannot upload, delete or edit anything else. Disconnect at any time and we delete your YouTube data.'],
  ['What size are the exports?', '1280x720 JPEG, always under 2 MB, which YouTube accepts on every channel. You can download any design too.'],
  ['Can I use my own fonts?', 'Yes. Upload WOFF2, TTF or OTF fonts you hold a licence for, or use the built-in thumbnail fonts.'],
  ["Do I need YouTube's custom thumbnail permission?", 'Yes. YouTube only lets verified channels set custom thumbnails. If yours is not verified yet, verify your phone number in YouTube Studio first. You can still make and download thumbnails without it.'],
  ['What happens when I run out of concepts?', 'Generating stops until next month or until you upgrade. Your designs, editor and tests keep working.'],
  ['Is this for Shorts?', 'Not yet. Marquee is for long-form videos, where the thumbnail decides most of the clicks.'],
  ['Can my editor or agency use it for me?', 'Yes. Invite them to your workspace with the Editor role. They never see your Google password.'],
]
export function Faq() {
  const [open, setOpen] = useState<number | null>(null)
  const reduce = useReducedMotion()
  const base = useId()
  return (
    <section className="mq-section" id="faq" aria-labelledby="mq-faq-h">
      <div className="mq-wrap mq-faq-grid">
        <Reveal className="mq-head">
          <h2 id="mq-faq-h" className="mq-h2">Questions</h2>
        </Reveal>
        <ul className="mq-faq">
          {FAQ.map(([q, a], i) => {
            const isOpen = open === i
            return (
              <li key={q}>
                <h3>
                  <button type="button" id={`${base}-q${i}`} aria-expanded={isOpen} aria-controls={`${base}-a${i}`} onClick={() => { setOpen(isOpen ? null : i); if (!isOpen) track('faq_opened', { index: i }) }}>
                    <span>{q}</span>
                    <ChevronDown size={16} className={`mq-chev ${isOpen ? 'is-open' : ''}`} aria-hidden="true" />
                  </button>
                </h3>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div id={`${base}-a${i}`} role="region" aria-labelledby={`${base}-q${i}`} className="mq-faq-a"
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
  const row = [CONCEPTS[1], CONCEPTS[3], CONCEPTS[4], CONCEPTS[5]]
  return (
    <section className="mq-section mq-tint mq-final" aria-labelledby="mq-final-h">
      <div className="mq-wrap">
        <Reveal className="mq-head mq-head-center">
          <h2 id="mq-final-h" className="mq-h2">Your next video deserves the thumbnail that wins.</h2>
          <p className="mq-lead">Six ideas with your face in two minutes. A tested winner in about ten days.</p>
          <TrialButton location="final" />
          <p className="mq-fineprint">7 days free. No thumbnail designer needed.</p>
        </Reveal>
        <Reveal className="mq-final-row" delay={0.12}>
          {row.map((c, i) => (
            <div key={c.angle} className={`mq-final-t ${i === 2 ? 'is-win' : ''}`} aria-hidden={i !== 2}>
              <Thumb c={c} badge={false} />
              {i === 2 && <span className="mq-winner">Winner</span>}
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  )
}

/* 14. Footer */
const FOOT: [string, [string, string][]][] = [
  ['Product', [['How it works', '#how'], ['Testing', '#testing'], ['Pricing', '#pricing'], ['Documentation', '#']]],
  ['Company', [['Contact', '#'], ['Privacy', '#'], ['Terms', '#']]],
  ['Compare', [['Marquee vs Pikzels', '#compare'], ['Marquee vs ThumbnailTest', '#compare'], ['Marquee vs TubeBuddy', '#compare']]],
]
export function Footer() {
  return (
    <footer className="mq-footer">
      <div className="mq-wrap">
        <div className="mq-foot-cols">
          <div className="mq-foot-brand">
            <Wordmark />
            <p>Thumbnails that prove themselves</p>
            <p className="mq-num">© {new Date().getFullYear()} Marquee</p>
          </div>
          {FOOT.map(([h, links]) => (
            <nav key={h} aria-label={h}>
              <h3>{h}</h3>
              <ul>{links.map(([l, href]) => <li key={l}><a href={href} onClick={(e) => { if (href === '#') e.preventDefault() }}>{l}</a></li>)}</ul>
            </nav>
          ))}
        </div>
        <p className="mq-foot-legal">YouTube is a trademark of Google LLC. Marquee is not affiliated with YouTube.</p>
      </div>
    </footer>
  )
}
