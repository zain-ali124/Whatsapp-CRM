import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { format, isToday, isYesterday } from 'date-fns';
import { leadApi } from '../api/leadApi';
import { messageApi } from '../api/messageApi';
import { useSocket } from '../hooks/useSocket';
import StatusBadge from '../components/ui/StatusBadge';
import LeadScoreBadge from '../components/ui/LeadScoreBadge';
import { getInitials } from '../utils/helpers';
import { useAuthStore } from '../store/authStore';

/* ─── Helpers ─── */
function msgTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  if (isToday(d))     return format(d, 'h:mm a');
  if (isYesterday(d)) return 'Yesterday ' + format(d, 'h:mm a');
  return format(d, 'MMM d, h:mm a');
}

function isOnline(lastAt) {
  if (!lastAt) return false;
  return Date.now() - new Date(lastAt).getTime() < 5 * 60 * 1000; // 5 min
}

/* ─── Simple Emoji Picker ─── */
const EMOJIS = ['😊','😂','❤️','👍','🙏','😍','🎉','🔥','😎','💯',
                '✅','❌','🤔','😅','🙌','💪','👋','😢','🥰','👀',
                '🚀','💰','📞','⏰','📋','✍️','🎯','💡','📱','🌟'];

function EmojiPicker({ onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      className="absolute bottom-14 left-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-3 z-50 w-64"
    >
      <div className="grid grid-cols-10 gap-1">
        {EMOJIS.map(e => (
          <button key={e} onClick={() => { onSelect(e); onClose(); }}
            className="text-lg hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg p-0.5 transition-colors leading-none"
          >{e}</button>
        ))}
      </div>
    </motion.div>
  );
}

