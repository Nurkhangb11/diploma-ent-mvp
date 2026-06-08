import { motion } from 'framer-motion'

export default function Spinner({ className = '' }) {
  return (
    <motion.div
      className={`inline-flex items-center justify-center ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.span
        className="h-10 w-10 rounded-full border-2 border-violet-400/30 border-t-violet-400"
        animate={{ rotate: 360 }}
        transition={{ duration: 0.85, repeat: Infinity, ease: 'linear' }}
      />
    </motion.div>
  )
}
