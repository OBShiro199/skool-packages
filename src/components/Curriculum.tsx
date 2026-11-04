import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'

const weeks = [
  { name: 'Foundations', outcome: 'A validated idea worth building', lessons: ['Welcome', 'Founder Mindset', 'SaaS Money Maths', 'Business Models', 'Finding Ideas', 'Validation', 'Pre-Selling', 'Pick Your Idea'] },
  { name: 'Build', outcome: 'A live product that takes payments', lessons: ['AI Build Setup', 'Plan Before Prompting', 'Core Feature', 'Auth, Data & Payments', 'Expensive Design', 'Landing Page', 'Security Basics', 'Deploy & Launch'] },
  { name: 'First Customers', outcome: 'Your first 10 paying customers', lessons: ['Ideal Customer', 'Lead Lists', 'Cold Email Setup', 'Cold Email Scripts', 'Social Outreach', 'Cold Calling', 'Demos & Closing', 'First 10 Playbook'] },
  { name: 'Growth', outcome: 'Repeatable acquisition', lessons: ['Pricing', 'Trials & Freemium', 'Content Engine', 'Reel Farms', 'Paid Ads', 'SEO', 'Referrals & Affiliates', 'Metrics & Funnels'] },
  { name: 'Retain & Scale', outcome: 'Keep customers, build an asset', lessons: ['Onboarding', 'Customer Support', 'Beating Churn', 'Expansion Revenue', 'Product-Market Fit', 'Solo Founder Finances', 'Automate & Hire', 'Exit Your SaaS'] },
]

/** The 40 lessons, with a highlight working through them one by one. */
export function Curriculum() {
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (reduce) return
    const id = setInterval(() => setN((v) => (v + 1) % 40), 700)
    return () => clearInterval(id)
  }, [reduce])
  const week = Math.floor(n / 8)

  return (
    <div className="cur">
      {weeks.map((w, wi) => (
        <div key={w.name} className="cur-week">
          <div className="cur-bar">
            <motion.div
              className="cur-fill"
              initial={false}
              animate={{ scaleX: reduce ? 1 : wi < week ? 1 : wi === week ? ((n % 8) + 1) / 8 : 0 }}
              transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
            />
          </div>
          <p className="cur-num num">Week {wi + 1}</p>
          <h3>{w.name}</h3>
          <p className="cur-out">{w.outcome}</p>
          <ol>
            {w.lessons.map((l, li) => {
              const on = !reduce && wi * 8 + li === n
              return (
                <li key={l} className={on ? 'on' : ''}>
                  <span className="num">{wi + 1}.{li + 1}</span>
                  <span className="cur-title">{l}</span>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </div>
  )
}
