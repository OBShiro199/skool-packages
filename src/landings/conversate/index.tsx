import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { EASE, TrialButton, Wordmark, scrollToId } from './shared'
import { Hero } from './Hero'
import { LiveDemo } from './Demo'
import { Features } from './Features'
import { Compare, FAQ, Faq, FinalCta, Footer, HowItWorks, LogoStrip, Pricing, Problem, Stats } from './Sections'
import './styles.css'

const LINKS: [string, string][] = [
  ['Product', 'product'], ['How it works', 'how'], ['Pricing', 'pricing'], ['Compare', 'compare'], ['Docs', 'faq'],
]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Conversate', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Starter', price: '49', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Growth', price: '129', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Scale', price: '299', priceCurrency: 'USD' },
    ],
  },
  {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
  { '@context': 'https://schema.org', '@type': 'Organization', name: 'Conversate' },
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
    <nav className={`cv-nav ${scrolled || open ? 'is-scrolled' : ''}`} aria-label="Main">
      <div className="cv-wrap cv-nav-inner">
        <a href="#top" className="cv-nav-brand" onClick={(e) => { e.preventDefault(); go('top') }} aria-label="Conversate home"><Wordmark /></a>
        <ul className="cv-nav-links">
          {LINKS.map(([l, id]) => (
            <li key={l}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>
          ))}
        </ul>
        <div className="cv-nav-right">
          <a href="#top" className="cv-btn cv-btn-ghost cv-btn-sm cv-nav-login" onClick={(e) => e.preventDefault()}>Log in</a>
          <TrialButton location="nav" size="sm" />
          <button type="button" className="cv-burger" aria-expanded={open} aria-controls="cv-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div id="cv-sheet" className="cv-sheet" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: EASE }}>
            <ul>
              {LINKS.map(([l, id]) => (
                <li key={l}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>
              ))}
            </ul>
            <div className="cv-sheet-btns">
              <a href="#top" className="cv-btn cv-btn-ghost" onClick={(e) => { e.preventDefault(); setOpen(false) }}>Log in</a>
              <TrialButton location="nav" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}

export default function ConversateLanding() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=Geist+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Conversate: AI help desk and help centre from your website'
    return () => { link.remove(); document.title = prevTitle }
  }, [])

  return (
    <div className="lp-conversate">
      <a href="#main" className="cv-skip">Skip to content</a>
      <Nav />
      <div className="cv-rail">
        <Hero />
        <main id="main">
          <LogoStrip />
          <Problem />
          <LiveDemo />
          <Features />
          <HowItWorks />
          <Compare />
          <Stats />
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
