# WhatsApp CRM — SaaS Platform

A full-stack multi-tenant CRM built on the MERN stack that connects to the **Meta WhatsApp Cloud API**. Business owners receive WhatsApp messages directly in a real-time inbox, manage leads through a pipeline, assign conversations to agents, and track performance through analytics.

---

## Live Demo

| Service | URL |
|---|---|
| Frontend | Deployed on Render |
| Backend API | Deployed on Render |

---

## Features

### Core
- **Real-time Inbox** — WhatsApp messages appear instantly via Socket.io without page refresh
- **Lead Management** — auto-creates leads from incoming WhatsApp messages, full CRUD with filters, search, pagination
- **Pipeline Board** — Kanban-style drag-and-drop across New → Contacted → Interested → Qualified → Closed
- **Agent System** — invite team members, auto-assign leads, track performance per agent
- **Templates** — pre-written messages with `{{variable}}` personalisation, category filters, favourites, usage tracking
- **Analytics** — lead trends, conversion funnel, agent performance charts, source breakdown
- **Reminders** — set follow-up reminders with toast notifications when due
- **Voice Messages** — record and send voice notes directly from the inbox

### Authentication
- Business owner registration and login (JWT)
- Agent login with temp password (generated on invite)
- Role-based access — agents see only their assigned leads, owners see everything

### WhatsApp Integration
- Webhook verification and message receiving via Meta Cloud API
- Send text and audio messages to customers
- Real-time status updates (sent → delivered → read)
- Auto-lead creation from first message

---

## Tech Stack

### Frontend
| Package | Purpose |
|---|---|
| React + Vite | UI framework |
| Tailwind CSS v3 | Styling |
| Zustand | Global state (auth, theme) |
| TanStack Query | Data fetching + caching |
| Socket.io-client | Real-time events |
| Framer Motion | Animations |
| Recharts | Analytics charts |
| React Router v6 | Navigation |
| react-hot-toast | Notifications |
| date-fns | Date formatting |

### Backend
| Package | Purpose |
|---|---|
| Express.js | HTTP server |
| Mongoose | MongoDB ODM |
| Socket.io | Real-time WebSocket |
| jsonwebtoken | Auth tokens |
| bcryptjs | Password hashing |
| multer | Audio file uploads |
| axios | Meta API calls |
| node-cron | Scheduled jobs |
| form-data | Multipart uploads to Meta |

---

## Project Structure

```
whatsapp-crm/
├── client/                        # React frontend
│   └── src/
│       ├── api/                   # Axios API layer
│       │   ├── axios.js           # Instance with JWT interceptors
│       │   ├── authApi.js
│       │   ├── leadApi.js
│       │   ├── messageApi.js
│       │   ├── agentApi.js
│       │   ├── analyticsApi.js
│       │   └── templateApi.js
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Sidebar.jsx    # Role-aware navigation
│       │   │   ├── Header.jsx
│       │   │   └── AppLayout.jsx
│       │   └── ui/
│       │       ├── StatCard.jsx
│       │       ├── StatusBadge.jsx
│       │       └── LeadScoreBadge.jsx
│       ├── hooks/
│       │   └── useSocket.js       # Socket.io real-time hook
│       ├── pages/
│       │   ├── Login.jsx          # Owner + agent login toggle
│       │   ├── Register.jsx
│       │   ├── Dashboard.jsx
│       │   ├── Inbox.jsx          # 3-column WhatsApp UI + voice
│       │   ├── Leads.jsx          # Table with assign + reminder
│       │   ├── LeadDetail.jsx     # Overview / Notes / Timeline / AI
│       │   ├── Pipeline.jsx       # Kanban board
│       │   ├── Agents.jsx         # Team management
│       │   ├── Analytics.jsx      # Charts and KPIs
│       │   ├── Templates.jsx      # Message templates
│       │   ├── Settings.jsx       # WhatsApp setup
│       │   └── Billing.jsx
│       └── store/
│           ├── authStore.js       # Zustand persisted auth
│           └── themeStore.js      # Dark mode
│
└── server/                        # Express backend
    ├── server.js                  # Entry point
    └── src/
        ├── app.js                 # Express setup + routes
        ├── controllers/
        │   ├── authController.js
        │   ├── leadController.js
        │   ├── messageController.js
        │   ├── agentController.js
        │   ├── webhookController.js
        │   ├── analyticsController.js
        │   └── templateController.js
        ├── middlewares/
        │   └── auth.js            # JWT + scope resolution
        ├── models/
        │   ├── User.js
        │   ├── Lead.js
        │   ├── Message.js
        │   ├── Agent.js
        │   ├── Activity.js
        │   └── Template.js
        ├── routes/
        │   ├── authRoute.js
        │   ├── leadRoute.js
        │   ├── messageRoute.js
        │   ├── agentRoute.js
        │   ├── webhookRoute.js
        │   ├── analyticsRoute.js
        │   └── templateRoute.js
        ├── services/
        │   ├── whatsappService.js  # Meta Cloud API
        │   ├── autoAssignService.js
        │   └── cronService.js      # Reminders + lead scoring
        └── sockets/
            └── index.js            # Socket.io events
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Meta Developer account (for WhatsApp)

### 1 — Clone and install

```bash
git clone https://github.com/your-username/whatsapp-crm.git
cd whatsapp-crm

