import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { leadApi } from '../api/leadApi';
import { messageApi } from '../api/messageApi';
import { useSocket } from '../hooks/useSocket';
import StatusBadge from '../components/ui/StatusBadge';
import LeadScoreBadge from '../components/ui/LeadScoreBadge';
import { timeAgo, getInitials } from '../utils/helpers';
import { useAuthStore } from '../store/authStore';

/* ── Conversation List Item ── */
function ConvoItem({ lead, isActive, onClick }) {
  return (
    <motion.div
      initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }}
      onClick={onClick}
      className={`p-4 cursor-pointer transition-colors border-l-4 ${
        isActive
          ? 'bg-primary/5 dark:bg-primary/10 border-primary'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">{lead.name}</span>
        <span className="text-[10px] text-slate-400">{lead.lastMessageAt ? timeAgo(lead.lastMessageAt) : ''}</span>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 truncate mb-2">
        {lead.lastMessage || 'No messages yet'}
      </p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <LeadScoreBadge score={lead.leadScore || 0} />
        </div>
        {lead.unreadCount > 0 && (
          <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
            {lead.unreadCount}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ── Message Bubble ── */
function Bubble({ msg }) {
  const out = msg.direction === 'outbound';
  return (
    <div className={`flex flex-col ${out ? 'items-end ml-auto' : 'items-start'} max-w-[70%]`}>
      <div className={`p-3 rounded-2xl text-sm shadow-sm
        ${out ? 'bg-primary text-white rounded-tr-none' : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-none'}`}
      >
        {msg.mediaUrl && (
          <div className="mb-2 flex items-center gap-2 bg-white/20 dark:bg-black/20 rounded-lg p-2">
            <span className="material-symbols-outlined text-[18px]">description</span>
            <div>
              <p className="text-xs font-semibold">Attachment</p>
              <p className="text-[10px] opacity-80">Media file</p>
            </div>
          </div>
        )}
        <p>{msg.body}</p>
      </div>
      <span className={`text-[10px] mt-1 text-slate-400 ${out ? 'mr-1' : 'ml-1'}`}>
        {timeAgo(msg.createdAt)}{out && msg.status === 'read' ? ' · Seen' : ''}
      </span>
    </div>
  );
}

