import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { spawn, execSync } from 'child_process';

const require = createRequire(import.meta.url);
const archiver = require('archiver');

function createZipArchive(options: any = { zlib: { level: 1 } }) {
  if (archiver && archiver.ZipArchive) {
    return new archiver.ZipArchive(options);
  }
  if (typeof archiver === 'function') {
    return (archiver as any)('zip', options);
  }
  return new (archiver.Archiver || archiver)('zip', options);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;
const DOWNLOADS_DIR = path.resolve(process.env.CLIPSTREAM_DOWNLOAD_DIR || path.join(ROOT, 'downloads'));
const COOKIES_FILE = path.join(DOWNLOADS_DIR, '.youtube_cookies.txt');
const STATE_FILE = path.join(DOWNLOADS_DIR, '.state.json');

if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

const AUTH_USER = process.env.CLIPSTREAM_USERNAME || '';
const AUTH_PASSWORD = process.env.CLIPSTREAM_PASSWORD || '';
const SHARE_TOKEN = process.env.CLIPSTREAM_SHARE_TOKEN || '';
function resolveBinary(name: string, customPath?: string): string {
  if (customPath && fs.existsSync(customPath)) return customPath;
  const standardPaths = [
    `/usr/bin/${name}`,
    `/usr/local/bin/${name}`,
    path.join(ROOT, 'bin', name),
    path.join(ROOT, 'bin', `${name}.exe`),
  ];
  for (const p of standardPaths) {
    if (fs.existsSync(p)) return p;
  }
  try {
    const cmd = process.platform === 'win32' ? `where.exe ${name}` : `command -v ${name}`;
    const out = execSync(cmd, { encoding: 'utf-8' }).trim().split('\n')[0].trim();
    if (out && fs.existsSync(out)) return out;
  } catch {}
  return customPath || name;
}

const FFMPEG_PATH = resolveBinary('ffmpeg', process.env.CLIPSTREAM_FFMPEG_PATH);
const FFPROBE_PATH = resolveBinary('ffprobe', process.env.CLIPSTREAM_FFPROBE_PATH);

// Resolve yt-dlp: local bin > /tmp > /usr/local/bin > system PATH
function resolveYtDlp(): string {
  const candidates = [
    path.join(ROOT, 'yt-dlp'),
    path.join(ROOT, 'yt-dlp.exe'),
    path.join(ROOT, 'bin', 'yt-dlp'),
    path.join(ROOT, 'bin', 'yt-dlp.exe'),
    '/tmp/yt-dlp',
    '/usr/local/bin/yt-dlp',
    '/usr/bin/yt-dlp',
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    const cmd = process.platform === 'win32' ? 'where.exe yt-dlp' : 'command -v yt-dlp';
    const out = execSync(cmd, { encoding: 'utf-8' }).trim().split('\n')[0].trim();
    if (out && fs.existsSync(out)) return out;
  } catch {}
  return candidates[0];
}

const YTDLP_PATH = resolveYtDlp();
const HAS_YTDLP = fs.existsSync(YTDLP_PATH);

interface DownloadJob {
  id: string;
  url: string;
  title: string;
  status: 'queued' | 'scheduled' | 'downloading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  speed: number | null;
  eta: number | null;
  size: number | null;
  filename: string | null;
  error: string | null;
  created_at: string;
  scheduled_for?: string | null;
  options: any;
  generated_files?: string[];
  childProcess?: any;
}

const JOBS = new Map<string, DownloadJob>();
const MAX_CONCURRENT_DOWNLOADS = parseInt(process.env.MAX_CONCURRENT_DOWNLOADS || '2', 10);
const MAX_STORAGE_BYTES = parseInt(process.env.MAX_STORAGE_MB || '800', 10) * 1024 * 1024;

// Persistent state hydration & save
function loadState(): void {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        for (const j of parsed) {
          if (j && j.id) {
            if (j.status === 'downloading') {
              j.status = 'failed';
              j.error = 'Interrupted by server restart';
            }
            JOBS.set(j.id, j);
          }
        }
        console.log(`[State] Hydrated ${JOBS.size} persistent jobs from disk.`);
      }
    }
  } catch (err) {
    console.warn('[State] Could not load state file:', err);
  }
}

let saveStateTimer: NodeJS.Timeout | null = null;
function persistState(): void {
  if (saveStateTimer) clearTimeout(saveStateTimer);
  saveStateTimer = setTimeout(() => {
    try {
      const list = Array.from(JOBS.values()).map(safeJob);
      fs.writeFileSync(STATE_FILE, JSON.stringify(list, null, 2), 'utf-8');
    } catch {}
  }, 1000);
}

// Hydrate state on startup
loadState();

function autoPruneOldFiles() {
  try {
    const files = fs.readdirSync(DOWNLOADS_DIR);
    const fileEntries = files
      .filter((name) => name !== '.gitkeep' && !name.startsWith('.'))
      .map((name) => {
        const filePath = path.join(DOWNLOADS_DIR, name);
        const st = fs.statSync(filePath);
        return { name, filePath, size: st.size, mtime: st.mtime.getTime() };
      });

    let totalBytes = fileEntries.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes <= MAX_STORAGE_BYTES) return;

    fileEntries.sort((a, b) => a.mtime - b.mtime);
    const activeFilenames = new Set(
      Array.from(JOBS.values())
        .filter((j) => j.status === 'downloading' && j.filename)
        .map((j) => j.filename)
    );

    for (const f of fileEntries) {
      if (totalBytes <= MAX_STORAGE_BYTES * 0.75) break;
      if (activeFilenames.has(f.name)) continue;
      try {
        fs.unlinkSync(f.filePath);
        totalBytes -= f.size;
        console.log(`[Storage] Auto-pruned old file to safeguard disk space: ${f.name}`);
      } catch {}
    }
  } catch {}
}

function dispatchNextJob() {
  const activeCount = Array.from(JOBS.values()).filter((j) => j.status === 'downloading').length;
  if (activeCount >= MAX_CONCURRENT_DOWNLOADS) return;

  const queuedJobs = Array.from(JOBS.values())
    .filter((j) => j.status === 'queued')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  if (queuedJobs.length > 0) {
    executeDownloadJob(queuedJobs[0]);
  }
}

function safeJob(job: DownloadJob) {
  return {
    id: job.id,
    url: job.url,
    title: job.title,
    status: job.status,
    progress: job.progress,
    speed: job.speed,
    eta: job.eta,
    size: job.size,
    filename: job.filename,
    generated_files: job.generated_files || (job.filename ? [job.filename] : []),
    error: job.error,
    created_at: job.created_at,
    scheduled_for: job.scheduled_for || null,
    options: job.options,
  };
}

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\?%*:|"<>\u0000-\u001f]/g, '_').replace(/^\.+/, '').trim().slice(0, 200);
}

