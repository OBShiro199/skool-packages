import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Menu, X } from 'lucide-react'
import { EASE, TrialButton, Wordmark, scrollToId } from './shared'
import { Hero } from './Hero'
import { Demo, HowItWorks, LogoStrip, Problem } from './Sections'
import { Features } from './Features'
import { Compare, FAQ, Faq, FinalCta, Footer, Pricing, Testimonials } from './Bottom'
import './styles.css'

const LINKS: [string, string][] = [['How it works', 'how'], ['Templates', 'templates'], ['Pricing', 'pricing'], ['FAQ', 'faq']]

const JSON_LD = JSON.stringify([
  {
    '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Folio', applicationCategory: 'BusinessApplication',
    offers: [
      { '@type': 'Offer', name: 'Creator', price: '39', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Pro', price: '79', priceCurrency: 'USD' },
      { '@type': 'Offer', name: 'Agency', price: '249', priceCurrency: 'USD' },
    ],
  },
  {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: FAQ.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
  },
])

function Nav() {
  const reduce = useReducedMotion()
  const [hidden, setHidden] = useState(false)
  const [open, setOpen] = useState(false)
  const last = useRef(0)
  useEffect(() => {
    const on = () => {
      const y = window.scrollY
      setHidden(y > 400 && y > last.current)
      last.current = y
    }
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
    if (id === 'templates') return // goes to /templates in the real app
    scrollToId(id)
  }
  const linkProps = (id: string) => ({
    href: id === 'templates' ? '/templates' : `#${id}`,
    onClick: (e: React.MouseEvent) => { e.preventDefault(); go(id) },
  })

  return (
    <>
      <motion.header
        className="fo-nav"
        initial={reduce ? false : { y: -56 }}
        animate={{ y: hidden && !open ? -57 : 0 }}
        transition={{ duration: hidden ? 0.24 : 0.4, ease: EASE }}
      >
        <a href="#top" className="fo-nav-brand" aria-label="Folio home" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }) }}>
          <Wordmark />
        </a>
        <nav aria-label="Main" className="fo-nav-links">
          {LINKS.map(([l, id]) => <a key={id} {...linkProps(id)}>{l}</a>)}
        </nav>
        <div className="fo-nav-right">
          <a href="/login" className="fo-nav-login" onClick={(e) => e.preventDefault()}>Log in</a>
          <TrialButton location="nav" size="md" />
          <button
            type="button" className="fo-burger" aria-expanded={open} aria-controls="fo-panel"
            aria-label="Open menu" onClick={() => setOpen(true)}
          >
            <Menu size={18} strokeWidth={1.5} />
          </button>
        </div>
      </motion.header>
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              key="ov" className="fo-overlay" onClick={() => setOpen(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
            />
            <motion.div
              key="panel" id="fo-panel" className="fo-panel" role="dialog" aria-modal="true" aria-label="Menu"
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.2, ease: EASE }}
            >
              <div className="fo-panel-top">
                <Wordmark />
                <button type="button" className="fo-burger" aria-label="Close menu" onClick={() => setOpen(false)} autoFocus>
                  <X size={18} strokeWidth={1.5} />
                </button>
              </div>
              <nav aria-label="Mobile">
                {LINKS.map(([l, id]) => <a key={id} {...linkProps(id)}>{l}</a>)}
                <a href="/login" onClick={(e) => { e.preventDefault(); setOpen(false) }}>Log in</a>
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default function FolioLanding() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Geist+Mono:wght@400;500&display=swap'
    document.head.appendChild(link)
    const prev = document.title
    document.title = 'Folio: LinkedIn and Instagram carousel generator'
    const meta = document.createElement('meta')
    meta.name = 'description'
    meta.content = 'Turn blog posts, YouTube videos, ideas and voice notes into on-brand LinkedIn and Instagram carousels. Edit, export PDF and schedule. 7 days free.'
    document.head.appendChild(meta)
    return () => { link.remove(); meta.remove(); document.title = prev }
  }, [])

  return (
    <div className="lp-folio">
      <a href="#main" className="fo-skip">Skip to content</a>
      <div className="fo-shell">
        <Nav />
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
