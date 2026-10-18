import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { EASE, TrialButton, Wordmark, scrollToId, track } from './shared'
import { Hero, LogoStrip } from './Hero'
import { Features } from './Bento'
import { Compare, Demo, FAQ, Fair, Faq, FinalCta, Footer, HowItWorks, Pricing, Problem } from './Sections'
import './styles.css'

const LINKS: [string, string][] = [['Product', 'product'], ['Fair hiring', 'fair'], ['Pricing', 'pricing'], ['FAQ', 'faq']]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Shortlist', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Starter', price: '29', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Team', price: '69', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Growth', price: '149', priceCurrency: 'USD' },
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
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])
  const go = (id: string) => { setOpen(false); scrollToId(id) }
  return (
    <nav className={`sl-nav ${scrolled || open ? 'is-scrolled' : ''}`} aria-label="Main">
      <div className="sl-nav-inner">
        <a href="#top" className="sl-nav-brand" aria-label="Shortlist home" onClick={(e) => { e.preventDefault(); setOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Wordmark /></a>
        <ul className="sl-nav-links">
          {LINKS.map(([l, id]) => <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)}
        </ul>
        <div className="sl-nav-right">
          <a href="#top" className="sl-login" onClick={(e) => e.preventDefault()}>Log in</a>
          <TrialButton location="nav" size="sm" />
          <button type="button" className="sl-burger" aria-expanded={open} aria-controls="sl-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div id="sl-sheet" className="sl-sheet" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2, ease: EASE }}>
            <ul>
              {LINKS.map(([l, id]) => <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)}
              <li><a href="#top" onClick={(e) => { e.preventDefault(); setOpen(false) }}>Log in</a></li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default function ShortlistLanding() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..700&family=Geist+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Shortlist: simple applicant tracking for small teams'
    const meta = document.createElement('meta')
    meta.name = 'description'
    meta.content = 'Post a job, review every CV with quoted AI summaries against your criteria, let candidates book interviews, and stay GDPR compliant. From $29 a month. 7 day free trial.'
    document.head.appendChild(meta)
    track('landing_viewed', { referrer: document.referrer })
    return () => { link.remove(); meta.remove(); document.title = prevTitle }
  }, [])

  return (
    <div className="lp-shortlist">
      <a href="#main" className="sl-skip">Skip to content</a>
      <Nav />
      <div className="sl-rail">
        <Hero />
        <main id="main">
          <LogoStrip />
          <Problem />
          <Demo />
          <Features />
          <HowItWorks />
          <Fair />
          <Compare />
          <Pricing />
          <Faq />
          <FinalCta />
        </main>
        <Footer />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
    </div>
  )
}
