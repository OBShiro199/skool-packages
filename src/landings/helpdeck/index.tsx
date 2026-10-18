import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { EASE, TrialButton, Wordmark, scrollToId } from './shared'
import { Hero } from './Hero'
import { LiveDemo, ProductVideo } from './Demo'
import { Features } from './Bento'
import { Compare, FAQ, Faq, FinalCta, Footer, HowItWorks, LogoStrip, Pricing, Problem, Testimonials } from './Sections'
import './styles.css'

const LINKS: [string, string][] = [
  ['Product', 'product'], ['How it works', 'how'], ['Pricing', 'pricing'], ['Docs', 'top'], ['FAQ', 'faq'],
]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Helpdeck', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Starter', price: '49', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Growth', price: '129', priceCurrency: 'USD' },
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
    const on = () => setScrolled(window.scrollY > 40)
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
      className={`hd-nav ${scrolled || open ? 'scrolled' : ''}`}
      aria-label="Main"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <div className="hd-container hd-nav-inner">
        <a href="#top" className="hd-nav-brand" onClick={(e) => { e.preventDefault(); go('top') }} aria-label="Helpdeck home"><Wordmark /></a>
        <ul className="hd-nav-links">
          {LINKS.map(([l, id]) => (
            <li key={l}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>
          ))}
        </ul>
        <div className="hd-nav-right">
          <a href="#top" className="hd-nav-login" onClick={(e) => e.preventDefault()}>Log in</a>
          <TrialButton location="nav" size="sm" />
          <button type="button" className="hd-burger" aria-expanded={open} aria-controls="hd-sheet" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div id="hd-sheet" className="hd-sheet" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2, ease: EASE }}>
            <ul>
              {LINKS.map(([l, id]) => (
                <li key={l}><a href={`#${id}`} onClick={(e) => { e.preventDefault(); go(id) }}>{l}</a></li>
              ))}
              <li><a href="#top" onClick={(e) => { e.preventDefault(); setOpen(false) }}>Log in</a></li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

export default function HelpdeckLanding() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prevTitle = document.title
    document.title = 'Helpdeck: AI support chat trained on your docs'
    return () => { link.remove(); document.title = prevTitle }
  }, [])

  return (
    <div className="lp-helpdeck">
      <a href="#main" className="hd-skip">Skip to content</a>
      <Nav />
      <div className="hd-rail">
      <Hero />
      <main id="main">
        <LogoStrip />
        <Problem />
        <LiveDemo />
        <ProductVideo />
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