/* ─── Conversation List Item ─── */
function ConvoItem({ lead, isActive, onClick }) {
  const online = isOnline(lead.lastMessageAt);
  const preview = lead.lastMessage || 'No messages yet';

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className={`p-4 cursor-pointer transition-colors border-l-4 ${
        isActive
          ? 'bg-primary/5 dark:bg-primary/10 border-primary'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-transparent'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar with online dot */}
        <div className="relative shrink-0">
          <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
            {getInitials(lead.name)}
          </div>
          {online && (
            <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-primary border-2 border-white dark:border-slate-900"/>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-0.5">
            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">{lead.name}</span>
            <span className="text-[10px] text-slate-400 shrink-0 ml-2">
              {lead.lastMessageAt ? msgTime(lead.lastMessageAt) : ''}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{preview}</p>
          <div className="flex items-center justify-between mt-1.5">
            <LeadScoreBadge score={lead.leadScore || 0} />
            {lead.unreadCount > 0 && (
              <span className="bg-primary text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold min-w-[18px] text-center">
                {lead.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Message Bubble ─── */
function Bubble({ msg }) {
  const out = msg.direction === 'outbound';
  const time = msgTime(msg.timestamp || msg.createdAt);
  const isSending = msg.status === 'sending';

  return (
    <div className={`flex flex-col ${out ? 'items-end ml-auto' : 'items-start'} max-w-[70%]`}>
      <div className={`px-3.5 py-2.5 rounded-2xl text-sm shadow-sm
        ${out
          ? 'bg-primary text-white rounded-tr-none'
          : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-tl-none'
        } ${isSending ? 'opacity-60' : ''}`}
      >
        {msg.mediaUrl && (
          <div className="mb-2 flex items-center gap-2 bg-white/20 rounded-lg p-2">
            <span className="material-symbols-outlined text-[18px]">description</span>
            <p className="text-xs font-semibold">Attachment</p>
          </div>
        )}
        <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
      </div>
      <div className={`flex items-center gap-1 mt-1 ${out ? 'flex-row-reverse' : ''}`}>
        <span className="text-[10px] text-slate-400">{time}</span>
        {out && (
          <span className="text-[10px] text-slate-400">
            {isSending ? '🕐' : msg.status === 'read' ? '✓✓' : msg.status === 'delivered' ? '✓✓' : '✓'}
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Date Separator ─── */
function DateSep({ date }) {
  const d = new Date(date);
  const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'MMMM d, yyyy');
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"/>
      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider bg-slate-50 dark:bg-slate-950 px-2">{label}</span>
      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"/>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN
═══════════════════════════════════════════════════════════ */
export default function Inbox() {
  const qc       = useQueryClient();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const isAgent  = user?.type === 'agent';

  const [searchParams]  = useSearchParams();
  const [activeLead, setActiveLead] = useState(searchParams.get('lead') || null);
  const [message, setMessage]       = useState('');
  const [filter, setFilter]         = useState('all');
  const [search, setSearch]         = useState('');
  const [mobileView, setMobileView] = useState('list');
  const [showEmoji, setShowEmoji]   = useState(false);
  const [showNote, setShowNote]     = useState(false);
  const [noteText, setNoteText]     = useState('');
  const [showReminder, setShowReminder] = useState(false);
  const [reminderInput, setReminderInput] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);
  const inputRef       = useRef(null);

  // Mobile: switch to chat when lead selected
  useEffect(() => {
    if (activeLead && mobileView === 'list') setMobileView('chat');
  }, [activeLead]);

  // ── Check due reminders every 30 seconds ──
  useEffect(() => {
    const check = () => {
      const leads = qc.getQueryData(['inbox-leads', filter, search])?.leads || [];
      const now = new Date();
      leads.forEach(lead => {
        if (!lead.reminderAt) return;
        const remAt = new Date(lead.reminderAt);
        const diff  = remAt - now;
        // Due within the last 30 seconds
        if (diff > -30000 && diff <= 30000) {
          toast(`⏰ Reminder: Follow up with ${lead.name}!`, {
            duration: 8000,
            icon: '🔔',
            style: { fontWeight: 'bold' },
          });
          // Play notification sound if browser allows
          try { new Audio('/notification.mp3').play().catch(() => {}); } catch {}
        }
      });
    };
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [filter, search, qc]);

  // ── Queries ──
  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ['inbox-leads', filter, search],
    queryFn: () => {
      const params = { limit: 100 };
      if (search) params.search = search;
      // Backend filters — agent filter applies via scope automatically
      if (filter === 'unread') params.unread = true;
      return leadApi.getAll(params).then(r => r.data);
    },
    refetchInterval: 15_000,
  });

  const { data: msgData, isLoading: msgsLoading } = useQuery({
    queryKey: ['messages', activeLead],
    queryFn:  () => messageApi.getByLead(activeLead).then(r => r.data),
    enabled:  !!activeLead,
  });

  const { data: leadDetail } = useQuery({
    queryKey: ['lead', activeLead],
    queryFn:  () => leadApi.getOne(activeLead).then(r => r.data),
    enabled:  !!activeLead,
  });

  // ── Send message ──
  const sendMut = useMutation({
    mutationFn: (d) => messageApi.send(d),
    onMutate: async (newMsg) => {
      await qc.cancelQueries(['messages', activeLead]);
      const prev = qc.getQueryData(['messages', activeLead]);
      const temp = {
        _id:       `temp-${Date.now()}`,
        direction: 'outbound',
        type:      'text',
        body:      newMsg.body,
        status:    'sending',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      qc.setQueryData(['messages', activeLead], old => ({
        ...(old || {}),
        messages: [...(old?.messages || []), temp],
      }));
      setMessage('');
      return { prev };
    },
    onError: (err, _, ctx) => {
      if (ctx?.prev) qc.setQueryData(['messages', activeLead], ctx.prev);
      toast.error('Failed to send message');
    },
    onSettled: () => {
      qc.invalidateQueries(['messages', activeLead]);
      qc.invalidateQueries(['inbox-leads']);
    },
  });

  // ── Socket.io real-time ──
  useSocket((event, data) => {
    if (event === 'new_message') {
      qc.invalidateQueries({ queryKey: ['inbox-leads'] });
      if (data.leadId === activeLead) {
        qc.invalidateQueries({ queryKey: ['messages', activeLead] });
      } else {
        toast(`💬 ${data.leadName || 'New message'}`, { duration: 3000 });
      }
    }
    if (event === 'reminder_due') {
      toast(`⏰ Reminder: ${data.leadName}`, { duration: 8000, icon: '🔔' });
    }
  });

  // ── Scroll to bottom ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgData]);

  // ── Data ──
  const allLeads = leadsData?.leads || [];

  // Client-side filter for assigned tab
  const leads = filter === 'assigned'
    ? allLeads.filter(l => l.assignedTo)
    : filter === 'unread'
    ? allLeads.filter(l => l.unreadCount > 0)
    : allLeads;

  const rawMsgs = msgData?.messages || [];

  // Group messages by date for separators
  const msgsWithSeps = [];
  let lastDate = null;
  rawMsgs.forEach(msg => {
    const d = new Date(msg.timestamp || msg.createdAt).toDateString();
    if (d !== lastDate) {
      msgsWithSeps.push({ _sep: true, date: msg.timestamp || msg.createdAt, _id: `sep-${d}` });
      lastDate = d;
    }
    msgsWithSeps.push(msg);
  });

  const activeLeadData = leadDetail?.lead || leads.find(l => l._id === activeLead);

  const handleSend = () => {
    const body = message.trim();
    if (!body || !activeLead || sendMut.isPending) return;
    sendMut.mutate({ leadId: activeLead, body, type: 'text' });
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const insertEmoji = (emoji) => {
    const el  = inputRef.current;
    const pos = el?.selectionStart ?? message.length;
    setMessage(m => m.slice(0, pos) + emoji + m.slice(pos));
    setTimeout(() => { el?.focus(); el?.setSelectionRange(pos + emoji.length, pos + emoji.length); }, 0);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    toast('📎 File attachments coming soon! Use WhatsApp directly for media.', { duration: 4000 });
    e.target.value = '';
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return toast.error('Note cannot be empty');
    try {
      await leadApi.update(activeLead, { notes: noteText.trim() });
      qc.invalidateQueries({ queryKey: ['lead', activeLead] });
      setNoteText(''); setShowNote(false);
      toast.success('Note saved ✅');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const handleSaveReminder = async () => {
    if (!reminderInput) return toast.error('Pick a date and time');
    try {
      await leadApi.setReminder(activeLead, { reminderAt: reminderInput });
      qc.invalidateQueries({ queryKey: ['lead', activeLead] });
      qc.invalidateQueries({ queryKey: ['inbox-leads'] });
      setShowReminder(false);
      toast.success(`⏰ Reminder set for ${new Date(reminderInput).toLocaleString()}`);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="flex flex-1 overflow-hidden h-full relative">

      {/* ══ LEFT: Conversations ══════════════════════════════════ */}
      <section className={`
        ${mobileView === 'list' ? 'flex' : 'hidden md:flex'}
        w-full md:w-80 shrink-0 flex-col bg-white dark:bg-slate-900
        border-r border-slate-200 dark:border-slate-700
      `}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Conversations
              {allLeads.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">({allLeads.length})</span>
              )}
            </h2>
            {isAgent && (
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-primary/10 text-primary rounded-lg">
                Assigned
              </span>
            )}
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search leads…"
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-1.5">
            {[
              { key: 'all',      label: 'All',      count: allLeads.length },
              { key: 'unread',   label: 'Unread',   count: allLeads.filter(l => l.unreadCount > 0).length },
              { key: 'assigned', label: 'Assigned', count: allLeads.filter(l => l.assignedTo).length },
            ].map(({ key, label, count }) => (
              <button key={key} onClick={() => setFilter(key)}
                className={`flex-1 text-[11px] px-2 py-1.5 rounded-xl font-semibold transition-colors
                  ${filter === key
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
              >
                {label}
                {count > 0 && (
                  <span className={`ml-1 text-[9px] px-1 py-0.5 rounded-full ${filter === key ? 'bg-white/30' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {leadsLoading ? (
            [...Array(5)].map((_, i) => (
              <div key={i} className="p-4 flex gap-3 animate-pulse">
                <div className="skeleton size-10 rounded-full shrink-0"/>
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-3 w-28 rounded"/>
                  <div className="skeleton h-2.5 w-40 rounded"/>
                </div>
              </div>
            ))
          ) : leads.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <span className="material-symbols-outlined text-3xl mb-2 block">inbox</span>
              {filter === 'unread' ? 'No unread messages'
               : filter === 'assigned' ? 'No assigned leads'
               : isAgent ? 'No leads assigned to you yet'
               : 'No conversations yet'}
            </div>
          ) : leads.map(lead => (
            <ConvoItem
              key={lead._id}
              lead={lead}
              isActive={activeLead === lead._id}
              onClick={() => { setActiveLead(lead._id); setMobileView('chat'); }}
            />
          ))}
        </div>
      </section>

      {/* ══ CENTER: Chat ═════════════════════════════════════════ */}
      <main className={`
        ${mobileView === 'chat' ? 'flex' : 'hidden md:flex'}
        flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950
      `}>
        {activeLead ? (
          <>
            {/* Chat Header */}
            <header className="h-16 flex items-center justify-between px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <button onClick={() => setMobileView('list')} className="md:hidden p-1.5 text-slate-400">
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className="relative shrink-0">
                  <div className="size-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm">
                    {getInitials(activeLeadData?.name || '')}
                  </div>
                  {isOnline(activeLeadData?.lastMessageAt) && (
                    <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-primary border-2 border-white dark:border-slate-900"/>
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{activeLeadData?.name || '…'}</h2>
                  <div className="flex items-center gap-2">
                    {activeLeadData?.status && <StatusBadge status={activeLeadData.status} />}
                    {isOnline(activeLeadData?.lastMessageAt) && (
                      <span className="text-[10px] text-primary font-semibold">● Online</span>
                    )}
                    {activeLeadData?.reminderAt && new Date(activeLeadData.reminderAt) > new Date() && (
                      <span className="text-[10px] text-amber-500 flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[11px]">alarm</span>
                        {format(new Date(activeLeadData.reminderAt), 'MMM d, h:mm a')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => navigate(`/leads/${activeLead}`)} title="View profile"
                  className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-[20px]">open_in_new</span>
                </button>
                <button onClick={() => setMobileView('info')} className="xl:hidden p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-[20px]">info</span>
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {msgsLoading ? (
                <div className="flex items-center justify-center h-full">
                  <span className="material-symbols-outlined text-3xl text-slate-300 animate-spin">progress_activity</span>
                </div>
              ) : msgsWithSeps.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm">
                  <span className="material-symbols-outlined text-5xl mb-3">chat_bubble_outline</span>
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Start the conversation below</p>
                </div>
              ) : msgsWithSeps.map(item =>
                item._sep
                  ? <DateSep key={item._id} date={item.date} />
                  : <Bubble key={item._id} msg={item} />
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 shrink-0 relative">
              <AnimatePresence>
                {showEmoji && (
                  <EmojiPicker onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
                )}
              </AnimatePresence>

              <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3 py-2">
                <button onClick={() => setShowEmoji(v => !v)}
                  className={`p-1 rounded-lg transition-colors shrink-0 ${showEmoji ? 'text-primary bg-primary/10' : 'text-slate-400 hover:text-primary'}`}>
                  <span className="material-symbols-outlined text-[20px]">sentiment_satisfied</span>
                </button>

                <button onClick={() => fileInputRef.current?.click()}
                  className="p-1 text-slate-400 hover:text-primary transition-colors shrink-0">
                  <span className="material-symbols-outlined text-[20px]">attach_file</span>
                </button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange}
                  accept="image/*,video/*,.pdf,.doc,.docx"/>

                <textarea
                  ref={inputRef}
                  value={message}
                  onChange={e => { setMessage(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'; }}
                  onKeyDown={handleKey}
                  placeholder="Type a message… (Enter to send)"
                  rows={1}
                  className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 resize-none leading-5 max-h-[120px] py-1"
                  style={{ overflow: 'hidden' }}
                />

                <button
                  onClick={handleSend}
                  disabled={!message.trim() || sendMut.isPending}
                  className="size-9 bg-primary text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-[0_2px_8px_rgba(16,183,127,0.35)] hover:scale-105 active:scale-95"
                >
                  {sendMut.isPending
                    ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                    : <span className="material-symbols-outlined text-[16px]">send</span>
                  }
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center p-6">
              <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4 block">forum</span>
              <p className="font-semibold text-slate-500 dark:text-slate-400">Select a conversation to start</p>
              <p className="text-sm mt-1">Or wait for a new message</p>
            </motion.div>
          </div>
        )}
      </main>

      {/* ══ RIGHT: Info Panel ════════════════════════════════════ */}
      {activeLead && activeLeadData && (
        <aside className={`
          ${mobileView === 'info' ? 'fixed inset-0 z-50 flex' : 'hidden xl:flex'}
          w-full xl:w-72 shrink-0 flex-col bg-white dark:bg-slate-900
          border-l border-slate-200 dark:border-slate-700 overflow-y-auto
        `}>
          {/* Mobile back */}
          <div className="xl:hidden h-14 flex items-center px-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <button onClick={() => setMobileView('chat')} className="p-1 text-slate-400 mr-2">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <span className="font-bold text-sm">Lead Details</span>
          </div>

          {/* Profile */}
          <div className="p-5 flex flex-col items-center text-center border-b border-slate-100 dark:border-slate-800">
            <div className="relative mb-3">
              <div className="size-16 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xl font-black ring-4 ring-primary/10">
                {getInitials(activeLeadData.name || '')}
              </div>
              {isOnline(activeLeadData.lastMessageAt) && (
                <span className="absolute bottom-0 right-0 size-3.5 rounded-full bg-primary border-2 border-white dark:border-slate-900"/>
              )}
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">{activeLeadData.name}</h3>
            <p className="text-slate-400 text-xs">{activeLeadData.phone}</p>
            {isOnline(activeLeadData.lastMessageAt) && (
              <span className="mt-1 text-[10px] text-primary font-semibold">● Online now</span>
            )}
          </div>

          {/* Info */}
          <div className="p-4 space-y-4 flex-1">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <StatusBadge status={activeLeadData.status} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Score</p>
              <LeadScoreBadge score={activeLeadData.leadScore || 0} showLabel />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Source</p>
              <p className="text-xs text-slate-700 dark:text-slate-300 capitalize">{activeLeadData.source?.replace(/_/g, ' ') || '—'}</p>
            </div>
            {activeLeadData.assignedTo && (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Agent</p>
                <div className="flex items-center gap-2">
                  <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {getInitials(activeLeadData.assignedTo.name || '')}
                  </div>
                  <span className="text-xs text-slate-700 dark:text-slate-300">{activeLeadData.assignedTo.name}</span>
                </div>
              </div>
            )}
            {activeLeadData.reminderAt && new Date(activeLeadData.reminderAt) > new Date() && (
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl">
                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-0.5">⏰ Reminder</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                  {format(new Date(activeLeadData.reminderAt), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-2 shrink-0">
            <button onClick={() => { setNoteText(''); setShowNote(true); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors">
              <span className="material-symbols-outlined text-[16px]">note_add</span>Add Note
            </button>
            <button onClick={() => {
                const def = activeLeadData?.reminderAt
                  ? new Date(activeLeadData.reminderAt).toISOString().slice(0, 16)
                  : new Date(Date.now() + 30 * 60000).toISOString().slice(0, 16);
                setReminderInput(def);
                setShowReminder(true);
              }}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors">
              <span className="material-symbols-outlined text-[16px]">alarm</span>
              {activeLeadData?.reminderAt && new Date(activeLeadData.reminderAt) > new Date()
                ? 'Update Reminder' : 'Set Reminder'}
            </button>
            <button onClick={() => navigate(`/leads/${activeLead}`)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-colors">
              <span className="material-symbols-outlined text-[16px]">open_in_new</span>View Full Profile
            </button>
            <button
              onClick={async () => {
                try {
                  await leadApi.update(activeLead, { status: 'closed' });
                  qc.invalidateQueries({ queryKey: ['lead', activeLead] });
                  qc.invalidateQueries({ queryKey: ['inbox-leads'] });
                  toast.success('Conversation closed ✅');
                } catch { toast.error('Failed'); }
              }}
              className="w-full btn-primary text-xs py-2.5">
              Close Conversation
            </button>
          </div>
        </aside>
      )}

      {/* ══ Note Modal ══════════════════════════════════════════ */}
      <AnimatePresence>
        {showNote && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowNote(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-primary">note_add</span>
                </div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Add Note</h3>
              </div>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                rows={4} placeholder="Type your note here…"
                className="input-field w-full mb-4 resize-none" autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setShowNote(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSaveNote} className="btn-primary flex-1">Save Note</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ Reminder Modal ══════════════════════════════════════ */}
      <AnimatePresence>
        {showReminder && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setShowReminder(false)}
          >
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="size-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px] text-amber-500">alarm</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100">Set Reminder</h3>
                  <p className="text-xs text-slate-400">{activeLeadData?.name}</p>
                </div>
              </div>

              {/* Quick picks */}
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[
                  { label: '30 min', fn: () => new Date(Date.now() + 30 * 60000) },
                  { label: '1 hour', fn: () => new Date(Date.now() + 60 * 60000) },
                  { label: '3 hours', fn: () => new Date(Date.now() + 180 * 60000) },
                  { label: 'Tomorrow 9am', fn: () => { const d = new Date(); d.setDate(d.getDate()+1); d.setHours(9,0,0,0); return d; }},
                ].map(({ label, fn }) => (
                  <button key={label} onClick={() => setReminderInput(fn().toISOString().slice(0,16))}
                    className="text-xs py-2 bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary text-slate-600 dark:text-slate-400 rounded-xl font-semibold transition-colors">
                    {label}
                  </button>
                ))}
              </div>

              <input type="datetime-local" value={reminderInput}
                min={new Date().toISOString().slice(0,16)}
                onChange={e => setReminderInput(e.target.value)}
                className="input-field w-full mb-4" />

              <div className="flex gap-3">
                {activeLeadData?.reminderAt && (
                  <button onClick={async () => {
                    await leadApi.setReminder(activeLead, { reminderAt: null });
                    qc.invalidateQueries({ queryKey: ['lead', activeLead] });
                    qc.invalidateQueries({ queryKey: ['inbox-leads'] });
                    setShowReminder(false);
                    toast.success('Reminder cleared');
                  }} className="btn-secondary text-red-500 hover:bg-red-50">Clear</button>
                )}
                <button onClick={() => setShowReminder(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSaveReminder} className="btn-primary flex-1">Set Reminder</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}