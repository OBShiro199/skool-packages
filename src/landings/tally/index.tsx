import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { Button, EASE, TrialButton, Wordmark, scrollToId, track } from './shared'
import { Hero, LogoStrip } from './Hero'
import { Features } from './Features'
import { Compare, Demo, FAQ, Faq, FinalCta, Footer, HowItWorks, Pricing, Problem, Testimonials } from './Sections'
import './styles.css'

const LINKS: [string, string][] = [
  ['How it works', 'how'], ['Features', 'features'], ['Pricing', 'pricing'], ['Compare', 'compare'], ['FAQ', 'faq'],
]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Tally', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Solo', price: '19', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Studio', price: '39', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Agency', price: '79', priceCurrency: 'USD' },
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
  const go = (id: string) => { setOpen(false); scrollToId(id) }
  return (
    <motion.nav
      className={`tl-nav ${scrolled || open ? 'is-scrolled' : ''}`}
      aria-label="Main"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <div className="tl-nav-inner">
        <a href="#top" className="tl-nav-brand" aria-label="Tally home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Wordmark /></a>
        <ul className="tl-nav-links">
          {LINKS.map(([l, id]) => (
            <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>
          ))}
        </ul>
        <div className="tl-nav-right">
          <span className="tl-nav-login"><Button variant="secondary" size="sm" href="#top" onClick={() => {}}>Log in</Button></span>
          <TrialButton location="nav" size="sm" />
          <button type="button" className="tl-burger" aria-expanded={open} aria-controls="tl-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div id="tl-sheet" className="tl-sheet" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: EASE }}>
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

export default function TallyLanding() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Tally: invoices that chase themselves'
    const meta = document.createElement('meta')
    meta.name = 'description'
    meta.content = 'Send branded invoices from your own domain. Tally sends polite, escalating reminders until your client pays, pauses when they reply, and pays you by card or bank. 7 day free trial.'
    document.head.appendChild(meta)
    track('lp_viewed', { referrer: document.referrer })
    return () => { link.remove(); meta.remove(); document.title = prevTitle }
  }, [])

  return (
    <div className="lp-tally">
      <a href="#main" className="tl-skip">Skip to content</a>
      <Nav />
      <div className="tl-rail">
        <Hero />
        <main id="main">
          <LogoStrip />
          <Problem />
          <Demo />
          <Features />
          <HowItWorks />
          <Compare />
          <Testimonials />
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