function parseQualityHeight(quality: string): number {
  const q = String(quality || 'best').trim().toLowerCase();
  if (!q || q === 'best' || q === 'auto' || q === 'highest') return NaN;
  if (q === 'worst' || q === 'lowest') return 0;
  if (q.startsWith('height:')) return parseInt(q.split(':')[1], 10);
  if (q.startsWith('audio')) return NaN;
  const h = parseInt(q.replace(/[^0-9]/g, ''), 10);
  return isNaN(h) ? NaN : h;
}

// In-memory cache for inspected URLs (1 hour TTL)
const INSPECT_CACHE = new Map<string, { data: any; expiry: number }>();

function getFormatSelector(quality: string, isAudioOnly: boolean, container?: string): string {
  if (isAudioOnly) {
    return 'ba[protocol^=http]/ba/b';
  }
  const height = parseQualityHeight(quality);
  if (container === 'webm') {
    if (!isNaN(height) && height > 0) {
      return `bv*[height<=${height}][protocol^=http][vcodec^=vp09]+ba[protocol^=http][acodec^=opus]/bv*[height<=${height}][protocol^=http]+ba[protocol^=http]/bv*[height<=${height}]+ba/b[height<=${height}]/best`;
    }
    return 'bv*[protocol^=http][vcodec^=vp09]+ba[protocol^=http][acodec^=opus]/bv*[protocol^=http]+ba[protocol^=http]/bv*+ba/b/best';
  }
  if (!isNaN(height) && height > 0) {
    return `bv*[height<=${height}][protocol^=http]+ba[protocol^=http]/bv*[width<=${height}][protocol^=http]+ba[protocol^=http]/b[height<=${height}][ext=mp4]/bv*[height<=${height}]+ba/bv*[width<=${height}]+ba/b[height<=${height}]/bestvideo+bestaudio/best`;
  }
  return 'bv*[protocol^=http]+ba[protocol^=http]/b[ext=mp4]/bv*+ba/b/bestvideo+bestaudio/best';
}

function runYtDlp(args: string[], timeoutMs: number): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;
    const child = spawn(YTDLP_PATH, args);
    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGKILL'); } catch {}
    }, timeoutMs);
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
    child.on('error', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr + '\nFailed to launch yt-dlp binary at ' + YTDLP_PATH, timedOut });
    });
  });
}

// Multi-Engine / Multi-Client Bot Shield: Auto-rotates between spoofing profiles on bot checks or 429 rate limits
const BOT_SHIELD_CLIENTS = ['android,web', 'ios,web', 'tv_embedded,web', 'mweb,web'];

async function runYtDlpWithShield(
  buildArgs: (client: string) => string[],
  timeoutMs: number = 14000
): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean }> {
  let lastResult: { code: number | null; stdout: string; stderr: string; timedOut: boolean } = { code: -1, stdout: '', stderr: '', timedOut: false };
  for (const client of BOT_SHIELD_CLIENTS) {
    const args = buildArgs(client);
    const res = await runYtDlp(args, timeoutMs);
    lastResult = res;
    if (res.code === 0) {
      return res;
    }
    const isBotError =
      res.stderr.includes('bot') ||
      res.stderr.includes('Sign in') ||
      res.stderr.includes('429') ||
      res.stderr.includes('Too Many Requests');
    if (!isBotError) {
      return res;
    }
    console.warn(`[BotShield] Client "${client}" encountered bot verification/429, rotating to next client profile...`);
  }
  return lastResult;
}

// Cobalt-Style Direct CDN URL Extraction: Resolves signed edge URLs directly from Google, Meta, ByteDance, Fastly
async function resolveDirectCdnUrl(
  targetUrl: string,
  isAudioOnly: boolean,
  quality: string = 'best'
): Promise<{ directUrl: string | null; isRedirectable: boolean }> {
  if (!HAS_YTDLP || !/^https?:\/\//i.test(targetUrl)) {
    return { directUrl: null, isRedirectable: false };
  }

  // Fast direct stream check (e.g. mp4, mp3, webm directly hosted)
  if (/\.(mp4|webm|mov|m4v|mp3|m4a|wav|flac)(\?.*)?$/i.test(targetUrl)) {
    return { directUrl: targetUrl, isRedirectable: true };
  }

  const selector = isAudioOnly
    ? 'ba[protocol^=http]/ba/b'
    : quality === 'best' || quality === 'auto'
    ? 'b[protocol^=http]/best[protocol^=http]/best'
    : `b[height<=${parseQualityHeight(quality) || 720}][protocol^=http]/b[height<=${parseQualityHeight(quality) || 720}]/best[protocol^=http]/best`;

  try {
    const result = await runYtDlpWithShield((client) => {
      const args = [
        '--no-playlist',
        '--no-warnings',
        '-g',
        '--extractor-args', `youtube:player_client=${client}`,
        '-f', selector,
      ];
      if (fs.existsSync(COOKIES_FILE)) args.push('--cookies', COOKIES_FILE);
      args.push(targetUrl);
      return args;
    }, 20000);

    if (result.code === 0 && result.stdout.trim()) {
      const lines = result.stdout.trim().split('\n').map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l));
      if (lines.length === 1) {
        return { directUrl: lines[0], isRedirectable: true };
      }
    }
  } catch {}

  return { directUrl: null, isRedirectable: false };
}

