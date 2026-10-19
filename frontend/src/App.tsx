import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InspectPost } from './components/InspectPost';
import { SettingsSheet } from './components/SettingsSheet';
import { AdvancedSettings } from './types';
import { Sliders, X, Zap, ShieldCheck, Scissors, Archive, Sparkles, Command } from 'lucide-react';

const MemoInspectPost = React.memo(InspectPost);
const MemoSettingsSheet = React.memo(SettingsSheet);

// Supported & Rotating Platforms Catalog (with brand gradients and active glows)
const ROTATING_PLATFORMS = [
  {
    name: 'YouTube',
    badge: '4K Ultra HD',
    gradient: 'from-red-500 via-rose-500 to-amber-500',
    color: 'hover:border-red-500/40 hover:bg-red-500/10 hover:text-red-300',
    activeClass: 'border-red-500/60 bg-red-500/15 text-red-300 shadow-[0_0_18px_rgba(239,68,68,0.3)] ring-1 ring-red-500/40',
    dot: 'bg-red-500',
  },
  {
    name: 'Instagram',
    badge: 'Reels 1080p',
    gradient: 'from-pink-500 via-purple-500 to-rose-400',
    color: 'hover:border-pink-500/40 hover:bg-pink-500/10 hover:text-pink-300',
    activeClass: 'border-pink-500/60 bg-pink-500/15 text-pink-300 shadow-[0_0_18px_rgba(236,72,153,0.3)] ring-1 ring-pink-500/40',
    dot: 'bg-pink-500',
  },
  {
    name: 'Snapchat',
    badge: 'Spotlight & Stories',
    gradient: 'from-yellow-400 via-amber-400 to-orange-400',
    color: 'hover:border-yellow-500/40 hover:bg-yellow-500/10 hover:text-yellow-300',
    activeClass: 'border-yellow-500/60 bg-yellow-500/15 text-yellow-300 shadow-[0_0_18px_rgba(234,179,8,0.3)] ring-1 ring-yellow-500/40',
    dot: 'bg-yellow-400',
  },
  {
    name: 'TikTok',
    badge: 'HD (No Watermark)',
    gradient: 'from-cyan-400 via-teal-400 to-emerald-400',
    color: 'hover:border-cyan-500/40 hover:bg-cyan-500/10 hover:text-cyan-300',
    activeClass: 'border-cyan-500/60 bg-cyan-500/15 text-cyan-300 shadow-[0_0_18px_rgba(6,182,212,0.3)] ring-1 ring-cyan-500/40',
    dot: 'bg-cyan-400',
  },
  {
    name: 'X (Twitter)',
    badge: 'Direct Edge MP4',
    gradient: 'from-slate-200 via-sky-300 to-zinc-400',
    color: 'hover:border-slate-500/40 hover:bg-slate-500/10 hover:text-slate-200',
    activeClass: 'border-slate-400/60 bg-slate-500/15 text-slate-200 shadow-[0_0_18px_rgba(148,163,184,0.3)] ring-1 ring-slate-400/40',
    dot: 'bg-slate-400',
  },
  {
    name: 'SoundCloud',
    badge: '320kbps Lossless',
    gradient: 'from-amber-400 via-orange-500 to-rose-400',
    color: 'hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300',
    activeClass: 'border-amber-500/60 bg-amber-500/15 text-amber-300 shadow-[0_0_18px_rgba(245,158,11,0.3)] ring-1 ring-amber-500/40',
    dot: 'bg-amber-400',
  },
  {
    name: 'Reddit',
    badge: 'Merged Audio',
    gradient: 'from-orange-500 via-red-500 to-amber-500',
    color: 'hover:border-orange-500/40 hover:bg-orange-500/10 hover:text-orange-300',
    activeClass: 'border-orange-500/60 bg-orange-500/15 text-orange-300 shadow-[0_0_18px_rgba(249,115,22,0.3)] ring-1 ring-orange-500/40',
    dot: 'bg-orange-500',
  },
];

