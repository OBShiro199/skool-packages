import { Bookmark } from 'lucide-react'
import { useStore, useUser } from '../lib/store'
import { toast } from '../components/Toasts'

/** Save a design to the member's account (shown under "Saved" on the Designs page). */
export function SaveDesign({ slug, name, variant = 'icon' }: { slug: string; name: string; variant?: 'icon' | 'button' }) {
  const user = useUser()
  const toggle = useStore((s) => s.toggleDesign)
  const saved = !!user?.savedDesigns?.includes(slug)
  const click = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation()
    toggle(slug)
    toast(saved ? `Removed ${name} from saved` : `${name} saved`)
  }
  return variant === 'icon' ? (
    <button type="button" className={`dz-save ${saved ? 'on' : ''}`} onClick={click} aria-pressed={saved} aria-label={saved ? `Unsave ${name}` : `Save ${name}`}>
      <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} />
    </button>
  ) : (
    <button type="button" className={`btn btn-sm ${saved ? 'dz-saved-btn' : ''}`} onClick={click} aria-pressed={saved}>
      <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} /> {saved ? 'Saved' : 'Save'}
    </button>
  )
}
