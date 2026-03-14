import { formatDistanceToNow, format } from 'date-fns';

export const timeAgo   = (date) => formatDistanceToNow(new Date(date), { addSuffix: true });
export const formatDate = (date, fmt = 'MMM d, yyyy') => format(new Date(date), fmt);

export function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export function scoreColor(score) {
  if (score >= 70) return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-600 dark:text-red-400', label: '🔥 Hot' };
  if (score >= 40) return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', label: '🟡 Warm' };
  return { bg: 'bg-slate-100 dark:bg-slate-700', text: 'text-slate-500 dark:text-slate-400', label: '❄️ Cold' };
}

export function statusStyle(status) {
  const map = {
    new:         { bg: 'bg-blue-100 dark:bg-blue-900/30',   text: 'text-blue-700 dark:text-blue-300',   label: 'New Lead'    },
    contacted:   { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', label: 'Contacted'   },
    interested:  { bg: 'bg-primary/10',                      text: 'text-primary',                        label: 'Interested'  },
    qualified:   { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', label: 'Qualified'   },
    negotiation: { bg: 'bg-purple-100 dark:bg-purple-900/30',text: 'text-purple-700 dark:text-purple-300',label: 'Negotiating'},
    closed:      { bg: 'bg-emerald-100 dark:bg-emerald-900/30',text: 'text-emerald-700 dark:text-emerald-300',label: 'Closed'},
    lost:        { bg: 'bg-slate-100 dark:bg-slate-700',    text: 'text-slate-500 dark:text-slate-400', label: 'Lost'        },
  };
  return map[status] || map.new;
}

export const PIPELINE_STAGES = ['new','contacted','interested','qualified','negotiation','closed','lost'];
