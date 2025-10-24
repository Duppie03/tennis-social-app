# System Architecture - Phase 1

## Before (localStorage only)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Browser 1     │         │   Browser 2     │         │   Browser 3     │
│                 │         │                 │         │                 │
│  ┌───────────┐  │         │  ┌───────────┐  │         │  ┌───────────┐  │
│  │ Your App  │  │         │  │ Your App  │  │         │  │ Your App  │  │
│  └─────┬─────┘  │         │  └─────┬─────┘  │         │  └─────┬─────┘  │
│        │        │         │        │        │         │        │        │
│  ┌─────▼─────┐  │         │  ┌─────▼─────┐  │         │  ┌─────▼─────┐  │
│  │localStorage│  │         │  │localStorage│  │         │  │localStorage│  │
│  │   (State) │  │         │  │   (State) │  │         │  │   (State) │  │
│  └───────────┘  │         │  └───────────┘  │         │  └───────────┘  │
└─────────────────┘         └─────────────────┘         └─────────────────┘
        ❌                          ❌                          ❌
   Isolated Data            Isolated Data            Isolated Data
```

**Problems:**
- Each browser has its own data
- Changes don't sync
- No shared state

---

## After (API + Server)

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Browser 1     │         │   Browser 2     │         │   Browser 3     │
│                 │         │                 │         │                 │
│  ┌───────────┐  │         │  ┌───────────┐  │         │  ┌───────────┐  │
│  │ Your App  │  │         │  │ Your App  │  │         │  │ Your App  │  │
│  └─────┬─────┘  │         │  └─────┬─────┘  │         │  └─────┬─────┘  │
│        │ API    │         │        │ API    │         │        │ API    │
└────────┼────────┘         └────────┼────────┘         └────────┼────────┘
         │                           │                           │
         └───────────────┬───────────┴───────────────┬───────────┘
                         │                           │
                         ▼                           ▼
                 ┌───────────────────────────────────────┐
                 │         Render.com Server            │
                 │                                       │
                 │  ┌─────────────────────────────────┐ │
                 │  │       Express.js Server         │ │
                 │  │                                 │ │
                 │  │  ┌────────────┐  ┌──────────┐  │ │
                 │  │  │ API Routes │  │  Static  │  │ │
                 │  │  │            │  │   Files  │  │ │
                 │  │  │ GET /state │  │  HTML    │  │ │
                 │  │  │POST /state │  │  CSS     │  │ │
                 │  │  │GET /health │  │  JS      │  │ │
                 │  │  └──────┬─────┘  └──────────┘  │ │
                 │  └─────────┼─────────────────────┘ │
                 │            │                        │
                 │  ┌─────────▼─────────┐             │
                 │  │   data/state.json │             │
                 │  │   (Shared State)  │             │
                 │  └───────────────────┘             │
                 └───────────────────────────────────────┘
                              ✅
                      Shared Persistent Data
```

**Benefits:**
- ✅ All browsers read/write to same server
- ✅ Data persists even if browsers close
- ✅ Changes saved to server
- ✅ Refresh to see latest data

---

## API Flow

### Loading State (Page Load)
```
Browser                     Server
   │                          │
   │  GET /api/state          │
   ├──────────────────────────>
   │                          │
   │                    Read state.json
   │                          │
   │  {success: true, state}  │
   <──────────────────────────┤
   │                          │
 Display                      │
  data                        │
```

### Saving State (Any Change)
```
Browser                     Server
   │                          │
   │  POST /api/state         │
   │  {players, courts, ...}  │
   ├──────────────────────────>
   │                          │
   │                    Write state.json
   │                          │
   │  {success: true}         │
   <──────────────────────────┤
   │                          │
 Confirm                      │
  saved                       │
```

---

## File Structure

```
tennis-club-manager/
│
├── server.js                    ← Express server (NEW)
├── package.json                 ← Dependencies (NEW)
├── .gitignore                   ← Git rules (NEW)
├── README.md                    ← Instructions
│
├── public/                      ← Frontend files
│   ├── index.html              ← Main app (MODIFIED)
│   ├── script.js               ← App logic (MODIFIED)
│   ├── style.css               ← Styles
│   ├── api.js                  ← API wrapper (NEW)
│   └── source/                 ← Images/assets
│       ├── eldorainge-tennis-logo.png
│       └── ...
│
└── data/                        ← Data storage (AUTO-CREATED)
    └── state.json              ← Shared state (AUTO-CREATED)
```

---

## Component Interaction

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser                               │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    index.html                          │  │
│  │                                                        │  │
│  │  ┌──────────────┐          ┌─────────────────────┐   │  │
│  │  │   api.js     │          │     script.js       │   │  │
│  │  │              │          │                     │   │  │
│  │  │ API.load()   │◄─────────┤  loadState()        │   │  │
│  │  │ API.save()   │◄─────────┤  saveState()        │   │  │
│  │  │ API.health() │          │  (all your logic)   │   │  │
│  │  └──────┬───────┘          └─────────────────────┘   │  │
│  └─────────┼──────────────────────────────────────────┘  │
└────────────┼──────────────────────────────────────────────┘
             │
             │ HTTP Requests
             │ (fetch)
             │
┌────────────▼──────────────────────────────────────────────────┐
│                      Render.com Server                        │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │                    server.js                           │  │
│  │                                                        │  │
│  │  app.get('/api/state')      ────────►  Read JSON      │  │
│  │  app.post('/api/state')     ────────►  Write JSON     │  │
│  │  app.get('/api/health')     ────────►  Status Check   │  │
│  │                                                        │  │
│  └────────────────────────────┬───────────────────────────┘  │
│                               │                               │
│  ┌────────────────────────────▼───────────────────────────┐  │
│  │              data/state.json                           │  │
│  │  {                                                     │  │
│  │    "availablePlayers": [...],                         │  │
│  │    "courts": [...],                                   │  │
│  │    "gameHistory": [...]                               │  │
│  │  }                                                     │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | HTML/CSS/JavaScript | User interface (your existing app) |
| **API Layer** | api.js | Communication with backend |
| **Backend** | Node.js + Express | Web server & API endpoints |
| **Storage** | JSON File | Data persistence |
| **Hosting** | Render.com | Cloud deployment |

---

## Current Limitations & Future Improvements

### ✅ Phase 1 (Complete)
- Shared state across devices
- API-based architecture
- Persistent storage
- Ready for deployment

### 🔄 Phase 2 (Next)
- Real-time sync with WebSockets
- No refresh needed for updates
- Live multi-user experience

### 🚀 Phase 3 (Future)
- Database (PostgreSQL/MongoDB)
- Better data persistence
- Improved performance
- Backup & recovery

---

**Status: Phase 1 Complete! 🎉**
