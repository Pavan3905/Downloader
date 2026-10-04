import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Check,
  Sparkles,
  Key,
  ShieldCheck,
  Upload,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  HelpCircle,
  Sun,
  Moon,
} from 'lucide-react';
import { AdvancedSettings } from '../types';

interface SettingsSheetProps {
  settings: AdvancedSettings;
  setSettings: React.Dispatch<React.SetStateAction<AdvancedSettings>>;
  health?: any;
  theme?: 'dark' | 'light';
  setTheme?: (theme: 'dark' | 'light') => void;
}

export const SettingsSheet: React.FC<SettingsSheetProps> = ({
  settings,
  setSettings,
  health,
  theme = 'dark',
  setTheme,
}) => {
  const [cookieText, setCookieText] = useState('');
  const [hasCookies, setHasCookies] = useState(false);
  const [cookieSize, setCookieSize] = useState(0);
  const [cookieLoading, setCookieLoading] = useState(false);
  const [cookieMsg, setCookieMsg] = useState<string | null>(null);
  const [showCookieHelp, setShowCookieHelp] = useState(false);

  const fetchCookieStatus = async () => {
    try {
      const res = await fetch('/api/cookies');
      if (res.ok) {
        const data = await res.json();
        setHasCookies(Boolean(data.configured));
        setCookieSize(data.size || 0);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchCookieStatus();
  }, []);

  const handleSaveCookies = async () => {
    if (!cookieText.trim()) return;
    setCookieLoading(true);
    setCookieMsg(null);
    try {
      const res = await fetch('/api/cookies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: cookieText.trim() }),
      });
      if (res.ok) {
        setCookieMsg('Cookies saved! YouTube bot verification is now bypassed.');
        setCookieText('');
        await fetchCookieStatus();
      } else {
        const d = await res.json().catch(() => ({}));
        setCookieMsg(d.error || 'Failed to save cookies.');
      }
    } catch {
      setCookieMsg('Network error while saving cookies.');
    } finally {
      setCookieLoading(false);
    }
  };

  const handleClearCookies = async () => {
    setCookieLoading(true);
    try {
      await fetch('/api/cookies', { method: 'DELETE' });
      setHasCookies(false);
      setCookieSize(0);
      setCookieMsg('Cookies removed.');
    } catch {
      // Ignore
    } finally {
      setCookieLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCookieText(content);
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    setSettings({
      subtitle_mode: 'off',
      subtitle_languages: 'en',
      subtitle_format: 'srt',
      thumbnail_mode: 'embed',
      metadata_mode: 'embed',
      embed_chapters: true,
      filename_template: '%(title)s [%(id)s].%(ext)s',
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
  };

  const FILENAME_PRESETS = [
    { label: 'Standard', template: '%(title)s [%(id)s].%(ext)s' },
    { label: 'Clean Title', template: '%(title)s.%(ext)s' },
    { label: 'Uploader + Title', template: '%(uploader)s - %(title)s.%(ext)s' },
  ];

  return (
    <div className="w-full max-w-xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-900">
        <div>
          <h1 className="text-base font-semibold text-white tracking-tight">Preferences</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Authentication, default behaviors, and download settings
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-neutral-400 hover:text-white flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-neutral-900 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      <div className="space-y-5">
        {/* Section: Appearance (Light / Dark Mode) */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-1">
            Interface Theme & Appearance
          </span>
          <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800/80 space-y-3">
            <div>
              <span className="text-xs font-semibold text-white block">Theme Mode</span>
              <span className="text-[11px] text-neutral-400">
                Switch between OLED Dark and high-contrast Light mode
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setTheme?.('dark')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-neutral-900 border-neutral-600 text-white shadow-sm ring-1 ring-neutral-500'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Moon className="w-4 h-4 text-indigo-400" />
                <span>Dark Mode</span>
              </button>

              <button
                type="button"
                onClick={() => setTheme?.('light')}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  theme === 'light'
                    ? 'bg-neutral-100 border-neutral-300 text-neutral-900 shadow-sm ring-1 ring-neutral-400'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Mode</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 0: YouTube Authentication & Bot Bypass */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              YouTube Authentication & Bot Bypass
            </span>
            <button
              type="button"
              onClick={() => setShowCookieHelp(!showCookieHelp)}
              className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
            >
              <HelpCircle className="w-3 h-3" />
              <span>How to get cookies?</span>
            </button>
          </div>

          <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 space-y-3.5 shadow-sm">
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  className={`w-4 h-4 ${hasCookies ? 'text-emerald-400' : 'text-amber-400'}`}
                />
                <span className="text-xs font-medium text-white">
                  {hasCookies ? 'Authenticated with YouTube' : 'No Cookies Configured'}
                </span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                  hasCookies
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {hasCookies ? `Active (${Math.round(cookieSize / 1024)} KB)` : 'Bot Checks May Block'}
              </span>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed">
              When YouTube flags a video with{' '}
              <span className="text-amber-300 font-mono">"Sign in to confirm you're not a bot"</span>
              , supplying your browser cookies allows yt-dlp to download it smoothly without restriction.
            </p>

            {/* Cookie Help Box */}
            {showCookieHelp && (
              <div className="p-3 bg-neutral-900/80 rounded-xl border border-neutral-800 text-[11px] space-y-2 text-neutral-300">
                <p className="font-semibold text-white">2 Quick Ways to Export Cookies:</p>
                <ol className="list-decimal pl-4 space-y-1.5 text-neutral-300">
                  <li>
                    <strong className="text-sky-300">Extension Method (Easiest):</strong> Install{' '}
                    <span className="text-white font-mono">"Get cookies.txt LOCALLY"</span> in Chrome, Edge, or Firefox. Go to youtube.com while logged in, click the extension icon, export the text, and upload it below.
                  </li>
                  <li>
                    <strong className="text-sky-300">DevTools Method:</strong> Open youtube.com, press <kbd className="px-1 py-0.5 bg-black rounded border border-neutral-700 font-mono text-[10px]">F12</kbd>, go to Network tab, refresh, click any request, copy the <span className="text-white font-mono">Cookie:</span> header value, and paste it below.
                  </li>
                </ol>
              </div>
            )}

            {/* Cookie Input Area */}
            <div className="space-y-2">
              <textarea
                value={cookieText}
                onChange={(e) => setCookieText(e.target.value)}
                placeholder="Paste Netscape cookies.txt content or raw Cookie header here..."
                rows={3}
                className="w-full p-2.5 bg-neutral-900 border border-neutral-800 rounded-xl text-[11px] font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-700 resize-none"
              />

              <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs text-neutral-300 hover:text-white transition-colors cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload cookies.txt</span>
                  <input
                    type="file"
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                <div className="flex items-center gap-1.5">
                  {hasCookies && (
                    <button
                      type="button"
                      onClick={handleClearCookies}
                      disabled={cookieLoading}
                      className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 text-rose-300 border border-rose-900/60 hover:bg-rose-900/40 text-xs transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleSaveCookies}
                    disabled={cookieLoading || !cookieText.trim()}
                    className="px-3 py-1.5 rounded-xl instagram-gradient text-white text-xs font-semibold shadow-sm hover:opacity-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Cookies</span>
                  </button>
                </div>
              </div>

              {cookieMsg && (
                <div className="p-2.5 rounded-xl bg-neutral-900/90 border border-neutral-800 text-xs text-sky-300 flex items-center justify-between">
                  <span>{cookieMsg}</span>
                  <button
                    onClick={() => setCookieMsg(null)}
                    className="text-neutral-500 hover:text-white text-xs ml-2 cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 1: Media Defaults */}
        <div className="space-y-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-1">
            Media & Enrichment
          </span>

          <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl divide-y divide-neutral-900 overflow-hidden shadow-sm">
            {/* Embed Subtitles */}
            <div className="p-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-white">Default Subtitles</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Fetch and package subtitles when available
                </p>
              </div>
              <div className="flex items-center p-0.5 bg-neutral-900 rounded-lg border border-neutral-800">
                {[
                  { id: 'off', label: 'Off' },
                  { id: 'embed', label: 'Embed' },
                  { id: 'separate', label: 'Separate' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, subtitle_mode: opt.id as any }))
                    }
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      settings.subtitle_mode === opt.id
                        ? 'bg-neutral-800 text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Thumbnail Cover Art */}
            <div className="p-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-white">Cover Artwork</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Attach album or video artwork to downloaded media
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    thumbnail_mode: prev.thumbnail_mode === 'off' ? 'embed' : 'off',
                  }))
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.thumbnail_mode !== 'off' ? 'bg-rose-500' : 'bg-neutral-800'
                }`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full transition-transform transform absolute top-1 ${
                    settings.thumbnail_mode !== 'off' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Embed Chapters */}
            <div className="p-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-white">Chapter Markers</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Preserve timeline chapters in video and podcast files
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings((prev) => ({
                    ...prev,
                    embed_chapters: !prev.embed_chapters,
                  }))
                }
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  settings.embed_chapters ? 'bg-rose-500' : 'bg-neutral-800'
                }`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full transition-transform transform absolute top-1 ${
                    settings.embed_chapters ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Section 2: Filename & Storage */}
        <div className="space-y-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-1">
            File Naming
          </span>

          <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-white block">Filename Pattern</label>
              <input
                type="text"
                value={settings.filename_template}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, filename_template: e.target.value }))
                }
                placeholder="%(title)s [%(id)s].%(ext)s"
                className="w-full h-10 px-3 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-white font-mono placeholder-neutral-600 focus:outline-none focus:border-neutral-700"
              />
            </div>

            {/* Quick Pattern Presets */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-neutral-500 shrink-0">Presets:</span>
              <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
                {FILENAME_PRESETS.map((p) => {
                  const isActive = settings.filename_template === p.template;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        setSettings((prev) => ({ ...prev, filename_template: p.template }))
                      }
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-neutral-800 text-white border border-neutral-700'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800/80'
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Performance & Network */}
        <div className="space-y-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 px-1">
            Network & Performance
          </span>

          <div className="bg-neutral-950 border border-neutral-800/80 rounded-2xl divide-y divide-neutral-900 overflow-hidden shadow-sm">
            {/* Concurrent Streams */}
            <div className="p-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-white">Parallel Download Streams</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Multi-fragment parallel connections for faster downloads
                </p>
              </div>
              <div className="flex items-center p-0.5 bg-neutral-900 rounded-lg border border-neutral-800">
                {[
                  { value: 2, label: '2x' },
                  { value: 4, label: '4x (Optimal)' },
                  { value: 8, label: '8x' },
                ].map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, concurrent_fragments: s.value }))
                    }
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      settings.concurrent_fragments === s.value
                        ? 'bg-neutral-800 text-white shadow-sm'
                        : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Network Speed Cap */}
            <div className="p-3.5 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-white">Speed Limit</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Cap bandwidth or leave unconstrained
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Uncapped"
                  value={settings.limit_rate}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, limit_rate: e.target.value }))
                  }
                  className="w-24 h-8 px-2.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-right text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-700"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
