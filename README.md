# Downloader

Downloader is a responsive FastAPI and yt-dlp app for saving video, audio, playlists, subtitles, thumbnails, and metadata. It includes a live queue, library, filename templates, and advanced quality/network options.

## Run on Windows

1. Install Python 3.10 or newer.
2. Run `start.bat`.
3. Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

The app stores media in `downloads/`. FFmpeg and FFprobe are used for merging and embedding media assets. Node.js or Deno improves YouTube extraction compatibility.

## Docker

The container installs FFmpeg and Node.js, runs as an unprivileged user, and stores downloads in `/data/downloads`.

```powershell
Copy-Item .env.example .env
# Edit .env and set a unique username and a long random password.
docker compose up --build -d
```

Open [http://localhost:8000](http://localhost:8000). Keep `.env` private. Use a single app instance because the in-memory job queue is process-local.

## Render

The included `render.yaml` Blueprint configures a Docker web service, a `/data/downloads` persistent disk, health checks, Render's runtime port, and generated Basic Auth credentials. Connect the repository to Render and create a Blueprint from this file. It uses Render's paid `starter` plan because persistent disks require a paid service.

For manual setup, create a **Web Service**, select **Docker**, and set the Dockerfile path to `Dockerfile`.

Set these environment variables:

- `CLIPSTREAM_HOST=0.0.0.0`
- `CLIPSTREAM_USERNAME` and `CLIPSTREAM_PASSWORD` to strong, unique credentials
- `CLIPSTREAM_DOWNLOAD_DIR=/data/downloads`
- `CLIPSTREAM_DOWNLOAD_WORKERS=2`

The container listens on Render's `PORT` value (Render supplies it at runtime). Add a persistent disk mounted at `/data/downloads` to keep files through deploys and restarts; without it, downloaded files are ephemeral. Keep one instance so the queue remains consistent. Render's persistent disk feature requires a paid service.

## Options

- Choose video or audio, available quality, and output container.
- Save subtitles and thumbnails separately, embed them, or do both.
- Keep metadata and chapter markers; customize the output filename template.
- Open Advanced settings for playlist ranges, format selectors, rate limits, retries, browser cookies, and proxies.
- Use the Library to search, download, and remove saved files.

Browser cookies are read from the machine running Downloader. A hosted Docker service cannot access cookies from your personal browser.

Only save content you own or are authorized to download, and follow the source site's terms.
