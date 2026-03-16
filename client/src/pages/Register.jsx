import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../store/authStore';
import ThemeToggle from '../components/ui/ThemeToggle';

export default function Register() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [form, setForm] = useState({ name:'', businessName:'', email:'', password:'' });
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) return toast.error('Please accept the terms first');
    if (form.password.length < 8) return toast.error('Password must be at least 8 characters');
    setLoading(true);
    try {
      const { data } = await authApi.register(form);
      login(data.user, data.token);
      toast.success('Account created! Welcome aboard 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: 'bolt',       text: 'Setup in under 5 minutes'         },
    { icon: 'shield',     text: 'Enterprise-grade security'        },
    { icon: 'support_agent', text: '24/7 dedicated support'       },
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-background-light dark:bg-background-dark font-display relative">
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>

      {/* Left - Hero hidden on mobile/tablet */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="hidden xl:flex xl:w-1/2 bg-primary/8 dark:bg-primary/5 flex-col justify-center items-center p-8 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/15 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary/10 rounded-full translate-x-1/4 translate-y-1/4 blur-3xl" />

        <div className="relative z-10 max-w-lg text-center">
          {/* Chat illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mb-8 flex justify-center"
          >
            <div className="size-48 bg-white/60 dark:bg-slate-800/40 rounded-2xl shadow-xl flex items-center justify-center border border-white/30 dark:border-white/10 backdrop-blur-sm p-6">
              <div className="flex flex-col gap-2 w-full">
                {[
                  { self: false, icon: 'chat' },
                  { self: true,  icon: 'done_all' },
                  { self: false, icon: 'attach_file' },
                ].map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: m.self ? 20 : -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.15 }}
                    className={`flex items-center gap-2 p-2 rounded-xl shadow-sm ${
                      m.self
                        ? 'self-end bg-slate-200 dark:bg-slate-700'
                        : 'self-start bg-primary text-white'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[12px]">{m.icon}</span>
                    <div className={`h-1 rounded-full ${m.self ? 'w-16 bg-slate-400 dark:bg-slate-500' : 'w-12 bg-white/40'}`}/>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2"
          >
            Connect with customers where they are
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-slate-600 dark:text-slate-400 text-base mb-6"
          >
            Manage your entire business communication through the world's most popular messaging app.
          </motion.p>

          {/* Feature list */}
          <div className="space-y-2">
            {features.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex items-center gap-3 text-left bg-white/50 dark:bg-white/5 rounded-xl px-3 py-2 border border-white/30 dark:border-white/10"
              >
                <div className="size-7 bg-primary/15 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-[16px]">{f.icon}</span>
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{f.text}</span>
              </motion.div>
            ))}
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
            className="mt-6 grid grid-cols-3 gap-4"
          >
            {[['10k+','Businesses'],['99%','Open Rate'],['24/7','Support']].map(([v, l], i) => (
              <div key={i} className={`text-center ${i === 1 ? 'border-x border-slate-200 dark:border-slate-700 px-2' : ''}`}>
                <p className="text-lg font-black text-primary">{v}</p>
                <p className="text-xs text-slate-500">{l}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Right - Scrollable on mobile if content exceeds */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full xl:w-1/2 flex flex-col items-center justify-center p-4 sm:p-8 bg-white dark:bg-background-dark overflow-y-auto no-scrollbar"
      >
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-5">
            <div className="size-9 bg-primary rounded-xl flex items-center justify-center text-white shadow-[0_4px_12px_rgba(16,183,127,0.35)]">
              <span className="material-symbols-outlined text-[18px]">forum</span>
            </div>
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">WhatsApp CRM</span>
          </div>

          <div className="mb-5">
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Create your account</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Start managing your business chats like a pro.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input type="text" placeholder="John Doe" value={form.name} onChange={e => set('name', e.target.value)} className="input-field text-sm h-9" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Business Name</label>
                <input type="text" placeholder="Acme Inc." value={form.businessName} onChange={e => set('businessName', e.target.value)} className="input-field text-sm h-9" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
              <input type="email" placeholder="john@company.com" value={form.email} onChange={e => set('email', e.target.value)} className="input-field text-sm h-9" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  className="input-field pr-9 text-sm h-9"
                  required
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  <span className="material-symbols-outlined text-[18px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1">Must be at least 8 characters long.</p>
            </div>

            <div className="flex items-start gap-2">
              <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-primary focus:ring-primary/30" />
              <label htmlFor="terms" className="text-xs text-slate-500 dark:text-slate-400">
                I agree to the{' '}
                <a href="#" className="text-primary hover:underline font-medium">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary hover:underline font-medium">Privacy Policy</a>
              </label>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="btn-primary w-full h-9 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Creating account…</>
              ) : 'Create Account'}
            </motion.button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">Log in</Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}