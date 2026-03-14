import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [mode, setMode]       = useState('owner');  // 'owner' | 'agent'

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Please fill in all fields');
    setLoading(true);
    try {
      const { data } = mode === 'agent'
        ? await authApi.agentLogin(form)
        : await authApi.login(form);
      login(data.user, data.token);
      toast.success(`Welcome back, ${data.user.name}! 👋`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background-light dark:bg-background-dark font-display">
      {/* Theme toggle - top right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Left: Hero */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="hidden lg:flex lg:w-1/2 bg-primary/8 dark:bg-primary/5 items-center justify-center p-12 relative overflow-hidden"
      >
        {/* Grid bg */}
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none">
          <svg width="100%" height="100%"><defs><pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/></pattern></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>
        </div>
        {/* Blobs */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/15 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full translate-x-1/4 translate-y-1/4 blur-3xl" />

        <div className="relative z-10 max-w-xl w-full">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-primary text-white w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-[0_8px_24px_rgba(16,183,127,0.4)]"
          >
            <span className="material-symbols-outlined text-4xl">chat_bubble</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-5xl font-black text-slate-900 dark:text-white leading-tight mb-6"
          >
            Manage your WhatsApp leads in one powerful CRM
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-xl text-slate-600 dark:text-slate-400 leading-relaxed mb-10"
          >
            Streamline sales, automate follow-ups, and scale your business communication.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="grid grid-cols-3 gap-6 p-6 bg-white/60 dark:bg-white/5 rounded-2xl border border-white/30 dark:border-white/10 backdrop-blur-sm"
          >
            {[['10k+','Businesses'],['99%','Open Rate'],['24/7','Support']].map(([val, lbl], i) => (
              <div key={i} className={`text-center ${i === 1 ? 'border-x border-slate-200 dark:border-slate-700 px-4' : ''}`}>
                <p className="text-2xl font-black text-primary">{val}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{lbl}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Right: Form */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-12 bg-white dark:bg-background-dark"
      >
        <div className="w-full max-w-md">
          {/* Brand */}
          <div className="flex items-center gap-3 mb-10">
            <div className="size-10 bg-primary rounded-xl flex items-center justify-center text-white shadow-[0_4px_12px_rgba(16,183,127,0.35)]">
              <span className="material-symbols-outlined text-[20px]">forum</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">WhatsApp CRM</h2>
          </div>

          <div className="mb-8">
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Welcome back 👋</h3>
            <p className="text-slate-500 dark:text-slate-400">Sign in to your account to continue.</p>
          </div>

          {/* Mode toggle */}
          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl mb-6">
            {[
              { value: 'owner', label: 'Business Owner', icon: 'business' },
              { value: 'agent', label: 'Agent / Staff',  icon: 'support_agent' },
            ].map(({ value, label, icon }) => (
              <button key={value} type="button" onClick={() => setMode(value)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mode === value
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {mode === 'agent' && (
            <div className="flex items-start gap-2.5 p-3.5 bg-primary/5 border border-primary/20 rounded-xl mb-5">
              <span className="material-symbols-outlined text-[18px] text-primary shrink-0 mt-0.5">info</span>
              <div>
                <p className="text-sm font-semibold text-primary">Agent Login</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Use the email and temporary password shared by your manager.</p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                {mode === 'agent' ? 'Agent Email' : 'Work Email'}
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={e => setForm({...form, email: e.target.value})}
                className="input-field"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Password</label>
                <a href="#" className="text-sm font-medium text-primary hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm({...form, password: e.target.value})}
                  className="input-field pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="remember" className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary/30" />
              <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400">Remember me for 30 days</label>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary w-full h-12 text-base disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </motion.button>
          </form>

          <p className="mt-8 text-center text-slate-600 dark:text-slate-400">
            Don't have an account?{' '}
            <Link to="/register" className="font-bold text-primary hover:underline">Start free trial</Link>
          </p>

          <footer className="mt-10 text-center text-xs text-slate-400 dark:text-slate-500">
            © 2025 WhatsApp CRM Platform. All rights reserved.
          </footer>
        </div>
      </motion.div>
    </div>
  );
}