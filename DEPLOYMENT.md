# Deployment Guide — Downloader Studio

This project is cleanly separated into two independent folders:
- **`frontend/`** &rarr; Designed to be hosted on **Vercel** (Global High-Speed CDN).
- **`backend/`** &rarr; Designed to be hosted on **Render** (Continuous Docker container with `yt-dlp` and `FFmpeg`).

---

## Part 1: Deploy Backend on Render (Free)

1. Push all your code to GitHub:
   ```bash
   git add .
   git commit -m "Organize clean frontend and backend directories"
   git push origin main
   ```
2. Go to **[dashboard.render.com](https://dashboard.render.com/)** and log in.
3. Click **New +** &rarr; select **Web Service**.
4. Select your **`Downloader`** GitHub repository.
5. In the configuration page:
   - **Name**: `downloader-backend` (or any name)
   - **Root Directory**: `backend` *(important)*
   - **Environment**: **Docker** (Render will detect `backend/Dockerfile`)
   - **Instance Type**: **Free**
6. *(Optional & Recommended)* Under **Disks**, click **Add a Disk**:
   - **Name**: `downloads`
   - **Mount Path**: `/app/downloads`
   - **Size**: 1 GB or more
7. Click **Deploy Web Service**.
8. Once finished, Render gives you a live URL at the top (e.g., `https://downloader-backend-xxxx.onrender.com`).

---

## Part 2: Deploy Frontend on Vercel

1. Go to **[vercel.com](https://vercel.com/)** and select your project.
2. In **Project Settings** &rarr; **General**:
   - **Root Directory**: Click *Edit* and select **`frontend`** (or leave as `./`).
   - **Framework Preset**: `Vite`.
3. Open [`frontend/vercel.json`](file:///c:/Users/pavan/Downloader/frontend/vercel.json) (and [`vercel.json`](file:///c:/Users/pavan/Downloader/vercel.json) in root) and replace `https://REPLACE_WITH_YOUR_BACKEND_URL` with your Render URL:
   ```json
   {
     "buildCommand": "npm run build",
     "outputDirectory": "dist",
     "framework": "vite",
     "rewrites": [
       {
         "source": "/api/:path*",
         "destination": "https://downloader-backend-xxxx.onrender.com/api/:path*"
       },
       {
         "source": "/share/:path*",
         "destination": "https://downloader-backend-xxxx.onrender.com/share/:path*"
       },
       {
         "source": "/(.*)",
         "destination": "/index.html"
       }
     ]
   }
   ```
4. Commit and push:
   ```bash
   git add frontend/vercel.json vercel.json
   git commit -m "Connect Vercel frontend to live Render backend"
   git push origin main
   ```

Vercel will redeploy automatically. Your Vercel frontend is now connected to your Render backend with zero errors.
