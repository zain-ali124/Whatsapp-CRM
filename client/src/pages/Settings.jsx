import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { authApi } from '../api/authApi';
import { whatsappApi } from '../api/whatsappApi';
import { useAuthStore } from '../store/authStore';
import { getInitials } from '../utils/helpers';
import api from '../api/axios';
import WhatsAppConnectButton from '../components/whatsapp/WhatsAppConnectButton';

const TABS = [
  { id: 'profile',    label: 'Profile',          icon: 'account_circle'   },
  { id: 'whatsapp',   label: 'WhatsApp Setup',   icon: 'chat'             },
  { id: 'team',       label: 'Team & Access',    icon: 'group'            },
  { id: 'notifications', label: 'Notifications', icon: 'notifications'    },
  { id: 'danger',     label: 'Danger Zone',      icon: 'warning'          },
];

function Section({ title, description, children }) {
  return (
    <div className="card p-6 space-y-5">
      <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">{title}</h3>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</p>
        {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${value ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <span className={`absolute top-1 size-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
      </button>
    </div>
  );
}

/* ── Profile Tab ── */
function ProfileTab() {
  const qc = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({ name: '', email: '', businessName: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);

  const { data } = useQuery({
    queryKey: ['me'],
    queryFn:  () => authApi.getMe().then(r => r.data),
  });

  useEffect(() => {
    if (data?.user) {
      setForm({ name: data.user.name || '', email: data.user.email || '', businessName: data.user.businessName || '' });
    }
  }, [data]);

  const updateMut = useMutation({
    mutationFn: (d) => authApi.updateProfile ? authApi.updateProfile(d) : Promise.reject(new Error('Not implemented')),
    onSuccess: (res) => { updateUser(res.data.user); toast.success('Profile updated'); qc.invalidateQueries(['me']); },
    onError:   (err) => toast.error(err.response?.data?.message || 'Update failed'),
  });

  const me = data?.user || user;

  return (
    <div className="space-y-6">
      <Section title="Profile Information" description="Update your personal details and business name.">
        {/* Avatar */}
        <div className="flex items-center gap-5">
          <div className="size-20 rounded-full bg-primary/15 flex items-center justify-center text-primary text-2xl font-black ring-4 ring-primary/10">
            {getInitials(me?.name || 'U')}
          </div>
          <div>
            <button className="btn-secondary text-sm py-2 px-4">Change Photo</button>
            <p className="text-xs text-slate-400 mt-1.5">JPG, PNG · Max 2MB</p>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Full Name</label>
            <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Business Name</label>
            <input value={form.businessName} onChange={e => setForm(f => ({...f, businessName: e.target.value}))} className="input-field" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email Address</label>
            <input value={form.email} type="email" onChange={e => setForm(f => ({...f, email: e.target.value}))} className="input-field" />
          </div>
        </div>
        <div className="flex justify-end">
          <button onClick={() => updateMut.mutate(form)} disabled={updateMut.isPending} className="btn-primary disabled:opacity-60">
            {updateMut.isPending ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </Section>

      <Section title="Change Password" description="Use a strong password of at least 8 characters.">
        <div className="space-y-4 max-w-md">
          {[
            { key: 'currentPassword', label: 'Current Password' },
            { key: 'newPassword',     label: 'New Password'     },
            { key: 'confirm',         label: 'Confirm New Password' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">{label}</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pwForm[key]}
                  onChange={e => setPwForm(f => ({...f, [key]: e.target.value}))}
                  className="input-field pr-10"
                  placeholder="••••••••"
                />
                {key === 'confirm' && (
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    <span className="material-symbols-outlined text-[18px]">{showPw ? 'visibility_off' : 'visibility'}</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            onClick={() => {
              if (pwForm.newPassword !== pwForm.confirm) return toast.error('Passwords do not match');
              if (pwForm.newPassword.length < 8) return toast.error('Must be at least 8 characters');
              toast.success('Password change request sent (integrate your endpoint)');
            }}
            className="btn-primary"
          >
            Update Password
          </button>
        </div>
      </Section>
    </div>
  );
}

/* ── WhatsApp Tab ── */
function WhatsAppTab() {
  const { user, updateUser } = useAuthStore();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    waPhoneNumberId: user?.waPhoneNumberId || '',
    waAccessToken:   user?.waAccessToken   || '',
    waVerifyToken:   user?.waVerifyToken   || '',
  });
  const [showToken, setShowToken] = useState(false);

  const saveMut = useMutation({
    mutationFn: (d) => authApi.updateWA(d),
    onSuccess:  (res) => { updateUser(res.data.user); toast.success('WhatsApp config saved!'); qc.invalidateQueries(['me']); },
    onError:    (err) => toast.error(err.response?.data?.message || 'Save failed'),
  });

  const [testMessage, setTestMessage] = useState({
    to: '',
    body: 'Hello from my WhatsApp CRM',
  });

  const { data: embeddedConnection } = useQuery({
    queryKey: ['whatsapp-connection'],
    queryFn: () => whatsappApi.getConnection().then((res) => res.data),
  });

  const testMut = useMutation({
    mutationFn: (payload) => whatsappApi.sendTestMessage(payload),
    onSuccess: () => toast.success('Test message sent'),
    onError: (error) => toast.error(error.response?.data?.message || 'Failed to send test message'),
  });

  const webhookUrl = embeddedConnection?.webhookUrl || `${import.meta.env.VITE_API_URL}/whatsapp/webhook`;
  const connection = embeddedConnection?.connection;

  return (
    <div className="space-y-6">
      <Section title="Meta WhatsApp Cloud API" description="Connect your business number to start receiving messages.">
        {/* Status */}
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${
          (connection?.phoneNumberId || user?.waPhoneNumberId)
            ? 'bg-primary/5 border-primary/30'
            : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'
        }`}>
          <span className={`material-symbols-outlined text-[20px] ${(connection?.phoneNumberId || user?.waPhoneNumberId) ? 'text-primary' : 'text-amber-500'}`}>
            {(connection?.phoneNumberId || user?.waPhoneNumberId) ? 'check_circle' : 'warning'}
          </span>
          <div>
            <p className={`text-sm font-bold ${(connection?.phoneNumberId || user?.waPhoneNumberId) ? 'text-primary' : 'text-amber-700 dark:text-amber-400'}`}>
              {(connection?.phoneNumberId || user?.waPhoneNumberId) ? 'WhatsApp Connected' : 'Not Connected'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {connection?.phoneNumberId
                ? `Embedded Signup connected: ${connection.phoneNumberId}`
                : user?.waPhoneNumberId
                  ? `Manual config: ${user.waPhoneNumberId}`
                  : 'Add your credentials below to connect.'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Embedded Signup</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Connect a tenant-owned WhatsApp Business account using Meta&apos;s guided popup.
            </p>
          </div>
          <WhatsAppConnectButton
            onConnected={() => {
              toast.success('WhatsApp Business connected');
              qc.invalidateQueries(['whatsapp-connection']);
              qc.invalidateQueries(['me']);
            }}
            onError={(message) => toast.error(message)}
            onCancel={() => toast('Signup cancelled')}
          />
        </div>

        {/* Webhook URL — read only */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Webhook URL <span className="text-xs text-primary font-medium">(paste this in Meta Developer Console)</span>
          </label>
          <div className="flex gap-2">
            <input value={webhookUrl} readOnly className="input-field flex-1 bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-500" />
            <button
              onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success('Copied!'); }}
              className="btn-secondary px-4"
            >
              <span className="material-symbols-outlined text-[18px]">content_copy</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Embedded WABA ID</label>
            <input value={connection?.wabaId || ''} readOnly className="input-field font-mono text-sm bg-slate-50 dark:bg-slate-800" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Embedded Phone Number ID</label>
            <input value={connection?.phoneNumberId || ''} readOnly className="input-field font-mono text-sm bg-slate-50 dark:bg-slate-800" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number ID</label>
            <input
              value={form.waPhoneNumberId}
              onChange={e => setForm(f => ({...f, waPhoneNumberId: e.target.value}))}
              placeholder="Enter your Meta Phone Number ID"
              className="input-field font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Verify Token</label>
            <input
              value={form.waVerifyToken}
              onChange={e => setForm(f => ({...f, waVerifyToken: e.target.value}))}
              placeholder="Custom verify token (any string)"
              className="input-field font-mono text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Permanent Access Token
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={form.waAccessToken}
                onChange={e => setForm(f => ({...f, waAccessToken: e.target.value}))}
                placeholder="EAAxxxxxx…"
                className="input-field font-mono text-sm pr-12"
              />
              <button onClick={() => setShowToken(s=>!s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined text-[18px]">{showToken ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Send test message</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Use this after Embedded Signup to verify the tenant-scoped connection token works.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              value={testMessage.to}
              onChange={(e) => setTestMessage((current) => ({ ...current, to: e.target.value }))}
              placeholder="Recipient phone in E.164 format"
              className="input-field"
            />
            <input
              value={testMessage.body}
              onChange={(e) => setTestMessage((current) => ({ ...current, body: e.target.value }))}
              placeholder="Message body"
              className="input-field"
            />
          </div>
          {connection?.lastError ? (
            <p className="text-sm text-red-500">{connection.lastError}</p>
          ) : null}
        </div>

        <div className="flex items-center justify-between pt-2">
          <a href="https://developers.facebook.com/docs/whatsapp/embedded-signup/" target="_blank" rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">open_in_new</span>
            Meta Embedded Signup docs
          </a>
          <div className="flex items-center gap-3">
            <button
              onClick={() => testMut.mutate(testMessage)}
              disabled={testMut.isPending || !connection?.phoneNumberId}
              className="btn-secondary disabled:opacity-60"
            >
              {testMut.isPending ? 'Sending...' : 'Send Test Message'}
            </button>
            <button
              onClick={() => saveMut.mutate(form)}
              disabled={saveMut.isPending || !form.waPhoneNumberId}
              className="btn-primary disabled:opacity-60"
            >
              {saveMut.isPending ? 'Saving…' : 'Save & Connect'}
            </button>
          </div>
        </div>
      </Section>
    </div>
  );
}

/* ── Notifications Tab ── */
function NotificationsTab() {
  const [prefs, setPrefs] = useState({
    newLead:     true,
    reminder:    true,
    agentOnline: false,
    hotLead:     true,
    dailyReport: true,
  });
  const toggle = (k) => setPrefs(p => ({...p, [k]: !p[k]}));

  return (
    <Section title="Notification Preferences" description="Choose what events trigger notifications.">
      <div className="space-y-4 divide-y divide-slate-100 dark:divide-slate-700">
        <ToggleRow label="New Lead Alert"       description="Notify when a new lead sends a message"    value={prefs.newLead}     onChange={() => toggle('newLead')}     />
        <div className="pt-4"><ToggleRow label="Reminder Alerts" description="Get notified when a follow-up is due" value={prefs.reminder}    onChange={() => toggle('reminder')}    /></div>
        <div className="pt-4"><ToggleRow label="Hot Lead Alert"  description="Alert when a lead score crosses 70"   value={prefs.hotLead}     onChange={() => toggle('hotLead')}     /></div>
        <div className="pt-4"><ToggleRow label="Agent Online"    description="When a team member goes online"       value={prefs.agentOnline} onChange={() => toggle('agentOnline')} /></div>
        <div className="pt-4"><ToggleRow label="Daily Report"    description="Receive a daily performance summary"  value={prefs.dailyReport} onChange={() => toggle('dailyReport')} /></div>
      </div>
      <div className="flex justify-end pt-2">
        <button onClick={() => toast.success('Preferences saved')} className="btn-primary">Save Preferences</button>
      </div>
    </Section>
  );
}

/* ── Team Tab ── */
function TeamTab() {
  const { user } = useAuthStore();
  return (
    <Section title="Team & Access Control" description="Manage workspace access and roles.">
      <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center gap-4">
        <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
          {getInitials(user?.name || 'A')}
        </div>
        <div className="flex-1">
          <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{user?.name}</p>
          <p className="text-xs text-slate-400">{user?.email}</p>
        </div>
        <span className="px-3 py-1 text-xs font-bold bg-primary/10 text-primary rounded-lg capitalize">{user?.role || 'Admin'}</span>
      </div>
      <p className="text-sm text-slate-400 text-center py-2">
        Manage agents in the <a href="/agents" className="text-primary hover:underline font-semibold">Agents page →</a>
      </p>
    </Section>
  );
}

/* ── Danger Zone ── */
function DangerTab() {
  const { logout } = useAuthStore();
  return (
    <div className="space-y-4">
      <div className="card p-6 border-red-200 dark:border-red-900/40">
        <h3 className="font-bold text-red-600 dark:text-red-400 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px]">warning</span>
          Danger Zone
        </h3>
        <div className="space-y-4 divide-y divide-red-100 dark:divide-red-900/30">
          {[
            { label:'Export All Data',  desc:'Download a full backup of your account data.',          btn:'Export',        action:() => toast('Export triggered (wire your endpoint)') },
            { label:'Clear All Leads',  desc:'Permanently delete all leads from your workspace.',     btn:'Clear Leads',   action:() => toast.error('This is irreversible!') },
            { label:'Delete Account',   desc:'Permanently delete your account and all associated data.',btn:'Delete Account',action:() => toast.error('Please contact support') },
          ].map(({ label, desc, btn, action }) => (
            <div key={label} className="flex items-center justify-between pt-4 first:pt-0">
              <div>
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{label}</p>
                <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
              </div>
              <button
                onClick={action}
                className="ml-4 px-4 py-2 text-sm font-semibold text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
              >
                {btn}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Main ── */
export default function Settings() {
  const [activeTab, setActiveTab] = useState('profile');

  const tabContent = {
    profile:       <ProfileTab />,
    whatsapp:      <WhatsAppTab />,
    team:          <TeamTab />,
    notifications: <NotificationsTab />,
    danger:        <DangerTab />,
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity:0, y:-12 }} animate={{ opacity:1, y:0 }}>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">Manage your account, team, and integrations.</p>
      </motion.div>

      <div className="flex gap-8">
        {/* Sidebar Nav */}
        <motion.nav initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }} transition={{ delay:0.1 }}
          className="w-56 shrink-0 space-y-1"
        >
          {TABS.map(({ id, label, icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors text-left
                ${activeTab === id
                  ? 'bg-primary text-white shadow-[0_2px_8px_rgba(16,183,127,0.35)]'
                  : `text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 ${id === 'danger' ? 'hover:text-red-500' : 'hover:text-slate-900 dark:hover:text-slate-200'}`
                }`}
            >
              <span className={`material-symbols-outlined text-[18px] ${id === 'danger' && activeTab !== id ? 'text-red-400' : ''}`}>{icon}</span>
              {label}
            </button>
          ))}
        </motion.nav>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity:0, x:12 }} animate={{ opacity:1, x:0 }} transition={{ duration:0.25 }}
          className="flex-1 min-w-0"
        >
          {tabContent[activeTab]}
        </motion.div>
      </div>
    </div>
  );
}
