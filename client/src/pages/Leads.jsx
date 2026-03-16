import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { leadApi } from '../api/leadApi';
import { agentApi } from '../api/agentApi';
import { useAuthStore } from '../store/authStore';
import StatusBadge from '../components/ui/StatusBadge';
import LeadScoreBadge from '../components/ui/LeadScoreBadge';
import { timeAgo, getInitials, formatDate } from '../utils/helpers';

const PAGE_SIZE = 10;

/* ── Skeleton Row ── */
function SkeletonRow() {
  return (
    <tr>{[...Array(8)].map((_,i) => (
      <td key={i} className="px-4 py-4"><div className="skeleton h-4 rounded w-full"/></td>
    ))}</tr>
  );
}

/* ── Add Lead Modal ── */
function AddLeadModal({ onClose, onSaved, isAgent }) {
  const [form, setForm] = useState({ name:'', phone:'', source:'organic', status:'new', notes:'' });
  const [loading, setLoading] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) return toast.error('Name and phone are required');
    setLoading(true);
    try {
      await leadApi.create(form);
      toast.success('Lead added!');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add lead');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Add New Lead" icon="person_add" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="field-label">Full Name *</label>
            <input value={form.name} onChange={e=>set('name',e.target.value)} placeholder="John Doe" className="input-field" autoFocus />
          </div>
          <div className="col-span-2">
            <label className="field-label">WhatsApp Number *</label>
            <input value={form.phone} onChange={e=>set('phone',e.target.value)} placeholder="+92 300 1234567" className="input-field" />
          </div>
          <div>
            <label className="field-label">Source</label>
            <select value={form.source} onChange={e=>set('source',e.target.value)} className="input-field">
              <option value="organic">Organic</option>
              <option value="whatsapp_ad">WhatsApp Ads</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="referral">Referral</option>
              <option value="website">Website</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="field-label">Status</label>
            <select value={form.status} onChange={e=>set('status',e.target.value)} className="input-field">
              <option value="new">New Lead</option>
              <option value="contacted">Contacted</option>
              <option value="interested">Interested</option>
              <option value="qualified">Qualified</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="field-label">Notes (optional)</label>
            <textarea value={form.notes} onChange={e=>set('notes',e.target.value)} rows={2} placeholder="Any initial notes…" className="input-field resize-none"/>
          </div>
        </div>
        {isAgent && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 border border-primary/20 rounded-xl text-xs text-primary">
            <span className="material-symbols-outlined text-[16px]">info</span>
            This lead will be automatically assigned to you.
          </div>
        )}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1 disabled:opacity-60">
            {loading ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span> Adding…</> : 'Add Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Assign Agent Modal ── */
function AssignModal({ leadIds, agents, onClose, onSaved, single = false }) {
  const [agentId, setAgentId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agentId) return toast.error('Please select an agent');
    setLoading(true);
    try {
      if (single) {
        await leadApi.assign(leadIds[0], { agentId });
      } else {
        await leadApi.bulkAssign({ leadIds, agentId });
      }
      toast.success(`${leadIds.length} lead${leadIds.length > 1 ? 's' : ''} assigned!`);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign');
    } finally { setLoading(false); }
  };

  return (
    <Modal title={single ? 'Assign Lead' : `Assign ${leadIds.length} Leads`} icon="assignment_ind" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Select which agent to assign {single ? 'this lead' : `these ${leadIds.length} leads`} to.
        </p>
        <div>
          <label className="field-label">Select Agent</label>
          <select value={agentId} onChange={e=>setAgentId(e.target.value)} className="input-field">
            <option value="">— Choose agent —</option>
            {agents.map(a => (
              <option key={a._id} value={a._id}>{a.name} ({a.email})</option>
            ))}
          </select>
        </div>
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading || !agentId} className="btn-primary flex-1 disabled:opacity-60">
            {loading ? 'Assigning…' : 'Assign'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* ── Reminder Modal ── */
function ReminderModal({ lead, onClose, onSaved }) {
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30);
  const defaultVal = now.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

  const [reminderAt, setReminderAt] = useState(
    lead.reminderAt ? new Date(lead.reminderAt).toISOString().slice(0, 16) : defaultVal
  );
  const [loading, setLoading] = useState(false);

  const QUICK = [
    { label: '30 min',  mins: 30  },
    { label: '1 hour',  mins: 60  },
    { label: '3 hours', mins: 180 },
    { label: 'Tomorrow 9 AM', mins: null, fn: () => {
      const d = new Date(); d.setDate(d.getDate()+1); d.setHours(9,0,0,0);
      return d.toISOString().slice(0,16);
    }},
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await leadApi.setReminder(lead._id, { reminderAt });
      toast.success('Reminder set!');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to set reminder');
    } finally { setLoading(false); }
  };

  const handleClear = async () => {
    setLoading(true);
    try {
      await leadApi.setReminder(lead._id, { reminderAt: null });
      toast.success('Reminder cleared');
      onSaved();
    } catch (err) {
      toast.error('Failed to clear reminder');
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Set Reminder" icon="alarm" onClose={onClose}>
      <div className="space-y-4">
        {/* Lead name */}
        <div className="flex items-center gap-2.5 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
            {getInitials(lead.name)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{lead.name}</p>
            <p className="text-xs text-slate-400">{lead.phone}</p>
          </div>
          {lead.reminderAt && (
            <span className="ml-auto text-xs text-amber-500 font-semibold bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-lg">
              Current: {formatDate(lead.reminderAt, 'MMM d, h:mm a')}
            </span>
          )}
        </div>

        {/* Quick pick */}
        <div>
          <label className="field-label mb-2">Quick pick</label>
          <div className="grid grid-cols-2 gap-2">
            {QUICK.map(({ label, mins, fn }) => (
              <button key={label} type="button"
                onClick={() => {
                  const d = new Date();
                  if (fn) { setReminderAt(fn()); return; }
                  d.setMinutes(d.getMinutes() + mins);
                  setReminderAt(d.toISOString().slice(0,16));
                }}
                className="text-xs py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary text-slate-600 dark:text-slate-400 rounded-xl font-semibold transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom datetime */}
        <div>
          <label className="field-label">Custom date & time</label>
          <input
            type="datetime-local"
            value={reminderAt}
            min={new Date().toISOString().slice(0,16)}
            onChange={e=>setReminderAt(e.target.value)}
            className="input-field"
          />
        </div>

        <div className="flex gap-3 pt-1">
          {lead.reminderAt && (
            <button type="button" onClick={handleClear} disabled={loading}
              className="btn-secondary text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
              Clear
            </button>
          )}
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={loading || !reminderAt} className="btn-primary flex-1 disabled:opacity-60">
            {loading ? 'Saving…' : 'Set Reminder'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ── Shared Modal Shell ── */
function Modal({ title, icon, onClose, children }) {
  return (
    <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
        exit={{ scale:0.95, opacity:0 }} transition={{ type:'spring', stiffness:300, damping:25 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-md p-6"
        onClick={e=>e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px] text-primary">{icon}</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          </div>
          <button onClick={onClose} className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function Leads() {
  const navigate = useNavigate();
  const qc       = useQueryClient();
  const { user } = useAuthStore();
  const isAgent  = user?.type === 'agent';

  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [status, setStatus]   = useState('');
  const [source, setSource]   = useState('');
  const [agentId, setAgentId] = useState('');
  const [selected, setSelected] = useState([]);

  // Modal states
  const [showAdd, setShowAdd]           = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);  // { leadIds, single }
  const [reminderTarget, setReminderTarget] = useState(null); // lead object

  const params = {
    page, limit: PAGE_SIZE,
    ...(search   && { search }),
    ...(status   && { status }),
    ...(source   && { source }),
    ...(agentId  && !isAgent && { agentId }),
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['leads', params],
    queryFn:  () => leadApi.getAll(params).then(r => r.data),
    keepPreviousData: true,
  });

  const { data: agentsData } = useQuery({
    queryKey: ['agents-list'],
    queryFn:  () => agentApi.getAll().then(r => r.data),
    enabled:  !isAgent,  // agents don't need this
  });

  const deleteMut = useMutation({
    mutationFn: (id) => leadApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['leads'] }); toast.success('Lead deleted'); },
    onError:   () => toast.error('Failed to delete lead'),
  });

  const leads      = data?.leads || [];
  const total      = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const agents     = agentsData?.agents || [];

  const toggleSelect = (id) => setSelected(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  const toggleAll    = () => setSelected(s => s.length === leads.length ? [] : leads.map(l=>l._id));
  const resetFilters = () => { setSearch(''); setStatus(''); setSource(''); setAgentId(''); setPage(1); };

  const invalidateLeads = () => {
    qc.invalidateQueries({ queryKey: ['leads'] });
  };

  const onModalSaved = () => {
    setShowAdd(false);
    setAssignTarget(null);
    setReminderTarget(null);
    setSelected([]);
    invalidateLeads();
  };

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">

      {/* ── Header ── */}
      <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
            {isAgent ? 'My Leads' : 'Leads Management'}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">
            {isAgent ? 'Leads assigned to you.' : 'Track and nurture your WhatsApp prospects.'}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAdd(true)} className="btn-primary w-full sm:w-auto gap-2 text-sm py-2 sm:py-2.5">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            Add Lead
          </button>
        </div>
      </motion.div>

      {/* ── Filters ── */}
      <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.08 }}
        className="card p-4 space-y-4"
      >
        <div className={`grid gap-3 ${isAgent ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-5'}`}>
          <div className={isAgent ? 'sm:col-span-2 lg:col-span-1' : 'sm:col-span-2'}>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
              <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}
                placeholder="Name or phone…" className="input-field pl-10 py-2 text-sm"/>
            </div>
          </div>
          <select value={status} onChange={e=>{setStatus(e.target.value);setPage(1);}} className="input-field py-2 text-sm">
            <option value="">All Statuses</option>
            <option value="new">New Lead</option>
            <option value="contacted">Contacted</option>
            <option value="interested">Interested</option>
            <option value="qualified">Qualified</option>
            <option value="negotiation">Negotiating</option>
            <option value="closed">Closed</option>
            <option value="lost">Lost</option>
          </select>
          <select value={source} onChange={e=>{setSource(e.target.value);setPage(1);}} className="input-field py-2 text-sm">
            <option value="">All Sources</option>
            <option value="organic">Organic</option>
            <option value="whatsapp_ad">WhatsApp Ads</option>
            <option value="facebook">Facebook</option>
            <option value="instagram">Instagram</option>
            <option value="referral">Referral</option>
            <option value="website">Website</option>
            <option value="other">Other</option>
          </select>
          {/* Agent filter — hidden from agents themselves */}
          {!isAgent && (
            <select value={agentId} onChange={e=>{setAgentId(e.target.value);setPage(1);}} className="input-field py-2 text-sm">
              <option value="">All Agents</option>
              <option value="unassigned">Unassigned</option>
              {agents.map(a => <option key={a._id} value={a._id}>{a.name}</option>)}
            </select>
          )}
        </div>

        {/* Bulk actions bar */}
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-3 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {selected.length > 0 && (
              <>
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1.5 rounded-lg">
                  {selected.length} selected
                </span>
                {!isAgent && (
                  <button onClick={() => setAssignTarget({ leadIds: selected, single: false })}
                    className="btn-secondary text-xs py-1.5 px-3 gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">assignment_ind</span>Assign
                  </button>
                )}
                <button onClick={() => setSelected([])}
                  className="btn-secondary text-xs py-1.5 px-3 gap-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <span className="material-symbols-outlined text-[14px]">deselect</span>Clear
                </button>
              </>
            )}
            {(search||status||source||agentId) && (
              <button onClick={resetFilters} className="text-xs text-slate-400 hover:text-primary flex items-center gap-1 transition-colors">
                <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>Clear filters
              </button>
            )}
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {isLoading ? 'Loading…' : `${total} lead${total!==1?'s':''} found`}
          </span>
        </div>
      </motion.div>

      {/* ── Table ── */}
      <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.14 }}
        className="card overflow-hidden"
      >
        {error ? (
          <div className="p-12 text-center">
            <span className="material-symbols-outlined text-4xl text-red-400 mb-3 block">error</span>
            <p className="text-slate-600 dark:text-slate-400">Failed to load leads.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700">
                    <th className="px-4 py-3.5 w-10">
                      <input type="checkbox"
                        checked={selected.length===leads.length && leads.length>0}
                        onChange={toggleAll}
                        className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary/30"
                      />
                    </th>
                    {['Lead','Phone','Status','Source',...(!isAgent?['Agent']:[]),'Score','Last Activity','Actions'].map(h=>(
                      <th key={h} className="px-4 py-3.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {isLoading
                    ? [...Array(5)].map((_,i) => <SkeletonRow key={i}/>)
                    : leads.length === 0
                    ? (
                      <tr><td colSpan={isAgent?8:9} className="px-6 py-16 text-center">
                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3 block">person_search</span>
                        <p className="text-slate-500 font-medium">
                          {isAgent ? 'No leads assigned to you yet.' : 'No leads found.'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {isAgent ? 'Ask your manager to assign leads.' : 'Try adjusting filters or add a new lead.'}
                        </p>
                      </td></tr>
                    )
                    : leads.map((lead, i) => (
                      <motion.tr key={lead._id}
                        initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
                        transition={{ delay: i * 0.03 }}
                        className="hover:bg-primary/5 transition-colors group cursor-pointer"
                        onClick={() => navigate(`/leads/${lead._id}`)}
                      >
                        <td className="px-4 py-3.5" onClick={e=>e.stopPropagation()}>
                          <input type="checkbox" checked={selected.includes(lead._id)}
                            onChange={()=>toggleSelect(lead._id)}
                            className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary/30"
                          />
                        </td>

                        {/* Name */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                              {getInitials(lead.name)}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
                                {lead.name}
                              </p>
                              {lead.reminderAt && new Date(lead.reminderAt) > new Date() && (
                                <p className="text-[10px] text-amber-500 flex items-center gap-0.5 mt-0.5">
                                  <span className="material-symbols-outlined text-[11px]">alarm</span>
                                  {formatDate(lead.reminderAt, 'MMM d, h:mm a')}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Phone */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 text-primary">
                            <span className="material-symbols-outlined text-[14px]">call</span>
                            <span>{lead.phone}</span>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3.5"><StatusBadge status={lead.status}/></td>

                        {/* Source */}
                        <td className="px-4 py-3.5 text-slate-500 dark:text-slate-400 capitalize">
                          {lead.source?.replace(/_/g,' ') || '—'}
                        </td>

                        {/* Agent — owner only */}
                        {!isAgent && (
                          <td className="px-4 py-3.5">
                            {lead.assignedTo ? (
                              <div className="flex items-center gap-1.5">
                                <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                  {getInitials(lead.assignedTo.name||'')}
                                </div>
                                <span className="text-slate-700 dark:text-slate-300 text-xs">{lead.assignedTo.name}</span>
                              </div>
                            ) : (
                              <button
                                onClick={e=>{e.stopPropagation();setAssignTarget({leadIds:[lead._id],single:true,lead});}}
                                className="text-xs text-slate-400 hover:text-primary transition-colors flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-[13px]">add</span>Assign
                              </button>
                            )}
                          </td>
                        )}

                        {/* Score */}
                        <td className="px-4 py-3.5"><LeadScoreBadge score={lead.leadScore||0}/></td>

                        {/* Last activity */}
                        <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap">
                          {lead.lastMessageAt ? timeAgo(lead.lastMessageAt) : timeAgo(lead.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5" onClick={e=>e.stopPropagation()}>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {/* Chat */}
                            <button onClick={()=>navigate(`/inbox?lead=${lead._id}`)} title="Open chat"
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <span className="material-symbols-outlined text-[16px]">chat</span>
                            </button>

                            {/* Reminder — owner and agent */}
                            <button onClick={()=>setReminderTarget(lead)} title="Set reminder"
                              className={`p-1.5 rounded-lg transition-colors ${
                                lead.reminderAt && new Date(lead.reminderAt) > new Date()
                                  ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                  : 'text-slate-400 hover:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                              }`}>
                              <span className="material-symbols-outlined text-[16px]">alarm</span>
                            </button>

                            {/* Assign — owner only */}
                            {!isAgent && (
                              <button onClick={()=>setAssignTarget({leadIds:[lead._id],single:true,lead})} title="Assign agent"
                                className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-[16px]">assignment_ind</span>
                              </button>
                            )}

                            {/* View */}
                            <button onClick={()=>navigate(`/leads/${lead._id}`)} title="View detail"
                              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                              <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                            </button>

                            {/* Delete — owner only */}
                            {!isAgent && (
                              <button onClick={()=>{if(window.confirm('Delete this lead?'))deleteMut.mutate(lead._id);}}
                                title="Delete"
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))
                  }
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30">
                <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
                <div className="flex items-center gap-1.5">
                  <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1}
                    className="size-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 disabled:opacity-40 hover:text-primary hover:border-primary transition-colors">
                    <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                  </button>
                  {[...Array(Math.min(totalPages,5))].map((_,i)=>{
                    const p = i+1;
                    return (
                      <button key={p} onClick={()=>setPage(p)}
                        className={`size-8 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                          page===p
                            ? 'bg-primary text-white shadow-[0_2px_8px_rgba(16,183,127,0.4)]'
                            : 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary'
                        }`}
                      >{p}</button>
                    );
                  })}
                  <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages}
                    className="size-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-400 disabled:opacity-40 hover:text-primary hover:border-primary transition-colors">
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAdd && (
          <AddLeadModal isAgent={isAgent} onClose={()=>setShowAdd(false)} onSaved={onModalSaved}/>
        )}
        {assignTarget && (
          <AssignModal
            leadIds={assignTarget.leadIds}
            single={assignTarget.single}
            agents={agents}
            onClose={()=>setAssignTarget(null)}
            onSaved={onModalSaved}
          />
        )}
        {reminderTarget && (
          <ReminderModal
            lead={reminderTarget}
            onClose={()=>setReminderTarget(null)}
            onSaved={onModalSaved}
          />
        )}
      </AnimatePresence>
    </div>
  );
}