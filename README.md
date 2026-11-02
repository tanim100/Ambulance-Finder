# 🚑 Ambulance Finder (Full-Stack Monorepo)

A real-time emergency ambulance booking and tracking monorepo built with **Next.js 14**, **Node.js/Express**, **MySQL (Sequelize ORM)**, and **Socket.io**.

---

## 🏗️ Monorepo Architecture

This repository is structured as a single **npm workspace monorepo** with one root `package.json` and a single unified root `package-lock.json`.

```
Ambulance-Finder/
├── package.json              # Root npm workspace configuration & runner scripts
├── package-lock.json         # Single root lockfile for the entire repository
├── .gitignore                # Comprehensive Git ignore (OS, IDEs, caches, envs, builds)
│
├── backend/                  # Workspace: "backend" (Express API + MySQL + Socket.io)
│   ├── src/
│   │   ├── config/          # MySQL connection (Sequelize + auto database creation)
│   │   ├── controllers/     # Auth, Ambulances, Bookings, Drivers, Admin
│   │   ├── middleware/      # JWT protection, role-based access, error handling
│   │   ├── models/          # User, Ambulance, Driver, Booking (Sequelize)
│   │   ├── routes/          # Express route definitions
│   │   ├── socket/          # Real-time GPS and trip events
│   │   └── app.js           # Express app configuration
│   ├── server.js            # HTTP + Socket.io entry point
│   ├── .env.example         # Backend environment template (MySQL)
│   └── package.json
│
├── frontend/                 # Workspace: "frontend" (Next.js 14 App Router + Tailwind)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/      # Login, Register
│   │   │   ├── (driver)/    # Driver Dashboard, Active Trip
│   │   │   ├── (user)/      # Map/Home, Request, Tracking, History, Profile
│   │   │   ├── admin/       # Admin Dashboard, Ambulances, Drivers, Bookings
│   │   │   ├── layout.jsx   # Root layout with Tailwind
│   │   │   └── page.jsx     # Landing / Hero page
│   │   ├── components/      # UI kit, Map (Leaflet), Layout, Ambulance components
│   │   ├── hooks/           # useAuth, useGeolocation, useSocket
│   │   └── lib/             # Axios API client, Socket.io client, Auth storage
│   ├── .env.local.example   # Frontend environment template
│   └── package.json
└── README.md
```

---

## ⚡ Quick Start: Single Command

From the root folder, run:

```bash
# 1. Install all dependencies across the entire monorepo:
npm install

# 2. Start both Backend & Frontend simultaneously with a single command:
npm run dev
```

- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:5000](http://localhost:5000)
- **Database**: Automatically synced with MySQL database `ambulance_finder`.

### Monorepo Workspace Commands
| Command | What it does |
|---|---|
| `npm run dev` | Runs backend (nodemon) & frontend (Next.js) concurrently with color-coded logs |
| `npm start` | Runs backend and frontend in production mode concurrently |
| `npm run seed` | Seeds MySQL database with demo users, ambulances, and trips |
| `npm run dev:backend` | Runs only the backend workspace (`-w backend`) |
| `npm run dev:frontend` | Runs only the frontend workspace (`-w frontend`) |
| `npm run build:frontend` | Builds production Next.js frontend (`-w frontend`) |

---

## 🔑 Demo Accounts

| Role | Email | Password |
|---|---|---|
| 👑 **Admin** | `admin@ambulance.com` | `password123` |
| 👤 **User** | `user@ambulance.com` | `password123` |
| 🚑 **Driver** | `driver1@ambulance.com` | `password123` |
