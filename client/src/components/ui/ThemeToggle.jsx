import { motion } from 'framer-motion';
import { useThemeStore } from '../../store/themeStore';

export default function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <motion.button
      onClick={toggleTheme}
      whileTap={{ scale: 0.9 }}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={`relative w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40
        ${isDark ? 'bg-primary' : 'bg-slate-200'} ${className}`}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md flex items-center justify-center
          ${isDark ? 'left-[26px]' : 'left-0.5'}`}
      >
        <span className="material-symbols-outlined text-[13px] text-slate-600">
          {isDark ? 'dark_mode' : 'light_mode'}
        </span>
      </motion.div>
    </motion.button>
  );
}