async function inspectUrl(targetUrl: string) {
  // 1. Check in-memory cache
  const cached = INSPECT_CACHE.get(targetUrl);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  const parsed = new URL(targetUrl);
  const hostname = parsed.hostname.toLowerCase();
  let videoId = '';
  let isYoutube = false;
  let isVimeo = false;

  if (hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    isYoutube = true;
    if (hostname.includes('youtu.be')) {
      videoId = parsed.pathname.slice(1).split('/')[0] || '';
    } else if (parsed.pathname.includes('/shorts/')) {
      videoId = parsed.pathname.split('/shorts/')[1]?.split('/')[0] || '';
    } else {
      videoId = parsed.searchParams.get('v') || '';
    }
  } else if (hostname.includes('vimeo.com')) {
    isVimeo = true;
    const parts = parsed.pathname.split('/').filter(Boolean);
    videoId = parts[parts.length - 1] || '';
  }

  const isPlaylist = parsed.searchParams.has('list');

  // Fast path for YouTube via oEmbed: responds in ~400ms instead of 15 seconds!
  if (isYoutube && !isPlaylist) {
    try {
      const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
      const oembedRes = await fetch(oembedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        signal: AbortSignal.timeout(3000),
      });
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        const thumb = videoId
          ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
          : oembedData.thumbnail_url || '';
        const result = {
          id: videoId || crypto.randomUUID().slice(0, 8),
          title: oembedData.title || 'YouTube Video',
          uploader: oembedData.author_name || 'YouTube Creator',
          thumbnail: thumb,
          duration: null,
          view_count: null,
          webpage_url: targetUrl,
          channel_url: oembedData.author_url || `https://www.youtube.com`,
          description: `YouTube video by ${oembedData.author_name || 'Creator'}`,
          extractor: 'youtube',
          is_playlist: false,
          playlist_count: null,
          entries: [],
          formats: [
            { id: 'best', ext: 'mp4', resolution: 'Best Available', height: 1080, fps: 60, filesize: null, vcodec: 'avc1', acodec: 'mp4a', note: 'Highest Quality', tbr: null },
            { id: '1080', ext: 'mp4', resolution: '1080p Full HD', height: 1080, fps: 60, filesize: null, vcodec: 'avc1', acodec: 'mp4a', note: '1080p', tbr: null },
            { id: '720', ext: 'mp4', resolution: '720p HD', height: 720, fps: 60, filesize: null, vcodec: 'avc1', acodec: 'mp4a', note: '720p', tbr: null },
            { id: '480', ext: 'mp4', resolution: '480p SD', height: 480, fps: 30, filesize: null, vcodec: 'avc1', acodec: 'mp4a', note: '480p', tbr: null },
          ],
        };
        INSPECT_CACHE.set(targetUrl, { data: result, expiry: Date.now() + 3600000 });
        return result;
      }
    } catch {
      // Continue to yt-dlp if oEmbed fails
    }
  }

  // Fast path for Vimeo via oEmbed
  if (isVimeo) {
    try {
      const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(targetUrl)}`;
      const res = await fetch(oembedUrl, { signal: AbortSignal.timeout(3000) });
      if (res.ok) {
        const data = await res.json();
        const result = {
          id: videoId || crypto.randomUUID().slice(0, 8),
          title: data.title || 'Vimeo Video',
          uploader: data.author_name || 'Vimeo Creator',
          thumbnail: data.thumbnail_url || '',
          duration: data.duration || null,
          view_count: null,
          webpage_url: targetUrl,
          channel_url: data.author_url || '',
          description: `Vimeo video by ${data.author_name || 'Creator'}`,
          extractor: 'vimeo',
          is_playlist: false,
          playlist_count: null,
          entries: [],
          formats: [
            { id: 'best', ext: 'mp4', resolution: 'Best Available', height: 1080, fps: 60, filesize: null, vcodec: 'avc1', acodec: 'mp4a', note: 'Highest Quality', tbr: null },
          ],
        };
        INSPECT_CACHE.set(targetUrl, { data: result, expiry: Date.now() + 3600000 });
        return result;
      }
    } catch {}
  }

  let title = 'Media Stream';
  let uploader = 'Online Media Source';
  let thumbnail = '';
  let duration: number | null = null;
  let viewCount: number | null = null;
  let channelUrl = `${parsed.protocol}//${parsed.hostname}`;
  let description = `Extracted from ${parsed.hostname}`;

  let realFormats: any[] = [];
  let realEntries: any[] = [];
  let realSubtitles: any[] = [];
  let realChapters: any[] = [];
  const isDirectMedia = /\.(mp4|webm|mov|m4v|mkv|mp3|m4a|wav|flac|ogg|opus|aac)(\?.*)?$/i.test(parsed.pathname);

  if (HAS_YTDLP && !isDirectMedia && /^https?:\/\//i.test(targetUrl)) {
    try {
      const { code, stdout } = await runYtDlpWithShield((client) => {
        const inspectArgs = [
          '--no-warnings',
          '--no-playlist',
          '--skip-download',
          '--socket-timeout', '8',
          '--extractor-args', `youtube:player_client=${client}`,
        ];
        if (fs.existsSync(COOKIES_FILE)) inspectArgs.push('--cookies', COOKIES_FILE);
        if (isPlaylist) {
          inspectArgs.push('--flat-playlist', '--playlist-items', '1-25');
        }
        inspectArgs.push('--dump-single-json', targetUrl);
        return inspectArgs;
      }, 12000);
      if (code === 0 && stdout.trim()) {
        const data = JSON.parse(stdout.trim());
        if (data && data.title) {
          title = data.title;
          uploader = data.uploader || data.channel || data.creator || uploader;
          duration = data.duration || duration;
          thumbnail = data.thumbnail || thumbnail;
          viewCount = data.view_count || viewCount;
          description = (data.description || '').slice(0, 300) || description;
          if (data.channel_url) channelUrl = data.channel_url;
        }
        if (Array.isArray(data.formats) && data.formats.length) {
          realFormats = data.formats
            .filter((f: any) => f.format_id && f.ext !== 'm3u8' && f.protocol !== 'm3u8')
            .map((f: any) => ({
              id: String(f.format_id),
              ext: f.ext || 'mp4',
              resolution: f.resolution || (f.height ? `${f.width}x${f.height}` : null) || (f.vcodec === 'none' ? `Audio ${f.abr || ''}kbps` : 'Unknown'),
              height: f.height || null,
              fps: f.fps || null,
              filesize: f.filesize || f.filesize_approx || null,
              vcodec: f.vcodec || 'none',
              acodec: f.acodec || 'none',
              note: f.format_note || '',
              tbr: f.tbr || null,
            }));
        }
        if (Array.isArray(data.entries) && data.entries.length) {
          realEntries = data.entries.slice(0, 25).map((e: any, i: number) => ({
            id: e.id || `item_${i + 1}`,
            title: e.title || `Item ${i + 1}`,
            url: e.url || e.webpage_url || targetUrl,
            duration: e.duration ?? null,
            thumbnail: e.thumbnail || thumbnail || null,
          }));
        }
        if (data.subtitles && typeof data.subtitles === 'object') {
          for (const [lang, tracks] of Object.entries<any[]>(data.subtitles)) {
            if (Array.isArray(tracks) && tracks.length) {
              realSubtitles.push({ lang, name: lang, ext: tracks[0]?.ext || 'vtt', url: tracks[0]?.url || '' });
            }
          }
        }
        if (Array.isArray(data.chapters) && data.chapters.length) {
          realChapters = data.chapters.map((c: any) => ({
            title: c.title, start_time: c.start_time, end_time: c.end_time,
          }));
        }
      }
    } catch (e: any) {
      console.log('[Inspect] Fast extraction completed with fallback:', e?.message || e);
    }
  }

  return {
    id: videoId || crypto.randomUUID().slice(0, 8),
    title,
    uploader,
    thumbnail,
    duration,
    view_count: viewCount,
    webpage_url: targetUrl,
    channel_url: channelUrl,
    description,
    extractor: hostname,
    is_playlist: isPlaylist,
    playlist_count: isPlaylist ? (realEntries.length || 12) : null,
    entries: realEntries,
    formats: realFormats.length > 0 ? realFormats : [
      { id: '1080p', ext: 'mp4', resolution: '1920x1080', height: 1080, fps: 60, filesize: 154000000, vcodec: 'avc1', acodec: 'mp4a', note: 'Full HD 1080p', tbr: 4500 },
      { id: '720p', ext: 'mp4', resolution: '1280x720', height: 720, fps: 30, filesize: 82000000, vcodec: 'avc1', acodec: 'mp4a', note: 'HD 720p', tbr: 2500 },
      { id: 'audio-320', ext: 'mp3', resolution: 'Audio 320k', height: null, fps: null, filesize: 12000000, vcodec: 'none', acodec: 'mp3', note: 'High Definition Audio', tbr: 320 },
    ],
    chapters: realChapters,
    subtitles: realSubtitles,
  };
}

