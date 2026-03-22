import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { analyticsApi } from '../api/analyticsApi';
import { getInitials } from '../utils/helpers';

const COLORS = ['#10b77f', '#4adea8', '#60a5fa', '#fbbf24', '#f87171', '#a78bfa'];

function Widget({ title, subtitle, children, delay = 0, className = '' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`card p-6 ${className}`}
    >
      <div className="mb-5">
        <h3 className="font-bold text-slate-900 dark:text-slate-100">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </motion.div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-xl text-sm">
      <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-600 dark:text-slate-400 capitalize">{p.name}:</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ label, value, icon, color, change, delay }) {
  const colorMap = {
    green:  { bg: 'bg-primary/10',                          text: 'text-primary'                    },
    blue:   { bg: 'bg-blue-50 dark:bg-blue-900/20',         text: 'text-blue-600 dark:text-blue-400' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-900/20',     text: 'text-orange-500'                 },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20',     text: 'text-purple-600 dark:text-purple-400' },
  };
  const c = colorMap[color] || colorMap.green;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="card p-5"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`size-11 rounded-xl flex items-center justify-center ${c.bg}`}>
          <span className={`material-symbols-outlined text-[22px] ${c.text}`}>{icon}</span>
        </div>
        {change != null && (
          <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
            change >= 0 ? 'bg-primary/10 text-primary' : 'bg-red-50 dark:bg-red-900/20 text-red-500'
          }`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-black text-slate-900 dark:text-slate-100 leading-none mb-1">
        {value ?? '—'}
      </p>
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
    </motion.div>
  );
}

function Empty({ icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2">
      <span className="material-symbols-outlined text-4xl">{icon}</span>
      <p className="text-sm">{text}</p>
    </div>
  );
}

export default function Analytics() {
  const [range, setRange] = useState(7);

  // ── Queries ──────────────────────────────────────────────────
  const { data: dashData,    isLoading: l1 } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn:  () => analyticsApi.dashboard().then(r => r.data),
    refetchInterval: 60_000,
  });
  const { data: sourcesData, isLoading: l2 } = useQuery({
    queryKey: ['analytics-sources'],
    queryFn:  () => analyticsApi.sources().then(r => r.data),
  });
  const { data: agentsData,  isLoading: l3 } = useQuery({
    queryKey: ['analytics-agents'],
    queryFn:  () => analyticsApi.agents().then(r => r.data),
  });
  const { data: funnelData,  isLoading: l4 } = useQuery({
    queryKey: ['analytics-funnel'],
    queryFn:  () => analyticsApi.funnel().then(r => r.data),
  });
  const { data: trendsData,  isLoading: l5 } = useQuery({
    queryKey: ['analytics-trends', range],
    queryFn:  () => analyticsApi.leadsOverTime({ days: range }).then(r => r.data),
    refetchInterval: 60_000,
  });

  // ── Data transforms — match backend response shapes exactly ──

  // Backend: { totalLeads, hotLeads, closedToday, followUpsDue, pipeline: {...} }
  // OLD BUG: was reading dashData?.stats?.totalLeads — stats wrapper doesn't exist
  const dash = dashData || {};
  const kpis = [
    { label: 'Total Leads',    value: (dash.totalLeads   ?? 0).toLocaleString(), icon: 'groups',                color: 'blue',   change: dash.leadsChange    },
    { label: 'Hot Leads',      value: (dash.hotLeads     ?? 0).toString(),        icon: 'local_fire_department', color: 'orange', change: dash.hotChange      },
    { label: 'Closed Today',   value: (dash.closedToday  ?? 0).toString(),        icon: 'task_alt',              color: 'green',  change: dash.closedChange   },
    { label: 'Follow-ups Due', value: (dash.followUpsDue ?? 0).toString(),        icon: 'pending_actions',       color: 'purple', change: dash.followUpChange },
  ];

  // Backend: { sources: [{ _id, count }] }
  const pieData = (sourcesData?.sources || []).map((s, i) => ({
    name:  s._id || 'Other',
    value: s.count || 0,
    color: COLORS[i % COLORS.length],
  }));

  // Backend: { data: [{ date, leads, closed }] }
  // OLD BUG: was reading d._id which doesn't exist — field is 'date'
  const trendPoints = (trendsData?.data || []).map(d => ({
    date:   (d.date || '').slice(5),   // show MM-DD only
    leads:  d.leads  || 0,
    closed: d.closed || 0,
  }));

  // Backend: { agents: [{ name, totalLeads, closedLeads, conversionRate(0-1 float) }] }
  // OLD BUG: was reading agentsData?.performance — field is 'agents'
  // OLD BUG: was reading a.totalAssigned — field is 'totalLeads'
  // OLD BUG: conversionRate was treated as string "75%" — it's a 0-1 float
  const agentRows = (agentsData?.agents || []).map(a => ({
    fullName:   a.name || 'Agent',
    name:       (a.name || 'Agent').split(' ')[0],
    leads:      a.totalLeads  || 0,
    closed:     a.closedLeads || 0,
    conversion: a.conversionRate != null ? Math.round(a.conversionRate * 100) : 0,
  }));

  // Backend: { funnel: [{ stage, count, percentage }] }
  // percentage is a NUMBER (e.g. 75), not string "75%"
  const funnel = funnelData?.funnel || [];

  // Pipeline breakdown from dashboard
  const pipeline = dash.pipeline || {};
  const pipelineTotal = Object.values(pipeline).reduce((s, v) => s + (v || 0), 0);
  const pipelineStages = [
    { label: 'New',         value: pipeline.new        || 0, color: '#60a5fa' },
    { label: 'Contacted',   value: pipeline.contacted  || 0, color: '#fbbf24' },
    { label: 'Interested',  value: pipeline.interested || 0, color: '#10b77f' },
    { label: 'Closed Won',  value: pipeline.closed     || 0, color: '#4adea8' },
    { label: 'Lost',        value: pipeline.lost       || 0, color: '#f87171' },
  ];

  return (
    <div className="p-8 space-y-8">

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Analytics</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
            Real-time insights — auto-refreshes every minute.
          </p>
        </div>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setRange(d)}
              className={`px-4 py-2 text-sm font-semibold rounded-xl transition-colors ${
                range === d
                  ? 'bg-primary text-white shadow-[0_2px_8px_rgba(16,183,127,0.4)]'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-primary hover:text-primary'
              }`}
            >{d}d</button>
          ))}
        </div>
      </motion.div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {kpis.map((k, i) => (
          l1
            ? <div key={k.label} className="card p-5 animate-pulse"><div className="skeleton h-24 rounded-xl"/></div>
            : <KpiCard key={k.label} {...k} delay={i * 0.07} />
        ))}
      </div>

      {/* ── Pipeline mini cards (from dashboard) ── */}
      {!l1 && pipelineTotal > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="grid grid-cols-5 gap-3"
        >
          {pipelineStages.map(({ label, value, color }) => (
            <div key={label} className="card p-3 text-center">
              <p className="text-xl font-black" style={{ color }}>{value}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{label}</p>
              <div className="mt-2 h-1 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pipelineTotal > 0 ? (value / pipelineTotal) * 100 : 0}%`, background: color }}
                />
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* ── Leads Over Time ── */}
      <Widget title="Leads Over Time" subtitle={`Last ${range} days · incoming vs closed`} delay={0.28}>
        {l5 ? (
          <div className="h-64 skeleton rounded-xl"/>
        ) : trendPoints.length === 0 || trendPoints.every(d => d.leads === 0 && d.closed === 0) ? (
          <Empty icon="show_chart" text="No trend data for this period yet"/>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trendPoints} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b77f" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#10b77f" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gClosed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#60a5fa" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false}/>
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Area type="monotone" dataKey="leads"  stroke="#10b77f" strokeWidth={2.5} fill="url(#gLeads)"  name="Leads"/>
              <Area type="monotone" dataKey="closed" stroke="#60a5fa" strokeWidth={2}   fill="url(#gClosed)" name="Closed"/>
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Widget>

      {/* ── Agent Bar + Source Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        <Widget title="Agent Performance" subtitle="Leads assigned vs closed" delay={0.36} className="lg:col-span-2">
          {l3 ? (
            <div className="h-56 skeleton rounded-xl"/>
          ) : agentRows.length === 0 ? (
            <Empty icon="group_off" text="No agents added yet"/>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={agentRows} margin={{ top: 5, right: 5, left: -20, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" vertical={false}/>
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip content={<ChartTooltip/>}/>
                <Bar dataKey="leads"  fill="#10b77f" radius={[4,4,0,0]} name="Leads"/>
                <Bar dataKey="closed" fill="#60a5fa" radius={[4,4,0,0]} name="Closed"/>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Widget>

        <Widget title="Lead Sources" subtitle="Distribution by channel" delay={0.42}>
          {l2 ? (
            <div className="h-56 skeleton rounded-xl"/>
          ) : pieData.length === 0 ? (
            <Empty icon="donut_small" text="No source data yet"/>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                  </Pie>
                  <Tooltip content={<ChartTooltip/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full shrink-0" style={{ background: d.color }}/>
                      <span className="text-slate-600 dark:text-slate-400 capitalize">{d.name.replace(/_/g, ' ')}</span>
                    </div>
                    <span className="font-bold text-slate-700 dark:text-slate-300">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Widget>
      </div>

      {/* ── Funnel + Top Agents ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">

        <Widget title="Pipeline Funnel" subtitle="Lead progression across stages" delay={0.5}>
          {l4 ? (
            <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-8 rounded-xl"/>)}</div>
          ) : funnel.length === 0 ? (
            <Empty icon="filter_alt_off" text="No pipeline data yet — add some leads first"/>
          ) : (
            <div className="space-y-5">
              {funnel.map(({ stage, count, percentage }, i) => (
                <div key={stage}>
                  <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    <span className="uppercase tracking-wide">{stage}</span>
                    <span className="tabular-nums font-bold">
                      {count}
                      <span className="text-slate-400 font-normal ml-1">({percentage}%)</span>
                    </span>
                  </div>
                  <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(percentage, percentage > 0 ? 2 : 0)}%` }}
                      transition={{ delay: 0.55 + i * 0.1, duration: 0.8, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{
                        background: `hsl(${160 - i * 25}, 70%, ${48 + i * 4}%)`,
                        opacity: Math.max(1 - i * 0.08, 0.5),
                      }}
                    />
                  </div>
                </div>
              ))}
              {/* Conversion summary */}
              {funnel.length >= 2 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex justify-between text-xs text-slate-500">
                  <span>Overall conversion</span>
                  <span className="font-bold text-primary">
                    {funnel[funnel.length - 1]?.percentage ?? 0}%
                  </span>
                </div>
              )}
            </div>
          )}
        </Widget>

        <Widget title="Top Agents" subtitle="Ranked by conversion rate" delay={0.56}>
          {l3 ? (
            <div className="space-y-3">{[...Array(4)].map((_,i) => <div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
          ) : agentRows.length === 0 ? (
            <Empty icon="support_agent" text="No agents added yet"/>
          ) : (
            <div className="space-y-3">
              {[...agentRows].sort((a,b) => b.conversion - a.conversion).map((agent, i) => (
                <div key={agent.fullName} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                  <span className="text-sm w-6 text-center shrink-0">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : <span className="text-xs text-slate-400 font-bold">#{i+1}</span>}
                  </span>
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {getInitials(agent.fullName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{agent.fullName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${agent.conversion}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">{agent.leads} leads · {agent.closed} closed</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-black ${
                      agent.conversion >= 70 ? 'text-primary'
                      : agent.conversion >= 40 ? 'text-amber-500'
                      : 'text-red-400'
                    }`}>{agent.conversion}%</p>
                    <p className="text-[10px] text-slate-400">conv.</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Widget>

      </div>
    </div>
  );
}