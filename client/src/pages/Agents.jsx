import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { agentApi } from '../api/agentApi';
import { getInitials, timeAgo } from '../utils/helpers';

/* ── Sparkline ── */
function Sparkline({ data = [] }) {
  if (!data.length) return <div className="h-10 bg-slate-100 dark:bg-slate-700 rounded-lg"/>;
  const max = Math.max(...data, 1);
  return (
    <div className="flex items-end gap-1 h-10">
      {data.slice(-7).map((v, i) => (
        <motion.div
          key={i}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ delay: i * 0.06, duration: 0.4, ease: 'easeOut' }}
          style={{ originY: 'bottom', height: `${Math.max((v / max) * 100, 5)}%` }}
          className="flex-1 bg-primary rounded-t-sm"
        />
      ))}
    </div>
  );
}

/* ── Agent Card ── */
function AgentCard({ agent, onRemove }) {
  const perf = agent.conversionRate != null
    ? Math.round(agent.conversionRate * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="card p-5 group"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="relative">
          <div className="size-14 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl border-2 border-white dark:border-slate-700 shadow-sm">
            {getInitials(agent.name)}
          </div>
          <span className={`absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-white dark:border-slate-900 ${agent.isOnline ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}/>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg
            ${agent.role === 'admin'   ? 'bg-primary/10 text-primary' :
              agent.role === 'manager' ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400' :
              'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'}`}
          >
            {agent.role || 'Agent'}
          </span>
          <button
            onClick={() => onRemove(agent._id)}
            className="p-1 text-slate-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
            title="Remove agent"
          >
            <span className="material-symbols-outlined text-[16px]">person_remove</span>
          </button>
        </div>
      </div>

      <div className="mb-4">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight">{agent.name}</h3>
        <p className="text-sm text-slate-400 truncate">{agent.email}</p>
        {agent.isOnline && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="size-1.5 rounded-full bg-primary animate-pulse"/>
            <span className="text-[10px] text-primary font-semibold">Online</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 border-y border-slate-100 dark:border-slate-700 py-4 mb-4">
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Leads</p>
          <p className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none mt-1">
            {agent.totalLeads ?? 0}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Conversion</p>
          <p className={`text-xl font-black leading-none mt-1 ${perf >= 70 ? 'text-primary' : perf >= 40 ? 'text-amber-500' : 'text-red-400'}`}>
            {perf}%
          </p>
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2">7-day Activity</p>
        <Sparkline data={agent.weeklyActivity || []} />
      </div>
    </motion.div>
  );
}

/* ── Temp Password Modal (shown after invite succeeds) ── */
function TempPasswordModal({ agentName, tempPassword, onClose }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6"
      >
        {/* Success icon */}
        <div className="size-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 mx-auto">
          <span className="material-symbols-outlined text-3xl text-primary">check_circle</span>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 text-center mb-1">
          {agentName} has been added!
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 text-center mb-6">
          Share this temporary password with the agent. They can change it after logging in.
        </p>

        {/* Password display */}
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 mb-6">
          <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider mb-2">Temporary Password</p>
          <div className="flex items-center gap-3">
            <code className="flex-1 text-lg font-black text-slate-900 dark:text-slate-100 font-mono tracking-widest">
              {tempPassword}
            </code>
            <button
              onClick={copy}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                copied
                  ? 'bg-primary text-white'
                  : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {copied ? 'check' : 'content_copy'}
              </span>
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl mb-5">
          <span className="material-symbols-outlined text-[18px] text-amber-500 shrink-0 mt-0.5">warning</span>
          <p className="text-xs text-amber-700 dark:text-amber-400">
            This password won't be shown again. Copy it now before closing.
          </p>
        </div>

        <button onClick={onClose} className="btn-primary w-full">Done</button>
      </motion.div>
    </motion.div>
  );
}