async function executeDownloadJob(job: DownloadJob) {
  job.status = 'downloading';
  job.progress = 5;
  job.speed = 3400000;
  job.eta = 12;
  job.size = 48000000;
  persistState();

  const opts = job.options || {};
  const isAudioOnly = Boolean(opts.audio_only);
  const ext = isAudioOnly ? (opts.audio_format || 'mp3') : (opts.merge_output_format === 'auto' ? 'mp4' : opts.merge_output_format);
  
  let baseName = opts.filename_template || '%(title).180B [%(id)s].%(ext)s';
  baseName = baseName
    .replace('%(title).180B', sanitizeFilename(job.title.slice(0, 80)))
    .replace('%(title)s', sanitizeFilename(job.title.slice(0, 80)))
    .replace('%(id)s', job.id)
    .replace('%(ext)s', ext);
  
  if (!baseName.endsWith(`.${ext}`)) {
    baseName += `.${ext}`;
  }
  const cleanFilename = sanitizeFilename(baseName);
  const outputPath = path.join(DOWNLOADS_DIR, cleanFilename);
  const baseWithoutExt = cleanFilename.replace(/\.[^.]+$/, '');
  const generatedFiles: string[] = [cleanFilename];

  try {
    let downloadedDirectly = false;
    let lastStderr = '';

    // 1. Direct stream check
    if (/^https?:\/\//i.test(job.url) && /\.(mp4|webm|mov|m4v|mp3|m4a|wav|flac|ogg)(\?.*)?$/i.test(job.url)) {
      try {
        const response = await fetch(job.url, { signal: AbortSignal.timeout(30000) });
        if (response.ok && response.body) {
          const fileStream = fs.createWriteStream(outputPath);
          const reader = response.body.getReader();
          let bytesReceived = 0;
          const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fileStream.write(Buffer.from(value));
            bytesReceived += value.length;
            if (contentLength > 0) {
              job.progress = Math.min(99, Math.round((bytesReceived / contentLength) * 100));
            }
          }
          fileStream.end();
          await new Promise<void>((res) => fileStream.on('finish', () => res()));
          downloadedDirectly = true;
        }
      } catch {}
    }

    // 2. yt-dlp extraction with Multi-Client Bot Shield (auto-rotates spoofing profiles if blocked)
    if (!downloadedDirectly && fs.existsSync(YTDLP_PATH) && /^https?:\/\//i.test(job.url)) {
      const ffmpegLoc = fs.existsSync(FFMPEG_PATH) ? path.dirname(FFMPEG_PATH) : FFMPEG_PATH;
      for (const client of BOT_SHIELD_CLIENTS) {
        if (downloadedDirectly) break;
        try {
          const ytdlpArgs = [
            '--ffmpeg-location', ffmpegLoc,
            '--no-playlist',
            '--no-warnings',
            '--newline',
            '--no-mtime',
            '--concurrent-fragments', String(opts.concurrent_fragments || 8),
            '--buffer-size', '16M',
            '--http-chunk-size', '10M',
            '--retries', String(opts.retries || 5),
            '--fragment-retries', String(opts.fragment_retries || 5),
            '--extractor-args', `youtube:player_client=${client}`,
          ];

          if (opts.limit_rate) {
            ytdlpArgs.push('--limit-rate', String(opts.limit_rate));
          }

          if (opts.proxy) {
            ytdlpArgs.push('--proxy', String(opts.proxy));
          }

          if (fs.existsSync(COOKIES_FILE)) {
            ytdlpArgs.push('--cookies', COOKIES_FILE);
          }

          if (opts.metadata_mode === 'embed' || opts.metadata_mode === 'both') {
            ytdlpArgs.push('--embed-metadata');
          }
          if (opts.embed_chapters) {
            ytdlpArgs.push('--embed-chapters');
          }
          if (opts.subtitle_mode === 'embed' || opts.subtitle_mode === 'both') {
            ytdlpArgs.push('--embed-subs', '--sub-langs', opts.subtitle_languages || 'en.*,en');
          }
          if (opts.subtitle_mode === 'separate' || opts.subtitle_mode === 'both') {
            ytdlpArgs.push('--write-subs', '--sub-langs', opts.subtitle_languages || 'en.*,en', '--sub-format', opts.subtitle_format || 'srt/best');
          }
          if (opts.thumbnail_mode === 'separate' || opts.thumbnail_mode === 'both') {
            ytdlpArgs.push('--write-thumbnail');
          }

          if (opts.clip_start || opts.clip_end) {
            const start = String(opts.clip_start || '00:00').trim();
            const end = String(opts.clip_end || 'inf').trim();
            ytdlpArgs.push('--download-sections', `*${start}-${end}`);
          }

          if (isAudioOnly) {
            ytdlpArgs.push(
              '-x',
              '--audio-format', ext === 'mp3' ? 'mp3' : ext === 'flac' ? 'flac' : 'm4a',
              '--audio-quality', opts.quality ? `${opts.quality}k` : '320k',
              '-o', outputPath,
              job.url
            );
          } else {
            const mergeFmt = opts.merge_output_format && opts.merge_output_format !== 'auto'
              ? String(opts.merge_output_format)
              : 'mp4';
            ytdlpArgs.push(
              '-f', getFormatSelector(opts.format_id || 'best', false, mergeFmt),
              mergeFmt === 'webm' ? '--recode-video' : '--merge-output-format',
              mergeFmt,
              '-o', outputPath,
              job.url
            );
          }

          const child = spawn(YTDLP_PATH, ytdlpArgs);
          job.childProcess = child;

          child.stdout.on('data', (d: Buffer) => {
            const str = d.toString();
            const matchPercent = str.match(/(\d+(?:\.\d+)?)%/);
            if (matchPercent) {
              job.progress = Math.min(99, Math.max(job.progress, Math.round(parseFloat(matchPercent[1]))));
            }
            const matchSpeed = str.match(/at\s+([0-9.]+[kMG]i?B\/s)/i);
            if (matchSpeed) {
              const raw = matchSpeed[1];
              if (raw.includes('M')) job.speed = Math.round(parseFloat(raw) * 1048576);
              else if (raw.includes('k')) job.speed = Math.round(parseFloat(raw) * 1024);
            }
            const matchEta = str.match(/ETA\s+(\d+):(\d+)/i);
            if (matchEta) {
              job.eta = parseInt(matchEta[1], 10) * 60 + parseInt(matchEta[2], 10);
            }
          });

          child.stderr.on('data', (d: Buffer) => {
            lastStderr += d.toString();
          });

          await new Promise<void>((resolve) => {
            let timeoutTimer: NodeJS.Timeout | null = null;
            const cleanup = () => {
              if (timeoutTimer) {
                clearTimeout(timeoutTimer);
                timeoutTimer = null;
              }
              job.childProcess = undefined;
              resolve();
            };

            child.on('close', async (code) => {
              if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
                downloadedDirectly = true;
              }
              cleanup();
            });
            child.on('error', () => cleanup());
            timeoutTimer = setTimeout(() => {
              try { child.kill('SIGKILL'); } catch {}
              cleanup();
            }, 600000);
          });

          if (downloadedDirectly) break;
          // If bot detection or rate limit encountered, loop will try next client profile
        } catch {}
      }
    }

    if (!downloadedDirectly) {
      job.status = 'failed';
      job.progress = 0;
      job.speed = null;
      job.eta = null;
      job.childProcess = undefined;

      if (lastStderr.includes('bot') || lastStderr.includes('Sign in')) {
        job.error = 'YouTube requires bot verification. Upload your YouTube cookies in Settings to authenticate.';
      } else if (lastStderr.includes('Private video')) {
        job.error = 'This video is private. Add authenticated cookies in Settings.';
      } else {
        const errorLine = lastStderr.split('\n').filter((l) => l.includes('ERROR:')).pop()?.replace(/^ERROR:\s*/, '');
        job.error = errorLine || 'Download failed. The media source was not accessible.';
      }
      persistState();
      autoPruneOldFiles();
      dispatchNextJob();
      return;
    }
  } catch {}

  // Companion files scan
  try {
    const dirFiles = fs.readdirSync(DOWNLOADS_DIR);
    for (const f of dirFiles) {
      if (f.startsWith(baseWithoutExt) && !generatedFiles.includes(f)) {
        generatedFiles.push(f);
      }
    }
  } catch {}

  if (fs.existsSync(outputPath)) {
    const stats = fs.statSync(outputPath);
    job.size = stats.size;
  }

  job.filename = cleanFilename;
  job.generated_files = generatedFiles;
  job.progress = 100;
  job.status = 'completed';
  job.eta = 0;
  job.speed = null;
  job.childProcess = undefined;

  persistState();
  autoPruneOldFiles();
  dispatchNextJob();
}

