import { create } from 'zustand'
import { AnimatePresence, motion } from 'motion/react'
import { Check } from 'lucide-react'

interface Toast { id: number; text: string; xp?: number }
const useToasts = create<{ list: Toast[]; push: (t: Omit<Toast, 'id'>) => void }>((set, get) => ({
  list: [],
  push: (t) => {
    const id = Date.now() + Math.random()
    set({ list: [...get().list.slice(-3), { ...t, id }] })
    setTimeout(() => set({ list: get().list.filter((x) => x.id !== id) }), 2600)
  },
}))

export const toast = (text: string, xp?: number) => useToasts.getState().push({ text, xp })

export function Toasts() {
  const list = useToasts((s) => s.list)
  return (
    <div className="toasts" aria-live="polite">
      <AnimatePresence>
        {list.map((t) => (
          <motion.div
            key={t.id}
            className="toast"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <Check size={16} />
            <span style={{ flex: 1 }}>{t.text}</span>
            {t.xp ? <span className="xp">+{t.xp} XP</span> : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