/* ── Invite Modal ── */
function InviteModal({ onClose, onSuccess }) {
  const [form, setForm]     = useState({ name: '', email: '', role: 'agent' });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) return toast.error('Name and email required');
    setLoading(true);
    try {
      const res = await agentApi.invite(form);
      onSuccess(res.data);   // pass full response to parent
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to invite agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px] text-primary">person_add</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Invite Team Member</h3>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name *</label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              placeholder="Jane Smith"
              className="input-field"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address *</label>
            <input
              type="email"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              placeholder="jane@company.com"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Role</label>
            <select value={form.role} onChange={e => set('role', e.target.value)} className="input-field">
              <option value="agent">Agent</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl">
            <span className="material-symbols-outlined text-[16px] text-blue-500 shrink-0 mt-0.5">info</span>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              A temporary password will be generated. You'll be able to copy and share it with the agent.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 gap-2 disabled:opacity-60">
              {loading
                ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>Adding…</>
                : <><span className="material-symbols-outlined text-[16px]">person_add</span>Add Agent</>
              }
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ── Main ── */
export default function Agents() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite]         = useState(false);
  const [inviteResult, setInviteResult]     = useState(null);  // { agent, tempPassword }
  const [search, setSearch]                 = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['agents'],
    queryFn:  () => agentApi.getAll().then(r => r.data),
  });

  const removeMut = useMutation({
    mutationFn: (id) => agentApi.remove(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['agents'] }); toast.success('Agent removed'); },
    onError:    () => toast.error('Failed to remove agent'),
  });

  const agents  = (data?.agents || []).filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase())
  );
  const online  = agents.filter(a => a.isOnline).length;
  const offline = agents.filter(a => !a.isOnline).length;

  const handleRemove = (id) => {
    if (window.confirm('Remove this agent from your team?')) removeMut.mutate(id);
  };

  const handleInviteSuccess = (data) => {
    setShowInvite(false);
    setInviteResult(data);             // show temp password modal
    qc.invalidateQueries({ queryKey: ['agents'] });
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Agents Management</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Oversee team workload and track performance metrics.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
              <span className="size-2 rounded-full bg-primary"/>
              {online} Online
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold">
              <span className="size-2 rounded-full bg-slate-300 dark:bg-slate-600"/>
              {offline} Offline
            </div>
          </div>
          <button onClick={() => setShowInvite(true)} className="btn-primary gap-2">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Agent
          </button>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative max-w-sm">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents…" className="input-field pl-10 py-2.5"/>
      </motion.div>

      {/* Grid */}
      {error ? (
        <div className="flex items-center justify-center py-20 text-center">
          <div>
            <span className="material-symbols-outlined text-5xl text-red-400 block mb-3">error</span>
            <p className="text-slate-600 dark:text-slate-400">Failed to load agents.</p>
            <p className="text-xs text-slate-400 mt-1">{error.message}</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3 animate-pulse">
              <div className="flex justify-between"><div className="skeleton size-14 rounded-full"/><div className="skeleton h-6 w-16 rounded-lg"/></div>
              <div className="skeleton h-5 w-28 rounded"/>
              <div className="skeleton h-4 w-36 rounded"/>
              <div className="skeleton h-16 w-full rounded-xl"/>
              <div className="skeleton h-10 w-full rounded-lg"/>
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-center">
          <div>
            <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 block mb-3">group_off</span>
            <p className="text-slate-600 dark:text-slate-400 font-medium mb-1">No agents found</p>
            <p className="text-sm text-slate-400 mb-5">{search ? 'Try a different search term.' : 'Add your first team member to get started.'}</p>
            {!search && <button onClick={() => setShowInvite(true)} className="btn-primary gap-2">
              <span className="material-symbols-outlined text-[18px]">person_add</span>Invite First Agent
            </button>}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
          {agents.map((agent, i) => (
            <motion.div key={agent._id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <AgentCard agent={agent} onRemove={handleRemove} />
            </motion.div>
          ))}

          {/* Add placeholder card */}
          <motion.button
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: agents.length * 0.06 }}
            onClick={() => setShowInvite(true)}
            className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-5 flex flex-col items-center justify-center gap-3 text-slate-400 hover:text-primary hover:border-primary transition-all group min-h-[200px]"
          >
            <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <span className="material-symbols-outlined text-2xl">add</span>
            </div>
            <span className="font-semibold text-sm">Add Team Member</span>
          </motion.button>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showInvite && (
          <InviteModal
            onClose={() => setShowInvite(false)}
            onSuccess={handleInviteSuccess}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {inviteResult && (
          <TempPasswordModal
            agentName={inviteResult.agent?.name}
            tempPassword={inviteResult.tempPassword}
            onClose={() => setInviteResult(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}