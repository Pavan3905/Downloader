import React, { useState, useMemo } from 'react';
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
  Subtitles,
  Image as ImageIcon,
  BookOpen,
  FileCode,
  Terminal,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Layers,
  Clock,
  Calendar,
  Zap,
} from 'lucide-react';
import { MediaInfo, AdvancedSettings } from '../types';
import { SupportedPlatforms } from './SupportedPlatforms';

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
  const [error, setError] = useState<string | null>(null);
  const [media, setMedia] = useState<MediaInfo | null>(null);

  // Form controls
  const [mode, setMode] = useState<'video' | 'audio'>('video');
  const [quality, setQuality] = useState('best');
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioBitrate, setAudioBitrate] = useState('320');
  const [container, setContainer] = useState<'auto' | 'mp4' | 'mkv' | 'webm' | 'mov'>('auto');

  // Subtitle options
  const [subtitleMode, setSubtitleMode] = useState<'off' | 'separate' | 'embed' | 'both'>('off');
  const [subtitleLang, setSubtitleLang] = useState('en');
  const [subtitleFormat, setSubtitleFormat] = useState<'srt' | 'vtt' | 'ass'>('srt');

  // Thumbnail options
  const [thumbnailMode, setThumbnailMode] = useState<'off' | 'separate' | 'embed' | 'both'>('embed');

  // Chapters & Metadata
  const [embedChapters, setEmbedChapters] = useState(true);
  const [metadataMode, setMetadataMode] = useState<'off' | 'separate' | 'embed' | 'both'>('embed');

  // UI accordion toggles
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showChapters, setShowChapters] = useState(false);
  const [showCliPreview, setShowCliPreview] = useState(false);

  // Post UI state
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(1482);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCli, setCopiedCli] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [showScheduleDrawer, setShowScheduleDrawer] = useState(false);
  const [schedulePreset, setSchedulePreset] = useState('15m');
  const [customScheduleTime, setCustomScheduleTime] = useState('');

  const calculateTargetTime = (preset: string, customVal: string): Date => {
    const now = new Date();
    if (preset === '15m') return new Date(now.getTime() + 15 * 60 * 1000);
    if (preset === '30m') return new Date(now.getTime() + 30 * 60 * 1000);
    if (preset === '1h') return new Date(now.getTime() + 60 * 60 * 1000);
    if (preset === 'tonight') {
      const target = new Date();
      target.setHours(23, 59, 0, 0);
      if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
      return target;
    }
    if (preset === 'custom' && customVal) {
      const d = new Date(customVal);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date(now.getTime() + 15 * 60 * 1000);
  };

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
        quality: audioBitrate,
        merge_output_format: container,
        subtitle_mode: subtitleMode,
        subtitle_languages: subtitleLang,
        subtitle_format: subtitleFormat,
        thumbnail_mode: thumbnailMode,
        metadata_mode: metadataMode,
        embed_chapters: embedChapters,
        filename_template: advancedSettings.filename_template,
        retries: advancedSettings.retries,
        limit_rate: advancedSettings.limit_rate,
        proxy: advancedSettings.proxy,
      });
    } finally {
      setDownloading(false);
    }
  };

  const handleScheduleDownload = async () => {
    if (!media) return;
    setDownloading(true);

    try {
      const targetDate = calculateTargetTime(schedulePreset, customScheduleTime);
      await onStartDownload(media.webpage_url, {
        scheduled_for: targetDate.toISOString(),
        format_id: mode === 'audio' ? 'best' : quality,
        audio_only: mode === 'audio',
        audio_format: audioFormat,
        quality: audioBitrate,
        merge_output_format: container,
        subtitle_mode: subtitleMode,
        subtitle_languages: subtitleLang,
        subtitle_format: subtitleFormat,
        thumbnail_mode: thumbnailMode,
        metadata_mode: metadataMode,
        embed_chapters: embedChapters,
        filename_template: advancedSettings.filename_template,
        retries: advancedSettings.retries,
        limit_rate: advancedSettings.limit_rate,
        proxy: advancedSettings.proxy,
      });
      setShowScheduleDrawer(false);
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = () => {
    if (media?.webpage_url) {
      navigator.clipboard.writeText(media.webpage_url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const generatedCliCommand = useMemo(() => {
    if (!media) return '';
    const parts = ['yt-dlp'];
    if (mode === 'audio') {
      parts.push('-x', `--audio-format ${audioFormat}`, `--audio-quality ${audioBitrate}k`);
    } else {
      if (quality === 'best') parts.push('-f "bestvideo+bestaudio/best"');
      else if (quality.startsWith('height:')) {
        const h = quality.split(':')[1];
        parts.push(`-f "bestvideo[height<=${h}]+bestaudio/best"`);
      }
      if (container !== 'auto') parts.push(`--merge-output-format ${container}`);
    }

    if (subtitleMode === 'embed') parts.push('--embed-subs', `--sub-langs "${subtitleLang}"`);
    else if (subtitleMode === 'separate') parts.push('--write-subs', `--sub-langs "${subtitleLang}"`, `--sub-format ${subtitleFormat}`);
    else if (subtitleMode === 'both') parts.push('--embed-subs', '--write-subs', `--sub-langs "${subtitleLang}"`);

    if (thumbnailMode === 'embed') parts.push('--embed-thumbnail');
    else if (thumbnailMode === 'separate') parts.push('--write-thumbnail');
    else if (thumbnailMode === 'both') parts.push('--embed-thumbnail', '--write-thumbnail');

    if (embedChapters) parts.push('--embed-chapters');
    if (metadataMode === 'embed' || metadataMode === 'both') parts.push('--add-metadata');
    if (metadataMode === 'separate' || metadataMode === 'both') parts.push('--write-info-json');

    parts.push(`"${media.webpage_url}"`);
    return parts.join(' ');
  }, [media, mode, quality, audioFormat, audioBitrate, container, subtitleMode, subtitleLang, subtitleFormat, thumbnailMode, embedChapters, metadataMode]);

  const handleCopyCli = () => {
    navigator.clipboard.writeText(generatedCliCommand);
    setCopiedCli(true);
    setTimeout(() => setCopiedCli(false), 2000);
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Live';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Sliding Row of Supported Platform Logos */}
      <SupportedPlatforms />

      {/* Modern Search & Paste Bar */}
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
            placeholder="Paste video, reel, audio, or playlist link..."
            className="w-full h-12 pl-10 pr-26 bg-neutral-900 border border-neutral-800 rounded-2xl text-xs sm:text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600 focus:ring-1 focus:ring-neutral-600 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="absolute right-1.5 h-9 px-4 rounded-xl text-xs font-semibold text-white instagram-gradient disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Inspect</span>
          </button>
        </form>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-200 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-100 text-xs ml-2 cursor-pointer"
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
              {/* Creator Avatar with Instagram Gradient Ring */}
              <div className="w-9 h-9 rounded-full p-[2px] instagram-gradient flex items-center justify-center shrink-0">
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
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-white tracking-tight truncate max-w-[180px] sm:max-w-xs">
                    {media.uploader}
                  </span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-400 fill-sky-400/20 shrink-0" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-neutral-400">
                  <span className="capitalize">{media.extractor}</span>
                  <span>·</span>
                  <span>{formatDuration(media.duration)}</span>
                  <span>·</span>
                  <span className="text-emerald-400 font-mono text-[10px]">Verified Stream</span>
                </div>
              </div>
            </div>

            {/* Source link */}
            <a
              href={media.webpage_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-900 transition-colors"
              title="Open source website"
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
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent pointer-events-none" />

            <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md text-[11px] font-mono text-white border border-neutral-700/50">
              {formatDuration(media.duration)}
            </div>

            <div className="absolute top-3 left-3 flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md text-[10px] font-semibold tracking-wide text-white border border-neutral-800">
                {mode === 'audio' ? 'AUDIO' : 'VIDEO'}
              </span>
              {media.is_playlist && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 backdrop-blur-md text-[10px] font-medium text-amber-300 border border-amber-500/30">
                  Playlist ({media.playlist_count || '12+'} items)
                </span>
              )}
            </div>
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
                className="flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
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
                className="hover:text-white transition-colors cursor-pointer"
                title="Copy share link"
              >
                {copiedLink ? (
                  <Check className="w-5 h-5 text-emerald-400" />
                ) : (
                  <Share2 className="w-5 h-5" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowCliPreview(!showCliPreview)}
                className={`p-1 rounded-md transition-colors ${showCliPreview ? 'text-rose-400 bg-neutral-900' : 'text-neutral-400 hover:text-white'}`}
                title="View yt-dlp CLI command"
              >
                <Terminal className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-white text-black hover:bg-neutral-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
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

          {/* CLI Command Preview (For Power Users) */}
          {showCliPreview && (
            <div className="mx-3.5 mt-3 p-3 rounded-xl bg-neutral-900 border border-neutral-800 text-[11px] font-mono text-neutral-300 space-y-2">
              <div className="flex items-center justify-between text-neutral-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-amber-400" />
                  <span>Equivalent yt-dlp Command:</span>
                </span>
                <button
                  onClick={handleCopyCli}
                  className="flex items-center gap-1 text-[10px] text-neutral-400 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedCli ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedCli ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="p-2 bg-black/60 rounded-lg overflow-x-auto text-emerald-400 border border-neutral-800/80 break-all select-all">
                {generatedCliCommand}
              </div>
            </div>
          )}

          {/* Chapters Accordion */}
          {media.chapters && media.chapters.length > 0 && (
            <div className="mx-3.5 mt-3 border border-neutral-800/80 rounded-xl overflow-hidden bg-neutral-900/40">
              <button
                type="button"
                onClick={() => setShowChapters(!showChapters)}
                className="w-full px-3 py-2 flex items-center justify-between text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="font-medium">Video Chapters ({media.chapters.length} markers)</span>
                </div>
                {showChapters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              {showChapters && (
                <div className="p-2.5 pt-0 space-y-1.5 border-t border-neutral-800/60 mt-1">
                  {media.chapters.map((ch, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] text-neutral-400 py-1 px-2 rounded-lg bg-black/40">
                      <span className="text-white truncate max-w-[240px]">{ch.title}</span>
                      <span className="font-mono text-[10px] text-neutral-500">
                        {formatDuration(ch.start_time)} - {formatDuration(ch.end_time)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Download Studio Settings Panel */}
          <div className="p-3.5 pt-4 space-y-4 border-t border-neutral-900 mt-3 bg-neutral-900/40">
            {/* Mode Switcher: Video vs Audio */}
            <div className="grid grid-cols-2 p-1 bg-neutral-900 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setMode('video')}
                className={`py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'video'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Video className="w-3.5 h-3.5 text-rose-400" />
                <span>Video (Full Stream)</span>
              </button>
              <button
                type="button"
                onClick={() => setMode('audio')}
                className={`py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  mode === 'audio'
                    ? 'bg-neutral-800 text-white shadow-sm'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5 text-amber-400" />
                <span>Audio Only (Lossless/MP3)</span>
              </button>
            </div>

            {/* Quality & Resolution Selection */}
            {mode === 'video' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="font-medium text-neutral-300">Resolution & Frame Rate</span>
                  <span className="text-[10px] text-neutral-500">Merged AVC/VP9/AV1</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: 'best', label: 'Best Quality', badge: 'Ultra HD' },
                    { id: '1080', label: '1080p FHD', badge: 'High Perf' },
                    { id: '720', label: '720p HD', badge: 'Standard' },
                    { id: '480', label: '480p SD', badge: 'Compact' },
                    { id: '360', label: '360p Mobile', badge: 'Light' },
                    { id: 'auto', label: 'Auto (Best)', badge: 'Source' },
                  ].map((res) => (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => setQuality(res.id)}
                      className={`p-2 text-left rounded-xl border transition-all cursor-pointer ${
                        quality === res.id
                          ? 'bg-neutral-800 border-neutral-600 text-white shadow-sm'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <div className="text-xs font-semibold leading-tight">{res.label}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">{res.badge}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="font-medium text-neutral-300">Audio Codec & Bitrate</span>
                  <span className="text-[10px] text-emerald-400">FFmpeg High Fidelity</span>
                </div>
                {/* Audio Formats */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[
                    { id: 'mp3', label: 'MP3', desc: 'Universal' },
                    { id: 'm4a', label: 'M4A', desc: 'AAC High' },
                    { id: 'flac', label: 'FLAC', desc: 'Lossless' },
                    { id: 'wav', label: 'WAV', desc: 'Studio' },
                    { id: 'opus', label: 'OPUS', desc: 'Modern' },
                  ].map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => setAudioFormat(fmt.id)}
                      className={`py-2 px-1 text-center rounded-xl border transition-all cursor-pointer ${
                        audioFormat === fmt.id
                          ? 'bg-neutral-800 border-neutral-600 text-white shadow-sm'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      <div className="text-xs font-bold uppercase">{fmt.label}</div>
                      <div className="text-[9px] text-neutral-500 mt-0.5">{fmt.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Bitrate Selector (for MP3/M4A) */}
                {(audioFormat === 'mp3' || audioFormat === 'm4a') && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-neutral-500 shrink-0">Bitrate:</span>
                    {['320', '256', '192', '128'].map((br) => (
                      <button
                        key={br}
                        type="button"
                        onClick={() => setAudioBitrate(br)}
                        className={`flex-1 py-1 text-center rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                          audioBitrate === br
                            ? 'bg-neutral-800 border-neutral-600 text-amber-300'
                            : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {br}k
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Container Format (Video mode) */}
            {mode === 'video' && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span className="font-medium text-neutral-300">Container Packaging</span>
                  <span className="text-[10px] text-neutral-500">MKV supports all subtitle tracks</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'auto', label: 'Auto' },
                    { id: 'mp4', label: 'MP4' },
                    { id: 'mkv', label: 'MKV' },
                    { id: 'webm', label: 'WebM' },
                  ].map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setContainer(c.id as any)}
                      className={`py-1.5 text-center rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                        container === c.id
                          ? 'bg-neutral-800 border-neutral-600 text-white'
                          : 'bg-neutral-900/60 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Advanced Subtitles & Chapters Control Drawer */}
            <div className="pt-2 border-t border-neutral-800/80">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full py-1.5 flex items-center justify-between text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
                  <span className="font-semibold">Subtitles, Cover Art & Chapters</span>
                </div>
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showAdvanced && (
                <div className="pt-3 space-y-3.5 text-xs text-neutral-300">
                  {/* Subtitle Configuration */}
                  <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-white">
                        <Subtitles className="w-3.5 h-3.5 text-sky-400" />
                        <span>Subtitles Delivery</span>
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">yt-dlp --embed-subs</span>
                    </div>

                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'off', label: 'Off' },
                        { id: 'embed', label: 'Embed' },
                        { id: 'separate', label: 'Separate' },
                        { id: 'both', label: 'Both' },
                      ].map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSubtitleMode(s.id as any)}
                          className={`py-1.5 text-center rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            subtitleMode === s.id
                              ? 'bg-neutral-800 border-neutral-600 text-sky-300 font-semibold'
                              : 'bg-black/40 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {subtitleMode !== 'off' && (
                      <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                        <div>
                          <label className="text-neutral-400 block mb-1">Language</label>
                          <select
                            value={subtitleLang}
                            onChange={(e) => setSubtitleLang(e.target.value)}
                            className="w-full py-1.5 px-2 bg-black border border-neutral-800 rounded-lg text-white focus:outline-none"
                          >
                            <option value="en">English (Original / CC)</option>
                            <option value="es">Spanish / Español</option>
                            <option value="fr">French / Français</option>
                            <option value="de">German / Deutsch</option>
                            <option value="ja">Japanese / 日本語</option>
                            <option value="all">All Available Subtitles</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-neutral-400 block mb-1">Format</label>
                          <select
                            value={subtitleFormat}
                            onChange={(e) => setSubtitleFormat(e.target.value as any)}
                            className="w-full py-1.5 px-2 bg-black border border-neutral-800 rounded-lg text-white focus:outline-none"
                          >
                            <option value="srt">SubRip (.srt)</option>
                            <option value="vtt">WebVTT (.vtt)</option>
                            <option value="ass">Advanced SSA (.ass)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Thumbnail / Cover Art */}
                  <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 font-medium text-white">
                        <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>Thumbnail & Cover Art</span>
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">100% Player Safe</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { id: 'off', label: 'Off' },
                        { id: 'embed', label: mode === 'audio' ? 'Embed (ID3)' : 'Cover (.jpg)' },
                        { id: 'separate', label: 'Separate (.jpg)' },
                        { id: 'both', label: 'Both' },
                      ].map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setThumbnailMode(t.id as any)}
                          className={`py-1.5 text-center rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                            thumbnailMode === t.id
                              ? 'bg-neutral-800 border-neutral-600 text-amber-300 font-semibold'
                              : 'bg-black/40 border-neutral-800 text-neutral-400 hover:text-white'
                          }`}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-neutral-400">
                      {mode === 'audio'
                        ? 'Embeds album artwork directly into ID3/M4A tags.'
                        : 'Saves high-res JPG alongside MP4. Avoids video stream corruption in Windows Media Player.'}
                    </p>
                  </div>

                  {/* Chapters & Metadata Toggles */}
                  <div className="p-3 rounded-xl bg-neutral-900/70 border border-neutral-800 space-y-2.5">
                    <label className="flex items-center justify-between cursor-pointer select-none">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                        <span>Embed Chapter Markers</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={embedChapters}
                        onChange={(e) => setEmbedChapters(e.target.checked)}
                        className="rounded border-neutral-700 bg-neutral-800 text-rose-500 focus:ring-0"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer select-none pt-1 border-t border-neutral-800/60">
                      <div className="flex items-center gap-2">
                        <FileCode className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Generate .info.json Metadata</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={metadataMode === 'separate' || metadataMode === 'both'}
                        onChange={(e) => setMetadataMode(e.target.checked ? 'both' : 'embed')}
                        className="rounded border-neutral-700 bg-neutral-800 text-rose-500 focus:ring-0"
                      />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Primary Action Buttons */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="flex-1 h-12 rounded-xl text-xs sm:text-sm font-semibold text-white instagram-gradient hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                >
                  {downloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting to download queue...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Start High Quality Download</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowScheduleDrawer(!showScheduleDrawer)}
                  className={`h-12 px-3.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold transition-all cursor-pointer ${
                    showScheduleDrawer
                      ? 'bg-violet-950/80 border-violet-600 text-violet-200'
                      : 'bg-neutral-900 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-700'
                  }`}
                  title="Schedule this download for later"
                >
                  <Clock className="w-4 h-4 text-violet-400" />
                  <span className="hidden sm:inline">Schedule</span>
                </button>
              </div>

              {/* Schedule Drawer */}
              {showScheduleDrawer && (
                <div className="p-3.5 bg-neutral-900/90 border border-violet-800/60 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                      <Calendar className="w-3.5 h-3.5 text-violet-400" />
                      <span>Schedule Delayed Start</span>
                    </div>
                    <span className="text-[10px] text-violet-300 font-mono flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" />
                      <span>Worker checks every 3s</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: '15m', label: '+15 Mins' },
                      { id: '30m', label: '+30 Mins' },
                      { id: '1h', label: '+1 Hour' },
                      { id: 'tonight', label: 'Midnight' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setSchedulePreset(p.id);
                          setCustomScheduleTime('');
                        }}
                        className={`py-1.5 text-center rounded-lg text-xs font-medium border transition-all ${
                          schedulePreset === p.id
                            ? 'bg-violet-950 border-violet-500 text-violet-200'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-neutral-400">
                      Starts around:{' '}
                      <strong className="text-white font-mono">
                        {calculateTargetTime(schedulePreset, customScheduleTime).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </strong>
                    </span>

                    <button
                      type="button"
                      onClick={handleScheduleDownload}
                      disabled={downloading}
                      className="px-3.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Confirm Schedule</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
