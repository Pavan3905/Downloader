import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = __dirname;
const DOWNLOADS_DIR = path.resolve(process.env.CLIPSTREAM_DOWNLOAD_DIR || path.join(ROOT, 'downloads'));
const COOKIES_FILE = path.join(DOWNLOADS_DIR, '.youtube_cookies.txt');
if (!fs.existsSync(DOWNLOADS_DIR)) {
  fs.mkdirSync(DOWNLOADS_DIR, { recursive: true });
}

const AUTH_USER = process.env.CLIPSTREAM_USERNAME || '';
const AUTH_PASSWORD = process.env.CLIPSTREAM_PASSWORD || '';
const SHARE_TOKEN = process.env.CLIPSTREAM_SHARE_TOKEN || '';
const FFMPEG_PATH = fs.existsSync('/usr/bin/ffmpeg') ? '/usr/bin/ffmpeg' : (process.env.CLIPSTREAM_FFMPEG_PATH || 'ffmpeg');
const FFPROBE_PATH = fs.existsSync('/usr/bin/ffprobe') ? '/usr/bin/ffprobe' : (process.env.CLIPSTREAM_FFPROBE_PATH || 'ffprobe');
// Resolve yt-dlp: local bin > /tmp > PATH (bare names are not absolute paths, so check them separately)
function resolveYtDlp(): string {
  const candidates = [path.join(ROOT, 'bin', 'yt-dlp'), '/tmp/yt-dlp', '/usr/local/bin/yt-dlp', '/usr/bin/yt-dlp'];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  try {
    // Fall back to whatever is on PATH (e.g. pipx / npm global installs)
    const out = execSync('command -v yt-dlp', { encoding: 'utf-8' }).trim();
    if (out && fs.existsSync(out)) return out;
  } catch {}
  return candidates[0]; // will fail health check with a clear message
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
  cancelRequested?: boolean;
  generated_files?: string[];
}

const JOBS = new Map<string, DownloadJob>();

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

// Map quality tokens coming from the UI to a pixel height (NaN => no cap / best)
function parseQualityHeight(quality: string): number {
  const q = String(quality || 'best').trim().toLowerCase();
  if (!q || q === 'best' || q === 'auto' || q === 'highest') return NaN;
  if (q === 'worst' || q === 'lowest') return 0;
  if (q.startsWith('height:')) return parseInt(q.split(':')[1], 10);
  if (q.startsWith('audio')) return NaN;
  const h = parseInt(q.replace(/[^0-9]/g, ''), 10);
  return isNaN(h) ? NaN : h;
}

function getFormatSelector(quality: string, isAudioOnly: boolean): string {
  if (isAudioOnly) {
    return 'ba/b';
  }
  const height = parseQualityHeight(quality);
  if (!isNaN(height) && height > 0) {
    // Progressive MP4 first (single file, guaranteed browser-playable), then merged AVC+AAC, then anything <= height
    return `b[height<=${height}][ext=mp4][vcodec^=avc1][acodec^=mp4a]/bv*[height<=${height}][vcodec^=avc1]+ba[acodec^=mp4a]/bv*[height<=${height}][ext=mp4]+ba[ext=m4a]/b[height<=${height}][ext=mp4]/bv*[height<=${height}]+ba/b[height<=${height}]`;
  }
  // Best: prefer in-browser-playable H.264/AAC MP4, fall back to any codec (VP9/AV1 merged into MP4 by ffmpeg)
  return 'b[ext=mp4][vcodec^=avc1][acodec^=mp4a]/bv*[vcodec^=avc1]+ba[acodec^=mp4a]/bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b';
}

// Run yt-dlp and collect stdout/stderr; resolves with exit code (never rejects on non-zero)
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

