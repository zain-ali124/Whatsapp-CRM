import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import ThemeToggle from '../ui/ThemeToggle';
import { getInitials, timeAgo } from '../../utils/helpers';
import { authApi } from '../../api/authApi';
import { useSocket } from '../../hooks/useSocket';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { leadApi } from '../../api/leadApi';

export default function Header({ onToggleSidebar }) {
  const { user, updateUser } = useAuthStore();
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [activeReminder, setActiveReminder] = useState(null);
  const alarmRef = useRef(null);
  const navigate = useNavigate();

  // Refresh profile on mount to ensure header shows latest backend data
  useEffect(() => {
    let mounted = true;
    authApi.getMe()
      .then(res => {
        if (!mounted) return;
        if (res?.data?.user) updateUser(res.data.user);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [updateUser]);

  // Subscribe to socket events and add notifications
  useSocket((event, data) => {
    let text = '';
    let icon = 'notifications';
    let color = 'text-slate-500 bg-slate-100 dark:bg-slate-800/50';

    switch (event) {
      case 'new_message':
        text = data?.body ? data.body : 'New message received';
        icon = 'chat_bubble';
        color = 'text-primary bg-primary/10';
        break;
      case 'reminder_due':
        text = data?.message || data?.text || 'Reminder due';
        icon = 'alarm';
        color = 'text-orange-500 bg-orange-50 dark:bg-orange-900/20';
        // Show modal and play alarm
        setActiveReminder(data);
        startAlarm();
        break;
      case 'agent_status_changed':
        text = data?.isOnline ? `${data.agentName || 'Agent'} is online` : `${data.agentName || 'Agent'} went offline`;
        icon = 'groups';
        color = 'text-blue-500 bg-blue-50 dark:bg-blue-900/20';
        break;
      case 'lead_inactive':
        text = data?.text || 'Lead inactive';
        icon = 'notifications';
        break;
      default:
        text = data?.text || `${event} event`;
    }

    setNotifications((prev) => [{
      id: Date.now() + Math.random(),
      icon,
      color,
      text,
      timestamp: new Date().toISOString(),
    }, ...prev].slice(0, 50));
  });

  // Play a short repeating alarm using Web Audio API
  function startAlarm() {
    try {
      if (alarmRef.current) return; // already playing
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.001;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      // Pulse the gain to make beep pattern
      let on = true;
      const iv = setInterval(() => {
        g.gain.linearRampToValueAtTime(on ? 0.2 : 0.001, ctx.currentTime + 0.05);
        on = !on;
      }, 600);
      alarmRef.current = { ctx, o, g, iv };
    } catch (e) {
      console.error('Alarm failed:', e.message);
    }
  }

  function stopAlarm() {
    try {
      const a = alarmRef.current; if (!a) return;
      clearInterval(a.iv);
      a.g.gain.linearRampToValueAtTime(0.001, a.ctx.currentTime + 0.05);
      a.o.stop(a.ctx.currentTime + 0.1);
      a.ctx.close();
      alarmRef.current = null;
    } catch (e) { console.error('stopAlarm error:', e.message); }
  }

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-900 px-6 flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Left */}
      <div className="flex items-center gap-4 flex-1">
        <button
          onClick={onToggleSidebar}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
        </button>

        {/* Search */}
        <div className="relative w-full max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
          <input
            name="globalSearch"
            type="text"
            placeholder="Search leads, agents, messages…"
            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
          />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <ThemeToggle className="mr-1" />

        {/* Help */}
        <button className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <span className="material-symbols-outlined text-[20px]">help_outline</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors relative"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 size-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900" />
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden z-50"
              >
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-sm">Notifications</span>
                    <button
                      onClick={() => setNotifications([])}
                      className="text-xs text-primary font-semibold cursor-pointer hover:underline"
                    >Mark all read</button>
                </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-72 overflow-y-auto">
                    {notifications.length ? notifications.map((n) => (
                      <div key={n.id} className="flex gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
                        <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${n.color}`}>
                          <span className="material-symbols-outlined text-[16px]">{n.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-snug">{n.text}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{n.timestamp ? timeAgo(n.timestamp) : ''}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="px-4 py-6 text-center text-slate-400">No notifications</div>
                    )}
                  </div>
                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 text-center">
                    <a href="/inbox" className="text-xs text-primary font-semibold cursor-pointer hover:underline">View all notifications</a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

        {/* Avatar */}
        <div className="flex items-center gap-2 cursor-pointer group">
          <div className="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs ring-2 ring-primary/20">
            {getInitials(user?.name || 'A')}
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{user?.name || 'Account'}</div>
            <div className="text-xs text-slate-400">{user?.businessName || user?.email || ''}</div>
          </div>
          <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 text-[18px] transition-colors">expand_more</span>
        </div>
      </div>
      {/* Reminder modal */}
      {activeReminder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => { stopAlarm(); setActiveReminder(null); }} />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg p-6">
            <div className="flex items-start gap-4">
              <div className="size-12 rounded-full bg-amber-50 dark:bg-amber-900/10 flex items-center justify-center text-amber-500">
                <span className="material-symbols-outlined text-[28px]">alarm</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Reminder: {activeReminder.leadName || 'Lead'}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{activeReminder.message || ''}</p>
                <div className="mt-3 text-sm text-slate-500">
                  <div><strong>Phone:</strong> {activeReminder.phone || '—'}</div>
                  <div><strong>Lead ID:</strong> {activeReminder.leadId || '—'}</div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => {
                // Snooze 5 minutes — round up to the next minute for reliable cron pickup
                const inMs = 5 * 60 * 1000;
                const raw = Date.now() + inMs;
                const rounded = Math.ceil(raw / 60000) * 60000; // round to next minute
                const when = new Date(rounded).toISOString();
                leadApi.setReminder(activeReminder.leadId, { reminderAt: when })
                  .then(() => { toast.success('Snoozed 5 minutes'); stopAlarm(); setActiveReminder(null); })
                  .catch(() => toast.error('Failed to snooze'));
              }} className="btn-secondary">Snooze 5m</button>
              <button onClick={() => { stopAlarm(); setActiveReminder(null); }} className="btn-secondary">Dismiss</button>
              <button onClick={() => { stopAlarm(); setActiveReminder(null); navigate(`/leads/${activeReminder.leadId}`); }} className="btn-primary ml-auto">Open Lead</button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
