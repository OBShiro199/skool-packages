import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { Button, EASE, TrialButton, Wordmark, scrollToId, track } from './shared'
import { Hero, RoleStrip } from './Hero'
import { Features } from './Features'
import { Compare, Demo, FAQ, Faq, FinalCta, Footer, HowItWorks, Pricing, Problem } from './Sections'
import './styles.css'

/** PRD section 10: hidden until there are real quotes. Never invent them. */
const SHOW_TESTIMONIALS = false

const LINKS: [string, string][] = [
  ['How it works', 'how'], ['Features', 'features'], ['Security', 'data-handling'], ['Pricing', 'pricing'], ['Compare', 'compare'], ['FAQ', 'faq'],
]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Dossier', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Team', price: '249', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Business', price: '599', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Scale', price: '1299', priceCurrency: 'USD' },
    ],
  },
  {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
])

function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])
  const go = (id: string) => {
    setOpen(false)
    if (id === 'data-handling') track('lp_security_clicked', { location: 'nav' })
    scrollToId(id)
  }
  return (
    <motion.nav
      className={`ds-nav ${scrolled || open ? 'is-scrolled' : ''}`} aria-label="Main"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: EASE }}
    >
      <div className="ds-nav-inner">
        <a href="#top" className="ds-nav-brand" aria-label="Dossier home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Wordmark /></a>
        <ul className="ds-nav-links">
          {LINKS.map(([l, id]) => (
            <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>
          ))}
        </ul>
        <div className="ds-nav-right">
          <span className="ds-nav-login"><Button variant="secondary" size="sm" href="#top" onClick={() => {}}>Log in</Button></span>
          <TrialButton location="nav" size="sm" />
          <button type="button" className="ds-burger" aria-expanded={open} aria-controls="ds-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div id="ds-sheet" className="ds-sheet" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: EASE }}>
            <ul>
              {LINKS.map(([l, id]) => (
                <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>
              ))}
              <li><a href="#top" onClick={(e) => { e.preventDefault(); setOpen(false) }}>Log in</a></li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

/** PRD 21: under 768px, a bar rises once the hero buttons leave view and hides over the final CTA.
 *  It floats above the bottom-left "Back to kit" pill rather than covering it. */
function MobileCta() {
  const [heroGone, setHeroGone] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const reduce = useReducedMotion()
  useEffect(() => {
    const hero = document.getElementById('hero-ctas')
    const final = document.getElementById('final')
    const io1 = new IntersectionObserver(([e]) => setHeroGone(!e.isIntersecting && e.boundingClientRect.top < 0))
    const io2 = new IntersectionObserver(([e]) => setBlocked(e.isIntersecting))
    if (hero) io1.observe(hero)
    if (final) io2.observe(final)
    return () => { io1.disconnect(); io2.disconnect() }
  }, [])
  const show = heroGone && !blocked
  return (
    <AnimatePresence>
      {show && (
        <motion.div className="ds-mcta" initial={{ y: reduce ? 0 : 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: reduce ? 0 : 16, opacity: 0 }} transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}>
          <span>7 days free</span>
          <TrialButton location="sticky" size="sm" />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default function DossierLanding() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Dossier: security questionnaires answered from your own documents'
    const meta = document.createElement('meta')
    meta.name = 'description'
    meta.content = 'Upload a security questionnaire or RFP. Dossier drafts every answer from your policies and SOC 2 report with citations and confidence scores, then exports the original file filled in.'
    document.head.appendChild(meta)
    track('lp_viewed', { referrer: document.referrer })
    return () => { link.remove(); meta.remove(); document.title = prevTitle }
  }, [])

  return (
    <div className="lp-dossier">
      <a href="#main" className="ds-skip">Skip to content</a>
      <Nav />
      <div className="ds-rail">
        <Hero />
        <main id="main">
          <RoleStrip />
          <Problem />
          <Demo />
          <Features />
          <HowItWorks />
          <Compare />
          {SHOW_TESTIMONIALS && null}
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
      <MobileCta />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
    </div>
  )
}
