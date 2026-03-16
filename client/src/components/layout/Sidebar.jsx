import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { getInitials } from '../../utils/helpers';

// Owner sees everything
const OWNER_NAV = [
  { to: '/dashboard', icon: 'dashboard',     label: 'Dashboard'  },
  { to: '/inbox',     icon: 'inbox',          label: 'Inbox'      },
  { to: '/leads',     icon: 'group',          label: 'Leads'      },
  { to: '/pipeline',  icon: 'account_tree',   label: 'Pipeline'   },
  { to: '/agents',    icon: 'support_agent',  label: 'Agents'     },
  { to: '/analytics', icon: 'bar_chart',      label: 'Analytics'  },
  { to: '/templates', icon: 'description',    label: 'Templates'  },
];

// Agents: no Agents management, no Analytics, no Billing
const AGENT_NAV = [
  { to: '/inbox',     icon: 'inbox',        label: 'Inbox'     },
  { to: '/leads',     icon: 'group',        label: 'My Leads'  },
  { to: '/pipeline',  icon: 'account_tree', label: 'Pipeline'  },
  { to: '/templates', icon: 'description',  label: 'Templates' },
];

const OWNER_BOTTOM = [
  { to: '/settings', icon: 'settings',    label: 'Settings' },
  { to: '/billing',  icon: 'credit_card', label: 'Billing'  },
];

const AGENT_BOTTOM = [
  { to: '/settings', icon: 'settings', label: 'Settings' },
];

export default function Sidebar({ collapsed = false, onClose }) {
  const { user, logout, isAgent } = useAuthStore();
  const navigate   = useNavigate();
  const agentMode  = isAgent?.() ?? user?.type === 'agent';

  const mainNav   = agentMode ? AGENT_NAV   : OWNER_NAV;
  const bottomNav = agentMode ? AGENT_BOTTOM : OWNER_BOTTOM;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={`
      ${collapsed ? 'w-20' : 'w-64'}
      fixed inset-y-0 left-0 z-40 lg:relative flex flex-col bg-sidebar-dark transition-all duration-300 shrink-0
      ${collapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
    `}>
      {/* Brand & Close Button (Mobile) */}
      <div className="flex items-center justify-between px-4 py-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary size-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-[0_4px_12px_rgba(16,183,127,0.4)]">
            <span className="material-symbols-outlined text-xl">chat</span>
          </div>
          {!collapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-w-0">
              <h1 className="text-white text-sm font-bold leading-tight truncate">WhatsApp CRM</h1>
              <p className="text-primary text-[10px] font-semibold tracking-widest uppercase truncate">
                {agentMode ? 'Agent Portal' : 'Enterprise'}
              </p>
            </motion.div>
          )}
        </div>

        {/* Close Button - Strictly Mobile Only */}
        <button
          onClick={onClose}
          className="lg:hidden p-2 text-slate-400 hover:text-white transition-colors"
          aria-label="Close Sidebar"
        >
          <span className="material-symbols-outlined text-[22px]">close</span>
        </button>
      </div>

      {/* Agent badge */}
      {agentMode && !collapsed && (
        <div className="mx-3 mb-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-primary">badge</span>
          <div className="min-w-0">
            <p className="text-primary text-[11px] font-bold uppercase tracking-wider">Agent Portal</p>
            <p className="text-slate-400 text-[10px] truncate capitalize">{user?.role || 'agent'}</p>
          </div>
        </div>
      )}

      {/* Main Nav */}
      <nav className="flex flex-col gap-0.5 px-2 flex-1">
        {mainNav.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
               ${isActive
                 ? 'bg-primary/15 text-primary'
                 : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
               }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`material-symbols-outlined text-[22px] shrink-0 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-primary' : ''}`}>
                  {icon}
                </span>
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{label}</span>
                )}
                {isActive && !collapsed && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}

        <div className="my-3 border-t border-white/5 mx-1" />

        {bottomNav.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
               ${isActive
                 ? 'bg-primary/15 text-primary'
                 : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
               }`
            }
          >
            <span className="material-symbols-outlined text-[22px] shrink-0 transition-transform duration-200 group-hover:scale-110">{icon}</span>
            {!collapsed && <span className="text-sm font-medium">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="px-2 pb-4 border-t border-white/5 pt-3">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
          <div className="size-8 rounded-full bg-primary/30 flex items-center justify-center text-primary text-xs font-bold shrink-0 ring-2 ring-primary/20">
            {getInitials(user?.name || 'User')}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.name || 'User'}</p>
              <p className="text-slate-500 text-xs truncate capitalize">
                {agentMode ? `${user?.role || 'agent'} · agent` : 'owner'}
              </p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              title="Logout"
            >
              <span className="material-symbols-outlined text-[18px]">logout</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}