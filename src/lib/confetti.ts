import confetti from 'canvas-confetti'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const colours = ['#2B59FF', '#167A47', '#0F0F0F', '#6E8BFF', '#4CC38A', '#F2C14E']

export function burst(origin?: { x: number; y: number }) {
  if (reduced()) return
  confetti({ particleCount: 70, spread: 70, startVelocity: 38, ticks: 160, origin: origin ?? { y: 0.6 }, colors: colours, shapes: ['square'], scalar: 0.9, zIndex: 300 })
}

export function celebrate() {
  if (reduced()) return
  const end = Date.now() + 1100
  const frame = () => {
    confetti({ particleCount: 5, angle: 60, spread: 60, origin: { x: 0, y: 0.7 }, colors: colours, shapes: ['square'], zIndex: 300 })
    confetti({ particleCount: 5, angle: 120, spread: 60, origin: { x: 1, y: 0.7 }, colors: colours, shapes: ['square'], zIndex: 300 })
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}
