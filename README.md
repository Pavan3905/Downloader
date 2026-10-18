# Downloader Studio

A sleek, responsive media downloader and library manager inspired by modern Instagram aesthetics. Inspect links, choose formats and qualities, manage real-time background queues, and access saved files in a clean interface.

---

## 📁 Clean Architecture Overview

The project is cleanly divided into two independent directories:

```text
Downloader/
├── 🌐 frontend/               # React 19 + Vite + Tailwind CSS v4 (Deployed on Vercel)
│   ├── src/
│   │   ├── App.tsx           # Main application state & theme coordinator
│   │   ├── components/       # Header, InspectPost, QueueFeed, SavedLibrary, SettingsSheet
│   │   ├── types.ts          # TypeScript interfaces & models
│   │   └── index.css         # Styling design tokens & dark/light mode
│   ├── package.json          # Frontend dependencies
│   ├── vite.config.ts        # Vite config with local backend proxy on port 3001
│   └── vercel.json           # Vercel deployment & proxy rewrites
│
├── ⚙️ backend/                # Node.js + Express + yt-dlp + FFmpeg (Deployed on Render)
│   ├── server.ts             # Express REST API, media streaming & queue worker
│   ├── Dockerfile            # Container build with yt-dlp, FFmpeg, and Python
│   ├── package.json          # Backend dependencies
│   └── downloads/            # Local media file storage
│
├── docker-compose.yml        # All-in-one local/VPS container stack
├── vercel.json               # Root Vercel configuration
└── DEPLOYMENT.md             # Complete step-by-step deployment guide
```

---

## 🚀 Quick Start (Local Development)

### 1. Run the Backend (Port 3001)
```bash
cd backend
npm install
npm run dev
```

### 2. Run the Frontend (Port 3000)
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser. All requests to `/api` are automatically proxied to the backend on `http://localhost:3001`.

---

## ☁️ Deployment Guide

- **Frontend on Vercel**: Connect your GitHub repository to Vercel. Set Root Directory to `frontend`.
- **Backend on Render**: Connect your GitHub repository to Render as a **Web Service (Docker)** using `backend/Dockerfile`.

See [DEPLOYMENT.md](file:///c:/Users/pavan/Downloader/DEPLOYMENT.md) for full instructions.
