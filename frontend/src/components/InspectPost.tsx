import React, { useState, useEffect, useCallback } from 'react';
import {
  Link2,
  Sparkles,
  Download,
  Music,
  Video,
  ExternalLink,
  Loader2,
  ClipboardPaste,
  Check,
  ChevronDown,
  ChevronUp,
  X,
  Scissors,
  Bookmark,
  Archive,
  CheckSquare,
  Square,
  Zap,
} from 'lucide-react';
import { MediaInfo, AdvancedSettings } from '../types';

interface InspectPostProps {
  onStartDownload?: (url: string, options: any) => Promise<void>;
  advancedSettings?: AdvancedSettings;
}

export const InspectPost: React.FC<InspectPostProps> = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaInfo | null>(null);

  // Download preferences
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState('best');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [container, setContainer] = useState<'auto' | 'mp4' | 'mkv' | 'webm'>('auto');
  const [showOptions, setShowOptions] = useState(false);
  const [pasted, setPasted] = useState(false);

  // Video Section Clipper / Trimmer
  const [clipStart, setClipStart] = useState('');
  const [clipEnd, setClipEnd] = useState('');

  // Auto clipboard detection
  const [detectedClipboardUrl, setDetectedClipboardUrl] = useState<string | null>(null);

  // Bookmarklet modal
  const [showBookmarkletModal, setShowBookmarkletModal] = useState(false);

  // Playlist batch selection
  const [selectedEntries, setSelectedEntries] = useState<string[]>([]);
  const [showPlaylistItems, setShowPlaylistItems] = useState(false);

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
      if (text && /^https?:\/\//i.test(text.trim())) {
        setUrl(text.trim());
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

  const handleDownload = useCallback(
    (isAudioOverride?: boolean) => {
      const targetUrl = media ? media.webpage_url : url.trim();
      if (!targetUrl) return;

      const isAudio = isAudioOverride !== undefined ? isAudioOverride : mode === 'audio';
      const selectedFormat = isAudio ? 'best' : quality;
      const mediaTitle = media?.title || '';

      // Direct Cobalt-Style CDN bypass stream to device
      const params = new URLSearchParams({
        url: targetUrl,
        title: mediaTitle,
        format_id: selectedFormat,
        audio_only: isAudio ? 'true' : 'false',
        audio_format: audioFormat,
      });

      if (clipStart.trim()) params.append('clip_start', clipStart.trim());
      if (clipEnd.trim()) params.append('clip_end', clipEnd.trim());

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
      }, 1000);

      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: `Direct download started: ${mediaTitle || 'Media file'}`,
        })
      );
    },
    [media, url, mode, quality, audioFormat, clipStart, clipEnd]
  );

  // Global Keyboard Paste & 1-Click Bookmarklet Listener
  useEffect(() => {
    const onGlobalPaste = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string; autoDownload?: boolean }>;
      const { url: newUrl, autoDownload } = customEvent.detail || {};
      if (newUrl && /^https?:\/\//i.test(newUrl)) {
        setUrl(newUrl);
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
  const handleBatchZipDownload = async () => {
    const urlsToDownload =
      selectedEntries.length > 0
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
      link.download = `clipstream_${cleanTitle}_${Date.now()}.zip`;
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



  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Smart Platform Detection Badge
  const getPlatformDetails = () => {
    const rawUrl = (url || media?.webpage_url || '').toLowerCase();
    const ext = (media?.extractor || '').toLowerCase();

    if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be') || ext.includes('youtube')) {
      return {
        name: 'YouTube',
        badge: '4K Ultra HD',
        bg: 'bg-red-500/10 text-red-400 border-red-500/20',
        dot: 'bg-red-500',
      };
    }
    if (rawUrl.includes('instagram.com') || ext.includes('instagram')) {
      return {
        name: 'Instagram',
        badge: 'Reels 1080p HD',
        bg: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        dot: 'bg-pink-500',
      };
    }
    if (rawUrl.includes('tiktok.com') || ext.includes('tiktok')) {
      return {
        name: 'TikTok',
        badge: 'HD (No Watermark)',
        bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        dot: 'bg-cyan-400',
      };
    }
    if (rawUrl.includes('twitter.com') || rawUrl.includes('x.com') || ext.includes('twitter')) {
      return {
        name: 'X (Twitter)',
        badge: 'Direct Edge MP4',
        bg: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
        dot: 'bg-slate-300',
      };
    }
    if (rawUrl.includes('soundcloud.com') || ext.includes('soundcloud')) {
      return {
        name: 'SoundCloud',
        badge: '320kbps Lossless',
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        dot: 'bg-amber-400',
      };
    }
    if (rawUrl.includes('reddit.com') || rawUrl.includes('v.redd.it') || ext.includes('reddit')) {
      return {
        name: 'Reddit',
        badge: 'Merged Audio+Video',
        bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        dot: 'bg-orange-500',
      };
    }
    if (rawUrl.includes('vimeo.com') || ext.includes('vimeo')) {
      return {
        name: 'Vimeo',
        badge: 'Full 1080p 60fps',
        bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        dot: 'bg-blue-400',
      };
    }
    if (/^https?:\/\//i.test(rawUrl)) {
      return {
        name: 'Direct CDN',
        badge: 'Edge Stream Bypass',
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-400',
      };
    }
    return null;
  };

  const platform = getPlatformDetails();

  // Bookmarklet javascript code for 1-click downloads
  const bookmarkletHref = `javascript:(function(){var u=window.location.href;window.open('${
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
  }/?url='+encodeURIComponent(u)+'&auto=1','_blank');})();`;

  return (
    <div id="downloader-section" className="space-y-4">
      {/* Top Smart Utility Row: Platform Badge & 1-Click Bookmarklet Trigger */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          {platform ? (
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium transition-all ${platform.bg}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${platform.dot}`} />
              <span>{platform.name}</span>
              <span className="opacity-50">·</span>
              <span className="opacity-90">{platform.badge}</span>
            </div>
          ) : (
            <span className="text-zinc-500 text-[11px] flex items-center gap-1">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span>Press <kbd className="px-1 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px]">Ctrl+V</kbd> anywhere to paste</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowBookmarkletModal(true)}
          className="text-zinc-400 hover:text-zinc-200 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
          title="1-Click Browser Bookmarklet"
        >
          <Bookmark className="w-3 h-3 text-amber-400" />
          <span>1-Click Bookmarklet</span>
        </button>
      </div>

      {/* Auto-Clipboard Detection Pill Banner */}
      {detectedClipboardUrl && (
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

      {/* Hero Input Area */}
      <div className="relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleInspect();
          }}
          className="relative flex items-center bg-zinc-900/90 border border-zinc-800/80 rounded-2xl shadow-xl transition-all focus-within:border-zinc-600 focus-within:ring-2 focus-within:ring-zinc-700/30"
        >
          <div className="pl-4 text-zinc-500">
            <Link2 className="w-4 h-4" />
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
            placeholder="Paste any YouTube, Instagram, TikTok, or video link..."
            className="w-full h-13 pl-3 pr-28 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />

          <div className="absolute right-2 flex items-center gap-1.5">
            {!url && (
              <button
                type="button"
                onClick={handlePaste}
                className="p-2 text-zinc-400 hover:text-zinc-200 rounded-xl hover:bg-zinc-800 transition-colors cursor-pointer text-xs flex items-center gap-1"
                title="Paste from clipboard"
              >
                {pasted ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <ClipboardPaste className="w-3.5 h-3.5" />
                )}
                <span className="text-[11px] font-medium hidden sm:inline">Paste</span>
              </button>
            )}

            {url && (
              <button
                type="submit"
                disabled={loading}
                className="h-9 px-3.5 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>Inspect</span>
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
              disabled={downloading}
              className="text-xs font-medium px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Video className="w-3.5 h-3.5 text-sky-400" />
              <span>Instant Video</span>
            </button>
            <button
              type="button"
              onClick={() => handleDownload(true)}
              disabled={downloading}
              className="text-xs font-medium px-3 py-1.5 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Music className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instant Audio</span>
            </button>
          </div>
        )}
      </div>

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

      {/* 1-Click Bookmarklet Modal */}
      {showBookmarkletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Bookmark className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-zinc-100">1-Click Browser Bookmarklet</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBookmarkletModal(false)}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Drag the button below to your browser’s bookmarks bar. Whenever you are on YouTube,
              Instagram, TikTok, or Reddit, click the bookmark to trigger an instant download!
            </p>

            <div className="flex items-center justify-center py-4 bg-zinc-950 rounded-xl border border-zinc-800">
              <a
                href={bookmarkletHref}
                onClick={(e) => e.preventDefault()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-zinc-950 font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 cursor-grab transition-all"
                title="Drag this button to your bookmarks bar"
              >
                ★ Clipstream Instant
              </a>
            </div>

            <p className="text-[11px] text-zinc-500 text-center">
              (Drag and drop onto your browser's bookmarks bar)
            </p>
          </div>
        </div>
      )}

      {/* Clean Inspected Media Preview Card */}
      {media && (
        <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl backdrop-blur-md animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Thumbnail */}
            <div className="relative aspect-video sm:w-48 rounded-xl overflow-hidden bg-zinc-950 shrink-0 border border-zinc-800">
              {media.thumbnail ? (
                <img
                  src={`/api/proxy?url=${encodeURIComponent(media.thumbnail)}`}
                  alt={media.title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <Video className="w-8 h-8" />
                </div>
              )}
              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-[10px] font-mono text-white">
                {formatDuration(media.duration)}
              </div>
            </div>

            {/* Metadata Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-between space-y-2">
              <div>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <span className="font-medium text-zinc-300 capitalize">{media.extractor}</span>
                  <span>·</span>
                  <span className="truncate">{media.uploader}</span>
                </div>
                <h2 className="text-sm font-semibold text-zinc-100 leading-snug line-clamp-2 mt-1">
                  {media.title}
                </h2>
              </div>

              {/* Mode Toggle & Direct Action */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="flex p-0.5 bg-zinc-950 rounded-lg border border-zinc-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setMode('video')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      mode === 'video'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Video
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('audio')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      mode === 'audio'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    Audio
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownload()}
                  className="ml-auto px-4 py-1.5 rounded-xl bg-white text-zinc-950 hover:bg-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Direct Download</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Quality Selector Pills */}
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

            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className="text-[11px] text-zinc-400 hover:text-zinc-200 flex items-center gap-1 transition-colors cursor-pointer ml-auto"
            >
              <span>More Options</span>
              {showOptions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

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
                    onClick={handleBatchZipDownload}
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
                            {formatDuration(item.duration)}
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

              {/* Video Section Clipper / Trimmer */}
              <div className="col-span-1 sm:col-span-3 pt-3 border-t border-zinc-800/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-medium">
                  <Scissors className="w-3.5 h-3.5 text-amber-400" />
                  <span>Clip / Trim Range:</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <input
                    type="text"
                    value={clipStart}
                    onChange={(e) => setClipStart(e.target.value)}
                    placeholder="Start (00:00)"
                    className="w-24 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-zinc-700"
                    title="Clip start timestamp (e.g. 00:15 or 1:30)"
                  />
                  <span className="text-zinc-600">to</span>
                  <input
                    type="text"
                    value={clipEnd}
                    onChange={(e) => setClipEnd(e.target.value)}
                    placeholder="End (01:30)"
                    className="w-24 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs focus:outline-none focus:border-zinc-700"
                    title="Clip end timestamp (e.g. 02:45)"
                  />
                  {(clipStart || clipEnd) && (
                    <button
                      type="button"
                      onClick={() => {
                        setClipStart('');
                        setClipEnd('');
                      }}
                      className="text-[11px] text-zinc-500 hover:text-zinc-300 ml-1 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
