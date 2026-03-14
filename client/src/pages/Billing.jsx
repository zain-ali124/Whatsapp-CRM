import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import api from '../api/axios';

/* ── Usage Bar ── */
function UsageBar({ label, used, limit, unit = '' }) {
  const pct = limit > 0 ? Math.min(Math.round((used / limit) * 100), 100) : 0;
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary';
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
        <span>{label}</span>
        <span>{used.toLocaleString()}<span className="text-slate-400 font-normal"> / {limit === -1 ? '∞' : limit.toLocaleString()}{unit && ` ${unit}`}</span></span>
      </div>
      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: limit === -1 ? '8%' : `${pct}%` }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
      {pct >= 90 && <p className="text-[10px] text-red-500 font-semibold mt-1">⚠️ Approaching limit — consider upgrading</p>}
    </div>
  );
}

/* ── Plan Card ── */
function PlanCard({ plan, isCurrent, onSelect }) {
  const isPopular = plan.name === 'Business';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative rounded-2xl border-2 p-6 flex flex-col transition-all
        ${isCurrent
          ? 'border-primary bg-primary/5 dark:bg-primary/10 shadow-[0_4px_24px_rgba(16,183,127,0.2)]'
          : isPopular
            ? 'border-primary/40 bg-white dark:bg-slate-900 shadow-[0_4px_16px_rgba(16,183,127,0.1)]'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900'
        }`}
    >
      {isPopular && !isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-[0_2px_8px_rgba(16,183,127,0.4)]">
          Most Popular
        </span>
      )}
      {isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">
          Current Plan
        </span>
      )}

      <div className="mb-5">
        <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">{plan.name}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{plan.tagline}</p>
      </div>

      <div className="mb-6">
        <span className="text-4xl font-black text-slate-900 dark:text-slate-100">${plan.price}</span>
        <span className="text-slate-400 text-sm">/month</span>
      </div>

      <ul className="space-y-3 flex-1 mb-6">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-slate-700 dark:text-slate-300">
            <span className="material-symbols-outlined text-[16px] text-primary mt-0.5 shrink-0">check_circle</span>
            {f}
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrent}
        className={`w-full py-3 rounded-xl text-sm font-bold transition-all
          ${isCurrent
            ? 'bg-primary/10 text-primary cursor-default'
            : 'bg-primary text-white hover:brightness-110 shadow-[0_2px_8px_rgba(16,183,127,0.35)] active:scale-95'
          }`}
      >
        {isCurrent ? '✓ Current Plan' : `Upgrade to ${plan.name}`}
      </button>
    </motion.div>
  );
}

const PLANS = [
  {
    id: 'starter', name: 'Starter', price: 19, tagline: 'For solo agents and small teams',
    features: ['Up to 3 agents', '500 leads/month', '2,000 messages/month', 'Basic analytics', 'WhatsApp Cloud API', 'Email support'],
    limits: { agents: 3, leads: 500, messages: 2000 },
  },
  {
    id: 'business', name: 'Business', price: 49, tagline: 'For growing sales teams',
    features: ['Up to 15 agents', '5,000 leads/month', 'Unlimited messages', 'Advanced analytics', 'AI lead scoring', 'Priority support', 'Auto-assignment', 'Custom templates'],
    limits: { agents: 15, leads: 5000, messages: -1 },
  },
  {
    id: 'agency', name: 'Agency', price: 199, tagline: 'For agencies managing multiple clients',
    features: ['Unlimited agents', 'Unlimited leads', 'Unlimited messages', 'Full analytics + exports', 'AI insights', 'Dedicated support', 'White-label option', 'API access', 'Custom integrations'],
    limits: { agents: -1, leads: -1, messages: -1 },
  },
];

const MOCK_HISTORY = [
  { id:'INV-2024-001', date:'Mar 1, 2025',  plan:'Business', amount:'$49.00', status:'paid' },
  { id:'INV-2024-002', date:'Feb 1, 2025',  plan:'Business', amount:'$49.00', status:'paid' },
  { id:'INV-2024-003', date:'Jan 1, 2025',  plan:'Starter',  amount:'$19.00', status:'paid' },
];

export default function Billing() {
  const { user } = useAuthStore();

  /* Fetch billing info from backend */
  const { data: billingData, isLoading } = useQuery({
    queryKey: ['billing'],
    queryFn:  () => api.get('/billing/status').then(r => r.data).catch(() => null),
    retry: false,
  });

  /* Determine current plan */
  const currentPlanId  = billingData?.plan  || user?.plan  || 'starter';
  const currentPlan    = PLANS.find(p => p.id === currentPlanId) || PLANS[0];

  /* Usage from backend or zeros */
  const usage = billingData?.usage || { agents: 0, leads: 0, messages: 0 };

  const handleUpgrade = (plan) => {
    /* In production: redirect to Stripe checkout */
    window.open(`https://buy.stripe.com/placeholder_${plan.id}`, '_blank');
  };

  return (
    <div className="p-8 space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Billing & Plans</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage your subscription and monitor usage.</p>
      </motion.div>

      {/* Current Plan + Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan Banner */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }}
          className="lg:col-span-2 card p-6 bg-gradient-to-br from-primary/5 to-primary/10 dark:from-primary/10 dark:to-transparent border-primary/20"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">{currentPlan.name} Plan</h2>
                <span className="px-2.5 py-1 bg-primary/15 text-primary text-[10px] font-black uppercase rounded-lg tracking-wider">Active</span>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm">{currentPlan.tagline}</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-slate-900 dark:text-slate-100">${currentPlan.price}</p>
              <p className="text-xs text-slate-400">/month</p>
            </div>
          </div>

          {/* Usage Bars */}
          <div className="space-y-5">
            <UsageBar label="Agents"   used={usage.agents || 0}   limit={currentPlan.limits.agents}   />
            <UsageBar label="Leads"    used={usage.leads || 0}    limit={currentPlan.limits.leads}    />
            <UsageBar label="Messages" used={usage.messages || 0} limit={currentPlan.limits.messages} />
          </div>
        </motion.div>

        {/* Next Billing */}
        <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.18 }} className="space-y-4">
          <div className="card p-5">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Next Invoice</p>
            <p className="text-3xl font-black text-slate-900 dark:text-slate-100 mb-1">${currentPlan.price}.00</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Due {billingData?.nextBillingDate || 'April 1, 2025'}
            </p>
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 space-y-2">
              {[
                { label:'Payment method', value: billingData?.paymentMethod || '•••• 4242' },
                { label:'Billing email',  value: user?.email || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between text-xs">
                  <span className="text-slate-400">{label}</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{value}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="w-full btn-secondary text-sm py-2.5">
            <span className="material-symbols-outlined text-[16px]">credit_card</span> Manage Payment
          </button>
          <button className="w-full btn-secondary text-sm py-2.5">
            <span className="material-symbols-outlined text-[16px]">download</span> Download Invoice
          </button>
        </motion.div>
      </div>

      {/* Plans Grid */}
      <div>
        <motion.h2 initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay:0.25 }}
          className="text-xl font-black text-slate-900 dark:text-slate-100 mb-6"
        >
          Available Plans
        </motion.h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div key={plan.id} initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay: 0.28 + i * 0.08 }}>
              <PlanCard
                plan={plan}
                isCurrent={currentPlanId === plan.id}
                onSelect={handleUpgrade}
              />
            </motion.div>
          ))}
        </div>
      </div>

      {/* Billing History */}
      <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.45 }} className="card overflow-hidden pb-2">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800">
          <h3 className="font-bold text-slate-900 dark:text-slate-100">Billing History</h3>
          <p className="text-xs text-slate-400 mt-0.5">Your past invoices and payment records.</p>
        </div>
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-800/60">
              {['Invoice', 'Date', 'Plan', 'Amount', 'Status', ''].map(h => (
                <th key={h} className="px-6 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
            {(billingData?.history || MOCK_HISTORY).map(row => (
              <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-6 py-4 text-sm font-mono font-semibold text-slate-700 dark:text-slate-300">{row.id}</td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{row.date}</td>
                <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">{row.plan}</td>
                <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-slate-100">{row.amount}</td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-lg
                    ${row.status === 'paid'   ? 'bg-primary/10 text-primary' :
                      row.status === 'failed' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' :
                      'bg-amber-50 dark:bg-amber-900/20 text-amber-500'}`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 ml-auto">
                    <span className="material-symbols-outlined text-[14px]">download</span> PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
