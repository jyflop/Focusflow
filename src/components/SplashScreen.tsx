import { motion } from 'motion/react';
import { Target } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[var(--bg)] z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="relative"
      >
        <div className="w-24 h-24 relative">
          {/* Geometric Target Logo */}
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, duration: 0.8, type: "spring" }}
            className="absolute inset-0 border-2 border-[var(--accent)]/10 rounded-full" 
          />
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.4, duration: 0.8, type: "spring" }}
            className="absolute inset-[20%] border-2 border-[var(--accent)]/20 rounded-full" 
          />
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, duration: 0.8, type: "spring" }}
            className="absolute inset-[40%] bg-[var(--accent)] rounded-full shadow-[0_0_20px_rgba(99,102,241,0.2)]" 
          />
          
          {/* Pulse effect */}
          <motion.div
            animate={{ 
              scale: [1, 1.5, 1],
              opacity: [0.3, 0, 0.3]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute inset-0 border-2 border-[var(--accent)] rounded-full"
          />
        </div>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.8 }}
        className="mt-10 text-center"
      >
        <h1 className="text-3xl font-bold text-[var(--text-main)] tracking-tight">
          Focus<span className="text-[var(--accent)]">Flow</span>
        </h1>
        <p className="mt-2 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-[0.3em]">
          Geometric Balance
        </p>
      </motion.div>
    </div>
  );
}
