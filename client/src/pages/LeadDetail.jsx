import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { leadApi } from '../api/leadApi';
import { agentApi } from '../api/agentApi';
import { messageApi } from '../api/messageApi';
import StatusBadge from '../components/ui/StatusBadge';
import LeadScoreBadge from '../components/ui/LeadScoreBadge';
import { timeAgo, formatDate, getInitials, PIPELINE_STAGES } from '../utils/helpers';

const TABS = ['Overview', 'Notes', 'Timeline', 'AI Insights'];

export default function LeadDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState('Overview');
  const [note, setNote] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['lead', id],
    queryFn:  () => leadApi.getOne(id).then(r => r.data),
  });

  const { data: messagesData } = useQuery({
    queryKey: ['messages', id],
    queryFn:  () => messageApi.getByLead(id).then(r => r.data),
    enabled:  tab === 'Timeline',
  });

  const { data: agentsData } = useQuery({
    queryKey: ['agents-list'],
    queryFn:  () => agentApi.getAll().then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: (d) => leadApi.update(id, d),
    onSuccess: () => { qc.invalidateQueries(['lead', id]); toast.success('Lead updated'); },
    onError:   () => toast.error('Update failed'),
  });

  if (isLoading) return (
    <div className="p-8 space-y-6 animate-fade-in">
      <div className="skeleton h-8 w-48 rounded-xl"/>
      <div className="card p-6"><div className="skeleton h-32 w-full rounded-xl"/></div>
    </div>
  );

  if (error || !data) return (
    <div className="flex-1 flex items-center justify-center p-8 text-center">
      <div>
        <span className="material-symbols-outlined text-5xl text-red-400 block mb-4">person_off</span>
        <p className="text-slate-600 dark:text-slate-400 font-medium">Lead not found</p>
        <Link to="/leads" className="text-primary hover:underline text-sm mt-2 block">← Back to Leads</Link>
      </div>
    </div>
  );

  const lead = data.lead || data;
  const aiInsights = data.aiInsights || null;

  return (
    <div className="p-4 sm:p-8 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} className="flex items-center gap-2 text-[11px] sm:text-sm overflow-x-auto no-scrollbar whitespace-nowrap">
        <Link to="/dashboard" className="text-primary hover:underline font-medium">Dashboard</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <Link to="/leads" className="text-primary hover:underline font-medium">Leads</Link>
        <span className="text-slate-300 dark:text-slate-600">/</span>
        <span className="text-slate-900 dark:text-slate-100 font-medium">{lead.name}</span>
      </motion.div>

      {/* Profile Header */}
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.08 }} className="card p-4 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex gap-3 sm:gap-5 items-center">
            <div className="relative">
              <div className="size-14 sm:size-20 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xl sm:text-2xl font-black ring-4 ring-primary/10">
                {getInitials(lead.name)}
              </div>
              <span className="absolute bottom-0 right-0 size-3 sm:size-4 rounded-full border-2 border-white dark:border-slate-900 bg-green-500"/>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <h1 className="text-xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">{lead.name}</h1>
                <StatusBadge status={lead.status} className="scale-90 sm:scale-100" />
              </div>
              <div className="flex items-center gap-3 mt-1">
                <LeadScoreBadge score={lead.leadScore || 0} showLabel className="scale-90 sm:scale-100 origin-left" />
                <p className="hidden sm:flex text-slate-500 dark:text-slate-400 items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  Active {lead.lastMessageAt ? timeAgo(lead.lastMessageAt) : timeAgo(lead.createdAt)}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 sm:gap-3">
            <button onClick={() => navigate(`/inbox?lead=${id}`)} className="btn-secondary flex-1 sm:flex-none justify-center gap-2 text-sm py-2">
              <span className="material-symbols-outlined text-[18px]">chat</span> Message
            </button>
            <button className="btn-primary flex-1 sm:flex-none justify-center gap-2 text-sm py-2">
              <span className="material-symbols-outlined text-[18px]">edit</span> Edit
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 sm:mt-8 border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
          <nav className="flex gap-6 sm:gap-8 min-w-max">
            {TABS.map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`pb-3 sm:pb-4 text-xs sm:text-sm font-bold tracking-wide transition-colors flex items-center gap-1.5 whitespace-nowrap
                  ${tab === t ? 'text-primary border-b-2 border-primary' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                {t === 'AI Insights' && <span className="material-symbols-outlined text-[16px]">auto_awesome</span>}
                {t}
              </button>
            ))}
          </nav>
        </div>
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {tab === 'Overview' && (
            <>
              {/* Contact Info */}
              <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="card p-6">
                <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <span className="material-symbols-outlined text-primary text-[20px]">contact_page</span>
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {[
                    { label:'WhatsApp Number', value: lead.phone },
                    { label:'Email',           value: lead.email || '—' },
                    { label:'Lead Source',     value: lead.source?.replace(/_/g,' ') || '—' },
                    { label:'Added On',        value: formatDate(lead.createdAt) },
                    { label:'Company',         value: lead.company || '—' },
                    { label:'Tags',            value: lead.tags?.join(', ') || '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                      <p className="text-slate-900 dark:text-slate-100 font-medium capitalize text-sm">{value}</p>
                    </div>
                  ))}
                </div>
              </motion.div>

              {/* Messages Preview */}
              <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }} className="card p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <span className="material-symbols-outlined text-primary text-[20px]">chat</span>
                    Recent Messages
                  </h3>
                  <button onClick={() => navigate(`/inbox?lead=${id}`)} className="text-xs text-primary font-semibold hover:underline">
                    Open in Inbox →
                  </button>
                </div>
                <div className="text-center py-8 text-slate-400 text-sm">
                  <span className="material-symbols-outlined text-3xl mb-2 block">chat_bubble_outline</span>
                  Click "Open in Inbox" to view the full conversation
                </div>
              </motion.div>
            </>
          )}

          {tab === 'Notes' && (
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="card p-6">
              <h3 className="text-base font-bold mb-5 text-slate-900 dark:text-slate-100">Internal Notes</h3>
              <textarea
                rows={4}
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Add a private note about this lead…"
                className="input-field resize-none mb-3"
              />
              <button
                onClick={() => { updateMut.mutate({ notes: note }); setNote(''); }}
                className="btn-primary"
              >
                <span className="material-symbols-outlined text-[18px]">note_add</span> Save Note
              </button>
              {Array.isArray(lead.notes) && lead.notes.length > 0 && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/10 border-l-4 border-amber-400 rounded-r-xl">
                  {lead.notes.slice().reverse().map((n, idx) => (
                    <div key={n._id || idx} className="mb-3">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{n.text}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{n.createdAt ? timeAgo(n.createdAt) : ''}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {tab === 'Timeline' && (
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="card p-6">
              <h3 className="text-base font-bold mb-5 text-slate-900 dark:text-slate-100">Message Timeline</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {(messagesData?.messages || []).length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-sm">
                    <span className="material-symbols-outlined text-3xl mb-2 block">history</span>
                    No messages yet
                  </div>
                ) : (messagesData?.messages || []).map(msg => (
                  <div key={msg._id} className={`flex ${msg.direction==='outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-xl text-sm
                      ${msg.direction==='outbound'
                        ? 'bg-primary text-white rounded-tr-none'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-none'}`}
                    >
                      <p>{msg.body}</p>
                      <p className={`text-[10px] mt-1 ${msg.direction==='outbound' ? 'text-white/70' : 'text-slate-400'}`}>
                        {timeAgo(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'AI Insights' && (
            <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }}
              className="card p-6 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-transparent border-primary/20"
            >
              <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <span className="material-symbols-outlined text-primary text-[20px]">smart_toy</span>
                AI Insights
              </h3>
              {aiInsights ? (
                <div className="space-y-4">
                  <div className="bg-white/70 dark:bg-slate-800/60 rounded-xl p-4">
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed italic">"{aiInsights.summary}"</p>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label:'Intent',      value: aiInsights.intent,     color:'text-primary'    },
                      { label:'Urgency',     value: aiInsights.urgency,    color:'text-orange-500' },
                      { label:'Next Action', value: aiInsights.nextAction, color:'text-slate-700 dark:text-slate-200' },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{label}</p>
                        <p className={`text-sm font-bold ${color}`}>{value || '—'}</p>
                      </div>
                    ))}
                  </div>
                  {aiInsights.suggestedMessage && (
                    <div className="p-4 border border-primary/30 rounded-xl bg-primary/5">
                      <p className="text-xs font-bold text-primary uppercase mb-2">Suggested Message</p>
                      <p className="text-sm text-slate-800 dark:text-slate-200 mb-3">"{aiInsights.suggestedMessage}"</p>
                      <button
                        onClick={() => { navigator.clipboard.writeText(aiInsights.suggestedMessage); toast.success('Copied!'); }}
                        className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        Copy message <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3 block">auto_awesome</span>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">AI insights will appear here once there are enough messages from this lead.</p>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Management */}
          <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.15 }} className="card p-5">
            <h3 className="text-sm font-bold mb-4 text-slate-900 dark:text-slate-100">Management</h3>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Status</label>
                <select
                  value={lead.status}
                  onChange={e => updateMut.mutate({ status: e.target.value })}
                  className="input-field py-2 text-sm"
                >
                  {PIPELINE_STAGES.map(s => (
                    <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5">Assigned Agent</label>
                <select
                  value={lead.assignedAgent?._id || lead.assignedAgent || ''}
                  onChange={e => updateMut.mutate({ assignedAgent: e.target.value || null })}
                  className="input-field py-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {(agentsData?.agents || []).map(a => (
                    <option key={a._id} value={a._id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </motion.div>

          {/* Tags */}
          <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.2 }} className="card p-5">
            <h3 className="text-sm font-bold mb-3 text-slate-900 dark:text-slate-100">Tags</h3>
            <div className="flex flex-wrap gap-2">
              {(lead.tags || []).map(tag => (
                <span key={tag} className="bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full border border-primary/20">
                  {tag}
                </span>
              ))}
              {!lead.tags?.length && <p className="text-xs text-slate-400 italic">No tags yet</p>}
            </div>
          </motion.div>

          {/* Reminder */}
          <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.25 }} className="card p-5">
            <h3 className="text-sm font-bold mb-4 text-slate-900 dark:text-slate-100">Reminder</h3>
            {lead.reminderAt ? (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/10 border-l-4 border-orange-500 rounded-r-xl">
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">Follow-up Scheduled</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                  {formatDate(lead.reminderAt, 'MMM d, yyyy · h:mm a')}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic mb-3">No reminder set</p>
            )}
            <button className="w-full mt-3 py-2 border border-dashed border-primary/40 rounded-xl text-primary text-sm font-medium hover:bg-primary/5 transition-colors">
              + Set Reminder
            </button>
          </motion.div>

          {/* Score */}
          <motion.div initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.3 }} className="card p-5">
            <h3 className="text-sm font-bold mb-3 text-slate-900 dark:text-slate-100">Lead Score</h3>
            <div className="flex items-center gap-3">
              <div className="relative size-16">
                <svg viewBox="0 0 36 36" className="rotate-[-90deg] w-full h-full">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-700" strokeWidth="3.8"/>
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b77f" strokeWidth="3.8"
                    strokeDasharray={`${lead.leadScore || 0} ${100 - (lead.leadScore || 0)}`}
                    strokeDashoffset="0"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-black text-slate-900 dark:text-slate-100">{lead.leadScore || 0}</span>
                </div>
              </div>
              <div>
                <LeadScoreBadge score={lead.leadScore || 0} showLabel />
                <p className="text-xs text-slate-400 mt-1">Auto-calculated</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
