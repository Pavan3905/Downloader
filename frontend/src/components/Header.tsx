import React from 'react';
import { Sun, Moon, Sliders, Activity, Bookmark, Zap } from 'lucide-react';

interface HeaderProps {
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenSettings?: () => void;
  activeJobsCount?: number;
  filesCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  theme = 'dark',
  onToggleTheme,
  onOpenSettings,
  activeJobsCount = 0,
  filesCount = 0,
}) => {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-black/80 dark:bg-black/80 backdrop-blur-xl border-b border-neutral-800/70 shadow-sm">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between">
        {/* Brand & Status */}
        <div className="flex items-center gap-3 select-none">
          <div className="w-8 h-8 rounded-xl p-[2px] instagram-gradient flex items-center justify-center shrink-0 shadow-md">
            <div className="w-full h-full bg-black rounded-[10px] flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-white">
                <path d="M12 3v12" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 21h14" />
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold tracking-tight text-white leading-none">
              Downloader Studio
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Ready</span>
            </span>
          </div>
        </div>

        {/* Section Jump Quick-Links & Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick jump to Queue */}
          <button
            type="button"
            onClick={() => scrollTo('queue-section')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            title="Jump to Download Queue"
          >
            <Activity className="w-3.5 h-3.5 text-violet-400" />
            <span className="hidden md:inline">Queue</span>
            {activeJobsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-violet-600 text-white animate-pulse">
                {activeJobsCount}
              </span>
            )}
          </button>

          {/* Quick jump to Library */}
          <button
            type="button"
            onClick={() => scrollTo('library-section')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-neutral-300 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
            title="Jump to Library"
          >
            <Bookmark className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">Library</span>
            {filesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-neutral-800 text-neutral-300">
                {filesCount}
              </span>
            )}
          </button>

          <div className="h-4 w-px bg-neutral-800 my-auto mx-1" />

          {/* Preferences Drawer Button */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
              title="Open Preferences & Settings"
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
              className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors cursor-pointer"
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
