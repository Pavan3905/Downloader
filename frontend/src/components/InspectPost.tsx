import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Link2,
  Sparkles,
  Download,
  Music,
  Video,
  ExternalLink,
  Loader2,
  Clipboard,
  ClipboardPaste,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Scissors,
  Archive,
  CheckSquare,
  Square,
  Zap,
  Play,
  FileText,
  SlidersHorizontal,
  Layers,
  Volume2,
  RefreshCw,
} from 'lucide-react';
import { MediaInfo, AdvancedSettings } from '../types';

interface InspectPostProps {
  onStartDownload?: (url: string, options: any) => Promise<void>;
  advancedSettings?: AdvancedSettings;
}

export const InspectPost: React.FC<InspectPostProps> = () => {
  // Input Modes: 'single' | 'batch'
  const [inputMode, setInputMode] = useState<'single' | 'batch'>('single');
  const [url, setUrl] = useState('');
  const [batchUrlsText, setBatchUrlsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadState, setDownloadState] = useState<'idle' | 'resolving' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaInfo | null>(null);

  // Download preferences
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState('best');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [container, setContainer] = useState<'auto' | 'mp4' | 'mkv' | 'webm'>('auto');
  const [showOptions, setShowOptions] = useState(false);
  const [showMatrix, setShowMatrix] = useState(false);
  const [pasted, setPasted] = useState(false);

  // In-App Preview Player
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Visual Timeline Clipper / Trimmer
  const [showClipper, setShowClipper] = useState(false);
  const [clipStartSec, setClipStartSec] = useState<number>(0);
  const [clipEndSec, setClipEndSec] = useState<number>(0);

  // Auto clipboard detection
  const [detectedClipboardUrl, setDetectedClipboardUrl] = useState<string | null>(null);

  // Playlist batch selection
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showPlaylistItems, setShowPlaylistItems] = useState(false);

  const totalDuration = media?.duration || 180;

  // Initialize trimmer bounds when media is loaded
  useEffect(() => {
    if (media?.duration) {
      setClipStartSec(0);
      setClipEndSec(media.duration);
    } else {
      setClipStartSec(0);
      setClipEndSec(180);
    }
  }, [media]);

  // Auto-select all playlist entries on inspection
  useEffect(() => {
    if (media?.entries && media.entries.length > 0) {
      setSelectedEntries(media.entries.map((e) => e.url));
      setShowPlaylistItems(true);
    } else {
      setSelectedEntries([]);
      setShowPlaylistItems(false);
    }
  }, [media]);

  // Check clipboard on window focus
  useEffect(() => {
    const checkClipboard = async () => {
      try {
        if (!navigator.clipboard?.readText) return;
        const text = await navigator.clipboard.readText();
        const trimmed = text ? text.trim() : '';
        if (
          trimmed &&
          /^https?:\/\//i.test(trimmed) &&
          trimmed !== url &&
          trimmed !== detectedClipboardUrl
        ) {
          setDetectedClipboardUrl(trimmed);
        }
      } catch {
        // Permissions or clipboard access denied
      }
    };

    window.addEventListener('focus', checkClipboard);
    return () => window.removeEventListener('focus', checkClipboard);
  }, [url, detectedClipboardUrl]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text ? text.trim() : '';
      if (trimmed) {
        setUrl(trimmed);
        setPasted(true);
        setTimeout(() => setPasted(false), 1500);
      }
    } catch {
      // clipboard access denied
    }
  };

  const handleInspect = useCallback(
    async (targetUrl?: string) => {
      const finalUrl = (targetUrl || url).trim();
      if (!finalUrl) return;

      if (!/^https?:\/\//i.test(finalUrl)) {
        setError('Please enter a valid HTTP or HTTPS link.');
        return;
      }

      setLoading(true);
      setError(null);
      setIsPreviewOpen(false);

      try {
        const res = await fetch('/api/inspect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: finalUrl }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to inspect link.');
        }

        const data: MediaInfo = await res.json();
        setMedia(data);
      } catch (err: any) {
        setError(err.message || 'Inspection failed. Check network or URL.');
      } finally {
        setLoading(false);
      }
    },
    [url]
  );

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleDownload = useCallback(
    (isAudioOverride?: boolean, qualityOverride?: string) => {
      const targetUrl = media ? media.webpage_url : url.trim();
      if (!targetUrl) return;

      const isAudio = isAudioOverride !== undefined ? isAudioOverride : mode === 'audio';
      const selectedFormat = qualityOverride || (isAudio ? 'best' : quality);
      const mediaTitle = media?.title || '';

      setDownloadState('resolving');

      const params = new URLSearchParams({
        url: targetUrl,
        title: mediaTitle,
        format_id: selectedFormat,
        audio_only: isAudio ? 'true' : 'false',
        audio_format: audioFormat,
      });

      // Apply section clipper if configured
      if (showClipper && (clipStartSec > 0 || (media?.duration && clipEndSec < media.duration))) {
        params.append('clip_start', formatSeconds(clipStartSec));
        params.append('clip_end', formatSeconds(clipEndSec));
      }

      const streamUrl = `/api/stream?${params.toString()}`;

      const link = document.createElement('a');
      link.href = streamUrl;
      link.setAttribute('download', '');
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
        setDownloadState('sent');
        setTimeout(() => setDownloadState('idle'), 2500);
      }, 900);

      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: `Direct download started: ${mediaTitle || 'Media file'}`,
        })
      );
    },
    [media, url, mode, quality, audioFormat, showClipper, clipStartSec, clipEndSec]
  );

  // Global Keyboard Paste & 1-Click Bookmarklet Listener
  useEffect(() => {
    const onGlobalPaste = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string; autoDownload?: boolean }>;
      const { url: newUrl, autoDownload } = customEvent.detail || {};
      if (newUrl && /^https?:\/\//i.test(newUrl)) {
        setUrl(newUrl);
        setInputMode('single');
        handleInspect(newUrl).then(() => {
          if (autoDownload) {
            setTimeout(() => {
              handleDownload();
            }, 600);
          }
        });
      }
    };
    window.addEventListener('app:global-paste', onGlobalPaste);
    return () => window.removeEventListener('app:global-paste', onGlobalPaste);
  }, [handleInspect, handleDownload]);

  // Playlist & Batch ZIP Downloader (1-Click ZIP Stream)
  const handleBatchZipDownload = async (customUrls?: string[]) => {
    const urlsToDownload =
      customUrls && customUrls.length > 0
        ? customUrls
        : selectedEntries.length > 0
        ? selectedEntries
        : media?.entries && media.entries.length > 0
        ? media.entries.map((e) => e.url)
        : [media ? media.webpage_url : url.trim()];

    if (urlsToDownload.length === 0) return;

    setDownloadingZip(true);
    window.dispatchEvent(
      new CustomEvent('app:toast', {
        detail: `Bundling ${urlsToDownload.length} items into a direct .ZIP stream...`,
      })
    );

    try {
      const res = await fetch('/api/batch-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: urlsToDownload,
          audio_only: mode === 'audio',
          audio_format: audioFormat,
          quality,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to create batch ZIP stream.');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      const cleanTitle = (media?.title || 'batch').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
      link.download = `downloader_${cleanTitle}_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
        if (link.parentNode) link.parentNode.removeChild(link);
      }, 2000);

      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: `Batch ZIP download ready!`,
        })
      );
    } catch (err: any) {
      setError(err.message || 'Batch ZIP download failed.');
    } finally {
      setDownloadingZip(false);
    }
  };

  // Parse multi-line URLs in Batch Input Mode
  const parsedBatchUrls = useMemo(() => {
    return batchUrlsText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => /^https?:\/\//i.test(l));
  }, [batchUrlsText]);

  // Subtitle 1-Click Extractor
  const handleDownloadSubtitle = (sub: { lang: string; ext: string; url?: string }) => {
    if (sub.url) {
      const link = document.createElement('a');
      link.href = `/api/proxy?url=${encodeURIComponent(sub.url)}`;
      link.download = `${(media?.title || 'subtitle').replace(/[^a-zA-Z0-9_-]/g, '_')}_${sub.lang}.${sub.ext}`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => link.remove(), 1000);
      window.dispatchEvent(new CustomEvent('app:toast', { detail: `Downloaded ${sub.lang.toUpperCase()} subtitles!` }));
    } else {
      window.dispatchEvent(new CustomEvent('app:toast', { detail: `Subtitle stream URL unavailable` }));
    }
  };

  // Smart Platform Detection Badge & Theming
  const getPlatformDetails = () => {
    const rawUrl = (url || media?.webpage_url || '').toLowerCase();
    const ext = (media?.extractor || '').toLowerCase();

    if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be') || ext.includes('youtube')) {
      return {
        name: 'YouTube',
        badge: '4K Ultra HD',
        bg: 'bg-red-500/10 text-red-400 border-red-500/20',
        dot: 'bg-red-500',
        cardBorder: 'border-red-500/30 shadow-[0_0_50px_-15px_rgba(239,68,68,0.2)]',
        accent: 'text-red-400',
      };
    }
    if (rawUrl.includes('instagram.com') || ext.includes('instagram')) {
      return {
        name: 'Instagram',
        badge: 'Reels 1080p HD',
        bg: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        dot: 'bg-pink-500',
        cardBorder: 'border-pink-500/30 shadow-[0_0_50px_-15px_rgba(236,72,153,0.2)]',
        accent: 'text-pink-400',
      };
    }
    if (rawUrl.includes('snapchat.com') || ext.includes('snapchat')) {
      return {
        name: 'Snapchat',
        badge: 'Spotlight & Stories',
        bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        dot: 'bg-yellow-400',
        cardBorder: 'border-yellow-500/30 shadow-[0_0_50px_-15px_rgba(234,179,8,0.2)]',
        accent: 'text-yellow-400',
      };
    }
    if (rawUrl.includes('tiktok.com') || ext.includes('tiktok')) {
      return {
        name: 'TikTok',
        badge: 'HD (No Watermark)',
        bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        dot: 'bg-cyan-400',
        cardBorder: 'border-cyan-500/30 shadow-[0_0_50px_-15px_rgba(6,182,212,0.2)]',
        accent: 'text-cyan-400',
      };
    }
    if (rawUrl.includes('twitter.com') || rawUrl.includes('x.com') || ext.includes('twitter')) {
      return {
        name: 'X (Twitter)',
        badge: 'Direct Edge MP4',
        bg: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
        dot: 'bg-slate-300',
        cardBorder: 'border-slate-500/30 shadow-[0_0_50px_-15px_rgba(148,163,184,0.2)]',
        accent: 'text-slate-300',
      };
    }
    if (rawUrl.includes('soundcloud.com') || ext.includes('soundcloud')) {
      return {
        name: 'SoundCloud',
        badge: '320kbps Lossless',
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        dot: 'bg-amber-400',
        cardBorder: 'border-amber-500/30 shadow-[0_0_50px_-15px_rgba(245,158,11,0.2)]',
        accent: 'text-amber-400',
      };
    }
    if (rawUrl.includes('reddit.com') || rawUrl.includes('v.redd.it') || ext.includes('reddit')) {
      return {
        name: 'Reddit',
        badge: 'Merged Audio+Video',
        bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        dot: 'bg-orange-500',
        cardBorder: 'border-orange-500/30 shadow-[0_0_50px_-15px_rgba(249,115,22,0.2)]',
        accent: 'text-orange-400',
      };
    }
    if (rawUrl.includes('vimeo.com') || ext.includes('vimeo')) {
      return {
        name: 'Vimeo',
        badge: 'Full 1080p 60fps',
        bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        dot: 'bg-blue-400',
        cardBorder: 'border-blue-500/30 shadow-[0_0_50px_-15px_rgba(59,130,246,0.2)]',
        accent: 'text-blue-400',
      };
    }
    if (/^https?:\/\//i.test(rawUrl)) {
      return {
        name: 'Direct CDN',
        badge: 'Edge Stream Bypass',
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-400',
        cardBorder: 'border-emerald-500/30 shadow-[0_0_50px_-15px_rgba(16,185,129,0.2)]',
        accent: 'text-emerald-400',
      };
    }
    return null;
  };

  const platform = getPlatformDetails();

  // Distinct Video Streams for Format Matrix
  const distinctFormats = useMemo(() => {
    if (!media?.formats || media.formats.length === 0) return [];
    const seen = new Set<string>();
    return media.formats
      .filter((f) => {
        if (!f.height && f.vcodec === 'none') return false;
        const key = `${f.height || 'audio'}_${f.vcodec}_${f.ext}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (b.height || 0) - (a.height || 0))
      .slice(0, 8);
  }, [media]);

  return (
    <div id="downloader-section" className="space-y-4">
      {/* Top Smart Utility Row: Mode Selector and Platform Badge */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          {/* Single vs Batch Mode Switcher */}
          <div className="flex p-0.5 bg-zinc-900 border border-zinc-800 rounded-lg text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setInputMode('single')}
              className={`px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                inputMode === 'single'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Single Link
            </button>
            <button
              type="button"
              onClick={() => setInputMode('batch')}
              className={`px-2.5 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${
                inputMode === 'batch'
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Layers className="w-3 h-3 text-amber-400" />
              <span>Batch (ZIP)</span>
            </button>
          </div>

          {inputMode === 'single' && platform && (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition-all ${platform.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${platform.dot}`} />
              <span>{platform.name}</span>
              <span className="opacity-50">·</span>
              <span className="opacity-90">{platform.badge}</span>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Clipboard Detection Pill Banner */}
      {inputMode === 'single' && detectedClipboardUrl && (
        <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-emerald-500/30 text-xs flex items-center justify-between shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 truncate pr-2">
            <ClipboardPaste className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate text-zinc-400">
              Copied link detected:{' '}
              <span className="text-zinc-200 font-mono text-[11px]">{detectedClipboardUrl}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setUrl(detectedClipboardUrl);
                handleInspect(detectedClipboardUrl);
                setDetectedClipboardUrl(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-[11px] transition-all cursor-pointer shadow-sm active:scale-95"
            >
              Paste & Inspect
            </button>
            <button
              type="button"
              onClick={() => setDetectedClipboardUrl(null)}
              className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Dismiss"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area: Single Link Mode vs Batch Mode */}
      {inputMode === 'single' ? (
        <div className="relative">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleInspect();
            }}
            className="relative flex items-center omnibar-glow rounded-2xl transition-all"
          >
            {/* Dynamic Platform / Link Icon */}
            <div className="pl-4 text-zinc-400 shrink-0">
              {platform?.name === 'YouTube' ? (
                <Video className="w-4 h-4 text-red-500" />
              ) : platform?.name === 'Instagram' ? (
                <Video className="w-4 h-4 text-pink-500" />
              ) : platform?.name === 'Snapchat' ? (
                <Zap className="w-4 h-4 text-yellow-400" />
              ) : platform?.name === 'TikTok' ? (
                <Music className="w-4 h-4 text-cyan-400" />
              ) : platform?.name === 'SoundCloud' ? (
                <Volume2 className="w-4 h-4 text-amber-400" />
              ) : (
                <Link2 className="w-4 h-4 text-emerald-400" />
              )}
            </div>

            <input
              type="url"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (media && e.target.value !== media.webpage_url) {
                  setMedia(null);
                }
              }}
              placeholder="Paste any YouTube, Instagram, Snapchat, TikTok, or video link..."
              className="w-full h-14 pl-3.5 pr-32 bg-transparent text-sm sm:text-base text-zinc-100 placeholder-zinc-500 focus:outline-none"
            />

            <div className="absolute right-2.5 flex items-center gap-1.5">
              {/* Clear button when URL is typed */}
              {url && (
                <button
                  type="button"
                  onClick={() => {
                    setUrl('');
                    setMedia(null);
                  }}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Minimalist Aesthetic Paste Button */}
              {!url && (
                <button
                  type="button"
                  onClick={handlePaste}
                  className="omnibar-paste-btn h-8 px-2.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all duration-150 active:scale-95 cursor-pointer select-none group"
                  title="Paste from clipboard"
                >
                  {pasted ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.2]" />
                      <span className="text-[11px] font-medium text-emerald-400">Pasted</span>
                    </>
                  ) : (
                    <>
                      <Clipboard className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-200 transition-colors stroke-[2]" />
                      <span className="text-[11px] font-medium text-zinc-300 group-hover:text-white transition-colors">
                        Paste
                      </span>
                    </>
                  )}
                </button>
              )}

              {/* Inspect Action */}
              {url && (
                <button
                  type="submit"
                  disabled={loading}
                  className="h-9 px-3.5 rounded-xl btn-emerald-glow text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-md"
                >
                  {loading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5" />
                  )}
                  <span>Inspect</span>
                  <kbd className="hidden sm:inline font-mono text-[10px] opacity-75 bg-black/20 px-1 py-0.2 rounded">↵</kbd>
                </button>
              )}
            </div>
          </form>

          {/* Quick Instant Action Buttons (When URL is pasted but not yet inspected) */}
          {url && !media && !loading && (
            <div className="flex items-center justify-end gap-2 mt-2.5 px-1 animate-in fade-in duration-200">
              <button
                type="button"
                onClick={() => handleDownload(false)}
                className="text-xs font-medium px-3.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Video className="w-3.5 h-3.5 text-sky-400" />
                <span>Instant Video</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownload(true)}
                className="text-xs font-medium px-3.5 py-1.5 rounded-xl bg-zinc-900/90 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <Music className="w-3.5 h-3.5 text-emerald-400" />
                <span>Instant Audio</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Batch Multi-URL Mode */
        <div className="glass-card rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 backdrop-blur-md animate-in fade-in">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              <span className="font-semibold text-zinc-200">Batch Link Processor</span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono text-[11px] font-semibold">
              {parsedBatchUrls.length} links ready
            </span>
          </div>

          <textarea
            value={batchUrlsText}
            onChange={(e) => setBatchUrlsText(e.target.value)}
            rows={4}
            placeholder={`https://www.youtube.com/watch?v=...\nhttps://www.instagram.com/reel/...\nhttps://www.tiktok.com/@user/video/...`}
            className="w-full p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500/50 resize-none leading-relaxed"
          />

          <div className="flex items-center justify-between pt-1">
            <div className="flex p-0.5 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
              <button
                type="button"
                onClick={() => setMode('video')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  mode === 'video' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-sky-400" />
                <span>Video (.MP4)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('audio')}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                  mode === 'audio' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Music className="w-3.5 h-3.5 text-emerald-400" />
                <span>Audio (.MP3)</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleBatchZipDownload(parsedBatchUrls)}
              disabled={downloadingZip || parsedBatchUrls.length === 0}
              className="btn-amber-glow px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg active:scale-95 disabled:opacity-50"
            >
              {downloadingZip ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Archive className="w-4 h-4" />
              )}
              <span>Stream All as .ZIP</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-900/50 text-rose-300 text-xs flex items-center justify-between animate-in fade-in">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200 text-xs ml-3 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}


      {/* Clean Inspected Media Preview Card */}
      {inputMode === 'single' && media && (
        <div
          className={`glass-card rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xl relative overflow-hidden transition-all duration-300 ${
            platform?.cardBorder || 'border-zinc-800'
          }`}
        >
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Thumbnail / In-App Video Preview Player */}
            <div className="relative aspect-video sm:w-56 rounded-xl overflow-hidden bg-zinc-950 shrink-0 border border-zinc-800 group shadow-md">
              {isPreviewOpen ? (
                <div className="relative w-full h-full flex flex-col justify-center bg-black">
                  <video
                    controls
                    autoPlay
                    src={`/api/stream?url=${encodeURIComponent(media.webpage_url)}&direct=1`}
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(false)}
                    className="absolute top-2 right-2 p-1.5 rounded-md bg-black/80 text-zinc-300 hover:text-white text-xs cursor-pointer shadow-md z-10"
                    title="Close Preview"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  {media.thumbnail ? (
                    <img
                      src={`/api/proxy?url=${encodeURIComponent(media.thumbnail)}`}
                      alt={media.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <Video className="w-8 h-8" />
                    </div>
                  )}

                  {/* Platform Corner Tag */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[10px] font-semibold text-white border border-white/10 flex items-center gap-1.5 shadow-sm">
                    <span className={`w-1.5 h-1.5 rounded-full ${platform?.dot || 'bg-emerald-400'}`} />
                    <span>{platform?.name || 'Media'}</span>
                  </div>

                  {/* Play Preview Overlay Button */}
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    className="absolute inset-0 m-auto w-11 h-11 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-xl transition-all hover:scale-110 active:scale-95 cursor-pointer"
                    title="Watch Preview in Browser"
                  >
                    <Play className="w-4 h-4 fill-white ml-0.5" />
                  </button>

                  <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] font-mono text-white border border-white/10">
                    {formatSeconds(media.duration || 0)}
                  </div>
                </>
              )}
            </div>

            {/* Metadata Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="font-semibold text-zinc-300 capitalize">{media.extractor}</span>
                  <span>·</span>
                  <span className="truncate text-zinc-400 font-medium">{media.uploader}</span>
                </div>
                <h2 className="text-sm sm:text-base font-bold text-zinc-100 leading-snug line-clamp-2 mt-1">
                  {media.title}
                </h2>
              </div>

              {/* Mode Toggle & Animated Download Action */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="flex p-0.5 bg-zinc-950 rounded-xl border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setMode('video')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      mode === 'video'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-sky-400" />
                    <span>Video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('audio')}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                      mode === 'audio'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Audio</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownload()}
                  disabled={downloadState === 'resolving'}
                  className={`ml-auto px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg disabled:opacity-75 ${
                    mode === 'video' ? 'btn-emerald-glow' : 'btn-amber-glow'
                  }`}
                >
                  {downloadState === 'resolving' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Resolving Fast CDN...</span>
                    </>
                  ) : downloadState === 'sent' ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Saved to Device!</span>
                    </>
                  ) : mode === 'video' ? (
                    <>
                      <Download className="w-4 h-4 stroke-[2.5]" />
                      <span>Download Video</span>
                    </>
                  ) : (
                    <>
                      <Music className="w-4 h-4 stroke-[2.5]" />
                      <span>Download MP3</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Quality Selector Pills & Utility Toggles */}
          <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 text-[11px]">Quality:</span>
              {mode === 'video' ? (
                <div className="flex items-center gap-1">
                  {[
                    { id: 'best', label: 'Best' },
                    { id: '1080', label: '1080p' },
                    { id: '720', label: '720p' },
                    { id: '480', label: '480p' },
                  ].map((q) => (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setQuality(q.id)}
                      className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                        quality === q.id
                          ? 'bg-zinc-800 text-white border border-zinc-700'
                          : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                      }`}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  {['mp3', 'm4a', 'flac'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setAudioFormat(fmt)}
                      className={`px-2 py-0.5 rounded-md text-[11px] uppercase font-medium transition-colors cursor-pointer ${
                        audioFormat === fmt
                          ? 'bg-zinc-800 text-white border border-zinc-700'
                          : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 ml-auto text-[11px]">
              {/* Toggle Timeline Scrubber */}
              <button
                type="button"
                onClick={() => setShowClipper(!showClipper)}
                className={`flex items-center gap-1 transition-colors cursor-pointer ${
                  showClipper ? 'text-amber-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Scissors className="w-3 h-3" />
                <span>Trimmer</span>
              </button>

              {/* Toggle Format Matrix */}
              <button
                type="button"
                onClick={() => setShowMatrix(!showMatrix)}
                className={`flex items-center gap-1 transition-colors cursor-pointer ${
                  showMatrix ? 'text-sky-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Formats Table</span>
              </button>

              {/* More Options */}
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <span>Options</span>
                {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>
          </div>

          {/* Visual Interactive Timeline Scrubber */}
          {showClipper && (
            <div className="p-3 bg-zinc-950/70 border border-amber-500/20 rounded-xl space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Interactive Section Trimmer:</span>
                </div>
                <div className="font-mono text-[11px] text-zinc-300">
                  {formatSeconds(clipStartSec)} — {formatSeconds(clipEndSec)} (
                  {formatSeconds(Math.max(0, clipEndSec - clipStartSec))})
                </div>
              </div>

              {/* Dual Range Controls */}
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-mono w-10">Start:</span>
                  <input
                    type="range"
                    min={0}
                    max={totalDuration}
                    value={clipStartSec}
                    onChange={(e) => {
                      const val = Math.min(Number(e.target.value), clipEndSec - 1);
                      setClipStartSec(val);
                    }}
                    className="w-full"
                  />
                  <span className="font-mono text-[11px] text-zinc-300 w-12 text-right">
                    {formatSeconds(clipStartSec)}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-mono w-10">End:</span>
                  <input
                    type="range"
                    min={0}
                    max={totalDuration}
                    value={clipEndSec}
                    onChange={(e) => {
                      const val = Math.max(Number(e.target.value), clipStartSec + 1);
                      setClipEndSec(val);
                    }}
                    className="w-full"
                  />
                  <span className="font-mono text-[11px] text-zinc-300 w-12 text-right">
                    {formatSeconds(clipEndSec)}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-zinc-900 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500 font-medium">Quick presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setClipStartSec(0);
                      setClipEndSec(Math.min(30, totalDuration));
                    }}
                    className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-[10px] text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    0:00 - 0:30 (Shorts)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setClipStartSec(0);
                      setClipEndSec(Math.min(60, totalDuration));
                    }}
                    className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 text-[10px] text-zinc-300 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    0:00 - 1:00
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setClipStartSec(0);
                    setClipEndSec(totalDuration);
                  }}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300 cursor-pointer"
                >
                  Reset Full Duration
                </button>
              </div>
            </div>
          )}

          {/* Transparent Format & Codec Breakdown Matrix */}
          {showMatrix && (
            <div className="p-3 bg-zinc-950/70 border border-zinc-800 rounded-xl space-y-2.5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs pb-1 border-b border-zinc-800/60">
                <span className="font-medium text-zinc-300 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3 h-3 text-sky-400" />
                  <span>Available Streams & Codec Matrix:</span>
                </span>
                <span className="text-[10px] text-zinc-500">1-Click Direct Download</span>
              </div>

              <div className="space-y-1.5 text-xs">
                {distinctFormats.map((f, i) => {
                  const sizeMB = f.filesize ? `${(f.filesize / 1048576).toFixed(1)} MB` : null;
                  return (
                    <div
                      key={f.id || i}
                      className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 border border-zinc-800/40 hover:bg-zinc-900 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-zinc-200">
                          {f.height ? `${f.height}p` : 'Audio'}
                        </span>
                        {f.fps && (
                          <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] font-mono text-zinc-400">
                            {f.fps}fps
                          </span>
                        )}
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {f.vcodec !== 'none' ? f.vcodec.split('.')[0] : f.acodec || f.ext}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {sizeMB && (
                          <span className="font-mono text-[11px] text-zinc-400">~{sizeMB}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownload(false, f.id)}
                          className="px-2.5 py-0.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition-colors cursor-pointer"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Subtitles & Closed Captions Extractor */}
          {media.subtitles && media.subtitles.length > 0 && (
            <div className="pt-2 border-t border-zinc-800/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-zinc-500 text-[11px] flex items-center gap-1">
                <FileText className="w-3 h-3 text-emerald-400" />
                <span>Subtitles (.VTT):</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {media.subtitles.slice(0, 6).map((sub) => (
                  <button
                    key={sub.lang}
                    type="button"
                    onClick={() => handleDownloadSubtitle(sub)}
                    className="px-2 py-0.5 rounded-md bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-emerald-500/50 hover:text-emerald-400 text-[10px] uppercase font-mono transition-colors cursor-pointer"
                    title={`Download ${sub.name} subtitles`}
                  >
                    {sub.lang}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Full Playlist & Batch ZIP Panel */}
          {media.entries && media.entries.length > 0 && (
            <div className="pt-3 border-t border-zinc-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-zinc-300 font-semibold">
                  <Archive className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Playlist Collection ({selectedEntries.length}/{media.entries.length} selected)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedEntries.length === media.entries.length) {
                        setSelectedEntries([]);
                      } else {
                        setSelectedEntries(media.entries.map((e) => e.url));
                      }
                    }}
                    className="text-[11px] text-zinc-400 hover:text-zinc-200 cursor-pointer"
                  >
                    {selectedEntries.length === media.entries.length ? 'Deselect All' : 'Select All'}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBatchZipDownload()}
                    disabled={downloadingZip || selectedEntries.length === 0}
                    className="px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {downloadingZip ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Archive className="w-3 h-3" />
                    )}
                    <span>Download All (.ZIP)</span>
                  </button>
                </div>
              </div>

              {/* Collapsible Playlist Items List */}
              {showPlaylistItems && (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {media.entries.map((item, idx) => {
                    const isSelected = selectedEntries.includes(item.url);
                    return (
                      <div
                        key={item.id || idx}
                        onClick={() => {
                          setSelectedEntries((prev) =>
                            isSelected ? prev.filter((u) => u !== item.url) : [...prev, item.url]
                          );
                        }}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border transition-colors cursor-pointer select-none ${
                          isSelected
                            ? 'bg-zinc-800/80 border-zinc-700/80 text-zinc-200'
                            : 'bg-zinc-950/40 border-zinc-800/40 text-zinc-500 hover:bg-zinc-900'
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        ) : (
                          <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                        )}
                        <span className="font-mono text-[10px] text-zinc-500 shrink-0">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        <span className="truncate flex-1 font-medium text-[11px]">{item.title}</span>
                        {item.duration && (
                          <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                            {formatSeconds(item.duration)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Collapsible Format & Advanced Options */}
          {showOptions && (
            <div className="pt-2 border-t border-zinc-800/40 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs animate-in fade-in duration-150">
              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Container</label>
                <select
                  value={container}
                  onChange={(e) => setContainer(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none"
                >
                  <option value="auto">Auto (Default)</option>
                  <option value="mp4">MP4</option>
                  <option value="mkv">MKV</option>
                  <option value="webm">WebM</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Source Link</label>
                <a
                  href={media.webpage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors w-full"
                >
                  <ExternalLink className="w-3 h-3 shrink-0" />
                  <span className="truncate">Open Origin</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
