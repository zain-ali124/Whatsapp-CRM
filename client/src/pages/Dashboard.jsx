import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { analyticsApi } from '../api/analyticsApi';
import StatCard from '../components/ui/StatCard';
import PageLoader from '../components/shared/PageLoader';
import { timeAgo } from '../utils/helpers';

/* ── Bar Chart ─────────────────────────────────────────── */
function BarChart({ agents = [] }) {
  if (!agents.length) return <p className="text-center text-slate-400 text-sm py-10">No agent data</p>;
  const max = Math.max(...agents.map(a => a.closedLeads || a.totalLeads || a.totalClosed || a.totalAssigned || 1));
  return (
    <div className="flex items-end justify-between h-48 gap-3 px-2">
      {agents.map(({ agentId, name, closedLeads, totalLeads, totalClosed, totalAssigned }, i) => {
        const val   = closedLeads ?? totalLeads ?? totalClosed ?? totalAssigned ?? 0;
        const pct   = Math.round((val / max) * 100);
        const label = name?.split(' ')[0] || 'Agent';
        return (
          <motion.div
            key={agentId || i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.25 + i * 0.07, duration: 0.5, ease: 'easeOut' }}
            style={{ originY: 'bottom' }}
            className="flex flex-col items-center flex-1 gap-2"
          >
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{val}</span>
            <div className="w-full relative rounded-t-lg overflow-hidden" style={{ height: `${Math.max(pct, 4)}%` }}>
              <div className="absolute inset-0 bg-primary/15 dark:bg-primary/10" />
              <div className="absolute inset-0 bg-primary rounded-t-lg hover:brightness-110 transition-all" />
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Donut Chart ───────────────────────────────────────── */
function DonutChart({ sources = [] }) {
  if (!sources.length) return <p className="text-center text-slate-400 text-sm py-10">No source data</p>;
  const colors  = ['#10b77f','#4adea8','#93c5fd','#fbbf24','#f87171'];
  const total   = sources.reduce((s, x) => s + (x.count || 0), 0) || 1;
  let   offset  = 0;
  const circles = sources.map((src, i) => {
    const pct  = ((src.count || 0) / total) * 100;
    const item = { ...src, pct: Math.round(pct), color: colors[i % colors.length], offset };
    offset    += pct;
    return item;
  });

  return (
    <div className="flex-1 flex flex-col items-center justify-center">
      <div className="relative size-36 mb-6">
        <svg viewBox="0 0 36 36" className="rotate-[-90deg] w-full h-full">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-700" strokeWidth="3.8"/>
          {circles.map((c, i) => (
            <circle key={i} cx="18" cy="18" r="15.9" fill="none"
              stroke={c.color} strokeWidth="3.8"
              strokeDasharray={`${c.pct} ${100 - c.pct}`}
              strokeDashoffset={`-${c.offset}`}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">{total > 999 ? `${(total/1000).toFixed(1)}k` : total}</p>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Leads</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 w-full">
        {circles.map((c) => (
          <div key={c._id} className="flex items-center gap-2">
            <div className="size-2 rounded-full shrink-0" style={{ background: c.color }}/>
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium truncate">{c._id || 'Other'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */
export default function Dashboard() {
  const { data: dash, isLoading: l1, error: e1 } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn:  () => analyticsApi.dashboard().then(r => r.data),
  });
  const { data: sources, isLoading: l2 } = useQuery({
    queryKey: ['analytics-sources'],
    queryFn:  () => analyticsApi.sources().then(r => r.data),
  });
  const { data: agentsData, isLoading: l3 } = useQuery({
    queryKey: ['analytics-agents'],
    queryFn:  () => analyticsApi.agents().then(r => r.data),
  });
  const { data: funnelData, isLoading: l4 } = useQuery({
    queryKey: ['analytics-funnel'],
    queryFn:  () => analyticsApi.funnel().then(r => r.data),
  });

  if (l1 || l2 || l3 || l4) return <PageLoader />;
  if (e1) return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center">
        <span className="material-symbols-outlined text-5xl text-red-400 mb-4 block">error</span>
        <p className="text-slate-600 dark:text-slate-400">Failed to load dashboard data.</p>
        <p className="text-sm text-slate-400 mt-1">{e1.message}</p>
      </div>
    </div>
  );

  const stats = [
    { icon:'groups',                label:'Total Leads',    value:(dash?.totalLeads||0).toLocaleString(),  change: dash?.leadsChange,    changeType:'up',   color:'blue'   },
    { icon:'local_fire_department', label:'Hot Leads',      value:(dash?.hotLeads||0).toString(),          change: dash?.hotChange,      changeType:'up',   color:'orange' },
    { icon:'task_alt',              label:'Closed Today',   value:(dash?.closedToday||0).toString(),       change: dash?.closedChange,   changeType:'down', color:'green'  },
    { icon:'history',               label:'Follow-ups Due', value:(dash?.followUpsDue||0).toString(),      change: dash?.followUpChange, changeType:'up',   color:'purple' },
  ];

  // Normalize funnel percentage to numeric value (server returns strings like '50%')
  const funnelRows = (funnelData?.funnel || []).map(row => {
    const raw = row.percentage ?? row.perc ?? '0';
    const pct  = typeof raw === 'string' ? parseFloat(raw.replace('%', '')) || 0 : Number(raw) || 0;
    return { ...row, percentage: pct };
  });

  // Server returns agents performance under `agents`
  const agentRows  = agentsData?.agents || [];
  const activities = dash?.recentActivity || [];

  return (
    <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
      {/* Title */}
      <motion.div initial={{ opacity:0, y:-16 }} animate={{ opacity:1, y:0 }} transition={{ duration:0.35 }}>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm mt-0.5">Here's what's happening with your leads today.</p>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {stats.map((s, i) => <StatCard key={s.label} {...s} delay={i * 0.07} />)}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Agent Bar Chart */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.32, duration:0.4 }} className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-slate-900 dark:text-slate-100">Agent Performance</h4>
            <Link to="/agents" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
              View all <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </Link>
          </div>
          {agentRows.length ? <BarChart agents={agentRows} /> : (
            <div className="h-48 flex items-center justify-center">
              <p className="text-slate-400 text-sm">No agents yet. <Link to="/agents" className="text-primary hover:underline">Add agents →</Link></p>
            </div>
          )}
        </motion.div>

        {/* Donut */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.40, duration:0.4 }} className="card p-6 flex flex-col">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-4">Lead Source Distribution</h4>
          {sources?.sources?.length ? <DonutChart sources={sources.sources} /> : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-400 text-sm text-center">No source data yet</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
        {/* Funnel */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.48, duration:0.4 }} className="card p-6">
          <h4 className="font-bold text-slate-900 dark:text-slate-100 mb-6">Conversion Funnel</h4>
          {funnelRows.length ? (
            <div className="space-y-4">
              {funnelRows.map(({ stage, count, percentage }, i) => (
                <div key={stage}>
                  <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">
                    <span>{stage}</span>
                    <span>{count} <span className="text-slate-300 dark:text-slate-600 font-normal">({percentage}%)</span></span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.55 + i * 0.08, duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-primary rounded-full"
                      style={{ opacity: Math.max(1 - i * 0.14, 0.3) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-slate-400 text-sm">No pipeline data yet. <Link to="/leads" className="text-primary hover:underline">Add leads →</Link></p>
            </div>
          )}
        </motion.div>

        {/* Activity Feed */}
        <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.54, duration:0.4 }} className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-slate-900 dark:text-slate-100">Recent Activity</h4>
            <Link to="/inbox" className="text-xs text-primary font-semibold hover:underline">View inbox →</Link>
          </div>
          {activities.length ? (
            <div className="space-y-5">
              {activities.slice(0, 5).map(({ _id, type, description, createdAt }, i) => {
                const iconMap = {
                  message:    { icon:'chat_bubble',          color:'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' },
                  lead_closed:{ icon:'assignment_turned_in', color:'bg-blue-50 dark:bg-blue-900/20 text-blue-600'           },
                  reminder:   { icon:'alarm',                color:'bg-orange-50 dark:bg-orange-900/20 text-orange-500'    },
                  broadcast:  { icon:'broadcast_on_home',    color:'bg-primary/10 text-primary'                             },
                };
                const { icon, color } = iconMap[type] || { icon:'info', color:'bg-slate-100 text-slate-500' };
                return (
                  <motion.div key={_id || i} initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} transition={{ delay: 0.6 + i * 0.07 }} className="flex gap-4">
                    <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                      <span className="material-symbols-outlined text-[16px]">{icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{createdAt ? timeAgo(createdAt) : ''}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className="text-slate-400 text-sm">No activity yet. Messages will appear here.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
