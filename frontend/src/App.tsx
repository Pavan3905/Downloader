import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InspectPost } from './components/InspectPost';
import { AdvancedSettings } from './types';

const MemoInspectPost = React.memo(InspectPost);

// 8 Platform Pills catalog from reference image
const PLATFORM_PILLS = [
  {
    id: 'youtube',
    name: 'YouTube',
    sampleUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#FF0000">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    id: 'instagram',
    name: 'Instagram',
    sampleUrl: 'https://www.instagram.com/reel/C8Xy_sample',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="ig-pill-icon" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f09433" />
            <stop offset="30%" stopColor="#e6683c" />
            <stop offset="60%" stopColor="#dc2743" />
            <stop offset="85%" stopColor="#cc2366" />
            <stop offset="100%" stopColor="#bc1888" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="url(#ig-pill-icon)" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="4.2" stroke="url(#ig-pill-icon)" strokeWidth="2" />
        <circle cx="17.2" cy="6.8" r="1.2" fill="url(#ig-pill-icon)" />
      </svg>
    ),
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    sampleUrl: 'https://www.tiktok.com/@tiktok/video/7106594312292453678',
    icon: (
      <svg className="w-4 h-4 shrink-0 text-slate-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.35 0 .68.06.98.17V8.9a6.3 6.3 0 0 0-.98-.08A6.33 6.33 0 0 0 3 15.15a6.33 6.33 0 0 0 6.34 6.34 6.33 6.33 0 0 0 6.33-6.34V8.52a8.27 8.27 0 0 0 4.92 1.6V6.69h-1z" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    sampleUrl: 'https://www.facebook.com/watch/?v=123456789',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: 'reddit',
    name: 'Reddit',
    sampleUrl: 'https://www.reddit.com/r/aww/comments/12345/cute_cat/',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#FF4500">
        <circle cx="12" cy="12" r="12" fill="#FF4500" />
        <path d="M19.2 12c0-.8-.6-1.4-1.4-1.4-.4 0-.8.2-1 .5-1-.7-2.4-1.2-4-1.3l.7-3.3 2.3.5c0 .6.5 1.1 1.1 1.1.6 0 1.1-.5 1.1-1.1s-.5-1.1-1.1-1.1c-.5 0-.9.3-1 .8l-2.6-.6c-.2 0-.3.1-.4.3l-.8 3.8c-1.6.1-3 .6-4 1.3-.3-.3-.6-.5-1.1-.5-.8 0-1.4.6-1.4 1.4 0 .6.3 1.1.8 1.3 0 .2 0 .4 0 .7 0 2.4 2.8 4.3 6.2 4.3s6.2-1.9 6.2-4.3c0-.2 0-.5 0-.7.4-.2.8-.7.8-1.3zm-9.7.8c0-.6.5-1.1 1.1-1.1s1.1.5 1.1 1.1-.5 1.1-1.1 1.1-1.1-.5-1.1-1.1zm5.8 3.2c-.7.7-2 1-3.3 1s-2.6-.3-3.3-1c-.1-.1-.1-.3 0-.4.1-.1.3-.1.4 0 .5.5 1.6.8 2.9.8s2.4-.3 2.9-.8c.1-.1.3-.1.4 0 .1.1.1.3 0 .4zm-.4-2.1c-.6 0-1.1-.5-1.1-1.1s.5-1.1 1.1-1.1 1.1.5 1.1 1.1-.5 1.1-1.1 1.1z" fill="white" />
      </svg>
    ),
  },
  {
    id: 'pinterest',
    name: 'Pinterest',
    sampleUrl: 'https://www.pinterest.com/pin/123456789/',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#BD081C">
        <path d="M12 0a12 12 0 0 0-4.37 23.18c-.06-.94-.12-2.38.02-3.41.13-.93.85-6.04.85-6.04s-.22-.44-.22-1.08c0-1.01.59-1.77 1.32-1.77.62 0 .92.47.92 1.03 0 .63-.4 1.57-.61 2.44-.17.74.37 1.34 1.1 1.34 1.32 0 2.34-1.39 2.34-3.4 0-1.78-1.28-3.03-3.11-3.03-2.27 0-3.6 1.7-3.6 3.46 0 .69.26 1.42.59 1.82.07.08.08.15.06.23-.06.26-.2.83-.23.95-.04.16-.13.2-.3.12-1.11-.52-1.8-2.14-1.8-3.45 0-2.81 2.04-5.39 5.89-5.39 3.09 0 5.5 2.2 5.5 5.15 0 3.07-1.94 5.54-4.63 5.54-.9 0-1.76-.47-2.05-1.03l-.56 2.13c-.2.78-.75 1.76-1.12 2.36A12 12 0 1 0 12 0z" />
      </svg>
    ),
  },
  {
    id: 'snapchat',
    name: 'Snapchat',
    sampleUrl: 'https://www.snapchat.com/spotlight/W7_EDnXwT1gAA',
    icon: (
      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="#FFE600">
        <path d="M12.01 2c-3.53 0-5.69 2.4-5.71 4.71-.01.99.3 2.11.75 2.87.14.23.08.38-.07.49-.3.23-.74.52-1.17.82-.44.31-.77.66-.78 1.11-.02.66.6 1.07 1.25 1.34.19.08.3.17.29.35-.04.47-.23 1.52-.39 2.05-.2.66-.73 1.13-1.63 1.29-.27.05-.37.2-.3.42.16.51.85.87 1.73.91.46.02.88-.1 1.28-.27.42-.18.79-.19 1.19.04.82.47 1.95.84 3.56.84 1.62 0 2.75-.37 3.57-.84.4-.23.77-.22 1.19-.04.4.17.82.29 1.28.27.88-.04 1.57-.4 1.73-.91.07-.22-.03-.37-.3-.42-.9-.16-1.43-.63-1.63-1.29-.16-.53-.35-1.58-.39-2.05-.01-.18.1-.27.29-.35.65-.27 1.27-.68 1.25-1.34-.01-.45-.34-.8-.78-1.11-.43-.3-.87-.59-1.17-.82-.15-.11-.21-.26-.07-.49.45-.76.76-1.88.75-2.87C17.7 4.4 15.54 2 12.01 2z" />
      </svg>
    ),
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    sampleUrl: 'https://x.com/SpaceX/status/1649078635876352000',
    icon: (
      <svg className="w-4 h-4 shrink-0 text-slate-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
];

export default function App() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Theme state: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('clipstream_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'light'; // Default to light mode matching reference image
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

  const [advancedSettings] = useState<AdvancedSettings>({
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

  const handleSelectPlatformPill = (sampleUrl: string, name: string) => {
    window.dispatchEvent(
      new CustomEvent('app:global-paste', {
        detail: { url: sampleUrl, autoDownload: false },
      })
    );
    showToast(`Loaded ${name} sample link!`);
  };

  return (
    <div
      className={`min-h-screen relative overflow-hidden ${
        theme === 'light' ? 'light bg-[#f8fafc] text-slate-900' : 'bg-[#09090b] text-zinc-100'
      } flex flex-col font-sans transition-colors duration-200`}
    >
      {/* Ambient Mesh Glow */}
      <div className="ambient-glow" />

      {/* Top Header */}
      <Header
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16 flex flex-col items-center z-10 transition-all">
        <div className="w-full flex flex-col items-center space-y-6 sm:space-y-7">
          
          {/* Hero Section with Celestial Arc & 4 Floating Platform Cards */}
          <div className="relative w-full max-w-3xl flex flex-col items-center justify-center pt-3 pb-2 select-none">
            {/* Celestial Arc Curve */}
            <div className="celestial-arc" />

            {/* Ambient Floating Pastel Dots */}
            <div className="absolute left-16 sm:left-28 top-3 w-2.5 h-2.5 rounded-full bg-violet-400/50 blur-[0.5px] pointer-events-none" />
            <div className="absolute left-6 sm:left-10 bottom-2 w-3 h-3 rounded-full bg-cyan-400/50 blur-[0.5px] pointer-events-none" />
            <div className="absolute right-8 sm:right-12 bottom-1 w-2.5 h-2.5 rounded-full bg-pink-400/50 blur-[0.5px] pointer-events-none" />
            <div className="absolute right-20 sm:right-32 top-1 w-2 h-2 rounded-full bg-indigo-400/50 blur-[0.5px] pointer-events-none" />

            {/* 4 Floating 3D Platform Squircle Cards from Reference Image */}
            {/* Card 1: YouTube (far-left, tilted -10deg) */}
            <button
              type="button"
              onClick={() => handleSelectPlatformPill('https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'YouTube')}
              title="YouTube"
              className="hidden sm:flex absolute -left-2 sm:-left-4 lg:-left-10 top-6 sm:top-8 float-card-1 z-10 w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-white dark:bg-zinc-800/90 shadow-[0_12px_28px_rgba(0,0,0,0.07)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.5)] border border-slate-200/80 dark:border-zinc-700/60 items-center justify-center p-3 select-none transition-transform hover:scale-110 cursor-pointer"
            >
              <svg className="w-7 h-7 sm:w-8 sm:h-8" viewBox="0 0 24 24" fill="#FF0000">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
            </button>

            {/* Card 2: Instagram (mid-left, tilted -4deg) */}
            <button
              type="button"
              onClick={() => handleSelectPlatformPill('https://www.instagram.com/reel/C8Xy_sample', 'Instagram')}
              title="Instagram"
              className="hidden sm:flex absolute left-14 sm:left-20 lg:left-22 -top-4 sm:-top-7 float-card-2 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-zinc-800/90 shadow-[0_12px_28px_rgba(0,0,0,0.07)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.5)] border border-slate-200/80 dark:border-zinc-700/60 items-center justify-center p-3 select-none transition-transform hover:scale-110 cursor-pointer"
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24" fill="none">
                <defs>
                  <linearGradient id="ig-hero-card" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#f09433" />
                    <stop offset="25%" stopColor="#e6683c" />
                    <stop offset="50%" stopColor="#dc2743" />
                    <stop offset="75%" stopColor="#cc2366" />
                    <stop offset="100%" stopColor="#bc1888" />
                  </linearGradient>
                </defs>
                <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="url(#ig-hero-card)" strokeWidth="2.2" />
                <circle cx="12" cy="12" r="4.2" stroke="url(#ig-hero-card)" strokeWidth="2" />
                <circle cx="17.2" cy="6.8" r="1.2" fill="url(#ig-hero-card)" />
              </svg>
            </button>

            {/* Card 3: TikTok (mid-right, tilted +4deg) */}
            <button
              type="button"
              onClick={() => handleSelectPlatformPill('https://www.tiktok.com/@tiktok/video/7106594312292453678', 'TikTok')}
              title="TikTok"
              className="hidden sm:flex absolute right-14 sm:right-20 lg:right-22 -top-4 sm:-top-7 float-card-3 z-10 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-zinc-800/90 shadow-[0_12px_28px_rgba(0,0,0,0.07)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.5)] border border-slate-200/80 dark:border-zinc-700/60 items-center justify-center p-3 select-none transition-transform hover:scale-110 cursor-pointer"
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-slate-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.35 0 .68.06.98.17V8.9a6.3 6.3 0 0 0-.98-.08A6.33 6.33 0 0 0 3 15.15a6.33 6.33 0 0 0 6.34 6.34 6.33 6.33 0 0 0 6.33-6.34V8.52a8.27 8.27 0 0 0 4.92 1.6V6.69h-1z" />
              </svg>
            </button>

            {/* Card 4: X / Twitter (far-right, tilted +10deg) */}
            <button
              type="button"
              onClick={() => handleSelectPlatformPill('https://x.com/SpaceX/status/1649078635876352000', 'X')}
              title="X (Twitter)"
              className="hidden sm:flex absolute -right-2 sm:-right-4 lg:-right-10 top-6 sm:top-8 float-card-4 z-10 w-13 h-13 sm:w-15 sm:h-15 rounded-2xl bg-white dark:bg-zinc-800/90 shadow-[0_12px_28px_rgba(0,0,0,0.07)] dark:shadow-[0_14px_30px_rgba(0,0,0,0.5)] border border-slate-200/80 dark:border-zinc-700/60 items-center justify-center p-3.5 select-none transition-transform hover:scale-110 cursor-pointer"
            >
              <svg className="w-6 h-6 sm:w-7 sm:h-7 text-slate-900 dark:text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </button>

            {/* Headline: Download Videos / from Anywhere */}
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight text-center leading-[1.15] select-none py-3">
              <div className="text-slate-900 dark:text-white drop-shadow-xs">Download Videos</div>
              <div className="mt-1.5">
                <span className="text-[#8B5CF6]">from </span>
                <span className="bg-gradient-to-r from-[#3B82F6] to-[#06B6D4] bg-clip-text text-transparent">
                  Anywhere
                </span>
              </div>
            </h1>
          </div>

          {/* Downloader Core Section (Elevated Rounded-3xl Card) */}
          <section id="downloader-section" className="w-full">
            <MemoInspectPost advancedSettings={advancedSettings} />
          </section>

          {/* 8 Platform Pill Chips from Reference Image */}
          <section className="w-full flex items-center justify-center flex-wrap gap-2 sm:gap-2.5 pt-1 select-none">
            {PLATFORM_PILLS.map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => handleSelectPlatformPill(pill.sampleUrl, pill.name)}
                className="px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all text-xs font-medium text-slate-700 dark:text-zinc-300 flex items-center gap-2 cursor-pointer"
                title={`Target ${pill.name}`}
              >
                {pill.icon}
                <span className="tracking-tight whitespace-nowrap">{pill.name}</span>
              </button>
            ))}
          </section>


        </div>
      </main>

      {/* Clean Centered Copyright Footer from Reference Image */}
      <footer className="w-full mt-auto py-6 sm:py-8 text-center text-xs text-slate-400 dark:text-zinc-500 select-none">
        &copy; 2026 Downloader. Made for everyone.
      </footer>

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
