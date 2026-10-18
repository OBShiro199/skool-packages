import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { EASE, TrialButton, Wordmark, scrollToId, track } from './shared'
import { Hero } from './Hero'
import { Demo } from './Demo'
import { Features } from './Features'
import { Compare, FAQ, Faq, FinalCta, Footer, HowItWorks, LogoStrip, Pricing, Problem, Testimonials } from './Sections'
import './styles.css'

const LINKS: [string, string][] = [['Product', 'product'], ['Calling', 'calling'], ['Pricing', 'pricing']]
const COMPETITORS = ['Attio', 'HubSpot', 'Pipedrive', 'Close']

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Etcher', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Monthly', price: '149', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Annual', price: '949', priceCurrency: 'USD' },
    ],
  },
  {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
])

function CompareMenu() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLLIElement>(null)
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    window.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); window.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <li ref={ref} className="et-menu-wrap">
      <button type="button" className="et-nav-link" aria-expanded={open} aria-haspopup="true" onClick={() => setOpen((o) => !o)}>
        Compare <ChevronDown size={13} className="et-chev" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul className="et-menu" initial={{ opacity: 0, y: -4, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.98 }} transition={{ duration: 0.16, ease: EASE }}>
            {COMPETITORS.map((c) => (
              <li key={c}><a href="#compare" onClick={(e) => { e.preventDefault(); setOpen(false); track('compare_open', { competitor: c }); scrollToId('compare') }}>vs {c}</a></li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  )
}

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
    <motion.nav className={`et-nav ${scrolled || open ? 'scrolled' : ''}`} aria-label="Main" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div className="et-nav-inner">
        <a href="#top" className="et-nav-brand" aria-label="Etcher home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Wordmark /></a>
        <ul className="et-nav-links">
          {LINKS.map(([l, id]) => <li key={l}><a className="et-nav-link" href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>)}
          <CompareMenu />
          <li><a className="et-nav-link" href="#faq" onClick={(e) => { e.preventDefault(); go('faq') }}>FAQ</a></li>
        </ul>
        <div className="et-nav-right">
          <a href="/login" className="et-nav-login" onClick={(e) => e.preventDefault()}>Log in</a>
          <span className="et-nav-cta"><TrialButton location="nav" size="md" /></span>
          <span className="et-nav-cta-sm"><TrialButton location="nav" size="sm" /></span>
          <button type="button" className="et-burger" aria-expanded={open} aria-controls="et-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div id="et-sheet" className="et-sheet" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: EASE }}>
            <ul>
              {[...LINKS, ['Compare', 'compare'] as [string, string], ['FAQ', 'faq'] as [string, string]].map(([l, id]) => (
                <li key={l}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>
              ))}
              <li><a href="/login" onClick={(e) => { e.preventDefault(); setOpen(false) }}>Log in</a></li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

export default function EtcherLanding() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Inter+Tight:wght@500;600&family=Geist+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Etcher: CRM with built-in calling for small sales teams'
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    const prevDesc = meta?.content
    if (meta) meta.content = 'People, companies, pipelines and browser calling in one CRM. Calls and recordings log themselves. $149/month for your whole team. 7 days free.'
    return () => { link.remove(); document.title = prevTitle; if (meta && prevDesc !== undefined) meta.content = prevDesc }
  }, [])

  return (
    <div className="lp-etcher">
      <a href="#main" className="et-skip">Skip to content</a>
      <Nav />
      <div className="et-rail">
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
