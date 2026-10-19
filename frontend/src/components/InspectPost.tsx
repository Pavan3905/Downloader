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
  Search,
  Globe,
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
  const [matrixTab, setMatrixTab] = useState<'audio' | 'video'>('audio');
  const [audioCategoryFilter, setAudioCategoryFilter] = useState<'all' | 'mp3' | 'm4a' | 'lossless' | 'source'>('all');
  const [pasted, setPasted] = useState(false);

  // Keep matrix tab aligned when mode toggles
  useEffect(() => {
    setMatrixTab(mode === 'audio' ? 'audio' : 'video');
  }, [mode]);

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
    (isAudioOverride?: boolean, qualityOverride?: string, formatExtOverride?: string) => {
      const targetUrl = media ? media.webpage_url : url.trim();
      if (!targetUrl) return;

      const isAudio = isAudioOverride !== undefined ? isAudioOverride : mode === 'audio';
      const selectedFormat = qualityOverride || (isAudio ? 'best' : quality);
      const mediaTitle = media?.title || '';
      const resolvedAudioFormat = formatExtOverride || audioFormat;

      setDownloadState('resolving');

      const params = new URLSearchParams({
        url: targetUrl,
        title: mediaTitle,
        format_id: selectedFormat,
        audio_only: isAudio ? 'true' : 'false',
        audio_format: resolvedAudioFormat,
      });

      if (isAudio && qualityOverride) {
        params.append('audio_quality', qualityOverride);
      }

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

      const typeLabel = isAudio ? `${resolvedAudioFormat.toUpperCase()} Audio` : 'Video';
      window.dispatchEvent(
        new CustomEvent('app:toast', {
          detail: `Direct download started: ${mediaTitle || 'Media file'} (${typeLabel})`,
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

  // Smart Platform Detection & Theming
  const getPlatformDetails = () => {
    const rawUrl = (url || media?.webpage_url || '').toLowerCase();
    const ext = (media?.extractor || '').toLowerCase();

    if (rawUrl.includes('youtube.com') || rawUrl.includes('youtu.be') || ext.includes('youtube')) {
      return {
        id: 'youtube',
        name: 'YouTube',
        bg: 'bg-red-500/10 text-red-400 border-red-500/20',
        dot: 'bg-red-500',
        cardBorder: 'border-red-500/30 shadow-[0_0_50px_-15px_rgba(239,68,68,0.2)]',
        accent: 'text-red-400',
      };
    }
    if (rawUrl.includes('instagram.com') || ext.includes('instagram')) {
      return {
        id: 'instagram',
        name: 'Instagram',
        bg: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
        dot: 'bg-pink-500',
        cardBorder: 'border-pink-500/30 shadow-[0_0_50px_-15px_rgba(236,72,153,0.2)]',
        accent: 'text-pink-400',
      };
    }
    if (rawUrl.includes('snapchat.com') || ext.includes('snapchat')) {
      return {
        id: 'snapchat',
        name: 'Snapchat',
        bg: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        dot: 'bg-yellow-400',
        cardBorder: 'border-yellow-500/30 shadow-[0_0_50px_-15px_rgba(234,179,8,0.2)]',
        accent: 'text-yellow-400',
      };
    }
    if (rawUrl.includes('tiktok.com') || ext.includes('tiktok')) {
      return {
        id: 'tiktok',
        name: 'TikTok',
        bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
        dot: 'bg-cyan-400',
        cardBorder: 'border-cyan-500/30 shadow-[0_0_50px_-15px_rgba(6,182,212,0.2)]',
        accent: 'text-cyan-400',
      };
    }
    if (rawUrl.includes('twitter.com') || rawUrl.includes('x.com') || ext.includes('twitter')) {
      return {
        id: 'x',
        name: 'X (Twitter)',
        bg: 'bg-slate-500/10 text-slate-300 border-slate-500/20',
        dot: 'bg-slate-300',
        cardBorder: 'border-slate-500/30 shadow-[0_0_50px_-15px_rgba(148,163,184,0.2)]',
        accent: 'text-slate-300',
      };
    }
    if (rawUrl.includes('soundcloud.com') || ext.includes('soundcloud')) {
      return {
        id: 'soundcloud',
        name: 'SoundCloud',
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        dot: 'bg-amber-400',
        cardBorder: 'border-amber-500/30 shadow-[0_0_50px_-15px_rgba(245,158,11,0.2)]',
        accent: 'text-amber-400',
      };
    }
    if (rawUrl.includes('reddit.com') || rawUrl.includes('v.redd.it') || ext.includes('reddit')) {
      return {
        id: 'reddit',
        name: 'Reddit',
        bg: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        dot: 'bg-orange-500',
        cardBorder: 'border-orange-500/30 shadow-[0_0_50px_-15px_rgba(249,115,22,0.2)]',
        accent: 'text-orange-400',
      };
    }
    if (rawUrl.includes('facebook.com') || rawUrl.includes('fb.watch') || ext.includes('facebook')) {
      return {
        id: 'facebook',
        name: 'Facebook',
        bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        dot: 'bg-blue-500',
        cardBorder: 'border-blue-500/30 shadow-[0_0_50px_-15px_rgba(59,130,246,0.2)]',
        accent: 'text-blue-400',
      };
    }
    if (rawUrl.includes('pinterest.com') || rawUrl.includes('pin.it') || ext.includes('pinterest')) {
      return {
        id: 'pinterest',
        name: 'Pinterest',
        bg: 'bg-red-500/10 text-red-400 border-red-500/20',
        dot: 'bg-red-600',
        cardBorder: 'border-red-500/30 shadow-[0_0_50px_-15px_rgba(239,68,68,0.2)]',
        accent: 'text-red-400',
      };
    }
    if (rawUrl.includes('twitch.tv') || ext.includes('twitch')) {
      return {
        id: 'twitch',
        name: 'Twitch',
        bg: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        dot: 'bg-purple-500',
        cardBorder: 'border-purple-500/30 shadow-[0_0_50px_-15px_rgba(168,85,247,0.2)]',
        accent: 'text-purple-400',
      };
    }
    if (rawUrl.includes('vimeo.com') || ext.includes('vimeo')) {
      return {
        id: 'vimeo',
        name: 'Vimeo',
        bg: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        dot: 'bg-blue-400',
        cardBorder: 'border-blue-500/30 shadow-[0_0_50px_-15px_rgba(59,130,246,0.2)]',
        accent: 'text-blue-400',
      };
    }
    if (/^https?:\/\//i.test(rawUrl)) {
      return {
        id: 'direct',
        name: 'Direct CDN',
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        dot: 'bg-emerald-400',
        cardBorder: 'border-emerald-500/30 shadow-[0_0_50px_-15px_rgba(16,185,129,0.2)]',
        accent: 'text-emerald-400',
      };
    }
    return null;
  };

  const platform = getPlatformDetails();

  // Authentic Brand Icon of the Pasted Site Link inside the Search Bar
  const renderSiteBrandIcon = () => {
    if (!url.trim()) {
      return <Search className="w-5 h-5 text-zinc-500 transition-colors" />;
    }

    switch (platform?.id) {
      case 'youtube':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 transition-transform duration-200 animate-in zoom-in-75">
            <path
              d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
              fill="#FF0000"
            />
            <polygon points="9.545,15.568 15.818,12 9.545,8.432" fill="#FFFFFF" />
          </svg>
        );
      case 'instagram':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 transition-transform duration-200 animate-in zoom-in-75" fill="none">
            <defs>
              <linearGradient id="search-ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#fdf497" />
                <stop offset="25%" stopColor="#fd5949" />
                <stop offset="65%" stopColor="#d6249f" />
                <stop offset="100%" stopColor="#285AEB" />
              </linearGradient>
            </defs>
            <rect x="2" y="2" width="20" height="20" rx="6" stroke="url(#search-ig-grad)" strokeWidth="2.2" />
            <circle cx="12" cy="12" r="4.5" stroke="url(#search-ig-grad)" strokeWidth="2.2" />
            <circle cx="17.5" cy="6.5" r="1.3" fill="url(#search-ig-grad)" />
          </svg>
        );
      case 'snapchat':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-[#FFE600] drop-shadow-[0_1px_4px_rgba(255,230,0,0.35)] transition-transform duration-200 animate-in zoom-in-75">
            <path d="M12 2c-3.8 0-6 2.8-6 6.3 0 1.2.4 2.6 1 3.4-.2.5-.9 1.1-1.6 1.3-.3.1-.5.3-.5.6 0 .5.7.8 1.4.9.1.5-.1 1.2-.5 1.7-.2.2-.1.5.1.7.9.6 2.2.4 3.2.1.8.8 1.9 1 2.9 1s2.1-.2 2.9-1c1 .3 2.3.5 3.2-.1.2-.2.3-.5.1-.7-.4-.5-.6-1.2-.5-1.7.7-.1 1.4-.4 1.4-.9 0-.3-.2-.5-.5-.6-.7-.2-1.4-.8-1.6-1.3.6-.8 1-2.2 1-3.4 0-3.5-2.2-6.3-6-6.3z" />
          </svg>
        );
      case 'tiktok':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-[#00F2FE] transition-transform duration-200 animate-in zoom-in-75">
            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 2.89 3.5 2.68 1.25-.11 2.37-.9 2.75-2.08.17-.47.24-.98.23-1.49l.01-16.34z" />
          </svg>
        );
      case 'x':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current text-zinc-100 transition-transform duration-200 animate-in zoom-in-75">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        );
      case 'soundcloud':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-[#FF5500] transition-transform duration-200 animate-in zoom-in-75">
            <path d="M1.175 12.225c-.097 0-.175.08-.175.178v3.194c0 .099.078.178.175.178.097 0 .175-.08.175-.178v-3.194c0-.098-.078-.178-.175-.178zm1.05 0c-.097 0-.175.08-.175.178v3.194c0 .099.078.178.175.178.097 0 .175-.08.175-.178v-3.194c0-.098-.078-.178-.175-.178zm1.05-1.472c-.104 0-.188.086-.188.19v4.664c0 .105.084.19.188.19.103 0 .187-.085.187-.19v-4.664c0-.104-.084-.19-.187-.19zm1.063-.589c-.11 0-.2.091-.2.204v5.842c0 .113.09.204.2.204.11 0 .2-.091.2-.204v-5.842c0-.113-.09-.204-.2-.204zm1.075-.43c-.116 0-.213.099-.213.22v6.702c0 .121.097.22.213.22.116 0 .212-.099.212-.22v-6.702c0-.121-.096-.22-.212-.22zm1.088-.135c-.123 0-.225.104-.225.233v6.97c0 .128.102.232.225.232.123 0 .225-.104.225-.232v-6.97c0-.129-.102-.233-.225-.233zm1.1 0c-.13 0-.238.11-.238.245v6.945c0 .135.108.245.238.245.13 0 .237-.11.237-.245v-6.945c0-.135-.107-.245-.237-.245zm1.112-.662c-.137 0-.25.115-.25.257v8.264c0 .142.113.257.25.257.138 0 .25-.115.25-.257V9.394c0-.142-.112-.257-.25-.257zm1.125-.563c-.144 0-.263.121-.263.27v9.39c0 .148.119.27.263.27.144 0 .262-.122.262-.27V9.098c0-.149-.118-.27-.262-.27zm1.138-.073c-.15 0-.275.127-.275.282v9.535c0 .156.125.283.275.283.15 0 .275-.127.275-.283V9.317c0-.155-.125-.282-.275-.282zm1.15.54c-.157 0-.287.133-.287.295v8.995c0 .163.13.295.287.295.158 0 .288-.132.288-.295v-8.995c0-.162-.13-.295-.288-.295zm1.163-.993c-.164 0-.3.138-.3.308v10.37c0 .17.136.308.3.308.163 0 .3-.138.3-.308V8.62c0-.17-.137-.308-.3-.308zm2.462-1.928c-.287 0-.56.052-.812.147v12.46c.264.045.535.069.812.069 3.037 0 5.5-2.502 5.5-5.588 0-3.086-2.463-5.588-5.5-5.588z" />
          </svg>
        );
      case 'reddit':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-[#FF4500] transition-transform duration-200 animate-in zoom-in-75">
            <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.702zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
          </svg>
        );
      case 'facebook':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-[#1877F2] transition-transform duration-200 animate-in zoom-in-75">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        );
      case 'pinterest':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-[#BD081C] transition-transform duration-200 animate-in zoom-in-75">
            <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
          </svg>
        );
      case 'twitch':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-[#9146FF] transition-transform duration-200 animate-in zoom-in-75">
            <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z" />
          </svg>
        );
      case 'vimeo':
        return (
          <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-[#1AB7EA] transition-transform duration-200 animate-in zoom-in-75">
            <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128 1.581-1.371 2.766-2.096 3.553-2.176 1.868-.18 3.016.974 3.447 3.468l1.419 9.176c.489 2.502.997 3.754 1.527 3.754.409 0 1.055-.648 1.936-1.944.881-1.296 1.354-2.289 1.419-2.981.18-1.791-.971-1.848-2.316-1.272 1.055-3.468 3.093-5.244 6.113-5.328 2.247-.061 3.303 1.258 3.17 3.963z" />
          </svg>
        );
      case 'direct':
        return <Globe className="w-5 h-5 text-emerald-400 shrink-0 transition-transform duration-200 animate-in zoom-in-75" />;
      default:
        return <Link2 className="w-5 h-5 text-emerald-400 shrink-0 transition-transform duration-200 animate-in zoom-in-75" />;
    }
  };

  // Distinct Video Streams for Video Format Matrix
  const distinctVideoFormats = useMemo(() => {
    if (!media?.formats || media.formats.length === 0) return [];
    const dur = Math.max(30, media.duration || 210);
    const seen = new Set<string>();
    return media.formats
      .filter((f) => {
        if (!f.height && f.vcodec === 'none') return false;
        const key = `${f.height || 'video'}_${f.vcodec}_${f.ext}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (b.height || 0) - (a.height || 0))
      .slice(0, 10)
      .map((f) => {
        const estMB = f.filesize
          ? `~${(f.filesize / 1048576).toFixed(1)} MB`
          : f.tbr
          ? `~${(((f.tbr * 1000) / 8 * dur) / 1048576).toFixed(1)} MB`
          : null;
        return {
          ...f,
          estMB,
        };
      });
  }, [media]);

  // Comprehensive Audio Formats & Bitrates Matrix
  const distinctAudioFormats = useMemo(() => {
    if (!media) return [];
    const dur = Math.max(30, media.duration || 210);

    const calcMB = (kbps: number) => {
      const mb = ((kbps * 1000) / 8 * dur) / 1048576;
      return `~${mb.toFixed(1)} MB`;
    };

    const list: Array<{
      id: string;
      format: string;
      category: 'mp3' | 'm4a' | 'lossless' | 'source';
      bitrate: string;
      qualityLabel: string;
      codecSpec: string;
      approxSize: string;
      ext: string;
      qualityArg: string;
      badgeStyle: string;
      recommended?: boolean;
      fidelityBadge: string;
    }> = [
      {
        id: 'mp3-320',
        format: 'MP3',
        category: 'mp3',
        bitrate: '320 kbps CBR',
        qualityLabel: 'Studio Master Quality',
        codecSpec: 'MPEG-1 Layer 3 · 48 kHz · 320k CBR',
        approxSize: calcMB(320),
        ext: 'mp3',
        qualityArg: '320k',
        recommended: true,
        fidelityBadge: 'Studio Master ⭐',
        badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      },
      {
        id: 'mp3-256',
        format: 'MP3',
        category: 'mp3',
        bitrate: '256 kbps',
        qualityLabel: 'High Fidelity',
        codecSpec: 'MPEG-1 Layer 3 · 44.1 kHz · 256k',
        approxSize: calcMB(256),
        ext: 'mp3',
        qualityArg: '256k',
        fidelityBadge: 'High Quality',
        badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      },
      {
        id: 'mp3-192',
        format: 'MP3',
        category: 'mp3',
        bitrate: '192 kbps',
        qualityLabel: 'Standard Audio',
        codecSpec: 'MPEG-1 Layer 3 · 44.1 kHz · 192k',
        approxSize: calcMB(192),
        ext: 'mp3',
        qualityArg: '192k',
        fidelityBadge: 'Standard',
        badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      },
      {
        id: 'mp3-128',
        format: 'MP3',
        category: 'mp3',
        bitrate: '128 kbps',
        qualityLabel: 'Compact Web',
        codecSpec: 'MPEG-1 Layer 3 · 44.1 kHz · 128k',
        approxSize: calcMB(128),
        ext: 'mp3',
        qualityArg: '128k',
        fidelityBadge: 'Compact',
        badgeStyle: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      },
      {
        id: 'm4a-256',
        format: 'M4A',
        category: 'm4a',
        bitrate: '256 kbps AAC',
        qualityLabel: 'Apple AAC (iTunes Plus)',
        codecSpec: 'AAC-LC · Stereo · 44.1 kHz Apple Native',
        approxSize: calcMB(256),
        ext: 'm4a',
        qualityArg: '256k',
        recommended: true,
        fidelityBadge: 'Apple Master 🍏',
        badgeStyle: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      },
      {
        id: 'm4a-128',
        format: 'M4A',
        category: 'm4a',
        bitrate: '128 kbps AAC',
        qualityLabel: 'Standard AAC',
        codecSpec: 'AAC-LC · Stereo · 44.1 kHz Efficient',
        approxSize: calcMB(128),
        ext: 'm4a',
        qualityArg: '128k',
        fidelityBadge: 'Standard AAC',
        badgeStyle: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
      },
      {
        id: 'flac-lossless',
        format: 'FLAC',
        category: 'lossless',
        bitrate: 'Lossless Hi-Res',
        qualityLabel: 'Bit-Perfect Studio Master',
        codecSpec: 'FLAC · 24-bit / 48 kHz Lossless',
        approxSize: calcMB(920),
        ext: 'flac',
        qualityArg: 'best',
        recommended: true,
        fidelityBadge: 'Hi-Fi Lossless 💎',
        badgeStyle: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      },
      {
        id: 'wav-pcm',
        format: 'WAV',
        category: 'lossless',
        bitrate: '1411 kbps PCM',
        qualityLabel: 'Raw Uncompressed Studio',
        codecSpec: 'PCM 16-bit · 44.1 kHz Stereo Uncompressed',
        approxSize: calcMB(1411),
        ext: 'wav',
        qualityArg: 'best',
        fidelityBadge: 'Studio PCM 🎙️',
        badgeStyle: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      },
    ];

    // Merge any native source audio streams from media.formats
    if (media.formats && media.formats.length > 0) {
      const rawAudio = media.formats.filter(
        (f) => (f.vcodec === 'none' || !f.height) && f.acodec !== 'none'
      );
      for (const raw of rawAudio) {
        const kbps = Math.round(raw.tbr || 0);
        if (kbps > 40) {
          const isOpus = (raw.acodec || '').includes('opus') || raw.ext === 'webm';
          const formatName = isOpus ? 'OPUS' : raw.ext.toUpperCase();
          const sizeStr = raw.filesize
            ? `~${(raw.filesize / 1048576).toFixed(1)} MB`
            : calcMB(kbps);
          list.push({
            id: `source-${raw.id}`,
            format: formatName,
            category: 'source',
            bitrate: `${kbps} kbps`,
            qualityLabel: 'Native Source Stream',
            codecSpec: `${raw.acodec.split('.')[0]} · Provider Direct`,
            approxSize: sizeStr,
            ext: raw.ext || 'm4a',
            qualityArg: raw.id,
            recommended: false,
            fidelityBadge: 'Direct Stream ⚡',
            badgeStyle: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
          });
        }
      }
    }

    return list;
  }, [media]);

  const filteredAudioFormats = useMemo(() => {
    if (audioCategoryFilter === 'all') return distinctAudioFormats;
    return distinctAudioFormats.filter((af) => af.category === audioCategoryFilter);
  }, [distinctAudioFormats, audioCategoryFilter]);

  return (
    <div id="downloader-section" className="space-y-3.5 w-full">
      {/* Top Smart Utility Row: Balanced Mode Selector and Status Hint */}
      <div className="flex items-center justify-between text-xs px-1">
        {/* Single vs Batch Mode Switcher */}
        <div className="mode-switcher-container flex p-0.5 bg-zinc-900/90 border border-zinc-800/80 rounded-xl text-[11px] font-medium shadow-sm backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setInputMode('single')}
            className={`mode-switcher-btn px-3 py-1 rounded-lg transition-all cursor-pointer ${
              inputMode === 'single'
                ? 'active bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Single Link
          </button>
          <button
            type="button"
            onClick={() => setInputMode('batch')}
            className={`mode-switcher-btn px-3 py-1 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
              inputMode === 'batch'
                ? 'active bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Batch (ZIP)</span>
          </button>
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
            {/* Dynamic Authentic Platform / Site Brand Icon */}
            <div className="pl-4 shrink-0 flex items-center justify-center transition-all duration-200">
              {renderSiteBrandIcon()}
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
                  {['mp3', 'm4a', 'flac', 'wav'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setAudioFormat(fmt)}
                      className={`px-2 py-0.5 rounded-md text-[11px] uppercase font-medium transition-colors cursor-pointer ${
                        audioFormat === fmt
                          ? 'bg-zinc-800 text-white border border-zinc-700 font-semibold'
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
                  showMatrix
                    ? mode === 'audio'
                      ? 'text-amber-400 font-semibold'
                      : 'text-sky-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {mode === 'audio' ? (
                  <Music className="w-3 h-3 text-amber-400" />
                ) : (
                  <SlidersHorizontal className="w-3 h-3 text-sky-400" />
                )}
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

          {/* Proper Format Matrix Table */}
          {showMatrix && (
            <div className="p-3.5 bg-zinc-950/80 border border-zinc-800 rounded-2xl space-y-3 animate-in fade-in duration-150 shadow-xl backdrop-blur-md">
              {/* Table Top Navigation: Mode Switcher Tabs + Audio Filters */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 border-b border-zinc-800/70">
                {/* Audio vs Video Tab Switcher */}
                <div className="flex items-center p-0.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setMatrixTab('audio');
                      setMode('audio');
                    }}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      matrixTab === 'audio'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    <Music className="w-3.5 h-3.5 text-amber-400" />
                    <span>Audio Formats</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
                      {distinctAudioFormats.length}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMatrixTab('video');
                      setMode('video');
                    }}
                    className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                      matrixTab === 'video'
                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-sky-400" />
                    <span>Video Streams</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-mono">
                      {distinctVideoFormats.length}
                    </span>
                  </button>
                </div>

                {/* Audio Category Filters (when in Audio tab) */}
                {matrixTab === 'audio' && (
                  <div className="flex flex-wrap items-center gap-1 text-[11px]">
                    {[
                      { id: 'all', label: 'All Formats' },
                      { id: 'mp3', label: 'MP3' },
                      { id: 'm4a', label: 'M4A (AAC)' },
                      { id: 'lossless', label: 'Lossless (FLAC/WAV)' },
                      { id: 'source', label: 'Source Streams' },
                    ].map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setAudioCategoryFilter(f.id as any)}
                        className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                          audioCategoryFilter === f.id
                            ? 'bg-zinc-800 text-zinc-100 border border-zinc-700 font-semibold'
                            : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Matrix Table Body */}
              {matrixTab === 'audio' ? (
                /* PROPER AUDIO FORMATS TABLE */
                <div className="space-y-2">
                  <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/70 shadow-inner">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800/90 bg-zinc-900/60 text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Format</th>
                          <th className="py-2.5 px-3">Bitrate / Quality</th>
                          <th className="py-2.5 px-3 hidden sm:table-cell">Codec Specs & Channel</th>
                          <th className="py-2.5 px-3">Est. File Size</th>
                          <th className="py-2.5 px-3 text-right">Instant Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {filteredAudioFormats.map((af) => {
                          const isSelected =
                            mode === 'audio' &&
                            audioFormat === af.ext &&
                            (quality === af.qualityArg ||
                              (af.ext === 'mp3' && (quality === 'best' || quality === 'auto') && af.qualityArg === '320k'));

                          return (
                            <tr
                              key={af.id}
                              className={`transition-colors group ${
                                isSelected
                                  ? 'bg-amber-500/10 border-l-2 border-l-amber-400'
                                  : 'hover:bg-zinc-900/50'
                              }`}
                            >
                              {/* Format Container */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`px-2.5 py-1 rounded-md border text-[11px] font-bold tracking-wide ${af.badgeStyle}`}
                                  >
                                    {af.format}
                                  </span>
                                  {af.recommended && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider hidden md:inline">
                                      ★ Recommended
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Bitrate & Quality */}
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-zinc-100 text-xs">
                                      {af.bitrate}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-zinc-400">
                                    {af.qualityLabel}
                                  </span>
                                </div>
                              </td>

                              {/* Codec Specs */}
                              <td className="py-2.5 px-3 hidden sm:table-cell text-zinc-400 text-[11px] font-mono whitespace-nowrap">
                                <span className="text-zinc-300">{af.codecSpec}</span>
                              </td>

                              {/* Approx Size */}
                              <td className="py-2.5 px-3 whitespace-nowrap font-mono text-[11px]">
                                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                                  {af.approxSize}
                                </span>
                              </td>

                              {/* Action Buttons */}
                              <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setMode('audio');
                                      setAudioFormat(af.ext);
                                      setQuality(af.qualityArg);
                                      window.dispatchEvent(
                                        new CustomEvent('app:toast', {
                                          detail: `Selected: ${af.format} (${af.bitrate})`,
                                        })
                                      );
                                    }}
                                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold'
                                        : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                                    }`}
                                  >
                                    {isSelected ? 'Active' : 'Select'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownload(true, af.qualityArg, af.ext)}
                                    className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 active:scale-95 text-zinc-950 font-bold text-[11px] transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                                    title={`Download ${af.format} (${af.bitrate})`}
                                  >
                                    <Download className="w-3 h-3 stroke-[2.5]" />
                                    <span>Download</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Audio Table Informational Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1 pt-1 text-[11px] text-zinc-400">
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <span className="text-amber-400 font-semibold">💡 Audio Tip:</span>
                      <span>
                        MP3 320k is universal for mobile/car audio; FLAC & WAV provide bit-perfect studio master fidelity.
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-zinc-500">
                      Showing {filteredAudioFormats.length} of {distinctAudioFormats.length} audio formats
                    </span>
                  </div>
                </div>
              ) : (
                /* PROPER VIDEO STREAMS TABLE */
                <div className="space-y-2">
                  <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-950/70 shadow-inner">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800/90 bg-zinc-900/60 text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                          <th className="py-2.5 px-3">Resolution</th>
                          <th className="py-2.5 px-3">FPS & Refresh</th>
                          <th className="py-2.5 px-3 hidden sm:table-cell">Video Codec</th>
                          <th className="py-2.5 px-3">Est. File Size</th>
                          <th className="py-2.5 px-3 text-right">Instant Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {distinctVideoFormats.map((f, i) => (
                          <tr
                            key={f.id || i}
                            className="hover:bg-zinc-900/50 transition-colors group"
                          >
                            <td className="py-2.5 px-3 font-semibold text-zinc-100 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[11px] font-bold">
                                {f.height ? `${f.height}p` : 'Video'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-zinc-400 whitespace-nowrap">
                              {f.fps ? `${f.fps} fps` : 'Standard (30 fps)'}
                            </td>
                            <td className="py-2.5 px-3 hidden sm:table-cell text-zinc-400 text-[11px] font-mono whitespace-nowrap">
                              {f.vcodec !== 'none' ? f.vcodec.split('.')[0] : f.acodec || f.ext}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-zinc-300 whitespace-nowrap">
                              {f.estMB ? (
                                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                                  {f.estMB}
                                </span>
                              ) : (
                                <span className="text-zinc-600">—</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => handleDownload(false, f.id)}
                                className="px-3 py-1 rounded-md bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 font-semibold text-[11px] transition-all active:scale-95 cursor-pointer inline-flex items-center gap-1 shadow-sm"
                              >
                                <Download className="w-3 h-3" />
                                <span>Get Stream</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-zinc-500">
                    <span>Direct progressive & DASH video streams with embedded audio</span>
                    <span className="font-mono text-[10px]">{distinctVideoFormats.length} streams available</span>
                  </div>
                </div>
              )}
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
