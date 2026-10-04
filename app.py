from __future__ import annotations

import asyncio
import hmac
import os
import re
import shutil
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote

import yt_dlp
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, PlainTextResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent
DOWNLOADS = Path(os.getenv("CLIPSTREAM_DOWNLOAD_DIR", str(ROOT / "downloads"))).expanduser().resolve()
DOWNLOADS.mkdir(parents=True, exist_ok=True)
BIND_HOST = os.getenv("CLIPSTREAM_HOST", "127.0.0.1")
AUTH_USER = os.getenv("CLIPSTREAM_USERNAME", "")
AUTH_PASSWORD = os.getenv("CLIPSTREAM_PASSWORD", "")
SHARE_TOKEN = os.getenv("CLIPSTREAM_SHARE_TOKEN", "")
if bool(AUTH_USER) != bool(AUTH_PASSWORD):
    raise RuntimeError("Set both CLIPSTREAM_USERNAME and CLIPSTREAM_PASSWORD, or leave both unset.")
if BIND_HOST not in {"127.0.0.1", "localhost", "::1"} and not AUTH_USER:
    raise RuntimeError("A non-local bind requires CLIPSTREAM_USERNAME and CLIPSTREAM_PASSWORD.")
SYSTEM_FFMPEG = shutil.which("ffmpeg")
SYSTEM_FFPROBE = shutil.which("ffprobe")
if SYSTEM_FFMPEG and SYSTEM_FFPROBE and not os.getenv("CLIPSTREAM_FFMPEG_PATH"):
    FFMPEG, FFPROBE = SYSTEM_FFMPEG, SYSTEM_FFPROBE
else:
    from static_ffmpeg import run as static_ffmpeg_run
    BUNDLED_FFMPEG, BUNDLED_FFPROBE = static_ffmpeg_run.get_or_fetch_platform_executables_else_raise()
    FFMPEG = os.getenv("CLIPSTREAM_FFMPEG_PATH") or BUNDLED_FFMPEG
    FFPROBE = BUNDLED_FFPROBE
if shutil.which("deno"):
    JS_RUNTIME = "deno"
    YTDLP_RUNTIME = {"js_runtimes": {"deno": {}}}
elif shutil.which("node"):
    JS_RUNTIME = "node"
    YTDLP_RUNTIME = {"js_runtimes": {"node": {}}}
else:
    JS_RUNTIME = None
    YTDLP_RUNTIME = {}
MAX_WORKERS = max(1, min(4, int(os.getenv("CLIPSTREAM_DOWNLOAD_WORKERS", "2"))))

app = FastAPI(title="Downloader", version="1.4.0", description="A clean, fast downloader powered by yt-dlp")
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.mount("/static", StaticFiles(directory=ROOT / "static"), name="static")
POOL = ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="clipstream")
JOBS: dict[str, dict[str, Any]] = {}
LOCK = threading.RLock()


@app.middleware("http")
async def basic_auth(request: Request, call_next):
    if SHARE_TOKEN and request.url.path != "/api/health":
        if request.url.path.startswith("/share/"):
            return await call_next(request)
        if not hmac.compare_digest(request.cookies.get("clipstream_share", ""), SHARE_TOKEN):
            return PlainTextResponse("Open your Clipstream share link to continue.", status_code=401)
    if AUTH_USER and request.url.path != "/api/health":
        header = request.headers.get("authorization", "")
        valid = False
        if header.lower().startswith("basic "):
            import base64
            try:
                decoded = base64.b64decode(header.split(" ", 1)[1], validate=True).decode("utf-8")
                username, password = decoded.split(":", 1)
                valid = hmac.compare_digest(username, AUTH_USER) and hmac.compare_digest(password, AUTH_PASSWORD)
            except (ValueError, UnicodeDecodeError):
                pass
        if not valid:
            return PlainTextResponse("Authentication required", status_code=401, headers={"WWW-Authenticate": 'Basic realm="Clipstream"'})
    return await call_next(request)


class InspectRequest(BaseModel):
    url: str = Field(min_length=8, max_length=4000)


