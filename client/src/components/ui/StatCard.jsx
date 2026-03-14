import { motion } from 'framer-motion';

export default function StatCard({ icon, label, value, change, changeType, color = 'blue', delay = 0 }) {
  const colorMap = {
    blue:   { iconBg: 'bg-blue-50 dark:bg-blue-900/20',   iconText: 'text-blue-500'   },
    green:  { iconBg: 'bg-primary/10',                     iconText: 'text-primary'    },
    orange: { iconBg: 'bg-orange-50 dark:bg-orange-900/20',iconText: 'text-orange-500' },
    purple: { iconBg: 'bg-purple-50 dark:bg-purple-900/20',iconText: 'text-purple-500' },
    red:    { iconBg: 'bg-red-50 dark:bg-red-900/20',      iconText: 'text-red-500'    },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: 'easeOut' }}
      className="card p-6 group cursor-default"
    >
      <div className="flex items-center justify-between mb-4">
        <span className={`${c.iconBg} ${c.iconText} p-2.5 rounded-xl material-symbols-outlined text-[22px]`}>
          {icon}
        </span>
        {change && (
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            changeType === 'up'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400'
          }`}>
            {changeType === 'up' ? '↑' : '↓'} {change}
          </span>
        )}
      </div>
      <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{label}</p>
      <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
        {value}
      </h3>
    </motion.div>
  );
}
