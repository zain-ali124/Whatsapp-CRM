import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { templateApi } from '../api/templateApi';
import { timeAgo } from '../utils/helpers';

/* ─── Constants ─── */
const CATEGORIES = [
  { value: 'all',        label: 'All',        icon: 'grid_view'          },
  { value: 'greeting',   label: 'Greeting',   icon: 'waving_hand'        },
  { value: 'follow_up',  label: 'Follow-up',  icon: 'replay'             },
  { value: 'closing',    label: 'Closing',    icon: 'handshake'          },
  { value: 'reminder',   label: 'Reminder',   icon: 'alarm'              },
  { value: 'promotion',  label: 'Promotion',  icon: 'local_offer'        },
  { value: 'support',    label: 'Support',    icon: 'support_agent'      },
  { value: 'custom',     label: 'Custom',     icon: 'edit_note'          },
];

const CAT_COLORS = {
  greeting:  { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-600 dark:text-blue-400',    border: 'border-blue-200 dark:border-blue-800'    },
  follow_up: { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-600 dark:text-amber-400',  border: 'border-amber-200 dark:border-amber-800'  },
  closing:   { bg: 'bg-primary/10',                      text: 'text-primary',                         border: 'border-primary/20'                       },
  reminder:  { bg: 'bg-orange-50 dark:bg-orange-900/20',text: 'text-orange-600 dark:text-orange-400',border: 'border-orange-200 dark:border-orange-800'},
  promotion: { bg: 'bg-pink-50 dark:bg-pink-900/20',    text: 'text-pink-600 dark:text-pink-400',    border: 'border-pink-200 dark:border-pink-800'    },
  support:   { bg: 'bg-purple-50 dark:bg-purple-900/20',text: 'text-purple-600 dark:text-purple-400',border: 'border-purple-200 dark:border-purple-800'},
  custom:    { bg: 'bg-slate-100 dark:bg-slate-700',    text: 'text-slate-600 dark:text-slate-400',  border: 'border-slate-200 dark:border-slate-600'  },
};

const STARTER_TEMPLATES = [
  { name: 'Welcome Message',      category: 'greeting',  body: 'Hi {{name}}! 👋 Welcome to {{businessName}}. We\'re excited to help you. How can we assist you today?' },
  { name: 'Follow-up Check-in',   category: 'follow_up', body: 'Hi {{name}}, just checking in! Have you had a chance to think about our offer? I\'d love to answer any questions you might have. 😊' },
  { name: 'Deal Closed',          category: 'closing',   body: 'Congratulations {{name}}! 🎉 Your order has been confirmed. Thank you for choosing us. We\'ll be in touch shortly with the next steps.' },
  { name: 'Appointment Reminder', category: 'reminder',  body: 'Hi {{name}}, this is a friendly reminder about your appointment tomorrow. Please let us know if you need to reschedule. ⏰' },
  { name: 'Special Offer',        category: 'promotion', body: 'Hi {{name}}! 🌟 We have an exclusive offer just for you — {{offerDetails}}. Valid until {{expiry}}. Reply to claim!' },
  { name: 'Support Follow-up',    category: 'support',   body: 'Hi {{name}}, we wanted to check if your issue has been resolved. Please let us know if you need any further assistance. 🙏' },
];

/* ─── Variable tag component ─── */
function VarTag({ name }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-primary/10 text-primary text-xs font-mono font-semibold rounded-md">
      <span className="opacity-50">{'{{'}</span>{name}<span className="opacity-50">{'}}'}</span>
    </span>
  );
}

/* ─── Render body with highlighted variables ─── */
function BodyPreview({ body }) {
  const parts = body.split(/(\{\{\w+\}\})/g);
  return (
    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
      {parts.map((part, i) => {
        const match = part.match(/^\{\{(\w+)\}\}$/);
        return match
          ? <VarTag key={i} name={match[1]} />
          : <span key={i}>{part}</span>;
      })}
    </p>
  );
}

/* ─── Template Card ─── */
function TemplateCard({ template, onEdit, onDelete, onCopy, onToggleFav, delay }) {
  const cat    = CAT_COLORS[template.category] || CAT_COLORS.custom;
  const catDef = CATEGORIES.find(c => c.value === template.category);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ delay, duration: 0.3 }}
      className="card p-5 group flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${cat.bg}`}>
            <span className={`material-symbols-outlined text-[18px] ${cat.text}`}>{catDef?.icon || 'description'}</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{template.name}</p>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${cat.bg} ${cat.text}`}>
              {template.category.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Actions — visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={() => onToggleFav(template._id)}
            className={`size-8 rounded-lg flex items-center justify-center transition-colors ${
              template.isFavourite
                ? 'text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                : 'text-slate-400 hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
            }`}
            title={template.isFavourite ? 'Unfavourite' : 'Favourite'}
          >
            <span className="material-symbols-outlined text-[18px]">
              {template.isFavourite ? 'star' : 'star_border'}
            </span>
          </button>
          <button
            onClick={() => onCopy(template)}
            className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-colors"
            title="Copy text"
          >
            <span className="material-symbols-outlined text-[18px]">content_copy</span>
          </button>
          <button
            onClick={() => onEdit(template)}
            className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            title="Edit"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>
          <button
            onClick={() => onDelete(template._id)}
            className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Delete"
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
          </button>
        </div>
      </div>

      {/* Body preview */}
      <div className="flex-1">
        <BodyPreview body={template.body} />
      </div>

      {/* Variables chips */}
      {template.variables?.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {template.variables.map(v => <VarTag key={v} name={v} />)}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="material-symbols-outlined text-[14px]">send</span>
          <span>{template.usageCount} uses</span>
        </div>
        <span className="text-[11px] text-slate-400">{timeAgo(template.updatedAt)}</span>
      </div>
    </motion.div>
  );
}

/* ─── Create / Edit Modal ─── */
function TemplateModal({ template, onClose, onSave, isSaving }) {
  const isEdit = !!template?._id;
  const [form, setForm] = useState({
    name:     template?.name     || '',
    body:     template?.body     || '',
    category: template?.category || 'custom',
  });
  const [charCount, setCharCount] = useState(template?.body?.length || 0);
  const textareaRef = useRef(null);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleBodyChange = (v) => {
    set('body', v);
    setCharCount(v.length);
  };

  // Insert variable at cursor position
  const insertVar = (varName) => {
    const el    = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end   = el.selectionEnd;
    const tag   = `{{${varName}}}`;
    const newVal = form.body.slice(0, start) + tag + form.body.slice(end);
    set('body', newVal);
    setCharCount(newVal.length);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + tag.length, start + tag.length);
    }, 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Template name is required');
    if (!form.body.trim()) return toast.error('Template body is required');
    onSave(form);
  };

  const QUICK_VARS = ['name', 'phone', 'businessName', 'offerDetails', 'expiry'];

  // Detect variables live
  const liveVars = [...new Set((form.body.match(/\{\{(\w+)\}\}/g) || []).map(m => m.replace(/[{}]/g, '')))];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[18px] text-primary">
                  {isEdit ? 'edit_note' : 'add_comment'}
                </span>
              </div>
              <h2 className="font-bold text-slate-900 dark:text-slate-100">
                {isEdit ? 'Edit Template' : 'New Template'}
              </h2>
            </div>
            <button onClick={onClose} className="size-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Template Name</label>
              <input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. Welcome Message"
                className="input-field"
                maxLength={100}
                autoFocus
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Category</label>
              <div className="grid grid-cols-4 gap-2">
                {CATEGORIES.filter(c => c.value !== 'all').map(cat => {
                  const c = CAT_COLORS[cat.value] || CAT_COLORS.custom;
                  return (
                    <button key={cat.value} type="button"
                      onClick={() => set('category', cat.value)}
                      className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        form.category === cat.value
                          ? `${c.bg} ${c.text} ${c.border} border-2`
                          : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
                      <span className="capitalize leading-tight text-center">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Message Body</label>
                <span className={`text-xs font-mono ${charCount > 900 ? 'text-red-500' : 'text-slate-400'}`}>
                  {charCount}/1024
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={form.body}
                onChange={e => handleBodyChange(e.target.value)}
                placeholder="Type your message… use {{name}} for personalisation"
                rows={5}
                maxLength={1024}
                className="input-field resize-none font-[14px] leading-relaxed"
              />

              {/* Quick-insert variables */}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-[11px] text-slate-400 self-center">Insert:</span>
                {QUICK_VARS.map(v => (
                  <button key={v} type="button"
                    onClick={() => insertVar(v)}
                    className="text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 hover:bg-primary/10 hover:text-primary text-slate-600 dark:text-slate-400 rounded-md font-mono transition-colors"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>

              {/* Live variable preview */}
              {liveVars.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5 p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="text-[11px] text-slate-400 self-center w-full mb-1">Variables detected:</span>
                  {liveVars.map(v => <VarTag key={v} name={v} />)}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-1">
              <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={isSaving} className="btn-primary gap-2 disabled:opacity-60">
                {isSaving
                  ? <><span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>Saving…</>
                  : <><span className="material-symbols-outlined text-[16px]">{isEdit ? 'save' : 'add'}</span>{isEdit ? 'Save Changes' : 'Create Template'}</>
                }
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Delete Confirm Modal ─── */
function DeleteModal({ onConfirm, onCancel, isDeleting }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="size-12 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-[24px] text-red-500">delete_forever</span>
        </div>
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg mb-1">Delete Template?</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">This action cannot be undone.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting}
            className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60">
            {isDeleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function Templates() {
  const qc = useQueryClient();

  const [category, setCategory]   = useState('all');
  const [search, setSearch]       = useState('');
  const [showFavs, setShowFavs]   = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);   // template being edited
  const [deleteId, setDeleteId]   = useState(null);

  // ── Queries ──
  const { data, isLoading } = useQuery({
    queryKey: ['templates', category, search, showFavs],
    queryFn:  () => templateApi.getAll({
      ...(category !== 'all' && { category }),
      ...(search               && { search }),
      ...(showFavs             && { favourite: true }),
    }).then(r => r.data),
    keepPreviousData: true,
  });

  const templates = data?.templates || [];

  // ── Mutations ──
  const invalidate = () => qc.invalidateQueries({ queryKey: ['templates'] });

  const createMut = useMutation({
    mutationFn: (d) => templateApi.create(d),
    onSuccess:  () => { toast.success('Template created!'); invalidate(); setModalOpen(false); },
    onError:    (e) => toast.error(e.response?.data?.message || 'Create failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => templateApi.update(id, data),
    onSuccess:  () => { toast.success('Template updated!'); invalidate(); setEditTarget(null); },
    onError:    (e) => toast.error(e.response?.data?.message || 'Update failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => templateApi.remove(id),
    onSuccess:  () => { toast.success('Template deleted'); invalidate(); setDeleteId(null); },
    onError:    (e) => toast.error(e.response?.data?.message || 'Delete failed'),
  });

  const favMut = useMutation({
    mutationFn: (id) => templateApi.toggleFavourite(id),
    onSuccess:  (res) => {
      const fav = res.data.isFavourite;
      toast.success(fav ? 'Added to favourites ⭐' : 'Removed from favourites');
      invalidate();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Failed'),
  });

  // ── Seed starter templates ──
  const seedMut = useMutation({
    mutationFn: () => Promise.all(STARTER_TEMPLATES.map(t => templateApi.create(t))),
    onSuccess:  () => { toast.success('6 starter templates added!'); invalidate(); },
    onError:    () => toast.error('Seeding failed'),
  });

  const handleCopy = (template) => {
    navigator.clipboard.writeText(template.body);
    toast.success('Copied to clipboard!');
    templateApi.markUsed(template._id).then(invalidate).catch(() => {});
  };

  const handleSave = (form) => {
    if (editTarget?._id) {
      updateMut.mutate({ id: editTarget._id, data: form });
    } else {
      createMut.mutate(form);
    }
  };

  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit   = (t)  => { setEditTarget(t);   setModalOpen(true); };
  const closeModal = ()   => { setModalOpen(false); setEditTarget(null); };

  const isMutating = createMut.isPending || updateMut.isPending;

  // Stats
  const totalCount = templates.length;
  const favCount   = templates.filter(t => t.isFavourite).length;
  const totalUses  = templates.reduce((s, t) => s + (t.usageCount || 0), 0);

  return (
    <div className="p-8 space-y-7">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Templates</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Pre-written messages with smart variables for faster replies.
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary gap-2">
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Template
        </button>
      </motion.div>

      {/* ── Stats row ── */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { label: 'Total Templates', value: totalCount, icon: 'description',   color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20'   },
          { label: 'Favourites',      value: favCount,   icon: 'star',           color: 'text-amber-500',  bg: 'bg-amber-50 dark:bg-amber-900/20' },
          { label: 'Total Uses',      value: totalUses,  icon: 'send',           color: 'text-primary',    bg: 'bg-primary/10'                    },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="card p-4 flex items-center gap-3">
            <div className={`size-10 rounded-xl flex items-center justify-center ${bg}`}>
              <span className={`material-symbols-outlined text-[20px] ${color}`}>{icon}</span>
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 dark:text-slate-100 leading-none">{value}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </motion.div>

      {/* ── Filters row ── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        className="flex flex-wrap items-center gap-3"
      >
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-[18px] text-slate-400">search</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="input-field pl-9 py-2 text-sm"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 flex-wrap">
          {CATEGORIES.map(cat => (
            <button key={cat.value} onClick={() => setCategory(cat.value)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
                category === cat.value
                  ? 'bg-primary text-white border-primary shadow-[0_2px_8px_rgba(16,183,127,0.35)]'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary/50 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Favourites toggle */}
        <button onClick={() => setShowFavs(f => !f)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all ${
            showFavs
              ? 'bg-amber-400 text-white border-amber-400 shadow-[0_2px_8px_rgba(251,191,36,0.4)]'
              : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-amber-300 hover:text-amber-500'
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">star</span>
          Favourites
        </button>
      </motion.div>

      {/* ── Grid ── */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3 animate-pulse">
              <div className="flex gap-3"><div className="skeleton size-9 rounded-xl" /><div className="skeleton h-4 w-32 rounded" /></div>
              <div className="skeleton h-16 rounded-xl" />
              <div className="skeleton h-3 w-24 rounded" />
            </div>
          ))}
        </div>
      ) : templates.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <div className="size-20 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-5">
            <span className="material-symbols-outlined text-4xl text-slate-400">description</span>
          </div>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-1">
            {search || category !== 'all' || showFavs ? 'No templates match your filters' : 'No templates yet'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-xs">
            {search || category !== 'all' || showFavs
              ? 'Try changing your filters or search query.'
              : 'Create your first template or load our starter pack to get going fast.'}
          </p>
          {!search && category === 'all' && !showFavs && (
            <div className="flex gap-3 flex-wrap justify-center">
              <button onClick={openCreate} className="btn-primary gap-2">
                <span className="material-symbols-outlined text-[16px]">add</span>Create First Template
              </button>
              <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}
                className="btn-secondary gap-2 disabled:opacity-60">
                <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                {seedMut.isPending ? 'Loading…' : 'Load Starter Pack (6)'}
              </button>
            </div>
          )}
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 pb-8">
            {templates.map((t, i) => (
              <TemplateCard
                key={t._id}
                template={t}
                delay={i < 9 ? i * 0.04 : 0}
                onEdit={openEdit}
                onDelete={setDeleteId}
                onCopy={handleCopy}
                onToggleFav={(id) => favMut.mutate(id)}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* ── Modals ── */}
      <AnimatePresence>
        {(modalOpen || editTarget) && (
          <TemplateModal
            template={editTarget}
            onClose={closeModal}
            onSave={handleSave}
            isSaving={isMutating}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteId && (
          <DeleteModal
            onConfirm={() => deleteMut.mutate(deleteId)}
            onCancel={() => setDeleteId(null)}
            isDeleting={deleteMut.isPending}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
