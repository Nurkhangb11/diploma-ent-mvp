import { motion } from 'framer-motion'

export default function GlassCard({ children, className = '', delay = 0, hover = true, ...props }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      className={`glass-panel rounded-2xl p-5 shadow-[0_0_48px_-16px_var(--app-glow)] ${className}`}
      {...props}
    >
      {children}
    </motion.div>
  )
}
