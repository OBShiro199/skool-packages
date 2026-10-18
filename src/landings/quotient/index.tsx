import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { Btn, OUT, Wordmark, scrollToId, track } from './shared'
import { Hero } from './Hero'
import { Demo, LogoStrip, Problem } from './Intro'
import { Features } from './Bento'
import { Compare, FAQ, Faq, FinalCta, Footer, HowItWorks, Pricing, Testimonials } from './Bottom'
import './styles.css'

type Variant = 'main' | 'agencies'
const LINKS: [string, string][] = [['How it works', 'how'], ['Features', 'features'], ['Pricing', 'pricing'], ['Compare', 'compare'], ['Agencies', 'agencies'], ['FAQ', 'faq']]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Quotient', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Solo', price: '39', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Crew', price: '79', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Agency', price: '299', priceCurrency: 'USD' },
    ],
  },
  { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
])

function Nav({ onLink }: { onLink: (id: string) => void }) {
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
  const go = (id: string) => { setOpen(false); onLink(id) }
  const links = LINKS.map(([l, id]) => <li key={l}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)
  return (
    <>
      <motion.nav className={`qt-nav${scrolled ? ' is-scrolled' : ''}`} aria-label="Main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, ease: OUT }}>
        <div className="qt-rail qt-nav-inner">
          <a href="#top" className="qt-nav-brand" aria-label="Quotient home" onClick={(e) => { e.preventDefault(); go('top') }}><Wordmark /></a>
          <ul className="qt-nav-links">{links}</ul>
          <div className="qt-nav-right">
            <a href="/login" className="qt-btn qt-btn-secondary qt-btn-md qt-nav-login">Log in</a>
            <Btn size="sm" href="/signup" onClick={() => track('lp_cta_clicked', { location: 'nav' })}>Start free trial</Btn>
            <button type="button" className="qt-burger" aria-expanded={open} aria-controls="qt-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </motion.nav>
      <AnimatePresence>
        {open && (
          <motion.div id="qt-sheet" className="qt-sheet" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: OUT }}>
            <ul>{links}<li><a href="/login">Log in</a></li></ul>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default function QuotientLanding() {
  const [variant, setVariant] = useState<Variant>('main')
  useEffect(() => {
    const id = 'lp-quotient-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@600;700;800&family=Geist+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
  }, [])
  useEffect(() => {
    const prev = document.title
    document.title = 'Quotient: instant online quotes for cleaners, gardeners and painters'
    track('lp_viewed', { variant })
    return () => { document.title = prev }
  }, [variant])
  const onLink = (id: string) => {
    if (id === 'agencies') { setVariant('agencies'); scrollToId('top'); return }
    scrollToId(id)
  }
  return (
    <div className="lp-quotient">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <header><Nav onLink={onLink} /></header>
      <main>
        <Hero variant={variant} onMain={() => setVariant('main')} />
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
  )
}
