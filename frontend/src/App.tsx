import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InspectPost } from './components/InspectPost';
import { SettingsSheet } from './components/SettingsSheet';
import { AdvancedSettings } from './types';
import { Sliders, X, Zap, ShieldCheck, Scissors, Archive, Sparkles, Command } from 'lucide-react';

const MemoInspectPost = React.memo(InspectPost);
const MemoSettingsSheet = React.memo(SettingsSheet);

// Supported & Rotating Platforms Catalog (with authentic brand gradients and rich glow hues)
const ROTATING_PLATFORMS = [
  {
    name: 'YouTube',
    badge: '4K Ultra HD',
    sampleUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    gradient: 'from-[#FF0000] via-[#FF264D] to-[#FF5500]',
    dot: 'bg-red-500',
    glow: 'radial-gradient(circle, rgba(255,0,50,0.35) 0%, transparent 70%)',
    shadow: 'drop-shadow-[0_2px_14px_rgba(255,0,50,0.35)]',
  },
  {
    name: 'Instagram',
    badge: 'Reels 1080p',
    sampleUrl: 'https://www.instagram.com/reel/C8Xy_sample',
    gradient: 'from-[#F58529] via-[#DD2A7B] to-[#8134AF]',
    dot: 'bg-pink-500',
    glow: 'radial-gradient(circle, rgba(221,42,123,0.35) 0%, transparent 70%)',
    shadow: 'drop-shadow-[0_2px_14px_rgba(221,42,123,0.35)]',
  },
  {
    name: 'Snapchat',
    badge: 'Spotlight & Stories',
    sampleUrl: 'https://www.snapchat.com/spotlight/W7_EDnXwT1gAA',
    gradient: 'from-[#FFE600] via-[#FFD000] to-[#FFAA00]',
    dot: 'bg-yellow-400',
    glow: 'radial-gradient(circle, rgba(255,220,0,0.35) 0%, transparent 70%)',
    shadow: 'drop-shadow-[0_2px_14px_rgba(255,220,0,0.25)]',
  },
  {
    name: 'TikTok',
    badge: 'HD (No Watermark)',
    sampleUrl: 'https://www.tiktok.com/@tiktok/video/7106594312292453678',
    gradient: 'from-[#00F2FE] via-[#4FACFE] to-[#00F2FE]',
    dot: 'bg-cyan-400',
    glow: 'radial-gradient(circle, rgba(0,242,254,0.35) 0%, transparent 70%)',
    shadow: 'drop-shadow-[0_2px_14px_rgba(0,242,254,0.35)]',
  },
  {
    name: 'X (Twitter)',
    badge: 'Direct Edge MP4',
    sampleUrl: 'https://x.com/SpaceX/status/1649078635876352000',
    gradient: 'from-[#FFFFFF] via-[#E2E8F0] to-[#94A3B8]',
    dot: 'bg-slate-300',
    glow: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, transparent 70%)',
    shadow: 'drop-shadow-[0_2px_14px_rgba(255,255,255,0.2)]',
  },
  {
    name: 'SoundCloud',
    badge: '320kbps Lossless',
    sampleUrl: 'https://soundcloud.com/octobersveryown/champagnepapi-laugh-now-cry',
    gradient: 'from-[#FF5500] via-[#FF7700] to-[#FFAA00]',
    dot: 'bg-amber-400',
    glow: 'radial-gradient(circle, rgba(255,85,0,0.35) 0%, transparent 70%)',
    shadow: 'drop-shadow-[0_2px_14px_rgba(255,85,0,0.35)]',
  },
  {
    name: 'Reddit',
    badge: 'Merged Audio',
    sampleUrl: 'https://www.reddit.com/r/aww/comments/12345/cute_cat/',
    gradient: 'from-[#FF4500] via-[#FF5722] to-[#FF7043]',
    dot: 'bg-orange-500',
    glow: 'radial-gradient(circle, rgba(255,69,0,0.35) 0%, transparent 70%)',
    shadow: 'drop-shadow-[0_2px_14px_rgba(255,69,0,0.35)]',
  },
];

export default function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Auto-rotating platform name with smooth vertical roll animation & pause on hover
  const [platformIdx, setPlatformIdx] = useState(0);
  const [prevPlatformIdx, setPrevPlatformIdx] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const changePlatform = React.useCallback(
    (newIdx: number) => {
      if (newIdx === platformIdx || prevPlatformIdx !== null) return;
      setPrevPlatformIdx(platformIdx);
      setPlatformIdx(newIdx);
      setTimeout(() => {
        setPrevPlatformIdx(null);
      }, 500);
    },
    [platformIdx, prevPlatformIdx]
  );

  const nextPlatform = React.useCallback(() => {
    changePlatform((platformIdx + 1) % ROTATING_PLATFORMS.length);
  }, [platformIdx, changePlatform]);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      nextPlatform();
    }, 2800);
    return () => clearInterval(timer);
  }, [isPaused, nextPlatform]);

  const currentPlatform = ROTATING_PLATFORMS[platformIdx];

  const handleTrySample = (url: string) => {
    window.dispatchEvent(
      new CustomEvent('app:global-paste', {
        detail: { url, autoDownload: false },
      })
    );
    showToast(`Loaded ${currentPlatform.name} sample link! Inspecting...`);
  };

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
        <div
          className="text-center pt-2 pb-2 select-none flex items-center justify-center w-full px-2"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <h1 className="hero-headline text-[clamp(1rem,3.2vw,2rem)] font-bold tracking-[-0.035em] leading-tight whitespace-nowrap inline-flex items-center justify-center max-w-full">
            {/* 100% Static Prefix Text (Never Shifts or Re-mounts) */}
            <span className="text-white drop-shadow-[0_2px_8px_rgba(255,255,255,0.08)] shrink-0 select-none">
              Download Any Video from&nbsp;
            </span>

            {/* Dynamic Platform Rotator in a Fixed-Width Slot (Prefix Never Moves) */}
            <span
              className="relative inline-block text-left w-[11.5ch] platform-rotator-mask cursor-pointer group h-[1.35em] align-baseline shrink-0"
              onClick={nextPlatform}
              title="Click to cycle platform"
              aria-label={`Current platform: ${currentPlatform.name}. Click to switch.`}
            >
              {/* Dynamic Hue Ambient Backlight */}
              <span
                className="absolute -inset-x-4 -inset-y-2 rounded-full blur-2xl opacity-40 pointer-events-none transition-all duration-700 ease-out"
                style={{ background: currentPlatform.glow }}
              />

              {/* Outgoing Platform (Slide Out) */}
              {prevPlatformIdx !== null && (
                <span
                  className={`absolute inset-0 flex items-center justify-start font-bold tracking-[-0.035em] bg-gradient-to-r ${ROTATING_PLATFORMS[prevPlatformIdx].gradient} bg-clip-text text-transparent platform-slide-out ${ROTATING_PLATFORMS[prevPlatformIdx].shadow} whitespace-nowrap`}
                >
                  {ROTATING_PLATFORMS[prevPlatformIdx].name}
                </span>
              )}

              {/* Active Platform (Slide In) */}
              <span
                className={`absolute inset-0 flex items-center justify-start ${prevPlatformIdx !== null ? 'platform-slide-in' : ''} font-bold tracking-[-0.035em] bg-gradient-to-r ${currentPlatform.gradient} bg-clip-text text-transparent ${currentPlatform.shadow} group-hover:scale-[1.02] transition-transform duration-200 whitespace-nowrap`}
              >
                {currentPlatform.name}
              </span>
            </span>
          </h1>
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
          <span>Downloader · Ultra-fast, direct stream, zero server limits.</span>
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