# Install backend dependencies
cd server && npm install

# Install frontend dependencies
cd ../client && npm install
```

### 2 — Environment variables

Create `server/.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/whatsapp-crm
JWT_SECRET=your-long-random-secret-min-32-chars
JWT_EXPIRE=7d

# Meta WhatsApp Cloud API
META_VERIFY_TOKEN=myverifytoken123
META_ACCESS_TOKEN=EAAxxxxxxxxxxxx
META_PHONE_NUMBER_ID=123456789012345
```

Create `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3 — Run locally

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Frontend: http://localhost:5173  
Backend API: http://localhost:5000

---

## Deployment

### Backend → Render

1. Push repo to GitHub
2. Create **Web Service** on Render
3. Set **Root Directory** → `server`
4. Set **Build Command** → `npm install`
5. Set **Start Command** → `node server.js`
6. Add all environment variables from `server/.env`

### Frontend → Vercel

1. Import GitHub repo on Vercel
2. Set **Root Directory** → `client`
3. Add environment variables:
   ```
   VITE_API_URL    = https://your-backend.onrender.com/api
   VITE_SOCKET_URL = https://your-backend.onrender.com
   ```

---

## WhatsApp Setup

After deployment:

1. Create a Meta Developer App at [developers.facebook.com](https://developers.facebook.com)
2. Add **WhatsApp** product to the app
3. Get your **Phone Number ID** and generate a **permanent access token** via System Users
4. Register webhook:
   ```
   Callback URL:  https://your-backend.onrender.com/api/webhook/whatsapp
   Verify Token:  myverifytoken123
   ```
5. Subscribe to `messages` field
6. Save credentials in your CRM → **Settings → WhatsApp Setup**

Full step-by-step guide in [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md).

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register business owner |
| POST | `/api/auth/login` | Owner login |
| POST | `/api/agents/login` | Agent login |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/update-wa` | Save WhatsApp credentials |
| POST | `/api/auth/verify-wa` | Test WhatsApp connection |

### Leads
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/leads` | List leads (scoped by role) |
| POST | `/api/leads` | Create lead |
| PATCH | `/api/leads/:id` | Update lead |
| PATCH | `/api/leads/:id/assign` | Assign to agent |
| PATCH | `/api/leads/:id/reminder` | Set reminder |
| DELETE | `/api/leads/:id` | Delete lead (owner only) |
| POST | `/api/leads/bulk-assign` | Bulk assign (owner only) |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages/:leadId` | Get conversation history |
| POST | `/api/messages/send` | Send text message |
| POST | `/api/messages/send-audio` | Send voice message |

### Webhook
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/webhook/whatsapp` | Meta verification |
| POST | `/api/webhook/whatsapp` | Receive messages |

---

## Role Permissions

| Feature | Owner | Manager | Agent |
|---|---|---|---|
| View all leads | ✅ | ✅ | ❌ (own only) |
| View assigned leads | ✅ | ✅ | ✅ |
| Delete leads | ✅ | ❌ | ❌ |
| Assign leads | ✅ | ❌ | ❌ |
| Invite agents | ✅ | ❌ | ❌ |
| View analytics | ✅ | ❌ | ❌ |
| View billing | ✅ | ❌ | ❌ |
| Send messages | ✅ | ✅ | ✅ |
| Set reminders | ✅ | ✅ | ✅ |

---

## Socket Events

| Event | Direction | Trigger |
|---|---|---|
| `new_message` | Server → Client | Inbound WhatsApp message |
| `message_sent` | Server → Client | Outbound message confirmed |
| `message_status` | Server → Client | Delivered / read update |
| `new_lead` | Server → Client | New lead auto-created |
| `reminder_due` | Server → Client | Cron: reminder time reached |
| `agent_status_changed` | Server → Client | Agent online/offline |

---

## Cron Jobs

| Schedule | Job |
|---|---|
| Every 5 min | Check due reminders, emit `reminder_due` |
| Every 30 min | Recalculate lead scores |
| Daily 9 AM | Detect inactive leads (no message in 2+ days) |

### Lead Scoring Algorithm
- Recent messages (last 24h) → +30 or +15
- Buying keywords detected → +25
- Status `interested` → +15, `contacted` → +5
- Inactive 3+ days → −20, 7+ days → −40
- Score clamped 0–100 → Hot 🔥 ≥70, Warm 🟡 40–69, Cold ❄️ <40

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `PORT` | Yes | Server port (5000) |
| `MONGO_URI` | Yes | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | Minimum 32 characters |
| `JWT_EXPIRE` | Yes | e.g. `7d` |
| `META_VERIFY_TOKEN` | Yes | Must match webhook setup in Meta |
| `META_ACCESS_TOKEN` | Yes | Permanent token from System Users |
| `META_PHONE_NUMBER_ID` | Yes | From Meta → WhatsApp → API Setup |
| `RENDER_URL` | Optional | Backend URL for keep-alive ping |

---

## License

MIT © 2025 Zain Ali
