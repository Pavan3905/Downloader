import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  Heart,
  Share2,
  Bookmark,
  Play,
  Download,
  Music,
  Video,
  ExternalLink,
  Sparkles,
  Loader2,
  Copy,
  Check,
} from 'lucide-react';
import { MediaInfo, AdvancedSettings } from '../types';

interface InspectPostProps {
  onStartDownload: (url: string, options: any) => Promise<void>;
  advancedSettings: AdvancedSettings;
}

const PRESET_LINKS = [
  { label: 'YouTube Sample', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { label: 'YouTube Shorts', url: 'https://www.youtube.com/shorts/sample123' },
  { label: 'Vimeo Cinematic', url: 'https://vimeo.com/76979871' },
  { label: 'Direct MP4 Stream', url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
];

export const InspectPost: React.FC<InspectPostProps> = ({
  onStartDownload,
  advancedSettings,
}) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaInfo | null>(null);

  // Form controls
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState('best');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [container, setContainer] = useState<'auto' | 'mp4' | 'mkv' | 'webm'>('auto');
  const [embedThumbnail, setEmbedThumbnail] = useState(true);
  const [embedSubtitles, setEmbedSubtitles] = useState(false);

  // Post UI state
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(1284);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleInspect = async (overrideUrl?: string) => {
    const targetUrl = (overrideUrl || url).trim();
    if (!targetUrl) return;

    if (!/^https?:\/\//i.test(targetUrl)) {
      setError('Please enter a valid HTTP or HTTPS link.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Unable to inspect URL.');
      }

      const data: MediaInfo = await res.json();
      setMedia(data);
      if (overrideUrl) setUrl(overrideUrl);
    } catch (err: any) {
      setError(err.message || 'Inspection failed. Check network or URL.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!media) return;
    setDownloading(true);

    try {
      await onStartDownload(media.webpage_url, {
        format_id: mode === 'audio' ? 'best' : quality,
        audio_only: mode === 'audio',
        audio_format: audioFormat,
        quality: mode === 'audio' ? '320' : '192',
        merge_output_format: container,
        thumbnail_mode: embedThumbnail ? 'embed' : 'off',
        subtitle_mode: embedSubtitles ? 'embed' : 'off',
        filename_template: advancedSettings.filename_template,
        retries: advancedSettings.retries,
        limit_rate: advancedSettings.limit_rate,
        proxy: advancedSettings.proxy,
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    if (media?.webpage_url) {
      navigator.clipboard.writeText(media.webpage_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Live';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Search Bar - Instagram Style */}
      <div className="space-y-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleInspect();
          }}
          className="relative flex items-center"
        >
          <div className="absolute left-3.5 text-neutral-500 pointer-events-none">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste media link from YouTube, Vimeo, or web..."
            className="w-full h-12 pl-10 pr-26 bg-neutral-900 border border-neutral-800 rounded-2xl text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="absolute right-1.5 h-9 px-4 rounded-xl text-xs font-semibold text-white instagram-gradient disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md flex items-center gap-1.5"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Inspect</span>
          </button>
        </form>

        {/* Quick Sample Links */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[11px] text-neutral-400">
          <span className="shrink-0 text-neutral-500 font-medium">Quick links:</span>
          {PRESET_LINKS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setUrl(preset.url);
                handleInspect(preset.url);
              }}
              className="shrink-0 px-2.5 py-1 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800/80 transition-colors cursor-pointer"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-200 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-100 text-xs ml-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Inspected Post Card (Instagram Card Design) */}
      {media && (
        <div className="bg-neutral-950 border border-neutral-800/90 rounded-2xl overflow-hidden shadow-2xl transition-all">
          {/* Post Header */}
          <div className="p-3.5 flex items-center justify-between border-b border-neutral-900">
            <div className="flex items-center gap-2.5">
              {/* Avatar with Instagram Gradient Ring */}
              <div className="w-9 h-9 rounded-full p-[2px] instagram-gradient flex items-center justify-center">
                <div className="w-full h-full bg-neutral-900 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase overflow-hidden">
                  {media.thumbnail ? (
                    <img
                      src={media.thumbnail}
                      alt={media.uploader}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    media.uploader.slice(0, 2)
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white tracking-tight">
                    {media.uploader}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <span className="capitalize">{media.extractor}</span>
                  <span>·</span>
                  <span>{formatDuration(media.duration)}</span>
                </div>
              </div>
            </div>

            {/* Source link */}
            <a
              href={media.webpage_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
              title="Open original link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Media Viewport */}
          <div className="relative aspect-video bg-neutral-900 overflow-hidden group">
            {media.thumbnail ? (
              <img
                src={media.thumbnail}
                alt={media.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-900 text-neutral-600">
                <Play className="w-12 h-12" />
              </div>
            )}

            {/* Gradient Scrim & Duration */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[11px] font-mono text-white">
              {formatDuration(media.duration)}
            </div>

            {media.is_playlist && (
              <div className="absolute top-3 left-3 px-2 py-0.5 rounded-md bg-neutral-900/80 backdrop-blur-md text-[11px] font-medium text-amber-400 border border-amber-500/30">
                Playlist ({media.playlist_count || '10+'} items)
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="p-3.5 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-4 text-neutral-300">
              <button
                type="button"
                onClick={() => {
                  setIsLiked(!isLiked);
                  setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));
                }}
                className="flex items-center gap-1.5 hover:text-white transition-colors"
              >
                <Heart
                  className={`w-5 h-5 transition-transform active:scale-125 ${
                    isLiked ? 'text-rose-500 fill-rose-500' : ''
                  }`}
                />
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="hover:text-white transition-colors"
                title="Copy media URL"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Share2 className="w-5 h-5" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors flex items-center gap-1.5"
            >
              {downloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
              <span>Queue Download</span>
            </button>
          </div>

          {/* Likes & Title */}
          <div className="px-3.5 space-y-1">
            <p className="text-xs font-semibold text-white">
              {likesCount.toLocaleString()} saves · {(media.view_count || 14200).toLocaleString()} views
            </p>
            <h2 className="text-sm font-medium text-neutral-100 leading-snug">
              {media.title}
            </h2>
          </div>

          {/* Download Configuration Panel */}
          <div className="p-3.5 pt-4 space-y-3.5 border-t border-neutral-900 mt-3 bg-neutral-900/30">
            {/* Mode Switcher: Video vs Audio */}
            <div className="grid grid-cols-2 p-1 bg-neutral-900 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setMode('video')}
                className={`py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'video'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5" />
                <span>Video (MP4/MKV)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('audio')}
                className={`py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all ${
                  mode === 'audio'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5" />
                <span>Audio Only (MP3)</span>
              </button>
            </div>

            {/* Quality & Format Options */}
            {mode === 'video' ? (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-neutral-400">
                  Select Resolution
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'best', label: '1080p FHD' },
                    { id: 'height:720', label: '720p HD' },
                    { id: 'height:480', label: '480p SD' },
                    { id: 'auto', label: 'Auto (Best)' },
                  ].map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => setQuality(res.id)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-medium border transition-all ${
                        quality === res.id
                          ? 'bg-neutral-800 border-neutral-600 text-white'
                          : 'bg-neutral-900/50 border-neutral-800/80 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-neutral-400">
                  Audio Format
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {['mp3', 'm4a', 'flac', 'wav'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setAudioFormat(fmt)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-medium uppercase border transition-all ${
                        audioFormat === fmt
                          ? 'bg-neutral-800 border-neutral-600 text-white'
                          : 'bg-neutral-900/50 border-neutral-800/80 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clean Toggles */}
            <div className="pt-2 flex items-center justify-between text-xs text-neutral-300">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={embedThumbnail}
                  onChange={(e) => setEmbedThumbnail(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-800 text-rose-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>Embed cover art</span>
              </label>

              {mode === 'video' && (
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={embedSubtitles}
                    onChange={(e) => setEmbedSubtitles(e.target.checked)}
                    className="rounded border-neutral-700 bg-neutral-800 text-rose-500 focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Embed subtitles</span>
                </label>
              )}
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="w-full h-11 rounded-xl text-xs font-semibold text-white instagram-gradient hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Adding to download queue...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Download Media File</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
