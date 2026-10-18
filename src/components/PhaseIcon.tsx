import { CreditCard, Database, Flag, LayoutTemplate, Megaphone, Rocket, Send, ShieldCheck, TerminalSquare, Video } from 'lucide-react'
import type { Phase } from '../content/types'

const ICONS = { terminal: TerminalSquare, layout: LayoutTemplate, database: Database, card: CreditCard, rocket: Rocket, shield: ShieldCheck, send: Send, video: Video, megaphone: Megaphone, flag: Flag }

export function PhaseIcon({ icon, size = 16 }: { icon: Phase['icon']; size?: number }) {
  const I = ICONS[icon] ?? Flag
  return <I size={size} />
}
