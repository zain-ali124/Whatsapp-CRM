import { motion } from 'framer-motion';

function ComingSoon({ title, icon }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
      >
        <div className="size-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-5xl text-primary">{icon}</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">{title}</h2>
        <p className="text-slate-500 dark:text-slate-400">This page is being built. Check back soon!</p>
      </motion.div>
    </div>
  );
}

export function Inbox()      { return <ComingSoon title="Inbox"      icon="inbox"         />; }
export function Leads()      { return <ComingSoon title="Leads"      icon="group"         />; }
export function LeadDetail() { return <ComingSoon title="Lead Detail" icon="contact_page" />; }
export function Pipeline()   { return <ComingSoon title="Pipeline"   icon="account_tree"  />; }
export function Agents()     { return <ComingSoon title="Agents"     icon="support_agent" />; }
export function Analytics()  { return <ComingSoon title="Analytics"  icon="bar_chart"     />; }
export function Settings()   { return <ComingSoon title="Settings"   icon="settings"      />; }
export function Billing()    { return <ComingSoon title="Billing"    icon="credit_card"   />; }
export function Templates()  { return <ComingSoon title="Templates"  icon="description"   />; }
