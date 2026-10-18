import bpaLogo from '../assets/bpa-logo.webp'
import { ArrowUpLeft } from 'lucide-react'
import skoolLogo from '../assets/skool-logo.png'

const COMMUNITY = 'https://www.skool.com/solo-saas-mastermind-7774'

/** The BPA community logo (Olly with the stack), used wherever the vault's mark appears. */
export function BrandMark({ size = 36 }: { size?: number }) {
  return <img className="brand-mark brand-img" src={bpaLogo} width={size} height={size} alt="BPA" />
}

/** Slightly tilted "Powered by Skool" sticker for the top right. */
export function PoweredBySkool() {
  return (
    <a className="skool-badge" href={COMMUNITY} target="_blank" rel="noreferrer" aria-label="Powered by Skool: open the community">
      <span>Powered by</span>
      <img src={skoolLogo} alt="Skool" height={15} />
    </a>
  )
}

/** Sidebar link back to the Skool community. */
export function BackToSkool() {
  return (
    <a className="back-skool" href={COMMUNITY} target="_blank" rel="noreferrer">
      <ArrowUpLeft size={15} />
      <span>Back to</span>
      <img src={skoolLogo} alt="Skool" height={15} />
    </a>
  )
}
