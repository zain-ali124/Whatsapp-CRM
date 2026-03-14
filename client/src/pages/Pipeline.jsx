import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { leadApi } from '../api/leadApi';
import LeadScoreBadge from '../components/ui/LeadScoreBadge';
import { timeAgo, getInitials, PIPELINE_STAGES } from '../utils/helpers';

const COLUMN_CONFIG = {
  new:         { label:'New',         color:'bg-blue-500',    dotColor:'bg-blue-500'    },
  contacted:   { label:'Contacted',   color:'bg-amber-400',   dotColor:'bg-amber-400'   },
  interested:  { label:'Interested',  color:'bg-primary',     dotColor:'bg-primary'     },
  qualified:   { label:'Qualified',   color:'bg-emerald-500', dotColor:'bg-emerald-500' },
  negotiation: { label:'Negotiating', color:'bg-purple-500',  dotColor:'bg-purple-500'  },
  closed:      { label:'Closed',      color:'bg-green-600',   dotColor:'bg-green-600'   },
  lost:        { label:'Lost',        color:'bg-slate-400',   dotColor:'bg-slate-400'   },
};

function KanbanCard({ lead, onDragStart, onClick }) {
  return (
    <motion.div
      layout
      initial={{ opacity:0, y:12 }}
      animate={{ opacity:1, y:0 }}
      exit={{ opacity:0, scale:0.95 }}
      draggable
      onDragStart={() => onDragStart(lead)}
      onClick={onClick}
      className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-slate-200 dark:border-slate-700 cursor-grab active:cursor-grabbing active:shadow-xl group transition-shadow"
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
            {getInitials(lead.name)}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
              {lead.name}
            </h4>
            <p className="text-[10px] text-slate-400">{lead.phone}</p>
          </div>
        </div>
        <LeadScoreBadge score={lead.leadScore || 0} />
      </div>

      {lead.source && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full capitalize">
            {lead.source.replace(/_/g,' ')}
          </span>
          {lead.tags?.slice(0,1).map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">{tag}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-700">
        {lead.assignedAgent ? (
          <div className="size-5 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary ring-2 ring-white dark:ring-slate-800">
            {getInitials(lead.assignedAgent.name || '')}
          </div>
        ) : (
          <span className="text-[10px] text-slate-400 italic">Unassigned</span>
        )}
        <span className="text-[10px] text-slate-400">
          {lead.lastMessageAt ? timeAgo(lead.lastMessageAt) : timeAgo(lead.createdAt)}
        </span>
      </div>
    </motion.div>
  );
}

function KanbanColumn({ stage, leads, onDrop, onDragOver, onDragLeave, isDragOver, onCardClick, onDragStart }) {
  const cfg = COLUMN_CONFIG[stage];
  return (
    <div className="flex flex-col" style={{ minWidth: 280, width: 280 }}>
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          <span className={`size-2 rounded-full ${cfg.dotColor}`}/>
          <h3 className="font-bold text-slate-700 dark:text-slate-300 uppercase text-xs tracking-wider">{cfg.label}</h3>
          <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full font-bold">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`flex flex-col gap-3 flex-1 min-h-32 rounded-2xl p-2 transition-all duration-200 ${
          isDragOver
            ? 'bg-primary/10 dark:bg-primary/15 border-2 border-dashed border-primary'
            : 'border-2 border-dashed border-transparent'
        }`}
      >
        <AnimatePresence>
          {leads.length === 0 && !isDragOver ? (
            <div className="flex items-center justify-center h-24 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
              <p className="text-[10px] text-slate-400 font-medium">Drop here</p>
            </div>
          ) : (
            leads.map(lead => (
              <KanbanCard
                key={lead._id}
                lead={lead}
                onDragStart={onDragStart}
                onClick={() => onCardClick(lead._id)}
              />
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Pipeline() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [search, setSearch]     = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['leads-pipeline'],
    queryFn:  () => leadApi.getAll({ limit: 200 }).then(r => r.data),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, status }) => leadApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries(['leads-pipeline']),
    onError:   () => toast.error('Failed to move lead'),
  });

  const leads = (data?.leads || []).filter(l =>
    !search || l.name.toLowerCase().includes(search.toLowerCase())
  );

  /* Group by status */
  const columns = PIPELINE_STAGES.reduce((acc, stage) => {
    acc[stage] = leads.filter(l => l.status === stage);
    return acc;
  }, {});

  const handleDrop = (stage) => {
    if (dragging && dragging.status !== stage) {
      updateMut.mutate({ id: dragging._id, status: stage });
    }
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shrink-0">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-slate-100">Sales Pipeline</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              {isLoading ? 'Loading…' : `${leads.length} lead${leads.length !== 1 ? 's' : ''} across all stages`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2">
              <span className="material-symbols-outlined text-slate-400 text-[16px]">search</span>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search leads…"
                className="bg-transparent border-none focus:outline-none text-sm w-40 placeholder:text-slate-400"
              />
            </div>
            <button onClick={() => navigate('/leads')} className="btn-primary gap-2 py-2">
              <span className="material-symbols-outlined text-[18px]">add</span> Add Lead
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      {error ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div>
            <span className="material-symbols-outlined text-5xl text-red-400 block mb-3">error</span>
            <p className="text-slate-600 dark:text-slate-400">Failed to load pipeline data.</p>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <span className="material-symbols-outlined text-4xl text-slate-300 animate-spin">progress_activity</span>
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto p-6">
          <div className="flex gap-5 h-full" style={{ minWidth: 'max-content' }}>
            {PIPELINE_STAGES.map(stage => (
              <KanbanColumn
                key={stage}
                stage={stage}
                leads={columns[stage] || []}
                isDragOver={dragOver === stage}
                onDragStart={(lead) => setDragging(lead)}
                onDragOver={(e) => { e.preventDefault(); setDragOver(stage); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(stage)}
                onCardClick={(id) => navigate(`/leads/${id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