class DownloadRequest(BaseModel):
    url: str = Field(min_length=8, max_length=4000)
    # "auto" or a resolution ceiling such as "height:1080". We do not keep
    # expiring format IDs from inspection; yt-dlp chooses a fresh matching stream.
    format_id: str = "auto"
    audio_only: bool = False
    audio_format: str = "mp3"
    quality: str = "192"
    playlist: bool = False
    subtitle_mode: str = "off"  # off, separate, embed, both
    subtitle_languages: str = "en.*,en"
    subtitle_format: str = "best"
    thumbnail_mode: str = "off"  # off, separate, embed, both
    metadata_mode: str = "embed"  # off, separate, embed, both
    embed_chapters: bool = True
    filename_template: str = "%(title).180B [%(id)s].%(ext)s"
    merge_output_format: str = "auto"
    custom_format_selector: str = ""
    playlist_items: str = ""
    limit_rate: str = ""
    retries: int = Field(default=10, ge=0, le=100)
    fragment_retries: int = Field(default=10, ge=0, le=100)
    concurrent_fragments: int = Field(default=4, ge=1, le=16)
    socket_timeout: int = Field(default=30, ge=5, le=300)
    cookies_from_browser: str = ""
    proxy: str = ""


def valid_url(url: str) -> str:
    url = url.strip()
    if not re.match(r"^https?://", url, re.I):
        raise HTTPException(400, "Enter a valid http or https URL.")
    return url


def safe_info(info: dict[str, Any]) -> dict[str, Any]:
    formats = []
    for f in info.get("formats") or []:
        if not f.get("format_id"):
            continue
        formats.append({
            "id": str(f.get("format_id")), "ext": f.get("ext") or "?",
            "resolution": f.get("resolution") or (f"{f['height']}p" if f.get("height") else "Audio" if f.get("vcodec") == "none" else "—"),
            "height": f.get("height"), "fps": f.get("fps"), "filesize": f.get("filesize") or f.get("filesize_approx"),
            "vcodec": f.get("vcodec"), "acodec": f.get("acodec"), "note": f.get("format_note") or "",
            "tbr": f.get("tbr"),
        })
    return {
        "id": info.get("id"), "title": info.get("title") or "Untitled", "description": info.get("description") or "",
        "thumbnail": info.get("thumbnail"), "uploader": info.get("uploader") or info.get("channel") or "Unknown creator",
        "channel_url": info.get("channel_url"), "duration": info.get("duration"), "view_count": info.get("view_count"),
        "upload_date": info.get("upload_date"), "webpage_url": info.get("webpage_url"), "extractor": info.get("extractor_key"),
        "is_playlist": info.get("_type") in ("playlist", "multi_video"), "playlist_count": info.get("playlist_count"),
        "entries": [{"id": x.get("id"), "title": x.get("title"), "url": x.get("url") or x.get("webpage_url"), "duration": x.get("duration"), "thumbnail": x.get("thumbnails", [{}])[-1].get("url") if x.get("thumbnails") else None} for x in (info.get("entries") or [])[:100] if x],
        "formats": formats,
    }