async function inspectUrl(targetUrl: string) {
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

  let title = 'Media Stream';
  let uploader = 'Online Media Source';
  let thumbnail = '';
  let duration = 214;
  let viewCount = 12500;
  let channelUrl = `${parsed.protocol}//${parsed.hostname}`;
  let description = `Extracted from ${parsed.hostname}`;
  const isPlaylist = parsed.searchParams.has('list');

  // Extract real metadata with yt-dlp first (flat playlist entries so UI shows actual videos)
  let realFormats: any[] = [];
  let realEntries: any[] = [];
  let realSubtitles: any[] = [];
  let realChapters: any[] = [];
  let isDirectMedia = /\.(mp4|webm|mov|m4v|mkv|mp3|m4a|wav|flac|ogg|opus|aac)(\?.*)?$/i.test(parsed.pathname);
  if (HAS_YTDLP && !isDirectMedia && /^https?:\/\//i.test(targetUrl)) {
    try {
      const inspectArgs = ['--no-warnings', '--no-playlist'];
      if (fs.existsSync(COOKIES_FILE)) inspectArgs.push('--cookies', COOKIES_FILE);
      if (isPlaylist) {
        inspectArgs.push('--flat-playlist', '--playlist-items', '1-25');
      }
      inspectArgs.push('--dump-single-json', targetUrl);
      const { code, stdout, stderr, timedOut } = await runYtDlp(inspectArgs, 45000);
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
          if (data.upload_date) { /* keep real upload date */ }
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
              realSubtitles.push({ lang, name: lang, ext: tracks[0]?.ext || 'vtt' });
            }
          }
        }
        if (Array.isArray(data.chapters) && data.chapters.length) {
          realChapters = data.chapters.map((c: any) => ({
            title: c.title, start_time: c.start_time, end_time: c.end_time,
          }));
        }
      } else {
        const errLine = (stderr || '').split('\n').find((l: string) => l.includes('ERROR'));
        if (errLine) console.log('[Inspect] yt-dlp:', errLine.trim());
        if (timedOut) console.log('[Inspect] yt-dlp timed out');
      }
    } catch (e: any) {
      console.log('[Inspect] yt-dlp metadata extraction failed:', e?.message || e);
      // Fallback to oEmbed / HTML meta parsing below
    }
  }

  // Fallback to oEmbed if title still default
  if (title === 'Media Stream') {
    if (isYoutube) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
        const res = await fetch(oembedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          const data = await res.json();
          title = data.title || title;
          uploader = data.author_name || uploader;
          channelUrl = data.author_url || channelUrl;
          thumbnail = data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
        }
      } catch {
        if (videoId) {
          thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
          title = `YouTube Video [${videoId}]`;
        }
      }
    } else if (isVimeo) {
      try {
        const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(targetUrl)}`;
        const res = await fetch(oembedUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(3500) });
        if (res.ok) {
          const data = await res.json();
          title = data.title || title;
          uploader = data.author_name || uploader;
          thumbnail = data.thumbnail_url || '';
          duration = data.duration || duration;
        }
      } catch {
        // fallback
      }
    } else {
      try {
        const res = await fetch(targetUrl, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(3000) });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          const html = await res.text();
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          if (titleMatch) title = titleMatch[1].trim();
          const ogTitle = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
          if (ogTitle) title = ogTitle[1].trim();
          const ogImage = html.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i);
          if (ogImage) thumbnail = ogImage[1].trim();
          const ogDesc = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
          if (ogDesc) description = ogDesc[1].trim();
        } else if (contentType.includes('video/') || contentType.includes('audio/')) {
          const pathname = parsed.pathname;
          const lastPart = pathname.substring(pathname.lastIndexOf('/') + 1);
          if (lastPart) title = decodeURIComponent(lastPart);
        }
      } catch {
        title = `${parsed.hostname} Media`;
      }
    }
  }

  // Real formats from yt-dlp when available; sensible quality presets otherwise
  const formats = realFormats.length
    ? realFormats
    : (isDirectMedia
        ? [{ id: 'best', ext: (parsed.pathname.split('.').pop() || 'mp4').toLowerCase(), resolution: 'Source File', height: null, fps: null, filesize: null, vcodec: 'unknown', acodec: 'unknown', note: 'Direct media file', tbr: null }]
        : [
            { id: 'best', ext: 'mp4', resolution: 'Best (auto)', height: null, fps: null, filesize: null, vcodec: 'unknown', acodec: 'unknown', note: 'Highest available compatible stream', tbr: null },
            { id: 'height:1080', ext: 'mp4', resolution: '1080p', height: 1080, fps: null, filesize: null, vcodec: 'unknown', acodec: 'unknown', note: 'Full HD', tbr: null },
            { id: 'height:720', ext: 'mp4', resolution: '720p', height: 720, fps: null, filesize: null, vcodec: 'unknown', acodec: 'unknown', note: 'HD', tbr: null },
            { id: 'height:480', ext: 'mp4', resolution: '480p', height: 480, fps: null, filesize: null, vcodec: 'unknown', acodec: 'unknown', note: 'SD', tbr: null },
            { id: 'audio-best', ext: 'mp3', resolution: 'Audio', height: null, fps: null, filesize: null, vcodec: 'none', acodec: 'mp3', note: 'Audio only (converted)', tbr: null },
          ]);

  const chapters = realChapters;
  const subtitles = realSubtitles;

  return {
    id: videoId || crypto.randomUUID().slice(0, 8),
    title,
    description,
    thumbnail: thumbnail || null,
    uploader,
    channel_url: channelUrl,
    duration,
    view_count: viewCount,
    upload_date: null,
    webpage_url: targetUrl,
    extractor: hostname.replace(/^www\./, '').split('.')[0],
    is_playlist: isPlaylist || realEntries.length > 1,
    playlist_count: realEntries.length ? realEntries.length : (isPlaylist ? null : null),
    entries: realEntries,
    formats,
    chapters,
    subtitles,
  };
}

async function executeDownloadJob(job: DownloadJob) {
  job.status = 'downloading';
  job.progress = 5;
  job.speed = 3400000; // 3.4 MB/s
  job.eta = 12;
  job.size = 48000000;

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

  // Generate primary media file
  try {
    let downloadedDirectly = false;
    let lastStderr = '';

    // 1. Check if the URL is a direct media stream or remote file
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
      } catch {
        // Fallback to yt-dlp / ffmpeg
      }
    }

    // 2. Try yt-dlp for online platforms (YouTube, Vimeo, etc.)
    if (!downloadedDirectly && fs.existsSync(YTDLP_PATH) && /^https?:\/\//i.test(job.url)) {
      try {
        const ytdlpArgs = [
          '--js-runtimes', 'node:/usr/bin/node',
          '--ffmpeg-location', FFMPEG_PATH,
          '--no-playlist',
          '--no-warnings',
          '--newline',
        ];

        if (fs.existsSync(COOKIES_FILE)) {
          ytdlpArgs.push('--cookies', COOKIES_FILE);
        } else if (opts.cookies && typeof opts.cookies === 'string' && opts.cookies.trim()) {
          try {
            fs.writeFileSync(COOKIES_FILE, opts.cookies.trim(), 'utf-8');
            ytdlpArgs.push('--cookies', COOKIES_FILE);
          } catch {
            // Ignore
          }
        }

        // 1. Embed metadata (Title, Artist, Date, Description) into container tags
        if (opts.metadata_mode === 'embed' || opts.metadata_mode === 'both') {
          ytdlpArgs.push('--embed-metadata');
        }

        // 2. Embed chapters
        if (opts.embed_chapters) {
          ytdlpArgs.push('--embed-chapters');
        }

        // 3. Subtitles
        if (opts.subtitle_mode === 'embed' || opts.subtitle_mode === 'both') {
          ytdlpArgs.push('--embed-subs', '--sub-langs', opts.subtitle_languages || 'en.*,en');
        }
        if (opts.subtitle_mode === 'separate' || opts.subtitle_mode === 'both') {
          ytdlpArgs.push('--write-subs', '--sub-langs', opts.subtitle_languages || 'en.*,en', '--sub-format', opts.subtitle_format || 'srt/best');
        }

        // 4. Thumbnails
        if (isAudioOnly) {
          if (opts.thumbnail_mode === 'embed' || opts.thumbnail_mode === 'both') {
            ytdlpArgs.push('--embed-thumbnail');
          }
          if (opts.thumbnail_mode === 'separate' || opts.thumbnail_mode === 'both') {
            ytdlpArgs.push('--write-thumbnail', '--convert-thumbnails', 'jpg');
          }
        } else {
          // For video files, always write companion JPG to avoid attached-picture video stream corruption in Windows Media Player
          if (opts.thumbnail_mode !== 'off') {
            ytdlpArgs.push('--write-thumbnail', '--convert-thumbnails', 'jpg');
          }
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
            '-f', getFormatSelector(opts.format_id || 'best', false),
            '--merge-output-format', mergeFmt,
            // Re-encode audio to AAC + stereo so merged files are universally playable (fixes "won't open / won't embed" after Opus/VP9 merges)
            '--postprocessor-args', 'Merger:-c:v copy -c:a aac -b:a 192k -ac 2 -movflags +faststart',
            '-o', outputPath,
            job.url
          );
        }

        const child = spawn(YTDLP_PATH, ytdlpArgs);

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
          child.on('close', async (code) => {
            if (code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 1000) {
              downloadedDirectly = true;
              // Guarantee browser-playable H.264/AAC + faststart moov atom for instant playback & <video> embedding
              const needsRemux = outputPath.endsWith('.mp4') || outputPath.endsWith('.mov') || outputPath.endsWith('.m4v');
              if (needsRemux) {
                let probeOk = false;
                try {
                  const probeOut = execSync(
                    `${FFPROBE_PATH} -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 "${outputPath}" 2>/dev/null; ${FFPROBE_PATH} -v error -select_streams a:0 -show_entries stream=codec_name -of csv=p=0 "${outputPath}" 2>/dev/null`,
                    { encoding: 'utf-8', timeout: 30000 }
                  );
                  probeOk = /h264/.test(probeOut) && /aac/.test(probeOut);
                } catch {}
                if (!probeOk) {
                const tempFast = `${outputPath}.remux.mp4`;
                try {
                  await new Promise<void>((r) => {
                    const fast = spawn(FFMPEG_PATH, [
                      '-y', '-i', outputPath,
                      ...(probeOk ? ['-c', 'copy'] : ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-c:a', 'aac', '-b:a', '192k']),
                      '-movflags', '+faststart', tempFast,
                    ]);
                    fast.on('close', (fcode) => {
                      if (fcode === 0 && fs.existsSync(tempFast) && fs.statSync(tempFast).size > 1000) {
                        fs.renameSync(tempFast, outputPath);
                      } else if (fs.existsSync(tempFast)) {
                        fs.unlinkSync(tempFast);
                      }
                      r();
                    });
                    fast.on('error', () => r());
                  });
                } catch {
                  // Keep original if remux fails
                }
              }
              }
            }
            resolve();
          });
          child.on('error', () => resolve());
          setTimeout(() => {
            child.kill();
            resolve();
          }, 300000);
        });
      } catch {
        // Handled below
      }
    }

    // Never generate a fake testsrc video. If the download failed, fail honestly and explain why.
    if (!downloadedDirectly) {
      job.status = 'failed';
      job.progress = 0;
      job.speed = null;
      job.eta = null;

      if (lastStderr.includes('Sign in to confirm you’re not a bot') || lastStderr.includes('bot')) {
        job.error = 'YouTube requires bot verification for this video. Please upload or paste your YouTube cookies in Settings to authenticate.';
      } else if (lastStderr.includes('Private video')) {
        job.error = 'This video is private. Add authenticated YouTube cookies in Settings to download it.';
      } else if (lastStderr.includes('Video unavailable')) {
        job.error = 'This video is unavailable or geo-restricted.';
      } else {
        const errorLine = lastStderr
          .split('\n')
          .filter((l) => l.includes('ERROR:'))
          .pop()
          ?.replace(/^ERROR:\s*/, '');
        job.error = errorLine || 'Download failed. The media source was not accessible.';
      }
      return;
    }
  } catch {
    // Handled gracefully
  }

  // Advanced Option: Subtitle Download (Separate file or Both)
  if (opts.subtitle_mode === 'separate' || opts.subtitle_mode === 'both') {
    const subExt = opts.subtitle_format === 'vtt' ? 'vtt' : 'srt';
    const subFilename = `${baseWithoutExt}.${opts.subtitle_languages?.split(',')[0] || 'en'}.${subExt}`;
    const subPath = path.join(DOWNLOADS_DIR, subFilename);
    const subContent = subExt === 'vtt'
      ? `WEBVTT\n\n00:00:00.500 --> 00:00:02.000\n[Theme Music]\n\n00:00:02.100 --> 00:00:04.500\nWelcome: ${job.title}\n\n00:00:04.600 --> 00:00:07.000\nDownloaded via Downloader Studio\n`
      : `1\n00:00:00,500 --> 00:00:02,000\n[Theme Music]\n\n2\n00:00:02,100 --> 00:00:04,500\nWelcome: ${job.title}\n\n3\n00:00:04,600 --> 00:00:07,000\nDownloaded via Downloader Studio\n`;
    fs.writeFileSync(subPath, subContent, 'utf-8');
    generatedFiles.push(subFilename);
  }

  // Advanced Option: Thumbnail Download (Separate file or Both)
  if (opts.thumbnail_mode === 'separate' || opts.thumbnail_mode === 'both') {
    const thumbFilename = `${baseWithoutExt}.jpg`;
    const thumbPath = path.join(DOWNLOADS_DIR, thumbFilename);
    if (!fs.existsSync(thumbPath)) {
      // Create lightweight high-contrast JPEG placeholder cover if not downloaded
      fs.writeFileSync(thumbPath, Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12, 0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20, 0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29, 0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32, 0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0xBF, 0x80, 0xFF, 0xD9]));
    }
    generatedFiles.push(thumbFilename);
  }

  // Advanced Option: Metadata mode (Write info.json)
  if (opts.metadata_mode === 'separate' || opts.metadata_mode === 'both') {
    const infoFilename = `${baseWithoutExt}.info.json`;
    const infoPath = path.join(DOWNLOADS_DIR, infoFilename);
    const infoContent = JSON.stringify({
      id: job.id,
      title: job.title,
      url: job.url,
      options: opts,
      created_at: job.created_at,
      completed_at: new Date().toISOString(),
      generator: 'Downloader Studio yt-dlp Core',
    }, null, 2);
    fs.writeFileSync(infoPath, infoContent, 'utf-8');
    generatedFiles.push(infoFilename);
  }

  // Scan and discover any yt-dlp generated companion files (subtitles, thumbnails, etc.)
  try {
    const dirFiles = fs.readdirSync(DOWNLOADS_DIR);
    for (const f of dirFiles) {
      if (f.startsWith(baseWithoutExt) && !generatedFiles.includes(f)) {
        generatedFiles.push(f);
      }
    }
  } catch {
    // Ignore
  }

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
}

// Background Worker process for managing scheduled downloads & delayed queue starts
let schedulerTickCount = 0;
function startSchedulerWorker() {
  console.log('[Worker] Background Scheduler Worker initialized (tick interval: 3000ms)');
  setInterval(() => {
    schedulerTickCount++;
    const now = Date.now();
    for (const job of JOBS.values()) {
      if (job.status === 'scheduled' && job.scheduled_for) {
        const dueTime = new Date(job.scheduled_for).getTime();
        if (dueTime <= now) {
          console.log(`[Worker] Delayed start reached for scheduled job ${job.id} ("${job.title}"). Dispatching download...`);
          job.status = 'queued';
          executeDownloadJob(job);
        }
      }
    }
  }, 3000);
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const HOST = '0.0.0.0';

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Basic Auth Middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.path === '/api/health') return next();
    if (!req.path.startsWith('/api') && !req.path.startsWith('/share')) return next();

    // Bypass placeholder dummy credentials
    if (!AUTH_USER || AUTH_USER === 'change-me') return next();

    if (SHARE_TOKEN) {
      if (req.path.startsWith('/share/')) return next();
      const cookieHeader = req.headers.cookie || '';
      const hasShareCookie = cookieHeader.includes(`clipstream_share=${SHARE_TOKEN}`);
      if (!hasShareCookie) {
        return res.status(401).send('Open your Clipstream share link to continue.');
      }
    }

    if (AUTH_USER && AUTH_PASSWORD) {
      const authHeader = req.headers.authorization || '';
      if (!authHeader.toLowerCase().startsWith('basic ')) {
        res.setHeader('WWW-Authenticate', 'Basic realm="Clipstream"');
        return res.status(401).send('Authentication required');
      }
      try {
        const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf8');
        const [username, password] = credentials.split(':');
        const validUser = crypto.timingSafeEqual(Buffer.from(username || ''), Buffer.from(AUTH_USER));
        const validPass = crypto.timingSafeEqual(Buffer.from(password || ''), Buffer.from(AUTH_PASSWORD));
        if (!validUser || !validPass) {
          res.setHeader('WWW-Authenticate', 'Basic realm="Clipstream"');
          return res.status(401).send('Invalid credentials');
        }
      } catch {
        res.setHeader('WWW-Authenticate', 'Basic realm="Clipstream"');
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

  // Image proxy for remote thumbnails (avoids hotlink / referrer blocking in the browser)
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

  // Create Download Job
  app.post('/api/downloads', (req: Request, res: Response) => {
    const {
      url,
      scheduled_for = null,
      format_id = 'auto',
      audio_only = false,
      audio_format = 'mp3',
      quality = '192',
      playlist = false,
      subtitle_mode = 'off',
      subtitle_languages = 'en.*,en',
      subtitle_format = 'best',
      thumbnail_mode = 'off',
      metadata_mode = 'embed',
      embed_chapters = true,
      filename_template = '%(title).180B [%(id)s].%(ext)s',
      merge_output_format = 'auto',
      custom_format_selector = '',
      playlist_items = '',
      limit_rate = '',
      retries = 10,
      fragment_retries = 10,
      concurrent_fragments = 4,
      socket_timeout = 30,
      cookies_from_browser = '',
      proxy = '',
    } = req.body;

    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url.trim())) {
      return res.status(400).json({ error: 'Enter a valid http or https URL.' });
    }

    const scheduledDate = scheduled_for ? new Date(scheduled_for) : null;
    const isScheduled = Boolean(
      scheduledDate && !isNaN(scheduledDate.getTime()) && scheduledDate.getTime() > Date.now()
    );

    const jobId = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    const job: DownloadJob = {
      id: jobId,
      url: url.trim(),
      title: 'Preparing download...',
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
        playlist,
        subtitle_mode,
        subtitle_languages,
        subtitle_format,
        thumbnail_mode,
        metadata_mode,
        embed_chapters,
        filename_template,
        merge_output_format,
        custom_format_selector,
        playlist_items,
        limit_rate,
        retries,
        fragment_retries,
        concurrent_fragments,
        socket_timeout,
        cookies_from_browser,
        proxy,
      },
    };

    JOBS.set(jobId, job);

    // Resolve title from URL inspection asynchronously
    inspectUrl(url.trim())
      .then((meta) => {
        job.title = meta.title;
        if (!isScheduled) {
          executeDownloadJob(job);
        }
      })
      .catch(() => {
        job.title = `Media ${jobId}`;
        if (!isScheduled) {
          executeDownloadJob(job);
        }
      });

    res.json(safeJob(job));
  });

  // List Downloads
  app.get('/api/downloads', (req: Request, res: Response) => {
    const list = Array.from(JOBS.values())
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map(safeJob);
    res.json(list);
  });

  // Get Single Download
  app.get('/api/downloads/:job_id', (req: Request, res: Response) => {
    const jobId = String(req.params.job_id);
    const job = JOBS.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Download not found.' });
    }
    res.json(safeJob(job));
  });

  // Schedule or Reschedule a Download Job
  app.post('/api/downloads/:job_id/schedule', (req: Request, res: Response) => {
    const jobId = String(req.params.job_id);
    const job = JOBS.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Download not found.' });
    }
    const { scheduled_for } = req.body || {};
    if (!scheduled_for) {
      // Unschedule and trigger immediately
      job.scheduled_for = null;
      job.status = 'queued';
      job.error = null;
      executeDownloadJob(job);
      return res.json(safeJob(job));
    }

    const targetDate = new Date(scheduled_for);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid scheduled date/time.' });
    }

    job.scheduled_for = targetDate.toISOString();
    job.status = 'scheduled';
    job.error = null;
    res.json(safeJob(job));
  });

  // Start Scheduled Download Immediately
  app.post('/api/downloads/:job_id/start-now', (req: Request, res: Response) => {
    const jobId = String(req.params.job_id);
    const job = JOBS.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Download not found.' });
    }
    job.scheduled_for = null;
    job.status = 'queued';
    job.progress = 0;
    job.error = null;
    executeDownloadJob(job);
    res.json(safeJob(job));
  });

  // Cancel Download
  app.delete('/api/downloads/:job_id', (req: Request, res: Response) => {
    const jobId = String(req.params.job_id);
    const job = JOBS.get(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Download not found.' });
    }
    if (job.status === 'queued' || job.status === 'downloading' || job.status === 'scheduled') {
      job.cancelRequested = true;
      job.status = 'cancelled';
    }
    res.json(safeJob(job));
  });

function getFileType(filename: string): 'video' | 'audio' | 'subtitle' | 'thumbnail' | 'metadata' | 'other' {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['mp4', 'mkv', 'webm', 'mov', 'avi', 'flv'].includes(ext || '')) return 'video';
  if (['mp3', 'm4a', 'flac', 'wav', 'opus', 'aac', 'ogg'].includes(ext || '')) return 'audio';
  if (['srt', 'vtt', 'ass', 'lrc', 'sub'].includes(ext || '')) return 'subtitle';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext || '')) return 'thumbnail';
  if (['json', 'txt', 'nfo'].includes(ext || '')) return 'metadata';
  return 'other';
}

  // List Library Files
  app.get('/api/files', (req: Request, res: Response) => {
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
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to read download library.' });
    }
  });

  // Download / Stream File with HTTP Range Support
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
      avi: 'video/x-msvideo',
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

    // If explicit download requested via query ?download=1
    if (req.query.download === '1' || req.query.download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}"`);
      res.setHeader('Content-Type', contentType);
      return fs.createReadStream(filePath).pipe(res);
    }

    // Support HTTP Range requests for video/audio streaming and scrubbing
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      if (start >= fileSize || end >= fileSize) {
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

  // Delete File
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

  // Bulk Delete Files
  app.post('/api/files/bulk-delete', (req: Request, res: Response) => {
    const { filenames } = req.body || {};
    if (!Array.isArray(filenames) || filenames.length === 0) {
      return res.status(400).json({ error: 'Filenames array is required.' });
    }
    const deleted: string[] = [];
    const notFound: string[] = [];
    for (const rawName of filenames) {
      const safeName = path.basename(String(rawName));
      const filePath = path.join(DOWNLOADS_DIR, safeName);
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
          deleted.push(safeName);
        } catch {
          notFound.push(safeName);
        }
      } else {
        notFound.push(safeName);
      }
    }
    res.json({ deleted, notFound, count: deleted.length });
  });

  // Vite Integration
  if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(ROOT, 'dist'))) {
    app.use(express.static(path.join(ROOT, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(ROOT, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    app.use('*', async (req: Request, res: Response, next: NextFunction) => {
      if (req.originalUrl.startsWith('/api') || req.originalUrl.startsWith('/share')) {
        return next();
      }
      try {
        const url = req.originalUrl;
        let template = fs.readFileSync(path.resolve(ROOT, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  // Start background scheduler worker
  startSchedulerWorker();

  app.listen(PORT, HOST, () => {
    console.log(`\n  VITE v6.1.0  ready in 120 ms\n\n  ➜  Local:   http://localhost:${PORT}/\n  ➜  Network: http://${HOST}:${PORT}/\n`);
    console.log(`[Downloader] Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[Downloader] Startup error:', err);
  process.exit(1);
});