export default function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auto-rotating platform name in hero
  const [platformIdx, setPlatformIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setPlatformIdx((prev) => (prev + 1) % ROTATING_PLATFORMS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [isPaused]);

  const currentPlatform = ROTATING_PLATFORMS[platformIdx];

  // Theme state: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('clipstream_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  useEffect(() => {
    try {
      if (theme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      localStorage.setItem('clipstream_theme', theme);
    } catch {}
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    subtitle_mode: 'off',
    subtitle_languages: 'en.*,en',
    subtitle_format: 'best',
    thumbnail_mode: 'embed',
    metadata_mode: 'embed',
    embed_chapters: true,
    filename_template: '%(title).180B [%(id)s].%(ext)s',
    merge_output_format: 'auto',
    custom_format_selector: '',
    playlist_items: '',
    limit_rate: '',
    retries: 10,
    fragment_retries: 10,
    concurrent_fragments: 4,
    socket_timeout: 30,
    cookies_from_browser: '',
    proxy: '',
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Toast notification event listener
  useEffect(() => {
    const onToast = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      if (msg) showToast(msg);
    };
    window.addEventListener('app:toast', onToast);
    return () => window.removeEventListener('app:toast', onToast);
  }, []);

  // Global Keyboard Paste (Ctrl+V / Cmd+V Anywhere on the page)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const active = document.activeElement;
      const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
      const isMainUrlInput = active && active.getAttribute('type') === 'url';

      const text = e.clipboardData?.getData('text') || '';
      const trimmed = text.trim();

      if (trimmed && /^https?:\/\//i.test(trimmed)) {
        if (!isInput || isMainUrlInput) {
          e.preventDefault();
          window.dispatchEvent(
            new CustomEvent('app:global-paste', {
              detail: { url: trimmed, autoDownload: false },
            })
          );
          showToast('Captured link from clipboard! Inspecting...');
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  // Support 1-Click Browser Bookmarklet & PWA Web Share Target (?url=...&auto=1)
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const sharedUrl = searchParams.get('url') || searchParams.get('text');
      const auto = searchParams.get('auto') === '1' || searchParams.get('auto') === 'true';

      if (sharedUrl && /^https?:\/\//i.test(sharedUrl.trim())) {
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('app:global-paste', {
              detail: { url: sharedUrl.trim(), autoDownload: auto },
            })
          );
          if (auto) {
            showToast('Bookmarklet triggered: Starting instant download!');
          }
        }, 150);
      }
    } catch {}
  }, []);

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${
        theme === 'light' ? 'light bg-zinc-50 text-zinc-900' : 'bg-black text-zinc-100'
      } flex flex-col font-sans transition-colors duration-200`}
    >
      {/* Ambient Mesh Glow */}
      <div className="ambient-glow" />

      {/* Top Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-8 pb-16 flex flex-col justify-start space-y-8 z-10">
        {/* Hero Section */}
        <div className="text-center space-y-4 pt-1 sm:pt-3">
          {/* 1. MOVED TO TOP: Supported Platform Switcher Bar */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 pb-1">
            {ROTATING_PLATFORMS.map((p, idx) => {
              const isActive = idx === platformIdx;
              return (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setPlatformIdx(idx);
                    setIsPaused(true);
                    setTimeout(() => setIsPaused(false), 8000);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer select-none active:scale-95 ${
                    isActive
                      ? p.activeClass
                      : `bg-zinc-900/60 border-zinc-800/80 text-zinc-400 ${p.color}`
                  }`}
                  title={`Switch to ${p.name}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                  <span>{p.name}</span>
                  <span className="text-[10px] opacity-60 font-mono hidden sm:inline">{p.badge}</span>
                </button>
              );
            })}
          </div>

          {/* 2. Engine Pill Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 shadow-sm backdrop-blur-md text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-zinc-300">Cobalt Edge Bypass Engine</span>
            <span className="text-zinc-600">·</span>
            <span className="text-emerald-400 font-mono font-medium">50+ MB/s Stream</span>
          </div>

          {/* 3. Headline with Dynamic Platform Name Change */}
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.18] min-h-[75px] sm:min-h-[115px] flex flex-col items-center justify-center">
            <span className="bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              Download Any Video from
            </span>
            <span
              key={currentPlatform.name}
              className={`bg-gradient-to-r ${currentPlatform.gradient} bg-clip-text text-transparent inline-block animate-in fade-in slide-in-from-bottom-2 duration-300 font-black drop-shadow-sm`}
            >
              {currentPlatform.name}
            </span>
          </h1>

          {/* 4. Subtitle */}
          <p className="text-xs sm:text-sm text-zinc-400 max-w-lg mx-auto leading-relaxed">
            Direct client-side media resolution. Stream 4K video, audio tracks, and full playlists straight from Google, Meta, Snapchat & CDN edges with zero cloud storage wait.
          </p>
        </div>

        {/* Downloader Core Section */}
        <section id="downloader-section" className="w-full">
          <MemoInspectPost advancedSettings={advancedSettings} />
        </section>

        {/* Global Keyboard Shortcut Pill Hint */}
        <div className="flex items-center justify-center gap-2 text-xs text-zinc-500 select-none">
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400">
            <Command className="w-3 h-3 text-zinc-500" />
            <span>V</span>
          </div>
          <span>or Ctrl+V anywhere to auto-capture link</span>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4 border-t border-zinc-900">
          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm space-y-1.5 hover:border-zinc-700/60 transition-colors">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Direct Edge CDN Stream</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Downloads resolve signed Google & edge CDN links in ~300ms, streaming straight to your browser at 50-100 MB/s.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm space-y-1.5 hover:border-zinc-700/60 transition-colors">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
              <span>100% Client-Side Private</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              No server database, no file retention, and no bandwidth logging. Every byte flows directly to your device storage.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm space-y-1.5 hover:border-zinc-700/60 transition-colors">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Scissors className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Visual Section Trimmer</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Interactive timeline scrubber lets you clip custom highlights and export only the required seconds losslessly.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 backdrop-blur-sm space-y-1.5 hover:border-zinc-700/60 transition-colors">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
              <Archive className="w-4 h-4 text-orange-400 shrink-0" />
              <span>Streamed Batch ZIP Engine</span>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Paste multiple URLs or choose entire playlist tracks. Downloads are compressed on the fly into a single `.zip` file.
            </p>
          </div>
        </div>

        {/* Minimal Footer */}
        <footer className="text-center pt-4 pb-2 text-[11px] text-zinc-600">
          <span>Clipstream Next-Gen Engine · Ultra-fast, client-side, zero server limits.</span>
        </footer>
      </main>

      {/* Settings Slide-Over Drawer Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="fixed inset-0"
            onClick={() => setIsSettingsOpen(false)}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 p-6 overflow-y-auto shadow-2xl z-10 flex flex-col space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-zinc-400" />
                <h2 className="text-sm font-semibold text-zinc-100 tracking-tight">Preferences</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 transition-colors cursor-pointer"
                aria-label="Close preferences"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1">
              <MemoSettingsSheet
                settings={advancedSettings}
                setSettings={setAdvancedSettings}
                theme={theme}
                setTheme={setTheme}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-3.5 py-2 rounded-full bg-zinc-900/95 border border-zinc-800 text-zinc-200 text-xs font-medium shadow-2xl backdrop-blur-md flex items-center gap-2 whitespace-nowrap animate-in fade-in slide-in-from-bottom-2 duration-150">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
