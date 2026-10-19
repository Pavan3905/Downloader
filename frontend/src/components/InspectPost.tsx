import React, { useState } from 'react';
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
} from 'lucide-react';
import { MediaInfo, AdvancedSettings } from '../types';

interface InspectPostProps {
  onStartDownload: (url: string, options: any) => Promise<void>;
  advancedSettings: AdvancedSettings;
}

export const InspectPost: React.FC<InspectPostProps> = ({
  onStartDownload,
  advancedSettings,
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaInfo | null>(null);

  // Download preferences
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState('best');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [container, setContainer] = useState<'auto' | 'mp4' | 'mkv' | 'webm'>('auto');
  const [showOptions, setShowOptions] = useState(false);
  const [pasted, setPasted] = useState(false);

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

  const handleInspect = async (targetUrl?: string) => {
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
  };

  const handleDownload = (isAudioOverride?: boolean) => {
    const targetUrl = media ? media.webpage_url : url.trim();
    if (!targetUrl) return;

    const isAudio = isAudioOverride !== undefined ? isAudioOverride : mode === 'audio';
    const selectedFormat = isAudio ? 'best' : quality;
    const mediaTitle = media?.title || '';

    // Direct stream directly to user's device (bypasses server library)
    const params = new URLSearchParams({
      url: targetUrl,
      title: mediaTitle,
      format_id: selectedFormat,
      audio_only: isAudio ? 'true' : 'false',
      audio_format: audioFormat,
    });

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
  };

  const handleQueueDownload = async () => {
    const targetUrl = media ? media.webpage_url : url.trim();
    if (!targetUrl) return;

    setDownloading(true);
    setError(null);
    try {
      await onStartDownload(targetUrl, {
        title: media?.title || undefined,
        format_id: mode === 'audio' ? 'best' : quality,
        audio_only: mode === 'audio',
        audio_format: audioFormat,
        quality: '320',
        merge_output_format: container,
        filename_template: advancedSettings.filename_template,
        retries: advancedSettings.retries,
        fragment_retries: advancedSettings.fragment_retries,
        concurrent_fragments: advancedSettings.concurrent_fragments,
        limit_rate: advancedSettings.limit_rate,
        proxy: advancedSettings.proxy,
      });
    } catch (err: any) {
      setError(err.message || 'Download failed to start.');
    } finally {
      setDownloading(false);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Live';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Hero Input Area */}
      <div className="relative">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleInspect();
          }}
          className="relative flex items-center bg-zinc-900/90 dark:bg-zinc-900/90 border border-zinc-800/80 rounded-2xl shadow-xl transition-all focus-within:border-zinc-600 focus-within:ring-2 focus-within:ring-zinc-700/30"
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
            placeholder="Paste any video, audio, or social link..."
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
                {pasted ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <ClipboardPaste className="w-3.5 h-3.5" />}
                <span className="text-[11px] font-medium hidden sm:inline">Paste</span>
              </button>
            )}

            {url && (
              <button
                type="submit"
                disabled={loading}
                className="h-9 px-3.5 rounded-xl bg-zinc-100 text-zinc-950 hover:bg-white text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer disabled:opacity-50 shadow-sm"
              >
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
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

          {/* Collapsible Format & Advanced Options */}
          {showOptions && (
            <div className="pt-2 border-t border-zinc-800/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs animate-in fade-in duration-150">
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

              <div>
                <label className="text-[11px] text-zinc-500 block mb-1">Background Queue</label>
                <button
                  type="button"
                  onClick={handleQueueDownload}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-colors cursor-pointer w-full disabled:opacity-50"
                  title="Download in background to server library"
                >
                  {downloading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3 text-sky-400" />}
                  <span className="truncate">Save to Server</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
