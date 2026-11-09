import { motion } from 'motion/react'
import ollyPhoto from '../assets/olly.webp'
import { COMMUNITY } from './Brand'

// Support happens in the Skool community: the launcher opens the group in a new tab.

export function AskOlly() {
  return (
    <motion.a
      className="olly-launcher"
      href={COMMUNITY}
      target="_blank"
      rel="noopener noreferrer"
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      aria-label="Ask Olly for support in the Skool community"
    >
      <span className="olly-avatar" style={{ width: 40, height: 40 }}><img src={ollyPhoto} alt="" /></span>
      <span className="olly-launch-text"><b>Ask Olly</b><small>on Skool</small></span>
      <i className="olly-dot" />
    </motion.a>
  )
}
