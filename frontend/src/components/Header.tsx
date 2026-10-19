import React from 'react';
import { Sun, Moon, Sliders, ArrowDownToLine } from 'lucide-react';

interface HeaderProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme = 'dark',
  onToggleTheme,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-black/60 dark:bg-black/60 backdrop-blur-2xl border-b border-zinc-800/60 shadow-sm transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-emerald-600 flex items-center justify-center text-zinc-950 font-bold shadow-[0_0_16px_rgba(16,185,129,0.35)]">
            <ArrowDownToLine className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold tracking-tight text-zinc-100 font-sans">
              Clipstream
            </span>
            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              v2.5 Edge
            </span>
          </div>
        </div>

        {/* Center Live Engine Status (Desktop) */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900/80 border border-zinc-800/80 text-[11px] font-medium text-zinc-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-zinc-300">Direct CDN Bypass Active</span>
          <span className="text-zinc-600">·</span>
          <span className="text-emerald-400 font-mono">0 Server Wait</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Preferences Drawer */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 active:scale-95 transition-all cursor-pointer border border-transparent hover:border-zinc-700/60"
              title="Preferences & Audio Options"
              aria-label="Settings"
            >
              <Sliders className="w-4 h-4" />
            </button>
          )}

          {/* Theme toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 active:scale-95 transition-all cursor-pointer border border-transparent hover:border-zinc-700/60"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle color theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