def extract(url: str, flat: bool = False) -> dict[str, Any]:
    opts = {
        "quiet": True, "no_warnings": True, "skip_download": True, "ignoreconfig": True,
        "extract_flat": "in_playlist" if flat else False, "ignoreerrors": False,
        "noplaylist": not flat, "ffmpeg_location": FFMPEG, **YTDLP_RUNTIME,
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        return ydl.extract_info(url, download=False)


@app.get("/")
def home():
    return FileResponse(ROOT / "static" / "index.html")


@app.get("/share/{token}")
def open_share(token: str):
    if not SHARE_TOKEN or not hmac.compare_digest(token, SHARE_TOKEN):
        raise HTTPException(404, "Share link not found")
    response = RedirectResponse("/", status_code=303, headers={"Referrer-Policy": "no-referrer"})
    response.set_cookie("clipstream_share", SHARE_TOKEN, httponly=True, secure=True, samesite="strict", max_age=60 * 60 * 24 * 14)
    return response


@app.get("/api/health")
def health():
    return {"ok": True, "app_version": app.version, "version": yt_dlp.version.__version__, "ffmpeg": Path(FFMPEG).is_file(), "ffprobe": Path(FFPROBE).is_file(), "js_runtime": JS_RUNTIME, "active": sum(1 for j in JOBS.values() if j["status"] in ("queued", "downloading"))}


@app.post("/api/inspect")
async def inspect(req: InspectRequest):
    url = valid_url(req.url)
    try:
        info = await asyncio.to_thread(extract, url, True)
        return safe_info(info)
    except Exception as exc:
        raise HTTPException(422, str(exc)[:500]) from exc


@app.post("/api/downloads")
def create_download(req: DownloadRequest):
    url = valid_url(req.url)
    if req.audio_format not in {"mp3", "m4a", "wav", "flac", "opus"}:
        raise HTTPException(400, "Unsupported audio format.")
    if req.format_id not in {"auto", "best"} and not re.fullmatch(r"height:(?:[1-9]\d{0,3})", req.format_id):
        raise HTTPException(400, "Choose automatic quality or a listed resolution.")
    if req.custom_format_selector and len(req.custom_format_selector) > 300:
        raise HTTPException(400, "Custom format selector is too long.")
    if req.merge_output_format not in {"auto", "mp4", "mkv", "webm", "mov"}:
        raise HTTPException(400, "Unsupported output container.")
    if req.subtitle_mode not in {"off", "separate", "embed", "both"} or req.thumbnail_mode not in {"off", "separate", "embed", "both"} or req.metadata_mode not in {"off", "separate", "embed", "both"}:
        raise HTTPException(400, "Choose a valid asset delivery mode.")
    if req.audio_only and req.subtitle_mode in {"embed", "both"}:
        raise HTTPException(400, "Subtitles can only be embedded in video. Choose 'Separate file' for audio downloads.")
    template = req.filename_template.strip()
    if (not template or len(template) > 240 or Path(template).is_absolute()
            or any(x in template for x in ("/", "\\", "..", "\x00"))):
        raise HTTPException(400, "Filename template must be a filename only; folders and '..' are not allowed.")
    if not re.fullmatch(r"[\w %().\[\]{}@,+!'-]+", template, re.UNICODE):
        raise HTTPException(400, "Filename template contains unsupported characters.")
    req.filename_template = template
    if req.subtitle_format not in {"best", "srt", "vtt", "ass", "lrc", "ttml"}:
        raise HTTPException(400, "Unsupported subtitle format.")
    if req.limit_rate and not re.fullmatch(r"\d+(?:\.\d+)?(?:K|M|G)?", req.limit_rate, re.I):
        raise HTTPException(400, "Rate limit format example: 2M or 500K.")
    if req.playlist_items and (len(req.playlist_items) > 120 or not re.fullmatch(r"[0-9,:+\-]+", req.playlist_items)):
        raise HTTPException(400, "Playlist items must be a range such as 1:5 or 1,3,5.")
    if req.cookies_from_browser and req.cookies_from_browser not in {"chrome", "edge", "firefox", "brave", "opera", "vivaldi", "chromium", "safari"}:
        raise HTTPException(400, "Choose a supported browser for cookies.")
    if len(req.subtitle_languages) > 300:
        raise HTTPException(400, "Subtitle language list is too long.")
    if req.proxy:
        from urllib.parse import urlparse
        try:
            proxy = urlparse(req.proxy)
            valid_proxy = proxy.scheme in {"http", "https", "socks4", "socks4a", "socks5", "socks5h"} and bool(proxy.hostname)
        except ValueError:
            valid_proxy = False
        if not valid_proxy:
            raise HTTPException(400, "Proxy must be a valid HTTP(S) or SOCKS URL.")
    job_id = uuid.uuid4().hex[:12]
    job = {"id": job_id, "url": url, "title": "Preparing download", "status": "queued", "progress": 0, "speed": None, "eta": None, "size": None, "filename": None, "error": None, "created_at": datetime.now(timezone.utc).isoformat(), "cancel": threading.Event(), "options": req.model_dump()}
    with LOCK:
        JOBS[job_id] = job
    POOL.submit(run_download, job_id)
    return public_job(job)


def public_job(job: dict[str, Any]) -> dict[str, Any]:
    return {k: job.get(k) for k in ("id", "url", "title", "status", "progress", "speed", "eta", "size", "filename", "error", "created_at")}


def run_download(job_id: str):
    with LOCK:
        job = JOBS[job_id]
        if job["cancel"].is_set():
            job["status"] = "cancelled"
            return
        opts = job["options"]
        job["status"] = "downloading"

    def hook(d):
        if job["cancel"].is_set():
            raise yt_dlp.utils.DownloadCancelled("Cancelled by user")
        with LOCK:
            if d.get("status") == "downloading":
                total = d.get("total_bytes") or d.get("total_bytes_estimate")
                job.update(title=d.get("info_dict", {}).get("title") or job["title"], progress=round((d.get("downloaded_bytes", 0) / total) * 100, 1) if total else job["progress"], speed=d.get("speed"), eta=d.get("eta"), size=total)
                if d.get("filename"):
                    job["filename"] = Path(d["filename"]).name
            elif d.get("status") == "finished":
                job["progress"] = 100
                job["filename"] = Path(d.get("filename", "")).name or job["filename"]

    selector = "bestvideo*[format_note!*=?Premium]+bestaudio/best[format_note!*=?Premium]/bestvideo*+bestaudio/best"
    if opts.get("custom_format_selector"):
        selector = opts["custom_format_selector"]
    elif opts["format_id"].startswith("height:"):
        height = int(opts["format_id"].split(":", 1)[1])
        selector = f"bestvideo[height<={height}][format_note!*=?Premium]+bestaudio/best[height<={height}][format_note!*=?Premium]/best[height<={height}]/best"
    ydl_opts: dict[str, Any] = {
        "quiet": True, "no_warnings": True, "ignoreconfig": True, "noplaylist": not opts["playlist"],
        "ignoreerrors": False, "outtmpl": str(DOWNLOADS / opts["filename_template"]),
        "progress_hooks": [hook], "continuedl": True, "overwrites": False,
        "retries": opts["retries"], "fragment_retries": opts["fragment_retries"],
        "concurrent_fragment_downloads": opts["concurrent_fragments"], "socket_timeout": opts["socket_timeout"],
        "windowsfilenames": True,
        "writethumbnail": opts["thumbnail_mode"] in {"separate", "embed", "both"},
        "writeinfojson": opts["metadata_mode"] in {"separate", "both"},
        "writesubtitles": opts["subtitle_mode"] in {"separate", "embed", "both"},
        "writeautomaticsub": opts["subtitle_mode"] in {"separate", "embed", "both"},
        "subtitleslangs": [lang.strip() for lang in opts["subtitle_languages"].split(",") if lang.strip()][:20] or ["en.*", "en"],
        "subtitlesformat": opts["subtitle_format"],
        "ffmpeg_location": FFMPEG, **YTDLP_RUNTIME,
        "format": "bestaudio/best" if opts["audio_only"] else selector,
    }
    embed_subtitles = opts["subtitle_mode"] in {"embed", "both"} and not opts["audio_only"]
    target_container = opts["merge_output_format"]
    embed_thumbnail = opts["thumbnail_mode"] in {"embed", "both"}
    if (embed_subtitles or (embed_thumbnail and not opts["audio_only"])) and target_container == "auto":
        # MKV supports the widest range of codecs, subtitles, and thumbnail
        # attachments. WebM cannot store embedded cover art.
        target_container = "mkv"
    if target_container != "auto" and not opts["audio_only"]:
        ydl_opts["merge_output_format"] = target_container
    postprocessors: list[dict[str, Any]] = []
    if opts["audio_only"]:
        postprocessors.append({"key": "FFmpegExtractAudio", "preferredcodec": opts["audio_format"], "preferredquality": opts["quality"]})
    if embed_subtitles:
        if opts["subtitle_format"] == "best":
            ydl_opts["subtitlesformat"] = "vtt" if target_container == "webm" else "vtt/srt/best"
        if target_container != "auto":
            postprocessors.append({"key": "FFmpegVideoRemuxer", "preferedformat": target_container})
        postprocessors.append({
            "key": "FFmpegEmbedSubtitle",
            "already_have_subtitle": opts["subtitle_mode"] == "both",
        })
    if opts["metadata_mode"] in {"embed", "both"} or opts["embed_chapters"]:
        postprocessors.append({
            "key": "FFmpegMetadata",
            "add_metadata": opts["metadata_mode"] in {"embed", "both"},
            "add_chapters": opts["embed_chapters"],
        })
    if opts["playlist_items"]:
        ydl_opts["playlist_items"] = opts["playlist_items"]
    if opts["limit_rate"]:
        ydl_opts["ratelimit"] = opts["limit_rate"]
    if opts["cookies_from_browser"]:
        ydl_opts["cookiesfrombrowser"] = (opts["cookies_from_browser"], None, None, None)
    if opts["proxy"]:
        ydl_opts["proxy"] = opts["proxy"]
    if embed_thumbnail:
        # WebP thumbnails are valid MKV attachments but many desktop/mobile
        # players don't display them. Normalize to broadly supported JPEG.
        postprocessors.append({"key": "FFmpegThumbnailsConvertor", "format": "jpg", "when": "before_dl"})
        postprocessors.append({
            "key": "EmbedThumbnail",
            "already_have_thumbnail": opts["thumbnail_mode"] == "both",
        })
    if postprocessors:
        ydl_opts["postprocessors"] = postprocessors
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            result = ydl.extract_info(job["url"], download=True)
        with LOCK:
            job["title"] = (result or {}).get("title") or job["title"]
            job["status"] = "completed"
            job["progress"] = 100
            output = (result or {}).get("filepath") or (result or {}).get("_filename")
            if output and Path(output).is_file():
                job["filename"] = Path(output).name
            elif (result or {}).get("id"):
                found = next((p for p in DOWNLOADS.iterdir() if p.is_file() and f"[{result['id']}]" in p.name and p.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".json", ".part", ".vtt", ".srt"}), None)
                if found:
                    job["filename"] = found.name
    except yt_dlp.utils.DownloadCancelled:
        with LOCK:
            job["status"] = "cancelled"
    except Exception as exc:
        message = str(exc)
        if "Requested format is not available" in message:
            message = "The source did not expose a downloadable stream for that quality. Try automatic quality again; if it persists, update yt-dlp or check whether the source requires sign-in."
        with LOCK:
            job["status"] = "failed"
            job["error"] = message[:600]