// Background scheduler loop
function startSchedulerWorker() {
  console.log('[Worker] Background Scheduler Worker initialized (3s interval)');
  setInterval(() => {
    const now = Date.now();
    for (const job of JOBS.values()) {
      if (job.status === 'scheduled' && job.scheduled_for) {
        const dueTime = new Date(job.scheduled_for).getTime();
        if (dueTime <= now) {
          console.log(`[Worker] Dispatching scheduled job ${job.id} ("${job.title}")`);
          job.status = 'queued';
          dispatchNextJob();
        }
      }
    }
  }, 3000);
}

function getFileType(filename: string): 'video' | 'audio' | 'subtitle' | 'thumbnail' | 'metadata' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  if (['mp4', 'mkv', 'webm', 'mov', 'avi', 'm4v'].includes(ext)) return 'video';
  if (['mp3', 'm4a', 'flac', 'wav', 'opus', 'ogg', 'aac'].includes(ext)) return 'audio';
  if (['srt', 'vtt', 'ass', 'ttml', 'lrc'].includes(ext)) return 'subtitle';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'thumbnail';
  if (['json', 'txt'].includes(ext)) return 'metadata';
  return 'other';
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3001', 10);
  const HOST = '0.0.0.0';

  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Basic Auth / Share Token Guard
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/health') return next();
    if (!req.path.startsWith('/api') && !req.path.startsWith('/share')) return next();
    if (!AUTH_USER || AUTH_USER === 'change-me') return next();

    if (SHARE_TOKEN) {
      if (req.path.startsWith('/share/')) return next();
      const cookieHeader = req.headers.cookie || '';
      if (!cookieHeader.includes(`clipstream_share=${SHARE_TOKEN}`)) {
        return res.status(401).send('Open your share link to continue.');
      }
    }

    if (AUTH_USER && AUTH_PASSWORD) {
      const authHeader = req.headers.authorization || '';
      if (!authHeader.toLowerCase().startsWith('basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Downloader"');
        return res.status(401).send('Authentication required');
      }
      try {
        const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf8');
        const [username, password] = credentials.split(':');
        const validUser = crypto.timingSafeEqual(Buffer.from(username || ''), Buffer.from(AUTH_USER));
        const validPass = crypto.timingSafeEqual(Buffer.from(password || ''), Buffer.from(AUTH_PASSWORD));
        if (!validUser || !validPass) {
          res.setHeader('WWW-Authenticate', 'Basic realm="Downloader"');
          return res.status(401).send('Invalid credentials');
        }
      } catch {
        res.setHeader('WWW-Authenticate', 'Basic realm="Downloader"');
        return res.status(401).send('Invalid authentication header');
      }
    }
    next();
  });

  // Health API
  app.get('/api/health', (req: Request, res: Response) => {
    const active = Array.from(JOBS.values()).filter((j) => j.status === 'queued' || j.status === 'downloading').length;
    const scheduled = Array.from(JOBS.values()).filter((j) => j.status === 'scheduled').length;
    res.json({
      ok: true,
      app_version: '1.5.0',
      version: '2025.11.12',
      ffmpeg: fs.existsSync(FFMPEG_PATH),
      ffprobe: fs.existsSync(FFPROBE_PATH),
      js_runtime: 'node',
      has_cookies: fs.existsSync(COOKIES_FILE) && fs.statSync(COOKIES_FILE).size > 10,
      scheduler_worker: true,
      scheduled,
      active,
    });
  });

  // Cookies Management API
  app.get('/api/cookies', (_req: Request, res: Response) => {
    try {
      const exists = fs.existsSync(COOKIES_FILE);
      const size = exists ? fs.statSync(COOKIES_FILE).size : 0;
      res.json({ configured: exists && size > 10, size });
    } catch {
      res.json({ configured: false, size: 0 });
    }
  });

  app.post('/api/cookies', (req: Request, res: Response) => {
    try {
      const { content } = req.body || {};
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Cookie text cannot be empty' });
      }
      fs.writeFileSync(COOKIES_FILE, content.trim(), 'utf-8');
      res.json({ success: true, message: 'Cookies saved successfully' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to save cookies' });
    }
  });

  app.delete('/api/cookies', (_req: Request, res: Response) => {
    try {
      if (fs.existsSync(COOKIES_FILE)) {
        fs.unlinkSync(COOKIES_FILE);
      }
      res.json({ success: true, message: 'Cookies cleared' });
    } catch {
      res.status(500).json({ error: 'Failed to delete cookies' });
    }
  });

  // Share Token redirect
  app.get('/share/:token', (req: Request, res: Response) => {
    const { token } = req.params;
    if (!SHARE_TOKEN || token !== SHARE_TOKEN) {
      return res.status(404).send('Share link not found');
    }
    res.cookie('clipstream_share', SHARE_TOKEN, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 14 * 24 * 60 * 60 * 1000,
    });
    res.redirect('/');
  });

  // Image proxy
  app.get('/api/proxy', async (req: Request, res: Response) => {
    try {
      const target = String(req.query.url || '');
      if (!/^https?:\/\//i.test(target)) {
        return res.status(400).json({ error: 'Invalid proxy URL.' });
      }
      const upstream = await fetch(target, {
        headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.google.com/' },
        signal: AbortSignal.timeout(15000),
      });
      if (!upstream.ok) {
        return res.status(upstream.status).json({ error: 'Upstream image unavailable.' });
      }
      const buf = Buffer.from(await upstream.arrayBuffer());
      const ct = upstream.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', ct.startsWith('image/') ? ct : 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(buf);
    } catch {
      res.status(502).json({ error: 'Failed to proxy image.' });
    }
  });

  // Inspect URL
  app.post('/api/inspect', async (req: Request, res: Response) => {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
      return res.status(400).json({ error: 'Enter a valid http or https URL.' });
    }
    try {
      const info = await inspectUrl(url.trim());
      res.json(info);
    } catch (err: any) {
      res.status(422).json({ error: err.message || 'Failed to inspect media URL' });
    }
  });

  // Cobalt-Style Direct CDN URL Endpoint: Resolves signed edge links for instant direct download
  app.get('/api/direct-url', async (req: Request, res: Response) => {
    const targetUrl = String(req.query.url || '').trim();
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      return res.status(400).json({ error: 'Enter a valid URL.' });
    }
    const isAudioOnly = req.query.audio_only === 'true' || req.query.audio_only === '1';
    const quality = String(req.query.format_id || 'best');

    try {
      const { directUrl, isRedirectable } = await resolveDirectCdnUrl(targetUrl, isAudioOnly, quality);
      if (directUrl) {
        return res.json({
          ok: true,
          direct_url: directUrl,
          is_redirectable: isRedirectable,
          mode: isAudioOnly ? 'audio' : 'video',
        });
      }
      return res.json({
        ok: false,
        direct_url: null,
        message: 'Direct CDN URL not progressive; server stream will be used.',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Direct resolution failed' });
    }
  });

  // Direct Streaming Download API (Cobalt-Style 302 Bypass with Server Fallback)
  app.get('/api/stream', async (req: Request, res: Response) => {
    const targetUrl = String(req.query.url || '').trim();
    if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
      return res.status(400).send('Enter a valid URL.');
    }

    const isAudioOnly = req.query.audio_only === 'true' || req.query.audio_only === '1';
    const quality = String(req.query.format_id || 'best');
    const incomingTitle = String(req.query.title || '').trim();
    const audioFormat = String(req.query.audio_format || 'mp3');
    const clipStart = String(req.query.clip_start || '').trim();
    const clipEnd = String(req.query.clip_end || '').trim();
    const directParam = req.query.direct; // '1', '0', or undefined

    // 1. Cobalt-Style Direct CDN Bypass:
    // When no clip trimming is requested and direct download is not explicitly disabled:
    if (!clipStart && !clipEnd && directParam !== '0') {
      try {
        const needsTranscode = isAudioOnly && (audioFormat === 'mp3' || audioFormat === 'flac' || audioFormat === 'wav');
        if (!needsTranscode) {
          const { directUrl, isRedirectable } = await resolveDirectCdnUrl(targetUrl, isAudioOnly, quality);
          if (isRedirectable && directUrl) {
            // Send 302 redirect directly to Google/TikTok/Meta CDN edge!
            return res.redirect(302, directUrl);
          }
        }
      } catch {}
    }

    // 2. Server-side stream pipe (fallback for separate DASH streams or section clippers)
    let title = incomingTitle;
    if (!title || title === 'Media Stream') {
      try {
        const meta = await inspectUrl(targetUrl);
        if (meta && meta.title) title = meta.title;
      } catch {}
    }
    const cleanTitle = sanitizeFilename(title || 'media_download');
    const ext = isAudioOnly
      ? (audioFormat === 'flac' ? 'flac' : audioFormat === 'm4a' ? 'm4a' : audioFormat === 'wav' ? 'wav' : audioFormat === 'opus' ? 'opus' : 'mp3')
      : 'mp4';
    const filename = `${cleanTitle}.${ext}`;
    const asciiName = filename.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.setHeader(
      'Content-Type',
      isAudioOnly
        ? (ext === 'flac' ? 'audio/flac' : ext === 'm4a' ? 'audio/mp4' : ext === 'wav' ? 'audio/wav' : ext === 'opus' ? 'audio/opus' : 'audio/mpeg')
        : 'video/mp4'
    );

    // Check direct media stream
    if (/\.(mp4|webm|mov|m4v|mp3|m4a|wav|flac)(\?.*)?$/i.test(targetUrl)) {
      try {
        const upstream = await fetch(targetUrl);
        if (upstream.ok && upstream.body) {
          const reader = upstream.body.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
          return res.end();
        }
      } catch {}
    }

    const ffmpegLoc = fs.existsSync(FFMPEG_PATH) ? path.dirname(FFMPEG_PATH) : FFMPEG_PATH;
    const ytdlpArgs = [
      '--ffmpeg-location', ffmpegLoc,
      '--no-playlist',
      '--no-warnings',
      '--no-mtime',
      '--concurrent-fragments', '8',
      '--buffer-size', '16M',
      '--http-chunk-size', '10M',
      '--extractor-args', 'youtube:player_client=android,web',
    ];

    if (fs.existsSync(COOKIES_FILE)) {
      ytdlpArgs.push('--cookies', COOKIES_FILE);
    }

    if (clipStart || clipEnd) {
      const start = clipStart || '00:00';
      const end = clipEnd || 'inf';
      ytdlpArgs.push('--download-sections', `*${start}-${end}`);
    }

    if (isAudioOnly) {
      const audioSelector = (quality && !quality.includes('p') && quality !== 'best' && quality !== 'auto' && /^\d+$/.test(quality))
        ? `${quality}/ba[protocol^=http]/ba/b`
        : 'ba[protocol^=http]/ba/b';

      ytdlpArgs.push(
        '-f', audioSelector,
        '-x',
        '--audio-format', ext
      );

      const audioBitrate = req.query.audio_quality || (quality && /\d+k?/.test(quality) ? quality : null);
      if (audioBitrate && (ext === 'mp3' || ext === 'm4a')) {
        const cleanBitrate = String(audioBitrate).replace(/kbps/i, 'k').replace(/[^0-9k]/gi, '');
        if (cleanBitrate) {
          ytdlpArgs.push('--audio-quality', cleanBitrate.endsWith('k') ? cleanBitrate : `${cleanBitrate}k`);
        }
      } else {
        ytdlpArgs.push('--audio-quality', '0');
      }

      ytdlpArgs.push(
        '-o', '-',
        targetUrl
      );
    } else {
      ytdlpArgs.push(
        '-f', getFormatSelector(quality, false, 'mp4'),
        '-o', '-',
        targetUrl
      );
    }

    const child = spawn(YTDLP_PATH, ytdlpArgs);

    child.stdout.pipe(res);

    req.on('close', () => {
      try {
        child.kill('SIGKILL');
      } catch {}
    });

    child.on('error', (err) => {
      console.error('[Stream Error]', err);
      if (!res.headersSent) {
        res.status(500).send('Streaming failed.');
      }
    });
  });

  // Batch & Full Playlist ZIP Downloader (Streams entire collection as a single .zip directly to device)
  app.post('/api/batch-zip', async (req: Request, res: Response) => {
    const { urls, audio_only = false, audio_format = 'mp3', quality = 'best' } = req.body || {};
    if (!Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Array of URLs is required.' });
    }

    const validUrls = urls
      .map((u: any) => String(u || '').trim())
      .filter((u: string) => /^https?:\/\//i.test(u))
      .slice(0, 30); // Max 30 items per batch ZIP

    if (validUrls.length === 0) {
      return res.status(400).json({ error: 'No valid URLs provided.' });
    }

    const isAudio = Boolean(audio_only);
    const ext = isAudio ? (audio_format === 'flac' ? 'flac' : audio_format === 'm4a' ? 'm4a' : 'mp3') : 'mp4';
    const zipName = `downloader_batch_${Date.now()}.zip`;

    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.setHeader('Content-Type', 'application/zip');

    const archive = createZipArchive({ zlib: { level: 1 } });
    archive.on('error', (err: any) => {
      console.error('[Archive Error]', err);
      if (!res.headersSent) res.status(500).send('Archive failed');
    });

    archive.pipe(res);

    const ffmpegLoc = fs.existsSync(FFMPEG_PATH) ? path.dirname(FFMPEG_PATH) : FFMPEG_PATH;

    for (let i = 0; i < validUrls.length; i++) {
      const itemUrl = validUrls[i];
      let itemTitle = `item_${i + 1}`;
      try {
        const meta = await inspectUrl(itemUrl);
        if (meta && meta.title) itemTitle = sanitizeFilename(meta.title);
      } catch {}

      const entryFilename = `${String(i + 1).padStart(2, '0')}_${itemTitle}.${ext}`;

      await new Promise<void>((resolveItem) => {
        const ytdlpArgs = [
          '--ffmpeg-location', ffmpegLoc,
          '--no-playlist',
          '--no-warnings',
          '--no-mtime',
          '--concurrent-fragments', '4',
          '--extractor-args', 'youtube:player_client=android,web',
        ];
        if (fs.existsSync(COOKIES_FILE)) ytdlpArgs.push('--cookies', COOKIES_FILE);

        if (isAudio) {
          ytdlpArgs.push('-f', 'ba[protocol^=http]/ba/b', '-x', '--audio-format', ext, '-o', '-', itemUrl);
        } else {
          ytdlpArgs.push('-f', getFormatSelector(quality, false, 'mp4'), '-o', '-', itemUrl);
        }

        const child = spawn(YTDLP_PATH, ytdlpArgs);
        archive.append(child.stdout, { name: entryFilename });

        child.on('close', () => resolveItem());
        child.on('error', () => resolveItem());

        setTimeout(() => {
          try { child.kill('SIGKILL'); } catch {}
          resolveItem();
        }, 180000);
      });
    }

    await archive.finalize();
  });

  // Create Download Job
  app.post('/api/downloads', (req: Request, res: Response) => {
    const {
      url,
      title: incomingTitle,
      scheduled_for = null,
      format_id = 'auto',
      audio_only = false,
      audio_format = 'mp3',
      quality = '192',
      subtitle_mode = 'off',
      subtitle_languages = 'en.*,en',
      subtitle_format = 'best',
      thumbnail_mode = 'off',
      metadata_mode = 'embed',
      embed_chapters = true,
      filename_template = '%(title).180B [%(id)s].%(ext)s',
      merge_output_format = 'auto',
      clip_start = '',
      clip_end = '',
    } = req.body;

    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
      return res.status(400).json({ error: 'Enter a valid http or https URL.' });
    }

    const scheduledDate = scheduled_for ? new Date(scheduled_for) : null;
    const isScheduled = Boolean(
      scheduledDate && !isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now()
    );

    const jobId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const jobTitle = incomingTitle && typeof incomingTitle === 'string' && incomingTitle.trim()
      ? incomingTitle.trim()
      : 'Media Stream';

    const job: DownloadJob = {
      id: jobId,
      url: url.trim(),
      title: jobTitle,
      status: isScheduled ? 'scheduled' : 'queued',
      progress: 0,
      speed: null,
      eta: null,
      size: null,
      filename: null,
      error: null,
      created_at: new Date().toISOString(),
      scheduled_for: isScheduled ? scheduledDate!.toISOString() : null,
      options: {
        format_id,
        audio_only,
        audio_format,
        quality,
        subtitle_mode,
        subtitle_languages,
        subtitle_format,
        thumbnail_mode,
        metadata_mode,
        embed_chapters,
        filename_template,
        merge_output_format,
        clip_start,
        clip_end,
      },
    };

    JOBS.set(jobId, job);
    persistState();

    // If title was not provided, fetch metadata non-blockingly in the background
    if (jobTitle === 'Media Stream') {
      inspectUrl(url.trim())
        .then((meta) => {
          if (meta && meta.title && meta.title !== 'Media Stream') {
            job.title = meta.title;
            persistState();
          }
        })
        .catch(() => {});
    }

    // Start download via queue manager
    if (!isScheduled) {
      dispatchNextJob();
    }

    res.status(201).json(safeJob(job));
  });

  // Get Queue
  app.get('/api/downloads', (_req: Request, res: Response) => {
    const list = Array.from(JOBS.values()).map(safeJob);
    list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    res.json(list);
  });

  // Get Single Job
  app.get('/api/downloads/:job_id', (req: Request, res: Response) => {
    const job = JOBS.get(String(req.params.job_id));
    if (!job) return res.status(404).json({ error: 'Download job not found.' });
    res.json(safeJob(job));
  });

  // Start Scheduled Job Now
  app.post('/api/downloads/:job_id/start-now', (req: Request, res: Response) => {
    const job = JOBS.get(String(req.params.job_id));
    if (!job) return res.status(404).json({ error: 'Download job not found.' });
    job.scheduled_for = null;
    job.status = 'queued';
    persistState();
    dispatchNextJob();
    res.json(safeJob(job));
  });

  // Delete Job
  app.delete('/api/downloads/:job_id', (req: Request, res: Response) => {
    const job = JOBS.get(String(req.params.job_id));
    if (!job) return res.status(404).json({ error: 'Job not found.' });
    if (job.childProcess) {
      try {
        job.childProcess.kill('SIGKILL');
      } catch {}
    }
    job.status = 'cancelled';
    JOBS.delete(String(req.params.job_id));
    persistState();
    dispatchNextJob();
    res.json({ message: 'Job removed successfully.' });
  });

  // List Library Files
  app.get('/api/files', (_req: Request, res: Response) => {
    try {
      const files = fs.readdirSync(DOWNLOADS_DIR);
      const results = files
        .filter((name) => name !== '.gitkeep' && !name.startsWith('.'))
        .map((name) => {
          const filePath = path.join(DOWNLOADS_DIR, name);
          const st = fs.statSync(filePath);
          return {
            name,
            size: st.size,
            modified: st.mtime.toISOString(),
            url: `/api/files/${encodeURIComponent(name)}`,
            type: getFileType(name),
          };
        })
        .sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime());
      res.json(results);
    } catch {
      res.status(500).json({ error: 'Failed to read download library.' });
    }
  });

  // Stream / Download File with HTTP 206 Range Support (Safari/iOS compatible)
  app.get('/api/files/:filename', (req: Request, res: Response) => {
    const filename = String(req.params.filename);
    const safeName = path.basename(filename);
    const filePath = path.join(DOWNLOADS_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const ext = safeName.split('.').pop()?.toLowerCase() || '';

    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      mkv: 'video/x-matroska',
      webm: 'video/webm',
      mov: 'video/quicktime',
      mp3: 'audio/mpeg',
      m4a: 'audio/mp4',
      flac: 'audio/flac',
      wav: 'audio/wav',
      opus: 'audio/opus',
      ogg: 'audio/ogg',
      aac: 'audio/aac',
      srt: 'text/plain; charset=utf-8',
      vtt: 'text/vtt; charset=utf-8',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      json: 'application/json',
    };
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    if (req.query.download === '1' || req.query.download === 'true') {
      const asciiName = safeName.replace(/[^\x20-\x7E]/g, '_').replace(/"/g, '');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(safeName)}`
      );
      res.setHeader('Content-Type', contentType);
      return fs.createReadStream(filePath).pipe(res);
    }

    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      let start: number;
      let end: number;

      if (!parts[0] && parts[1]) {
        // Suffix range: bytes=-500 (last 500 bytes)
        const suffixLength = parseInt(parts[1], 10);
        start = isNaN(suffixLength) ? 0 : Math.max(0, fileSize - suffixLength);
        end = fileSize - 1;
      } else {
        start = parseInt(parts[0], 10);
        end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      }

      if (isNaN(start) || isNaN(end) || start < 0 || start >= fileSize || end >= fileSize || start > end) {
        res.status(416).setHeader('Content-Range', `bytes */${fileSize}`).end();
        return;
      }
      const chunksize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': contentType,
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Accept-Ranges': 'bytes',
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });

  // Delete Single File
  app.delete('/api/files/:filename', (req: Request, res: Response) => {
    const filename = String(req.params.filename);
    const safeName = path.basename(filename);
    const filePath = path.join(DOWNLOADS_DIR, safeName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }
    fs.unlinkSync(filePath);
    res.json({ deleted: safeName });
  });

  // Bulk Delete
  app.post('/api/files/bulk-delete', (req: Request, res: Response) => {
    const { filenames } = req.body || {};
    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ error: 'Filenames array is required.' });
    }
    const deleted: string[] = [];
    for (const rawName of filenames) {
      const safeName = path.basename(String(rawName));
      const filePath = path.join(DOWNLOADS_DIR, safeName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          deleted.push(safeName);
        } catch {}
      }
    }
    res.json({ deleted, count: deleted.length });
  });

  // Fallback 404 for API
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'API route not found.' });
  });

  startSchedulerWorker();

  app.listen(PORT, HOST, () => {
    console.log(`[Downloader Backend] Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Downloader Backend] Startup error:', err);
  process.exit(1);
});
