import React from 'react';
import { Sun, Moon, Sliders, ArrowDownToLine } from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-black/75 dark:bg-black/75 backdrop-blur-xl border-b border-zinc-800/60 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5 select-none">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/70 flex items-center justify-center text-zinc-100 shadow-sm">
            <ArrowDownToLine className="w-3.5 h-3.5" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">
            Downloader
          </span>
        </div>

        {/* Section Jump Quick-Links & Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Quick jump to Activity */}
          <button
            type="button"
            onClick={() => scrollTo('queue-section')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            title="Jump to Activity Queue"
          >
            <span>Activity</span>
            {activeJobsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {activeJobsCount}
              </span>
            )}
          </button>

          {/* Quick jump to Library */}
          <button
            type="button"
            onClick={() => scrollTo('library-section')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
            title="Jump to Library"
          >
            <span>Library</span>
            {filesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono text-zinc-400 bg-zinc-800/80">
                {filesCount}
              </span>
            )}
          </button>

          <div className="h-4 w-px bg-zinc-800 my-auto mx-1" />

          {/* Preferences Drawer */}
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
              title="Preferences"
              aria-label="Settings"
            >
              <Sliders className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Theme toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle color theme"
            >
              {theme === 'light' ? (
                <Moon className="w-3.5 h-3.5" />
              ) : (
                <Sun className="w-3.5 h-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
