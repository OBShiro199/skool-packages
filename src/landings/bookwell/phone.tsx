import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, ChevronLeft, CreditCard, Lock } from 'lucide-react'
import { EASE } from './parts'

export const SLOTS = ['09:00', '09:45', '10:30', '11:15', '13:00', '13:45', '14:30', '15:15', '16:00']
const BUSY = new Set(['10:30', '13:00'])
const DAYS = [['Mon', '19'], ['Tue', '20'], ['Wed', '21'], ['Thu', '22'], ['Fri', '23']]
const SERVICES = [
  { name: 'Skin fade', min: 45, price: 35, dep: 10 },
  { name: 'Beard trim', min: 20, price: 15, dep: 5 },
  { name: 'Fade and beard', min: 60, price: 45, dep: 10 },
]

export function PhoneFrame({ children, className = '', label, live = false }: { children: ReactNode; className?: string; label: string; live?: boolean }) {
  return (
    <div className={`bw-phone ${className}`} role={live ? 'group' : 'img'} aria-label={label}>
      <div className="bw-phone-screen">
        <div className="bw-phone-status" aria-hidden="true"><span>9:41</span><i className="bw-island" /><span className="bw-bars"><b /><b /><b /></span></div>
        {children}
      </div>
    </div>
  )
}

function Tap({ on, children, onClick, className }: { on: boolean; children: ReactNode; onClick?: () => void; className: string }) {
  return on
    ? <button type="button" className={className} onClick={onClick} disabled={!onClick}>{children}</button>
    : <div className={className}>{children}</div>
}

export type Step = 0 | 1 | 2 | 3

/** The Fade Room booking page. Step 0 service, 1 time, 2 pay, 3 booked. */
export function BookingScreen({ step, pick, onPick, tap = false }: { step: Step; pick?: string; onPick?: (next: Step) => void; tap?: boolean }) {
  const interactive = !!onPick
  const go = (n: Step) => () => onPick?.(n)
  return (
    <div className="bw-book">
      <div className="bw-book-top">
        {step > 0 && step < 3 ? <ChevronLeft size={16} aria-hidden="true" /> : <span style={{ width: 16 }} />}
        <span className="bw-avatar" aria-hidden="true">FR</span>
        <div><b>Fade Room</b><small>Barber · Hackney</small></div>
      </div>
      <div className="bw-book-progress" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => <i key={i} className={i <= step ? 'on' : ''} />)}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          className="bw-book-body"
          initial={{ opacity: 0, x: 14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -14 }}
          transition={{ duration: 0.28, ease: EASE }}
        >
          {step === 0 && (
            <>
              <p className="bw-book-q">Pick a service</p>
              {SERVICES.map((s, i) => (
                <Tap on={interactive} key={s.name} className={`bw-svc${i === 0 ? ' sel' : ''}`} onClick={go(1)}>
                  <span><b>{s.name}</b><small>{s.min} min · ${s.price}</small></span>
                  <em>Deposit ${s.dep}</em>
                </Tap>
              ))}
            </>
          )}
          {step === 1 && (
            <>
              <p className="bw-book-q">Pick a time</p>
              <div className="bw-book-chosen"><span>Skin fade · 45 min</span><b>$35</b></div>
              <div className="bw-days">
                {DAYS.map(([d, n], i) => <span key={d} className={i === 2 ? 'sel' : ''}><small>{d}</small><b>{n}</b></span>)}
              </div>
              <div className="bw-slots">
                {SLOTS.map((s) => {
                  const busy = BUSY.has(s)
                  const sel = s === pick
                  return (
                    <Tap on={interactive} key={s} className={`bw-slot${busy ? ' busy' : ''}${sel ? ' sel' : ''}${sel && tap ? ' tap' : ''}`} onClick={busy ? undefined : go(2)}>
                      {s}
                    </Tap>
                  )
                })}
              </div>
              <Tap on={interactive} className={`bw-book-cta${pick ? '' : ' off'}`} onClick={go(2)}>Continue · $10 deposit</Tap>
            </>
          )}
          {step === 2 && (
            <>
              <p className="bw-book-q">Pay a $10 deposit</p>
              <div className="bw-sum">
                <div><span>Skin fade</span><b>Wed 21 Oct · 14:30</b></div>
                <div><span>Name</span><b>Jordan</b></div>
                <div><span>Mobile</span><b>07•• ••• 482</b></div>
                <div><span>Pay in the shop</span><b>$25</b></div>
              </div>
              <div className="bw-card-field"><CreditCard size={14} aria-hidden="true" /> 4242 •••• •••• 4242</div>
              <Tap on={interactive} className="bw-book-cta" onClick={go(3)}><Lock size={12} aria-hidden="true" /> Pay $10 deposit</Tap>
            </>
          )}
          {step === 3 && (
            <div className="bw-booked">
              <motion.span className="bw-tick" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, ease: EASE, delay: 0.1 }}>
                <Check size={26} strokeWidth={2.6} aria-hidden="true" />
              </motion.span>
              <b>Booked</b>
              <span>Skin fade · Wed 21 Oct · 14:30</span>
              <span className="bw-booked-sms">Text reminder on its way.</span>
              {interactive && <button type="button" className="bw-book-again" onClick={go(0)}>Book another</button>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      <p className="bw-book-foot">Booking by Bookwell</p>
    </div>
  )
}