@app.get("/api/downloads")
def list_downloads():
    with LOCK:
        return [public_job(j) for j in sorted(JOBS.values(), key=lambda x: x["created_at"], reverse=True)]


@app.get("/api/downloads/{job_id}")
def get_download(job_id: str):
    with LOCK:
        if job_id not in JOBS:
            raise HTTPException(404, "Download not found.")
        return public_job(JOBS[job_id])


@app.delete("/api/downloads/{job_id}")
def cancel_download(job_id: str):
    with LOCK:
        job = JOBS.get(job_id)
        if not job:
            raise HTTPException(404, "Download not found.")
        if job["status"] in ("queued", "downloading"):
            job["cancel"].set()
            if job["status"] == "queued":
                job["status"] = "cancelled"
        return public_job(job)


@app.get("/api/files")
def files():
    result = []
    for p in sorted(DOWNLOADS.iterdir(), key=lambda f: f.stat().st_mtime, reverse=True):
        if p.is_file() and p.name != ".gitkeep":
            st = p.stat()
            result.append({"name": p.name, "size": st.st_size, "modified": datetime.fromtimestamp(st.st_mtime, timezone.utc).isoformat(), "url": f"/api/files/{quote(p.name)}"})
    return result


@app.get("/api/files/{filename}")
def get_file(filename: str):
    path = (DOWNLOADS / filename).resolve()
    if path.parent != DOWNLOADS.resolve() or not path.is_file():
        raise HTTPException(404, "File not found.")
    return FileResponse(path, filename=path.name)


@app.delete("/api/files/{filename}")
def delete_file(filename: str):
    path = (DOWNLOADS / filename).resolve()
    if path.parent != DOWNLOADS.resolve() or not path.is_file():
        raise HTTPException(404, "File not found.")
    path.unlink()
    return {"deleted": filename}





