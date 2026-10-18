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
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Echo', applicationCategory: 'MultimediaApplication',
    offers: [
      { '@type': 'Offer', name: 'Creator', price: '29', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Studio', price: '79', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Agency', price: '199', priceCurrency: 'USD' },
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
      className={`ec-nav ${scrolled || open ? 'is-scrolled' : ''}`}
      aria-label="Main"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <div className="ec-nav-inner">
        <a href="#top" className="ec-nav-brand" aria-label="Echo home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}><Wordmark /></a>
        <ul className="ec-nav-links">
          {LINKS.map(([l, id]) => (
            <li key={id}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>
          ))}
        </ul>
        <div className="ec-nav-right">
          <span className="ec-nav-login"><Button variant="secondary" size="sm" href="#top" onClick={() => {}}>Log in</Button></span>
          <TrialButton location="nav" size="sm" />
          <button type="button" className="ec-burger" aria-expanded={open} aria-controls="ec-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} strokeWidth={1.5} /> : <Menu size={18} strokeWidth={1.5} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div id="ec-sheet" className="ec-sheet" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: EASE }}>
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

export default function EchoLanding() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT,WONK@0,9..144,300..700,0..100,0..1;1,9..144,300..700,0..100,0..1&family=Geist+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Echo: podcast show notes, chapters and audiograms in one'
    const meta = document.createElement('meta')
    meta.name = 'description'
    meta.content = 'Upload an episode or connect your RSS feed. Echo writes show notes, chapters, quotes, a newsletter and blog post in your voice, and renders audiograms.'
    document.head.appendChild(meta)
    track('lp_viewed', { referrer: document.referrer })
    return () => { link.remove(); meta.remove(); document.title = prevTitle }
  }, [])

  return (
    <div className="lp-echo">
      <a href="#main" className="ec-skip">Skip to content</a>
      <Nav />
      <div className="ec-rail">
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
