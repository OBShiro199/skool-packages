import type { KeyboardEvent, ReactNode } from 'react'
import { Check, ExternalLink, Star } from 'lucide-react'

/** Google "G" mark in its official colours (used on the Google button, as the product does). */
export function GoogleG({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" className="hl-g">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}

/** StarRow (display): filled star glyphs only in --star, never animated. */
export function Stars({ n, size = 14 }: { n: number; size?: number }) {
  return (
    <span className="hl-stars" role="img" aria-label={`${n} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} strokeWidth={1.5} className={i <= n ? 'on' : ''} aria-hidden="true" />
      ))}
    </span>
  )
}

export function Phone({ children, className = '', label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={`hl-phone ${className}`} role={label ? 'img' : undefined} aria-label={label}>
      <div className="hl-screen">
        <div className="hl-statusbar" aria-hidden="true"><span>9:41</span><span className="hl-sb-icons"><i /><i /><i /></span></div>
        {children}
      </div>
    </div>
  )
}

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']
export const thanksFor = (r: number) =>
  r >= 4 ? 'Thank you. We would love it if you shared that on Google.'
    : r >= 1 ? 'Thank you for telling us. We are sorry it was not right.' : ''

export type RatingState = {
  rating: number
  /** a thumb tap shown on star 5, star 2, or the Google button */
  tap?: 'star' | 'google' | null
  pressed?: boolean
  googleOpened?: boolean
  /** private note: undefined follows the rating (open for 1 to 3), true/false forces it */
  noteOpen?: boolean
  noteText?: string
  noteSent?: boolean
}

/**
 * The public rating page (/r/[token]) as DESIGN.md section 8 describes it.
 * The Google button is the same component, size, position and label in every state (rule R1).
 * The private note area is reserved below it at a fixed height, so the button never moves.
 */
export function RatingScreen({
  state, size = 'md', business = 'Brightside Dental', onRate, onGoogle, onToggleNote,
}: {
  state: RatingState; size?: 'md' | 'sm'; business?: string
  onRate?: (r: number) => void; onGoogle?: () => void; onToggleNote?: () => void
}) {
  const { rating, tap, pressed, googleOpened, noteText, noteSent } = state
  const noteOpen = state.noteOpen ?? (rating >= 1 && rating <= 3)
  const interactive = !!onRate
  const StarEl = interactive ? 'button' : 'span'
  return (
    <div className={`hl-rate hl-rate-${size}`}>
      <div className="hl-rate-biz">
        <span className="hl-rate-logo" aria-hidden="true">{business[0]}</span>
        <span className="hl-rate-name">{business}</span>
      </div>
      <p className="hl-rate-h">How was your visit to {business}?</p>
      <div className="hl-rate-stars" role={interactive ? 'radiogroup' : undefined} aria-label={interactive ? 'Your rating' : undefined}>
        {[1, 2, 3, 4, 5].map((i) => (
          <StarEl
            key={i}
            {...(interactive ? {
              type: 'button' as const, role: 'radio', 'aria-checked': rating === i, 'aria-label': `${i} star${i > 1 ? 's' : ''}, ${LABELS[i]}`,
              onClick: () => onRate?.(i),
            } : {})}
            className={`hl-rate-star${i <= rating ? ' on' : ''}`}
          >
            <Star strokeWidth={1.5} aria-hidden="true" />
            {tap === 'star' && i === rating && <span className="hl-thumb" aria-hidden="true" />}
          </StarEl>
        ))}
      </div>
      <p className="hl-rate-label" aria-live="polite">{LABELS[rating]}</p>
      <p className={`hl-rate-thanks${rating ? ' on' : ''}`}>{thanksFor(rating)}</p>
      <div className="hl-gbtn-wrap">
        <span
          className={`hl-gbtn${pressed ? ' pressed' : ''}`}
          {...(onGoogle ? { role: 'button', tabIndex: 0, onClick: onGoogle, onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onGoogle() } } } : {})}
        >
          <GoogleG />
          <span>Post a review on Google</span>
          <ExternalLink size={14} aria-hidden="true" />
          {tap === 'google' && <span className="hl-thumb" aria-hidden="true" />}
        </span>
      </div>
      <p className="hl-rate-opened">{googleOpened ? 'Opened Google in a new tab.' : ''}</p>
      <div className="hl-note">
        {noteSent ? (
          <p className="hl-note-sent"><Check size={14} aria-hidden="true" />Sent. The team will read it today.</p>
        ) : (
          <>
            <span
              className="hl-note-toggle"
              {...(onToggleNote ? { role: 'button', tabIndex: 0, 'aria-expanded': noteOpen, onClick: onToggleNote, onKeyDown: (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleNote() } } } : {})}
            >
              Tell the team privately
            </span>
            <div className={`hl-note-box${noteOpen ? ' open' : ''}`} aria-hidden={!noteOpen}>
              <span className="hl-note-area">{noteText ?? ''}<i className="hl-caret" /></span>
              <span className="hl-note-help">Only {business} sees this.</span>
              <span className="hl-note-send">Send to the team</span>
            </div>
          </>
        )}
      </div>
      <p className="hl-rate-foot">{business} uses Halo to collect feedback. Reply STOP to the text to opt out.</p>
    </div>
  )
}

/** The review request text as it lands on the customer's phone. */
export function SmsBubble({ name = 'Maria', business = 'Brightside Dental' }: { name?: string; business?: string }) {
  return (
    <p className="hl-sms">
      Hi {name}, thanks for visiting {business} today. How did we do? <span className="hl-sms-link">usehalo.app/r/x7Kp2...</span>
    </p>
  )
}