/* ── Main Component ── */
export default function Inbox() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const isAgent = user?.type === 'agent';
  const [searchParams] = useSearchParams();
  const [activeLead, setActiveLead]  = useState(searchParams.get('lead') || null);
  const [message, setMessage]        = useState('');
  const [filter, setFilter]          = useState('all'); // all | unread
  const [search, setSearch]          = useState('');
  const [newMessages, setNewMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderAtInput, setReminderAtInput] = useState('');

  /* Leads list */
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['inbox-leads', filter, search],
    queryFn:  () => leadApi.getAll({ limit: 50, ...(search && { search }), ...(filter==='unread' && { unread:true }) }).then(r => r.data),
    refetchInterval: 30_000,
  });

  /* Active lead messages */
  const { data: msgData, isLoading: msgsLoading } = useQuery({
    queryKey: ['messages', activeLead],
    queryFn:  () => messageApi.getByLead(activeLead).then(r => r.data),
    enabled:  !!activeLead,
    refetchInterval: false,
  });

  /* Active lead detail */
  const { data: leadDetail } = useQuery({
    queryKey: ['lead', activeLead],
    queryFn:  () => leadApi.getOne(activeLead).then(r => r.data),
    enabled:  !!activeLead,
  });

  /* Send message */
  const sendMut = useMutation({
    mutationFn: (d) => messageApi.send(d),
    onMutate: async (newMsg) => {
      if (!activeLead) return;
      await qc.cancelQueries(['messages', activeLead]);
      const previous = qc.getQueryData(['messages', activeLead]);

      const tempId = `temp-${Date.now()}`;
      const tempMessage = {
        _id: tempId,
        leadId: activeLead,
        userId: user?._id,
        direction: 'outbound',
        type: newMsg.type || 'text',
        body: newMsg.body,
        status: 'sending',
        createdAt: new Date().toISOString(),
      };

      qc.setQueryData(['messages', activeLead], old => {
        if (!old) return { messages: [tempMessage], total: 1 };
        return { ...old, messages: [...old.messages, tempMessage], total: (old.total || 0) + 1 };
      });

      // optimistic update for inbox-leads: bump lastMessage
      qc.setQueryData(['inbox-leads', filter, search], old => {
        if (!old) return old;
        const leads = old.leads.map(l => l._id === activeLead ? { ...l, lastMessage: newMsg.body, lastMessageAt: new Date().toISOString() } : l);
        return { ...old, leads };
      });

      // clear input immediately for snappier UX
      setMessage('');

      return { previous };
    },
    onError: (err, newMsg, context) => {
      if (activeLead && context?.previous) qc.setQueryData(['messages', activeLead], context.previous);
      toast.error('Failed to send message');
    },
    onSettled: () => {
      qc.invalidateQueries(['messages', activeLead]);
      qc.invalidateQueries(['inbox-leads']);
    },
    onSuccess: () => {},
  });

  /* Socket.io — real-time */
  useSocket((event, data) => {
    if (event === 'new_message') {
      qc.invalidateQueries(['inbox-leads']);
      if (data.leadId === activeLead) {
        qc.invalidateQueries(['messages', activeLead]);
      } else {
        toast(`New message from ${data.leadName || 'a lead'}`, { icon: '💬' });
      }
    }
  });

  /* Scroll to bottom on new messages */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgData, newMessages]);

  const leads       = leadsData?.leads || [];
  const messages    = msgData?.messages || [];
  const activeLeadData = (leadDetail?.lead || leadDetail) || leads.find(l => l._id === activeLead);

  const handleSend = () => {
    const body = message.trim();
    if (!body || !activeLead) return;
    sendMut.mutate({ leadId: activeLead, body, type: 'text' });
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {/* Leads Column */}
      <section className="w-80 shrink-0 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Conversations</h2>
            {isAgent && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-primary/10 text-primary rounded-lg">
                Assigned to you
              </span>
            )}
          </div>
          <div className="relative mb-3">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-2">
            {['all','unread','assigned'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold transition-colors capitalize
                  ${filter === f ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              >{f}</button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {leadsLoading ? (
            [...Array(6)].map((_, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="skeleton h-4 w-32 rounded"/><div className="skeleton h-3 w-48 rounded"/><div className="skeleton h-3 w-20 rounded"/>
              </div>
            ))
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <span className="material-symbols-outlined text-3xl mb-2 block">inbox</span>
              {isAgent
                ? 'No leads assigned to you yet. Ask your manager to assign leads.'
                : 'No conversations yet'
              }
            </div>
          ) : leads.map(lead => (
            <ConvoItem key={lead._id} lead={lead} isActive={activeLead === lead._id} onClick={() => setActiveLead(lead._id)} />
          ))}
        </div>
      </section>

      {/* Chat Window */}
      {activeLead ? (
        <main className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950">
          {/* Chat Header */}
          <header className="h-16 flex items-center justify-between px-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                {getInitials(activeLeadData?.name || '')}
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">{activeLeadData?.name || '…'}</h2>
                <div className="flex items-center gap-1.5">
                  {activeLeadData?.status && <StatusBadge status={activeLeadData.status} />}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {[{icon:'more_vert', title:'More'}].map(({icon, title}) => (
                <button key={icon} title={title}
                  className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-[20px]">{icon}</span>
                </button>
              ))}
            </div>
          </header>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {msgsLoading ? (
              <div className="flex items-center justify-center h-full">
                <span className="material-symbols-outlined text-3xl text-slate-300 animate-spin">progress_activity</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                <span className="material-symbols-outlined text-5xl mb-3">chat_bubble_outline</span>
                <p>No messages yet</p>
                <p className="text-xs mt-1">Start the conversation below</p>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  <span className="text-[10px] bg-slate-200 dark:bg-slate-800 px-3 py-1 rounded-full text-slate-500 uppercase font-bold tracking-widest">
                    Conversation
                  </span>
                </div>
                {messages.map(msg => <Bubble key={msg._id} msg={msg} />)}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shrink-0">
            <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-800 rounded-2xl px-4 py-2">
              <button className="text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">sentiment_satisfied</span>
              </button>
              <button className="text-slate-400 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-[20px]">attach_file</span>
              </button>
              <input
                value={message}
                onChange={e => setMessage(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Type a message… (Enter to send)"
                className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400"
              />
              <button
                onClick={handleSend}
                disabled={!message.trim() || sendMut.isPending}
                className="size-9 bg-primary text-white rounded-xl flex items-center justify-center hover:bg-primary-600 transition-colors disabled:opacity-50 shrink-0 shadow-[0_2px_8px_rgba(16,183,127,0.35)]"
              >
                {sendMut.isPending
                  ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                  : <span className="material-symbols-outlined text-[16px]">send</span>
                }
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex-1 flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">
          <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} className="text-center">
            <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4 block">forum</span>
            <p className="font-semibold text-slate-500 dark:text-slate-400">Select a conversation to start</p>
            <p className="text-sm mt-1">Or wait for a new message to come in</p>
          </motion.div>
        </main>
      )}

      {/* Info Panel */}
      {activeLead && activeLeadData && (
        <aside className="w-72 shrink-0 flex flex-col bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-700 overflow-y-auto">
          <div className="p-6 flex flex-col items-center text-center border-b border-slate-100 dark:border-slate-800">
            <div className="size-20 rounded-full bg-primary/15 flex items-center justify-center text-primary text-2xl font-black mb-4 ring-4 ring-primary/10">
              {getInitials(activeLeadData.name || '')}
            </div>
            <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">{activeLeadData.name}</h3>
            <p className="text-slate-400 text-xs mb-3">{activeLeadData.phone}</p>
            <LeadScoreBadge score={activeLeadData.leadScore || 0} showLabel />
          </div>

          <div className="p-5 space-y-5 flex-1">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
              <StatusBadge status={activeLeadData.status} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Source</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 capitalize">{activeLeadData.source?.replace(/_/g,' ') || '—'}</p>
            </div>
            {activeLeadData.assignedAgent && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Assigned Agent</p>
                <div className="flex items-center gap-2">
                  <div className="size-7 rounded-full bg-primary/20 flex items-center justify-center text-[11px] font-bold text-primary">
                    {getInitials(activeLeadData.assignedAgent.name || '')}
                  </div>
                  <span className="text-sm text-slate-700 dark:text-slate-300">{activeLeadData.assignedAgent.name}</span>
                </div>
              </div>
            )}
            {(activeLeadData.tags || []).length > 0 && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {activeLeadData.tags.map(tag => (
                    <span key={tag} className="bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5 rounded-lg border border-primary/20">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <button onClick={() => setShowNoteModal(true)} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors">
                <span className="material-symbols-outlined text-[16px]">note_add</span>Add Note
              </button>
              <button onClick={() => {
                setReminderAtInput(activeLeadData?.reminderAt ? new Date(activeLeadData.reminderAt).toISOString().slice(0,16) : new Date(Date.now()+30*60000).toISOString().slice(0,16));
                setShowReminderModal(true);
              }} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors">
                <span className="material-symbols-outlined text-[16px]">alarm</span>Set Reminder
              </button>
              <button onClick={() => window.location.href = `/leads/${activeLead}`} className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors">
                <span className="material-symbols-outlined text-[16px]">open_in_new</span>View Full Profile
              </button>
            <button className="w-full btn-primary text-xs py-2.5 mt-1">Close Conversation</button>
          </div>

          {/* Add Note Modal */}
          {showNoteModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowNoteModal(false)} />
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6">
                <h3 className="font-bold mb-3">Add Note</h3>
                <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={4} className="input-field w-full mb-4" />
                <div className="flex gap-3">
                  <button onClick={() => setShowNoteModal(false)} className="btn-secondary">Cancel</button>
                  <button onClick={async () => {
                    try {
                      if (!noteText.trim()) return toast.error('Note cannot be empty');
                      await leadApi.update(activeLead, { notes: noteText.trim() });
                      qc.invalidateQueries(['lead', activeLead]); qc.invalidateQueries(['inbox-leads']); qc.invalidateQueries(['messages', activeLead]);
                      setNoteText(''); setShowNoteModal(false); toast.success('Note saved');
                    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save note'); }
                  }} className="btn-primary ml-auto">Save Note</button>
                </div>
              </div>
            </div>
          )}

          {/* Reminder Modal */}
          {showReminderModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" onClick={() => setShowReminderModal(false)} />
              <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6">
                <h3 className="font-bold mb-3">Set Reminder</h3>
                <input type="datetime-local" value={reminderAtInput} onChange={e => setReminderAtInput(e.target.value)} className="input-field w-full mb-4" />
                <div className="flex gap-3">
                  <button onClick={() => setShowReminderModal(false)} className="btn-secondary">Cancel</button>
                  <button onClick={async () => {
                    try {
                      if (!reminderAtInput) return toast.error('Please choose date & time');
                      await leadApi.setReminder(activeLead, { reminderAt: reminderAtInput });
                      qc.invalidateQueries(['lead', activeLead]); qc.invalidateQueries(['inbox-leads']);
                      setShowReminderModal(false); toast.success('Reminder set');
                    } catch (err) { toast.error(err.response?.data?.message || 'Failed to set reminder'); }
                  }} className="btn-primary ml-auto">Set Reminder</button>
                </div>
              </div>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
